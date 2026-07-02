"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 공용 신고 버튼. syus_reports 에 접수(운영자만 열람·처리, RLS).
 * 비로그인 → 로그인 유도. 사유는 간단 입력(prompt).
 */
export default function SyusReportButton({ targetType, targetId }: { targetType: string; targetId: string }) {
  const pathname = usePathname();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const report = async () => {
    if (busy) return;
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) {
      window.location.href = `/syus/login?next=${encodeURIComponent(pathname)}`;
      return;
    }
    const reason = window.prompt("신고 사유를 적어 주세요. (예: 부적절한 내용 / 저작권 / 스팸 / 명예훼손)");
    if (!reason || !reason.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("syus_reports")
      .insert({ user_id: me.user.id, target_type: targetType, target_id: targetId, reason: reason.trim().slice(0, 1000) });
    setBusy(false);
    if (!error) setDone(true);
  };

  if (done) return <span className="syc-report-done">신고가 접수되었습니다</span>;
  return (
    <button type="button" className="syc-report" onClick={report} disabled={busy}>
      신고
    </button>
  );
}
