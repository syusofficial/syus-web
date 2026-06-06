"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 방문자 트래커 — page_views 테이블에 1방문 1행 insert
 *
 * 설계 메모 (2026-06-06):
 * - 사장님 요청: 관리자 통계 탭에 일일·누적 방문자 노출 ("하루 몇 명 들렀다 갔는가")
 * - 정확도 80% — GA만큼 정밀하진 않지만 실시간성·데이터 소유권 우선
 * - 봇 필터: user-agent 기반 sniff (sites GET을 안 하는 봇은 어차피 트래커도 안 탐)
 * - 운영자 본인 트래픽 분리: profiles.role === 'admin' 이면 is_admin=true
 *   → 관리자 페이지에서 "운영자 제외/포함" 토글로 분리해서 볼 수 있음
 * - 세션 ID: sessionStorage 30분 갱신 (탭 닫으면 사라짐). UU 추정용 보조 키.
 * - 중복 방지: 같은 (session_id, path) 조합은 같은 페이지 새로고침 시 5초 디바운스
 */

const STORAGE_KEY = "syus-pv-session";
const SESSION_TTL_MS = 30 * 60 * 1000;       // 30분
const DEDUPE_WINDOW_MS = 5 * 1000;            // 같은 경로 5초 내 중복 무시
const BOT_REGEX = /bot|crawler|spider|crawling|slurp|baidu|yandex|duckduckgo|googlebot|bingbot|facebookexternalhit|whatsapp|telegrambot|preview/i;

type SessionPayload = { id: string; expiresAt: number };

function getOrCreateSessionId(): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionPayload;
      if (parsed.expiresAt > Date.now()) {
        // TTL 연장
        parsed.expiresAt = Date.now() + SESSION_TTL_MS;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed.id;
      }
    }
  } catch {
    // sessionStorage 사용 불가 환경 (시크릿 일부, 차단 환경) → 1회성 ID
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id, expiresAt: Date.now() + SESSION_TTL_MS } satisfies SessionPayload),
    );
  } catch {
    /* noop */
  }
  return id;
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<{ path: string; ts: number }>({ path: "", ts: 0 });

  useEffect(() => {
    if (!pathname) return;

    // 봇 필터 — 안 보내고 종료
    const ua = navigator.userAgent || "";
    if (BOT_REGEX.test(ua)) return;

    // 같은 경로 5초 디바운스 (React strict mode 이중 mount + fast 새로고침 대응)
    const now = Date.now();
    if (
      lastTrackedRef.current.path === pathname &&
      now - lastTrackedRef.current.ts < DEDUPE_WINDOW_MS
    ) {
      return;
    }
    lastTrackedRef.current = { path: pathname, ts: now };

    const send = async () => {
      const supabase = createClient();

      // 운영자(admin role) 본인 트래픽인지 판별 — 로그인 + admin이면 is_admin=true
      let isAdmin = false;
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();
          isAdmin = profile?.role === "admin";
        }
      } catch {
        // 로그인 안 한 익명 방문 — 정상 흐름
      }

      const referrer = (document.referrer || "").slice(0, 500) || null;
      // 자기 자신에서 자기 자신으로 (내부 이동)은 referrer 없는 것과 동치 처리
      const refIsSelf =
        referrer !== null &&
        typeof window !== "undefined" &&
        referrer.startsWith(window.location.origin);

      await supabase.from("page_views").insert({
        path: pathname.slice(0, 500),
        referrer: refIsSelf ? null : referrer,
        session_id: getOrCreateSessionId(),
        user_agent: ua.slice(0, 300),
        is_admin: isAdmin,
      });
    };

    // 화면 그리기 끝난 뒤에 비동기로 — 페이지 로드 체감속도 보호
    const handle = window.setTimeout(() => {
      send().catch(() => {
        // 추적 실패는 사용자 경험에 영향 주지 않도록 조용히 흘림
      });
    }, 0);

    return () => window.clearTimeout(handle);
  }, [pathname]);

  return null;
}
