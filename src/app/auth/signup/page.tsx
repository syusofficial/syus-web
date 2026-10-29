"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey } from "@/lib/supabase/keys";
import PasswordInput from "@/components/PasswordInput";
import SocialLoginButtons, { SocialDivider } from "@/components/SocialLoginButtons";
import { handOffSignupEmail } from "@/lib/signupHandoff";
import { safeNextPath } from "@/lib/safeNext";
import { triggerWelcomeEmail } from "./actions";

/**
 * 가입 전용 Supabase 클라이언트 — 세션을 브라우저에 저장하지 않는다 (2026-10-29).
 *
 * 되돌리지 말 것. 이전엔 사이트 공용 클라이언트(@/lib/supabase/client)로 signUp을 불렀다.
 * 컨펌 절차가 없어 signUp이 곧바로 세션을 발급하므로, 같은 클라이언트를 듣던 상단 메뉴가
 * 그 즉시 「마이페이지 · 로그아웃」으로 바뀌었다. 그런데 화면은 환영 메일 요청을 기다리며
 * 가입 페이지에 「처리 중...」으로 남았고, 그 요청이 늦거나 실패하면 이동 코드에 닿지 못해
 * 그대로 멈췄다 (2026-10-28 사장님 목격).
 * 이제 가입은 계정만 만들고, 로그인은 로그인 화면에서 따로 한다.
 * storageKey를 따로 둬서 공용 클라이언트와 저장소·탭 간 알림이 섞이지 않는다.
 */
let signupClient: SupabaseClient | null = null;
function getSignupClient() {
  if (!signupClient) {
    signupClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabasePublishableKey()!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "syus-signup-only",
      },
    });
  }
  return signupClient;
}

/** 환영 메일을 기다리는 최대 시간. 넘으면 웹훅 경로(on-signup/route.ts)에 맡기고 화면을 넘긴다. */
const WELCOME_WAIT_MS = 8000;

