"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import SocialLoginButtons, { SocialDivider } from "@/components/SocialLoginButtons";

type Consents = {
  terms: boolean;       // 이용약관 (필수)
  privacy: boolean;     // 개인정보 (필수)
  marketing: boolean;   // 마케팅 (선택)
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState<Consents>({
    terms: false,
    privacy: false,
    marketing: false,
  });

  const allChecked = consents.terms && consents.privacy && consents.marketing;
  const requiredChecked = consents.terms && consents.privacy;

  const toggleAll = () => {
    const next = !allChecked;
    setConsents({ terms: next, privacy: next, marketing: next });
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

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          marketing_opt_in: consents.marketing,
          terms_agreed_at: new Date().toISOString(),
          privacy_agreed_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setError(error.message === "User already registered"
        ? "이미 가입된 이메일입니다."
        : "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    // 이메일 컨펌이 OFF여도 안전을 위해 세션이 있는지 확인
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      // 컨펌이 ON 상태로 남아있는 경우 — 로그인 페이지로
      router.push("/auth/login?signup=success");
    }
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#E8DDD0",
    color: "#1A1A1A",
    border: "1px solid transparent",
  };

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Account
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            회원가입
          </h1>
        </div>

        {/* 소셜 가입 */}
        <div className="mb-6 space-y-3">
          <SocialLoginButtons mode="signup" />
          <SocialDivider label="또는 이메일로 가입" />
        </div>

        <div className="mb-8 p-4 space-y-2" style={{ backgroundColor: "#E8DDD0" }}>
          {["공연 찜하기 · 관심 공연 저장", "공연자 신청 · 내 공연 등록 자격", "새 공연 알림 · 업데이트 수신"].map((text) => (
            <p key={text} className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
              ✓ {text}
            </p>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              비밀번호
            </label>
            <PasswordInput value={password} onChange={setPassword} required minLength={8} />
            <p className="mt-1 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>8자 이상</p>
          </div>

          {/* ─── 약관 동의 섹션 ─── */}
          <div className="pt-3 space-y-2" style={{ borderTop: "1px solid #D4CFC9" }}>
            <ConsentRow
              checked={allChecked}
              onChange={toggleAll}
              label="전체 동의"
              bold
            />
            <div className="pl-1 space-y-2" style={{ borderLeft: "2px solid #E8DDD0", paddingLeft: "12px" }}>
              <ConsentRow
                checked={consents.terms}
                onChange={() => toggleOne("terms")}
                required
                label={
                  <>
                    이용약관 동의{" "}
                    <Link href="/terms" target="_blank" className="underline" style={{ color: "#6D3115" }}>
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
                    <Link href="/privacy" target="_blank" className="underline" style={{ color: "#6D3115" }}>
                      보기
                    </Link>
                  </>
                }
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
              backgroundColor: loading || !requiredChecked ? "#9B9693" : "#6D3115",
              color: "#F4EDE3",
              cursor: loading || !requiredChecked ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!loading && requiredChecked) e.currentTarget.style.backgroundColor = "#8B4A2A"; }}
            onMouseLeave={(e) => { if (!loading && requiredChecked) e.currentTarget.style.backgroundColor = "#6D3115"; }}
          >
            {loading ? "처리 중..." : "가입하기"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" style={{ color: "#6D3115" }}>
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
          backgroundColor: checked ? "#6D3115" : "transparent",
          border: `1.5px solid ${checked ? "#6D3115" : "#9B9693"}`,
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F4EDE3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className="text-xs leading-relaxed"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          color: "#1A1A1A",
          fontWeight: bold ? 600 : 400,
        }}
      >
        {required && <span style={{ color: "#A63D2F", marginRight: "4px" }}>[필수]</span>}
        {label}
      </span>
    </label>
  );
}
