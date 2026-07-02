"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 공용 좋아요(찜) 버튼. syus_likes(target_type,target_id) 토글.
 * 비로그인 클릭 → 현재 경로로 복귀하는 로그인으로 유도.
 */
export default function SyusLikeButton({ targetType, targetId }: { targetType: string; targetId: string }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [on, setOn] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      const id = me.user?.id ?? null;
      if (!mounted) return;
      setUid(id);
      const { count: c } = await supabase
        .from("syus_likes")
        .select("id", { count: "exact", head: true })
        .eq("target_type", targetType)
        .eq("target_id", targetId);
      if (mounted) setCount(c ?? 0);
      if (id) {
        const { data: mine } = await supabase
          .from("syus_likes")
          .select("id")
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .eq("user_id", id)
          .maybeSingle();
        if (mounted) setOn(!!mine);
      }
    })();
    return () => { mounted = false; };
  }, [targetType, targetId]);

  const toggle = async () => {
    if (!uid) { window.location.href = `/syus/login?next=${encodeURIComponent(pathname)}`; return; }
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    if (on) {
      await supabase.from("syus_likes").delete().eq("target_type", targetType).eq("target_id", targetId).eq("user_id", uid);
      setOn(false); setCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("syus_likes").insert({ user_id: uid, target_type: targetType, target_id: targetId });
      if (!error) { setOn(true); setCount((c) => c + 1); }
    }
    setBusy(false);
  };

  return (
    <button type="button" className={`syc-like ${on ? "is-on" : ""}`} onClick={toggle} disabled={busy}>
      {on ? "♥" : "♡"} 찜 {count}
    </button>
  );
}
