"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safeNext";

type Provider = "google" | "kakao";
const PROVIDER_LABEL: Record<Provider, string> = { google: "구글", kakao: "카카오" };

/**
 * 앱 안 브라우저(인스타·페이스북·카카오톡·네이버 앱 등) 알아보기 — 2026-10-29
 *
 * 구글은 앱 안 브라우저에서의 로그인을 막는다(「403 disallowed_useragent」 화면).
 * 지금 사람이 들어오는 주된 길이 인스타 링크라, 구글 버튼을 누른 학생이 그 오류 화면에서 떠날 수 있었다.
 * 카카오 로그인·이메일 로그인은 앱 안에서도 되므로 그대로 두고, 구글만 바깥 브라우저로 넘긴다.
 * - 카카오톡: 카카오톡이 제공하는 「바깥 브라우저로 열기」 주소로 바로 넘긴다
 * - 안드로이드: intent 주소로 크롬에서 연다
 * - 아이폰: 앱이 바깥으로 넘겨주는 길을 막아 두어, 메뉴에서 여는 방법을 안내한다
 */
type InApp = "kakaotalk" | "android" | "ios" | null;
const IN_APP_UA = /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|NAVER\(inapp|Line\/|DaumApps|everytimeApp|; wv\)/i;

function detectInApp(): InApp {
  const ua = navigator.userAgent;
  if (!IN_APP_UA.test(ua)) return null;
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";
  if (/Android/i.test(ua)) return "android";
  return "ios";
}
const noSubscribe = () => () => {};

export default function SocialLoginButtons({ mode = "login", next }: { mode?: "login" | "signup"; next?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  // 서버에서 그릴 땐 알 수 없으므로 null(일반 브라우저처럼) → 화면이 뜬 뒤 실제 값
  const inApp = useSyncExternalStore(noSubscribe, detectInApp, () => null);

  // 카카오·구글로 갔다가 뒤로 가기로 돌아오면 브라우저가 이전 화면을 그대로 복원해
  // 버튼이 「이동 중...」으로 묶여 있었다 — 복원될 때 풀어 준다
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) setLoading(null); };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const openInBrowser = () => {
    const here = window.location.href;
    if (inApp === "kakaotalk") {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(here)}`;
    } else if (inApp === "android") {
      const { host, pathname, search } = window.location;
      window.location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
      setShowGuide(true);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setShowGuide(true);
    }
  };

  const handleSocial = async (provider: Provider) => {
    if (provider === "google" && inApp) {
      openInBrowser();
      return;
    }
    setLoading(provider);
    const supabase = createClient();
    // 로그인 후 복귀 목적지를 콜백으로 전달(내부 경로만). /auth/callback 이 next로 최종 리다이렉트.
    const safeNext = next ? safeNextPath(next, "") : "";
    const callbackUrl = `${window.location.origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      alert(`${PROVIDER_LABEL[provider]} 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`);
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

      {inApp && (
        <div className="p-3 space-y-2 text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", backgroundColor: "#E6E1D6" }}>
          <p>
            앱 안에서 여신 화면이라 구글 {verb}은 브라우저로 옮겨서 진행됩니다.
            카카오와 이메일은 여기서 바로 하실 수 있습니다.
          </p>
          {showGuide && (
            <>
              <p style={{ color: "#0B5563", fontWeight: 600 }}>
                화면 위나 아래의 ⋯ 메뉴에서 「외부 브라우저에서 열기」(또는 Safari로 열기)를 누른 뒤, 구글 버튼을 다시 눌러주세요.
              </p>
              <button
                type="button"
                onClick={copyAddress}
                className="underline"
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#0B5563" }}
              >
                {copied ? "주소를 복사했습니다 — 브라우저 주소창에 붙여 넣어주세요" : "이 페이지 주소 복사하기"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 구분선: ─── 또는 ─── */
export function SocialDivider({ label = "또는" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ backgroundColor: "#D4CFC1" }} />
      <span
        className="text-xs tracking-wider"
        style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "#D4CFC1" }} />
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
