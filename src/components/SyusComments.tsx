"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SyusLoginPrompt from "@/components/SyusLoginPrompt";

/**
 * 시우스 공용 댓글. syus_comments(target_type,target_id). 읽기 공개 / 쓰기 로그인·본인 삭제.
 * 비로그인 제출 → 로그인 안내 팝업(SyusLoginPrompt).
 */
type Comment = { id: string; user_id: string; body: string; created_at: string };

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function SyusComments({ targetType, targetId }: { targetType: string; targetId: string }) {
  const pathname = usePathname();
  const [items, setItems] = useState<Comment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [uid, setUid] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    setUid(me.user?.id ?? null);
    const { data } = await supabase
      .from("syus_comments")
      .select("id, user_id, body, created_at")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .order("created_at", { ascending: true });
    const list = (data as Comment[] | null) ?? [];
    setItems(list);
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; name: string | null }) => { map[p.id] = p.name || "익명"; });
      setNames(map);
    }
  }, [targetType, targetId]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) { setAsk(true); return; }
    if (body.trim().length < 1 || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("syus_comments").insert({ user_id: uid, target_type: targetType, target_id: targetId, body: body.trim() });
    if (!error) { setBody(""); await load(); }
    setBusy(false);
  };

  const del = async (id: string) => {
    if (!uid || busy) return;
    setBusy(true);
    const supabase = createClient();
    // 2026-08-03 — 삭제 실패(RLS 거부·네트워크)를 알리지 않고 넘어가던 문제 수정
    const { error } = await supabase.from("syus_comments").delete().eq("id", id).eq("user_id", uid);
    if (error) alert("댓글을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
    await load();
    setBusy(false);
  };

  return (
    <div className="syc-comments">
      <h2 className="syc-h2">댓글 {items.length}</h2>
      {items.length > 0 && (
        <ul className="syc-clist">
          {items.map((c) => (
            <li key={c.id} className="syc-comment">
              <p className="syc-comment-body">{c.body}</p>
              <div className="syc-comment-foot">
                <span className="syc-comment-meta">{names[c.user_id] ?? "익명"} · {fmt(c.created_at)}</span>
                {uid === c.user_id && (
                  <button type="button" className="syc-comment-del" onClick={() => del(c.id)} disabled={busy}>삭제</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="syc-form">
        <textarea
          className="syc-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="생각을 덧대 주세요."
        />
        <button type="submit" className="syc-btn" style={{ justifySelf: "start" }} disabled={uid ? busy || body.trim().length < 1 : false}>
          {busy ? "남기는 중…" : "댓글 남기기"}
        </button>
      </form>
      <SyusLoginPrompt open={ask} onClose={() => setAsk(false)} next={pathname || "/syus"} />
    </div>
  );
}
