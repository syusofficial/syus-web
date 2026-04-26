"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "kakao";

export default function SocialLoginButtons({ mode = "login" }: { mode?: "login" | "signup" }) {
  const [loading, setLoading] = useState<Provider | null>(null);

  const handleSocial = async (provider: Provider) => {
    setLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      alert(`${provider} 로그인 중 오류가 발생했습니다.`);
      setLoading(null);
    }
    // 성공 시 외부로 리다이렉트되므로 setLoading 호출 없음
  };

  const verb = mode === "signup" ? "가입" : "로그인";

  return (
    <div className="space-y-2.5">
      {/* Google — 공식 디자인 가이드 준수 (흰 배경, 다색 G 로고) */}
      <button
        type="button"
        onClick={() => handleSocial("google")}
        disabled={loading !== null}
        className="w-full py-3 px-4 flex items-center justify-center gap-3 transition-colors"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          backgroundColor: "#FFFFFF",
          color: "#1F1F1F",
          border: "1px solid #DADCE0",
          fontSize: "0.875rem",
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#F8F9FA"; }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#FFFFFF"; }}
      >
        <GoogleIcon />
        {loading === "google" ? "이동 중..." : `Google로 ${verb}`}
      </button>

      {/* Kakao — 공식 디자인 가이드 준수 (#FEE500 노란 배경, 검정 말풍선 로고) */}
      <button
        type="button"
        onClick={() => handleSocial("kakao")}
        disabled={loading !== null}
        className="w-full py-3 px-4 flex items-center justify-center gap-3 transition-colors"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          backgroundColor: "#FEE500",
          color: "rgba(0, 0, 0, 0.85)",
          border: "1px solid #FEE500",
          fontSize: "0.875rem",
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.92"; }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = "1"; }}
      >
        <KakaoIcon />
        {loading === "kakao" ? "이동 중..." : `카카오로 ${verb}`}
      </button>
    </div>
  );
}

/** 구분선: ─── 또는 ─── */
export function SocialDivider({ label = "또는" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ backgroundColor: "#D4CFC9" }} />
      <span
        className="text-xs tracking-wider"
        style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "#D4CFC9" }} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3C6.48 3 2 6.48 2 10.8c0 2.81 1.88 5.27 4.71 6.65l-.86 3.16c-.08.3.26.55.51.36l3.79-2.5c.6.08 1.21.13 1.85.13 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"
        fill="#000000"
      />
    </svg>
  );
}
