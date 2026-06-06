"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 실시간 동시접속 — Supabase Realtime Presence 헤드리스 컴포넌트
 *
 * 설계 메모 (2026-06-06):
 * - 사장님 요청: "지금 보고 있는 사람" 카드를 /admin → 통계 탭에 노출
 * - 사이트의 모든 페이지(루트 layout)에 마운트되어 채널 "syus-presence"에 join
 * - 운영자(admin role)는 metadata에 is_admin=true 로 표시 →
 *   LivePresenceCard 에서 운영자 본인 제외 토글 가능
 * - 세션 단위 추정 (PageViewTracker와 동일한 sessionStorage 키 재사용)
 *   → 같은 사람이 여러 탭을 띄워도 1명으로 카운트
 * - 무료 플랜 한도: 200 동시 연결 — 사이트 트래픽 충분히 커버
 * - 추적 실패는 사용자 경험에 영향 주지 않도록 조용히 흘림
 */

const STORAGE_KEY = "syus-pv-session";
const PRESENCE_CHANNEL = "syus-presence";

function readSessionId(): string {
  // PageViewTracker가 이미 만들어놓은 sessionId 재사용
  // 없으면 즉석 생성 (presence 전용)
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string };
      if (parsed?.id) return parsed.id;
    }
  } catch {
    /* sessionStorage 차단 환경 */
  }
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function RealtimePresence() {
  useEffect(() => {
    const supabase = createClient();
    const sessionId = readSessionId();

    let cleanup: (() => void) | null = null;

    (async () => {
      // 운영자 본인 트래픽 분리용 메타데이터
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
        /* 익명 방문 — 정상 */
      }

      // presence 채널 join — key는 세션 단위로 고유
      const channel = supabase.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: sessionId } },
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel
            .track({
              session_id: sessionId,
              is_admin: isAdmin,
              joined_at: Date.now(),
            })
            .catch(() => {
              /* 추적 실패 무시 */
            });
        }
      });

      cleanup = () => {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel).catch(() => {});
      };
    })().catch(() => {
      /* 초기화 실패 무시 — 사이트 동작에는 영향 없음 */
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
