"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 자동 로그아웃 정책
 * - Absolute timeout: 12시간 (로그인 시점부터)
 * - Idle timeout: 3시간 (마지막 활동부터)
 * - 만료 5분 전 토스트 경고 + (idle 한정) 활동 연장 버튼
 */

const STORAGE = {
  loginAt: "syus-session-login-at",
  lastActivity: "syus-session-last-activity",
} as const;

const ABSOLUTE_MS = 12 * 60 * 60 * 1000; // 12시간
const IDLE_MS = 3 * 60 * 60 * 1000;       // 3시간
const WARNING_MS = 5 * 60 * 1000;          // 5분 전 경고
const CHECK_INTERVAL_MS = 30 * 1000;       // 30초마다 체크
const ACTIVITY_THROTTLE_MS = 30 * 1000;    // 활동 갱신 throttle

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

type WarningState = { message: string; canExtend: boolean } | null;

export default function SessionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const [warning, setWarning] = useState<WarningState>(null);
  const lastActivityUpdateRef = useRef(0);

  // 사용자 활동 감지 → last_activity 갱신 (throttled)
  useEffect(() => {
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdateRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityUpdateRef.current = now;
      // 로그인 상태에서만 갱신 (loginAt이 있을 때)
      if (localStorage.getItem(STORAGE.loginAt)) {
        localStorage.setItem(STORAGE.lastActivity, now.toString());
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, []);

  // 로그인 / 로그아웃 이벤트 감지
  useEffect(() => {
    const supabase = createClient();

    // 초기 상태 — 이미 로그인되어 있는데 키가 없으면 지금 시점으로 셋업
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !localStorage.getItem(STORAGE.loginAt)) {
        const now = Date.now().toString();
        localStorage.setItem(STORAGE.loginAt, now);
        localStorage.setItem(STORAGE.lastActivity, now);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const now = Date.now().toString();
        localStorage.setItem(STORAGE.loginAt, now);
        localStorage.setItem(STORAGE.lastActivity, now);
        setWarning(null);
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem(STORAGE.loginAt);
        localStorage.removeItem(STORAGE.lastActivity);
        setWarning(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 만료 체크 (30초마다)
  useEffect(() => {
    const autoLogout = async (reason: "absolute" | "idle") => {
      const supabase = createClient();
      await supabase.auth.signOut();
      localStorage.removeItem(STORAGE.loginAt);
      localStorage.removeItem(STORAGE.lastActivity);
      setWarning(null);
      router.push(`/auth/login?reason=${reason}`);
      router.refresh();
    };

    const check = async () => {
      const loginAtStr = localStorage.getItem(STORAGE.loginAt);
      const lastActivityStr = localStorage.getItem(STORAGE.lastActivity);
      if (!loginAtStr || !lastActivityStr) {
        setWarning(null);
        return;
      }

      const loginAt = parseInt(loginAtStr, 10);
      const lastActivity = parseInt(lastActivityStr, 10);
      const now = Date.now();

      const absoluteRemaining = ABSOLUTE_MS - (now - loginAt);
      const idleRemaining = IDLE_MS - (now - lastActivity);

      // 만료 처리 (절대 만료 우선)
      if (absoluteRemaining <= 0) {
        await autoLogout("absolute");
        return;
      }
      if (idleRemaining <= 0) {
        await autoLogout("idle");
        return;
      }

      // 5분 전 경고 — 더 임박한 쪽을 표시
      if (absoluteRemaining <= WARNING_MS && absoluteRemaining <= idleRemaining) {
        const min = Math.max(1, Math.ceil(absoluteRemaining / 60000));
        setWarning({
          message: `보안상 12시간 한도로 ${min}분 후 자동 로그아웃됩니다.`,
          canExtend: false, // 절대 만료는 연장 불가
        });
      } else if (idleRemaining <= WARNING_MS) {
        const min = Math.max(1, Math.ceil(idleRemaining / 60000));
        setWarning({
          message: `비활성 시간이 길어 ${min}분 후 자동 로그아웃됩니다.`,
          canExtend: true,
        });
      } else {
        setWarning(null);
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router]);

  // 인증 페이지에서는 토스트 안 보여줌
  if (pathname?.startsWith("/auth/") || !warning) return null;

  const extend = () => {
    localStorage.setItem(STORAGE.lastActivity, Date.now().toString());
    setWarning(null);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[60] max-w-sm p-5 shadow-lg"
      style={{
        backgroundColor: "#6D3115",
        color: "#F4EDE3",
        fontFamily: "var(--font-noto-sans-kr)",
      }}
      role="alert"
    >
      <p className="text-sm leading-relaxed mb-3">{warning.message}</p>
      <div className="flex gap-2">
        {warning.canExtend && (
          <button
            type="button"
            onClick={extend}
            className="px-3 py-1.5 text-xs tracking-wide transition-opacity"
            style={{
              backgroundColor: "#F4EDE3",
              color: "#6D3115",
              fontFamily: "var(--font-noto-sans-kr)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            계속 사용하기
          </button>
        )}
        <button
          type="button"
          onClick={() => setWarning(null)}
          className="px-3 py-1.5 text-xs tracking-wide transition-colors"
          style={{
            backgroundColor: "transparent",
            color: "#F4EDE3",
            border: "1px solid #F4EDE3",
            fontFamily: "var(--font-noto-sans-kr)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
