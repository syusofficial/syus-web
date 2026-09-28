"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import SyusMonologueView, { MONOLOGUE_IN_PROGRESS, type SyusMonologue } from "@/components/SyusMonologueView";

/**
 * 요청자 본인이 "생성 중" 독백을 보고 있을 때만 쓰는 자동 갱신 껍데기 — 2026-09-28 분리 (제작팀).
 *
 * 서버 페이지가 첫 화면(initial)을 그려서 넘겨주고, 이 컴포넌트는 상태가 pending/reviewing인 동안만
 * 몇 초마다 조용히 다시 읽는다. delivered·rejected로 바뀌면 폴링을 멈춘다(불필요한 요청 방지).
 * 예전 "use client" 페이지의 폴링 동작(2026-07-29 도입)을 그대로 옮긴 것이다.
 */

// 백그라운드 자동 재조회 간격(ms). 5~10초 사이.
const POLL_INTERVAL_MS = 7000;

export default function SyusMonologueLive({ initial, isOwner }: { initial: SyusMonologue; isOwner: boolean }) {
  const [m, setM] = useState<SyusMonologue>(initial);

  const reload = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("syus_monologues").select("*").eq("id", initial.id).maybeSingle();
    if (data) setM(data as SyusMonologue);
  }, [initial.id]);

  const status = m.status;
  useEffect(() => {
    if (!MONOLOGUE_IN_PROGRESS.has(status)) return;
    const timer = setInterval(() => { reload(); }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status, reload]);

  return <SyusMonologueView m={m} isOwner={isOwner} />;
}
