"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 실시간 동시접속 카드 — /admin → 통계 탭 상단
 *
 * 설계 메모 (2026-06-06):
 * - Supabase Realtime Presence 채널 "syus-presence" 의 현재 상태를 구독
 * - 5초 디바운스: presence sync 이벤트가 빈번하므로 setState를 묶어서 호출
 * - 운영자 본인 제외 토글: metadata.is_admin === true 인 항목 제외 가능
 * - 사장님 보호: 0명이어도 자연스럽게 노출 (가짜 숫자 금지)
 * - Mineral Stage 팔레트 (#0B5563 / #E6E1D6) 준수
 */

const PRESENCE_CHANNEL = "syus-presence";
const SYNC_DEBOUNCE_MS = 5000;

// presenceState 의 제네릭 제약: `{ [key: string]: any }` 호환 필요
// → index signature 포함된 형태로 선언
type PresenceMeta = {
  [key: string]: unknown;
  session_id?: string;
  is_admin?: boolean;
  joined_at?: number;
};

export default function LivePresenceCard() {
  const [totalCount, setTotalCount] = useState<number>(0);
  const [adminCount, setAdminCount] = useState<number>(0);
  const [excludeAdmin, setExcludeAdmin] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);

  const debounceTimerRef = useRef<number | null>(null);
  const latestStateRef = useRef<{ total: number; admin: number }>({ total: 0, admin: 0 });

  useEffect(() => {
    // Realtime 연결 실패가 통계 탭을 죽이지 않도록 전체 useEffect를 try-catch로 격리
    let cleanup: (() => void) | null = null;
    try {
      const supabase = createClient();
      const channel = supabase.channel(PRESENCE_CHANNEL);

      const computeAndSchedule = () => {
        try {
          const state = channel.presenceState<PresenceMeta>();
          const keys = Object.keys(state);
          let admins = 0;
          for (const key of keys) {
            const metas = state[key];
            if (Array.isArray(metas) && metas.some((m) => m?.is_admin === true)) admins += 1;
          }
          latestStateRef.current = { total: keys.length, admin: admins };

          if (debounceTimerRef.current !== null) return;
          debounceTimerRef.current = window.setTimeout(() => {
            setTotalCount(latestStateRef.current.total);
            setAdminCount(latestStateRef.current.admin);
            debounceTimerRef.current = null;
          }, SYNC_DEBOUNCE_MS);
        } catch {
          /* presence 처리 실패 — 카드는 0명으로 노출 */
        }
      };

      channel
        .on("presence", { event: "sync" }, computeAndSchedule)
        .on("presence", { event: "join" }, computeAndSchedule)
        .on("presence", { event: "leave" }, computeAndSchedule)
        .subscribe((status) => {
          try {
            setConnected(status === "SUBSCRIBED");
            if (status === "SUBSCRIBED") {
              const initial = channel.presenceState<PresenceMeta>();
              const keys = Object.keys(initial);
              let admins = 0;
              for (const key of keys) {
                const metas = initial[key];
                if (Array.isArray(metas) && metas.some((m) => m?.is_admin === true)) admins += 1;
              }
              setTotalCount(keys.length);
              setAdminCount(admins);
            }
          } catch {
            /* subscribe callback 실패 무시 */
          }
        });

      cleanup = () => {
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }
        try {
          supabase.removeChannel(channel).catch(() => {});
        } catch {
          /* 정리 실패 무시 */
        }
      };
    } catch {
      /* Realtime 초기화 실패 — 카드는 0명·연결 안 됨 상태로 노출 */
    }

    return () => {
      cleanup?.();
    };
  }, []);

  const visibleCount = excludeAdmin ? Math.max(totalCount - adminCount, 0) : totalCount;

  return (
    <section>
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <p
          className="text-xs tracking-[0.3em] uppercase"
          style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}
        >
          지금 보고 있는 사람
        </p>
        <label
          className="flex items-center gap-2 text-xs cursor-pointer select-none"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}
        >
          <input
            type="checkbox"
            checked={excludeAdmin}
            onChange={(e) => setExcludeAdmin(e.target.checked)}
            style={{ accentColor: "#0B5563" }}
          />
          운영자 본인 제외 ({adminCount}명)
        </label>
      </div>

      <div
        className="p-6 flex items-center justify-between gap-4 flex-wrap"
        style={{ backgroundColor: "#0B5563", color: "#F0EEE9" }}
      >
        <div className="flex items-baseline gap-3">
          {/* 라이브 표시 점 — 연결 시 깜빡임 */}
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: connected ? "#C9E265" : "#6B5C50",
              boxShadow: connected ? "0 0 0 4px rgba(201,226,101,0.18)" : "none",
              animation: connected ? "syus-pulse 1.6s ease-in-out infinite" : "none",
            }}
            aria-hidden
          />
          <p
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {visibleCount.toLocaleString("ko-KR")}
            <span className="text-sm ml-2" style={{ opacity: 0.8, fontWeight: 300 }}>
              명
            </span>
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-xs tracking-wide"
            style={{ fontFamily: "var(--font-noto-sans-kr)", opacity: 0.85 }}
          >
            {connected ? "실시간 연결" : "연결 중…"}
          </p>
          <p
            className="text-[10px] mt-1"
            style={{ fontFamily: "var(--font-inter)", opacity: 0.65 }}
          >
            5초 디바운스 · Supabase Realtime
          </p>
        </div>
      </div>

      {/* 라이브 도트 펄스 — 컴포넌트 내부에서만 사용 */}
      <style jsx>{`
        @keyframes syus-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </section>
  );
}
