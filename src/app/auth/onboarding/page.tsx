"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageLoader from "@/components/PageLoader";
import { isAtLeast14 } from "@/lib/validators";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD — 소셜 가입자도 이메일 가입과 동일한 만 14세 게이트 적용 (PIPA v2.1)

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }

      // 이미 동의 완료한 사용자는 홈으로
      const meta = data.user.user_metadata ?? {};
      if (meta.terms_agreed_at && meta.privacy_agreed_at) {
        router.push("/");
        return;
      }

      // 기본 이름: provider에서 받은 정보 활용
      const fallbackName =
        meta.name ||
        meta.full_name ||
        meta.nickname ||
        meta.preferred_username ||
        "";
      setName(fallbackName);
      setLoading(false);
    });
  }, [router]);

  const allChecked = terms && privacy && marketing;
  const requiredChecked = terms && privacy;

  const toggleAll = () => {
    const next = !allChecked;
    setTerms(next);
    setPrivacy(next);
    setMarketing(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!requiredChecked) {
      setError("필수 약관에 모두 동의해주세요.");
      return;
    }
    if (!name.trim()) {
      setError("이름(닉네임)을 입력해주세요.");
      return;
    }

    // 생년월일 필수 — 이메일 가입(signup)과 동일한 게이트 (PIPA v2.1)
    if (!birthDate) {
      setError("생년월일을 입력해주세요.");
      return;
    }

    // 만 14세 이상 확인 — 소셜(구글·카카오) 가입도 이메일 가입과 동일하게 여기서 막는다.
    if (!isAtLeast14(birthDate)) {
      setError("본 서비스는 만 14세 이상만 가입 가능합니다.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    // user metadata 업데이트 — 나이 확인을 통과해야만 terms_agreed_at/privacy_agreed_at이
    // 기록되므로, 위 나이 검증을 통과하기 전에는 온보딩(가입 완료)이 끝나지 않는다.
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        birth_date: birthDate,
        terms_agreed_at: now,
        privacy_agreed_at: now,
        age14_confirmed_at: now,
        marketing_opt_in: marketing,
      },
    });

    if (metaError) {
      // DB 레벨 14세 게이트(check constraint)가 막은 경우 안내문 통일
      if (/profiles_birth_date_age_check/i.test(metaError.message ?? "")) {
        setError("본 서비스는 만 14세 이상만 가입 가능합니다.");
      } else {
        setError("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
      setSubmitting(false);
      return;
    }

    // profiles의 name·birth_date 동기화 — 실패를 무시하지 않고 로그를 남긴다.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: name.trim(), birth_date: birthDate })
        .eq("id", user.id);
      if (profileError) {
        console.warn("[onboarding] profiles name/birth_date 업데이트 실패", profileError);
      }
    }

    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
        <PageLoader />
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#E6E1D6",
    color: "#4A3B33",
    border: "1px solid transparent",
  };

  return (
    <div className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#F0EEE9" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            Welcome
          </p>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            가입을 마무리합니다
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
            서비스 이용을 위해 약관 동의와
            <br />
            기본 정보를 확인해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-clarity-mask="True">
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              이름 (닉네임) <span style={{ color: "#A63D2F" }}>*</span>
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

          {/* 생년월일 — PIPA v2.1 만 14세 이상 확인 용도 (이메일 가입과 동일 게이트) */}
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              생년월일 <span style={{ color: "#A63D2F" }}>*</span>
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

          <div className="pt-3 space-y-2" style={{ borderTop: "1px solid #D4CFC1" }}>
            <ConsentRow checked={allChecked} onChange={toggleAll} label="전체 동의" bold />
            <div className="pl-3 space-y-2" style={{ borderLeft: "2px solid #E6E1D6", paddingLeft: "12px" }}>
              <ConsentRow
                checked={terms}
                onChange={() => setTerms(!terms)}
                required
                label={<>이용약관 동의 <Link href="/terms" target="_blank" className="underline" style={{ color: "#0B5563" }}>보기</Link></>}
              />
              <ConsentRow
                checked={privacy}
                onChange={() => setPrivacy(!privacy)}
                required
                label={<>개인정보 수집 및 이용 동의 <Link href="/privacy" target="_blank" className="underline" style={{ color: "#0B5563" }}>보기</Link></>}
              />
              <ConsentRow
                checked={marketing}
                onChange={() => setMarketing(!marketing)}
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
            disabled={submitting || !requiredChecked}
            className="w-full py-3 text-sm tracking-wider transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: submitting || !requiredChecked ? "#5A4A3E" : "#0B5563",
              color: "#F0EEE9",
              cursor: submitting || !requiredChecked ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "처리 중..." : "가입 완료"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConsentRow({
  checked, onChange, label, required, bold,
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
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", fontWeight: bold ? 600 : 400 }}
      >
        {required && <span style={{ color: "#A63D2F", marginRight: "4px" }}>[필수]</span>}
        {label}
      </span>
    </label>
  );
}
