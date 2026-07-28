"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import SocialLoginButtons, { SocialDivider } from "@/components/SocialLoginButtons";
import { isAtLeast14 } from "@/lib/validators";
import { triggerWelcomeEmail } from "./actions";

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
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\") ? nextParam : "/";
  const backToLogin = safeNext.startsWith("/syus") ? "/syus/login" : "/auth/login";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD (PIPA v2.1)
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

    // 생년월일 필수
    if (!birthDate) {
      setError("생년월일을 입력해주세요.");
      return;
    }

    // 만 14세 이상 확인 — 서버 액션 전 클라이언트 차단 (PIPA v2.1)
    if (!isAtLeast14(birthDate)) {
      setError("본 서비스는 만 14세 이상만 가입 가능합니다.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          birth_date: birthDate,
          marketing_opt_in: consents.marketing,
          terms_agreed_at: new Date().toISOString(),
          privacy_agreed_at: new Date().toISOString(),
          age14_confirmed_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      // DB 레벨 14세 게이트(check constraint)가 막은 경우 안내문 통일
      const msg = error.message ?? "";
      const code = (error as { code?: string }).code ?? "";
      const status = (error as { status?: number }).status ?? 0;

      // 진단을 위해 콘솔에 모든 정보 노출
      console.error("[SIGNUP ERROR]", { message: msg, code, status, error });

      if (/profiles_birth_date_age_check/i.test(msg)) {
        setError("본 서비스는 만 14세 이상만 가입 가능합니다.");
      } else if (code === "user_already_exists" || /user already registered/i.test(msg)) {
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

    // profiles.birth_date 백필 — handle_new_user trigger가 metadata에서 못 가져오는 경우 대비
    // (있으면 덮어쓰지 않도록 update만 사용; profiles row가 아직 없을 수 있어 실패는 로그만 남김
    //  — trigger가 동시 처리 중일 수 있으므로 실패해도 가입 흐름은 막지 않고, 다음 로그인/온보딩에서 채워짐)
    if (data.user?.id) {
      const { error: backfillError } = await supabase
        .from("profiles")
        .update({ birth_date: birthDate })
        .eq("id", data.user.id);
      if (backfillError) {
        console.warn("[signup] birth_date backfill failed:", backfillError);
      }
    }

    // 2026-07-28: 이메일 컨펌 절차 제거 — 가입과 동시에 세션이 발급되는 것이 기본 동작.
    // data.session이 있으면 바로 로그인 처리하고, 환영 메일도 이 순간 직접 트리거한다
    // (Database Webhook 도착 여부와 무관하게 확실히 나가도록 — welcome-trigger.ts 참고).
    // 메일 발송은 화면 전환을 막지 않도록 기다리지 않는다(best-effort, 실패해도 가입은 유효).
    if (data.session) {
      if (data.user?.id) {
        triggerWelcomeEmail(data.user.id).catch((err) => {
          console.warn("[signup] triggerWelcomeEmail 호출 실패:", err);
        });
      }
      router.push(safeNext);
      router.refresh();
    } else {
      // 드물게 컨펌이 ON으로 남아있거나 세션 발급이 지연되는 경우의 안전장치 —
      // 이 경우엔 웹훅 경로(on-signup/route.ts)가 환영 메일을 대신 처리한다.
      router.push(`${backToLogin}?signup=success`);
    }
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
            {[
              "공연 찜하기 · 관심 공연 저장",
              "공연 좋아요 · 응원 기록",
              "한 줄 후기 작성 (10~200자, 한 공연당 1회)",
              "새 공연 알림 · D-3 / D-1 메일 안내",
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
              className="w-full px-4 py-3 text-sm outline-none"
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
              className="w-full px-4 py-3 text-sm outline-none"
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

          {/* 생년월일 — PIPA v2.1 만 14세 이상 확인 용도 */}
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              생년월일
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
            <p className="mt-1 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              만 14세 이상만 가입할 수 있습니다.
            </p>
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

          <button
            type="submit"
            disabled={loading || !requiredChecked}
            className="w-full py-3 text-sm tracking-wider transition-colors mt-2"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: loading || !requiredChecked ? "#5A4A3E" : "#0B5563",
              color: "#F0EEE9",
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
