"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/recentViews";
import { createClient } from "@/lib/supabase/client";

const VIEW_THROTTLE_MS = 60 * 60 * 1000; // 같은 공연 1시간 내 1회만 카운트

export default function ShowViewTracker({ showId }: { showId: string }) {
  useEffect(() => {
    // 1) 로컬 최근 본 공연 기록
    recordView(showId);

    // 2) 서버 조회수 증가 (1시간 throttle, localStorage로 관리)
    const key = `syus-view-counted-${showId}`;
    const last = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (last && Date.now() - parseInt(last, 10) < VIEW_THROTTLE_MS) {
      return; // 1시간 내 중복 호출 방지
    }

    const supabase = createClient();
    supabase.rpc("increment_show_view", { p_show_id: showId }).then(({ error }) => {
      if (!error) {
        localStorage.setItem(key, Date.now().toString());
      }
    });
  }, [showId]);

  return null;
}