type Consents = {
  terms: boolean;       // 이용약관 (필수)
  privacy: boolean;     // 개인정보 (필수)
  age14: boolean;       // 만 14세 이상 (필수, PIPA v2.1 2026-06-15 시행)
  marketing: boolean;   // 마케팅 (선택)
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 가입 후 복귀 목적지(기본 무대올림 "/"). 시우스에서 온 경우 next=/syus… → 시우스로 복귀·시우스 로그인으로.
  const nextParam = searchParams.get("next");
  const safeNext = safeNextPath(nextParam);
  const backToLogin = safeNext.startsWith("/syus") ? "/syus/login" : "/auth/login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState<Consents>({
    terms: false,
    privacy: false,
    age14: false,
    marketing: false,
  });

  const allChecked = consents.terms && consents.privacy && consents.age14 && consents.marketing;
  const requiredChecked = consents.terms && consents.privacy && consents.age14;

  const toggleAll = () => {
    const next = !allChecked;
    setConsents({ terms: next, privacy: next, age14: next, marketing: next });
  };

  const toggleOne = (key: keyof Consents) => {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!requiredChecked) {
      setError("필수 약관에 모두 동의해주세요.");
      return;
    }

    // 이름 공백만 입력 방지 (onboarding/page.tsx와 동일한 검증)
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    setLoading(true);

    let result: Awaited<ReturnType<SupabaseClient["auth"]["signUp"]>>;
    try {
      result = await getSignupClient().auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            marketing_opt_in: consents.marketing,
            terms_agreed_at: new Date().toISOString(),
            privacy_agreed_at: new Date().toISOString(),
            age14_confirmed_at: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      // 네트워크 끊김 등 — 버튼이 「처리 중...」에 묶이지 않게 풀어 준다
      console.error("[SIGNUP ERROR] 요청 실패", err);
      setError("네트워크 문제로 가입 요청을 보내지 못했습니다. 연결을 확인하고 다시 시도해주세요.");
      setLoading(false);
      return;
    }
    const { data, error } = result;

    if (error) {
      // DB 레벨 14세 게이트(check constraint)가 막은 경우 안내문 통일
      const msg = error.message ?? "";
      const code = (error as { code?: string }).code ?? "";
      const status = (error as { status?: number }).status ?? 0;

      // 진단을 위해 콘솔에 모든 정보 노출
      console.error("[SIGNUP ERROR]", { message: msg, code, status, error });

      if (code === "user_already_exists" || /user already registered/i.test(msg)) {
        // supabase-js가 code(예: user_already_exists)를 내려주면 그걸 우선 사용.
        // 혹시 code가 안 내려오는 경로가 있을 수 있어 문자열 비교(대소문자 무시)도 함께 유지.
        setError("이미 가입된 이메일입니다.");
      } else if (/signups? (are )?disabled/i.test(msg)) {
        setError("일시적으로 이메일 가입이 중단되어 있습니다. 운영자(syusflux@gmail.com)에게 문의해주세요.");
      } else if (/rate.?limit|too many/i.test(msg) || status === 429) {
        setError("잠시 후 다시 시도해주세요. 너무 많은 요청이 들어왔습니다. (429)");
      } else if (/database error/i.test(msg) || /saving new user/i.test(msg)) {
        setError("일시적인 가입 처리 오류입니다. 잠시 후 다시 시도해주세요. 계속되면 운영자(syusflux@gmail.com)에게 알려주세요.");
      } else {
        // 진단을 위해 실제 메시지를 화면에 노출 (운영자가 사용자 캡처 받아 즉시 진단)
        setError(`회원가입 중 오류가 발생했습니다. (${msg || code || `status:${status}`}) — 계속되면 운영자(syusflux@gmail.com)에게 위 메시지를 그대로 알려주세요.`);
      }
      setLoading(false);
      return;
    }

    // 2026-10-29: 가입 = 계정 만들기까지. 로그인은 로그인 화면에서 따로 한다(사장님 지시).
    // 가입 전용 클라이언트가 세션을 들고 있지 않으므로 이 순간에도 메뉴는 「로그인」 그대로다.
    //
    // 환영 메일은 이 화면에서 직접 트리거한다(Database Webhook 도착 여부와 무관하게 — welcome-trigger.ts 참고).
    // 2026-08-06 수정 — 반드시 기다릴 것. 되돌리지 말 것.
    //   기다리지 않으면 화면 전환이 진행 중이던 server action(POST)을 잘라먹는다.
    //   실측: 회원 14명 전원 profiles.welcome_email_sent_at = null, Resend 발송 이력 0건.
    // 2026-10-29 보강 — 다만 무한정 기다리지 않는다. 요청 자체가 실패하거나(네트워크·배포 교체 중)
    //   늦어지면 예전엔 이동 코드에 닿지 못해 가입 화면에 그대로 멈췄다. 최대 8초만 기다리고
    //   나머지는 웹훅 경로(on-signup/route.ts)에 맡긴다. 중복 발송은 welcome-trigger.ts가 막는다.
    if (data.session && data.user?.id) {
      await Promise.race([
        triggerWelcomeEmail(data.user.id).catch((err) => console.warn("[signup] 환영 메일 요청 실패", err)),
        new Promise((resolve) => setTimeout(resolve, WELCOME_WAIT_MS)),
      ]);
    }
    // 쓰지 않을 일회용 세션은 서버에서도 폐기한다(브라우저 쿠키는 처음부터 건드리지 않았다).
    // 막 만든 계정이라 이 세션 하나뿐이다.
    await getSignupClient().auth.signOut().catch(() => {});

    handOffSignupEmail(email);
    const loginQuery = new URLSearchParams({ signup: "success" });
    if (safeNext !== "/") loginQuery.set("next", safeNext);
    router.replace(`${backToLogin}?${loginQuery.toString()}`);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#E6E1D6",
    color: "#4A3B33",
    border: "1px solid transparent",
  };

  return (
    <div className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#F0EEE9" }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            Account
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            회원가입
          </h1>
        </div>

        {/* 소셜 가입 */}
        <div className="mb-6 space-y-3">
          <SocialLoginButtons mode="signup" next={safeNext} />
          <SocialDivider label="또는 이메일로 가입" />
        </div>

        {/* ── 가입 안내: 일반 회원 + 공연자 회원 혜택 분리 안내 ── */}
        <div className="mb-8 space-y-3">
          <div className="p-4 space-y-2" style={{ backgroundColor: "#E6E1D6" }}>
            <p
              className="text-[0.7rem] tracking-[0.2em] uppercase mb-1"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
            >
              일반 회원으로 누릴 수 있는 것
            </p>
            {/* 2026-08-06 정정 — 코드에 없는 기능을 약속하고 있었다. 되돌리지 말 것.
                · "새 공연 알림": marketing_opt_in을 읽는 코드가 한 줄도 없다(저장만 한다).
                  실재하는 알림은 찜한 공연의 D-3/D-1뿐이므로 그렇게만 적는다.
                · "찜하기"와 "좋아요"는 likes 테이블 하나·하트 하나짜리 같은 기능인데
                  혜택 두 줄로 세고 있었다 → 한 줄로 합친다.
                · 예약 내역 관리는 실재한다(mypage reservations 탭 + cancelReservationAction). */}
            {[
              "공연 찜하기 · 관심 공연 저장",
              "찜해 둔 공연의 사흘 전 · 하루 전 메일 알림",
              "한 줄 후기와 별점 (10~200자, 한 공연당 1회)",
              "예약 내역을 마이페이지에서 확인 · 취소",
            ].map((text) => (
              <p key={text} className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                ✓ {text}
              </p>
            ))}
          </div>
          <div className="p-4 space-y-1.5" style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1" }}>
            <p
              className="text-[0.7rem] tracking-[0.2em] uppercase mb-1"
              style={{ fontFamily: "var(--font-inter)", color: "#5C2A42", fontWeight: 600 }}
            >
              공연자 회원으로 더해지는 것
            </p>
            <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
              ✓ 내 공연 직접 등록 · 수정 · 회차 관리
            </p>
            <p className="text-[0.7rem] leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
              가입 후 마이페이지에서 공연자 신청 → 운영자 확인 후 자격이 부여됩니다.
              학과·동아리·극단·졸업 워크샵 모두 가능합니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-clarity-mask="True">
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 text-base outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-base outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              비밀번호
            </label>
            <PasswordInput value={password} onChange={setPassword} required minLength={8} />
            <p className="mt-1 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>8자 이상</p>
          </div>

          {/* ─── 약관 동의 섹션 ─── */}
          <div className="pt-3 space-y-2" style={{ borderTop: "1px solid #D4CFC1" }}>
            <ConsentRow
              checked={allChecked}
              onChange={toggleAll}
              label="전체 동의"
              bold
            />
            <div className="pl-1 space-y-2" style={{ borderLeft: "2px solid #E6E1D6", paddingLeft: "12px" }}>
              <ConsentRow
                checked={consents.terms}
                onChange={() => toggleOne("terms")}
                required
                label={
                  <>
                    이용약관 동의{" "}
                    <Link href="/terms" target="_blank" className="underline" style={{ color: "#0B5563" }}>
                      보기
                    </Link>
                  </>
                }
              />
              <ConsentRow
                checked={consents.privacy}
                onChange={() => toggleOne("privacy")}
                required
                label={
                  <>
                    개인정보 수집 및 이용 동의{" "}
                    <Link href="/privacy" target="_blank" className="underline" style={{ color: "#0B5563" }}>
                      보기
                    </Link>
                  </>
                }
              />
              <ConsentRow
                checked={consents.age14}
                onChange={() => toggleOne("age14")}
                required
                label="만 14세 이상입니다."
              />
              <ConsentRow
                checked={consents.marketing}
                onChange={() => toggleOne("marketing")}
                label="새 공연 · 소식 알림 수신 (선택)"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs p-3" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#C0392B", backgroundColor: "#EDD4D4" }}>
              {error}
            </p>
          )}

          {/* 왜 버튼이 안 눌리는지 미리 알려준다 — 예전에는 버튼이 채워진 채로 남아
              눌러도 아무 반응이 없었다(디자인팀 진단 7번). */}
          {!requiredChecked && (
            <p
              id="signup-consent-hint"
              className="text-xs p-3"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", backgroundColor: "#E6E1D6" }}
            >
              [필수] 표시된 세 항목에 모두 동의하셔야 가입하실 수 있습니다.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !requiredChecked}
            aria-describedby={!requiredChecked ? "signup-consent-hint" : undefined}
            className="w-full py-3 text-sm tracking-wider transition-colors mt-2"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              // 비활성일 때는 채도를 빼서 "지금은 못 누른다"가 한눈에 보이게 한다.
              // 투명도로 흐리면 크림 배경(#F0EEE9)에 글자가 묻혀 읽히지 않으므로
              // 대비가 남는 무채색 조합(대비 약 5.4:1)을 쓴다.
              backgroundColor: loading || !requiredChecked ? "#D4CFC1" : "#0B5563",
              color: loading || !requiredChecked ? "#5A4A3E" : "#F0EEE9",
              cursor: loading || !requiredChecked ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!loading && requiredChecked) e.currentTarget.style.backgroundColor = "#2C7384"; }}
            onMouseLeave={(e) => { if (!loading && requiredChecked) e.currentTarget.style.backgroundColor = "#0B5563"; }}
          >
            {loading ? "처리 중..." : "가입하기"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
          이미 계정이 있으신가요?{" "}
          <Link href={backToLogin} style={{ color: "#0B5563" }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

/** 동의 체크박스 한 줄 */
function ConsentRow({
  checked,
  onChange,
  label,
  required,
  bold,
}: {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  required?: boolean;
  bold?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <span
        className="w-5 h-5 shrink-0 flex items-center justify-center transition-colors"
        style={{
          backgroundColor: checked ? "#0B5563" : "transparent",
          border: `1.5px solid ${checked ? "#0B5563" : "#5A4A3E"}`,
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0EEE9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className="text-xs leading-relaxed"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          color: "#4A3B33",
          fontWeight: bold ? 600 : 400,
        }}
      >
        {required && <span style={{ color: "#A63D2F", marginRight: "4px" }}>[필수]</span>}
        {label}
      </span>
    </label>
  );
}
