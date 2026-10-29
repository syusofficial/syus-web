"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginHref, requiresLogin } from "@/lib/safeNext";

/**
 * 자동 로그아웃 정책
 * - Absolute timeout: 12시간 (로그인 시점부터)
 * - Idle timeout: 3시간 (마지막 활동부터)
 * - 만료 5분 전 토스트 경고 + (idle 한정) 활동 연장 버튼
 *
 * 2026-10-29 정정 — 되돌리지 말 것:
 * - 만료되면 「이 기기」에서만 로그아웃한다(scope: local). 이전엔 기본값(global)이라 PC에 켜 둔 탭 하나가
 *   만료되면 폰까지 함께 로그아웃됐다.
 * - 로그인 화면으로 보내는 건 로그인이 필요한 화면(마이페이지·관리·글쓰기)에서만. 공연 페이지처럼
 *   비로그인으로도 보는 화면은 그대로 두고 안내만 띄운다. 이전엔 3시간 넘게 지나 인스타 링크로 공연을 열면
 *   열자마자 로그인 화면으로 끌려가 내용을 못 봤다.
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

/** loggedOut: 이미 자동 로그아웃된 뒤의 안내 — 로그아웃 이벤트·주기 점검이 지우지 않고, 사용자가 닫는다 */
type WarningState = { message: string; canExtend: boolean; loggedOut?: boolean } | null;

const AUTO_LOGOUT_REASON_KEY = "syus-auto-logout-reason";

/**
 * 로그인 화면이 「왜 로그아웃됐는지」 보여주도록 남긴 사유를 읽고 지운다.
 * 주소(?reason=)에만 실으면, 마이페이지처럼 스스로 로그인 화면으로 보내는 화면이 먼저 이동시켜 사유가 사라졌다.
 */
export function takeAutoLogoutReason(): "absolute" | "idle" | null {
  try {
    const reason = sessionStorage.getItem(AUTO_LOGOUT_REASON_KEY);
    sessionStorage.removeItem(AUTO_LOGOUT_REASON_KEY);
    return reason === "absolute" || reason === "idle" ? reason : null;
  } catch {
    return null;
  }
}

const LOGGED_OUT_MESSAGE: Record<"absolute" | "idle", string> = {
  absolute: "보안상 12시간 한도가 지나 로그아웃되었습니다. 보던 화면은 그대로 보실 수 있습니다.",
  idle: "3시간 동안 활동이 없어 로그아웃되었습니다. 보던 화면은 그대로 보실 수 있습니다.",
};

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
        setWarning((w) => (w?.loggedOut ? w : null));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 만료 체크 (30초마다)
  useEffect(() => {
    const autoLogout = async (reason: "absolute" | "idle") => {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      localStorage.removeItem(STORAGE.loginAt);
      localStorage.removeItem(STORAGE.lastActivity);
      const here = window.location.pathname;
      if (requiresLogin(here)) {
        setWarning(null);
        try { sessionStorage.setItem(AUTO_LOGOUT_REASON_KEY, reason); } catch {}
        const login = loginHref(here + window.location.search);
        router.push(`${login}${login.includes("?") ? "&" : "?"}reason=${reason}`);
      } else {
        setWarning({ message: LOGGED_OUT_MESSAGE[reason], canExtend: false, loggedOut: true });
        router.refresh();
      }
    };

    const check = async () => {
      const loginAtStr = localStorage.getItem(STORAGE.loginAt);
      const lastActivityStr = localStorage.getItem(STORAGE.lastActivity);
      if (!loginAtStr || !lastActivityStr) {
        setWarning((w) => (w?.loggedOut ? w : null));
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
        backgroundColor: "#0B5563",
        color: "#F0EEE9",
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
              backgroundColor: "#F0EEE9",
              color: "#0B5563",
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
            color: "#F0EEE9",
            border: "1px solid #F0EEE9",
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
