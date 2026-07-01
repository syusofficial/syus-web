"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SyusLikeButton from "@/components/SyusLikeButton";
import SyusComments from "@/components/SyusComments";

type Review = { id: string; user_id: string; work_title: string; work_type: string; rating: number; body: string; tags: string[]; image_url: string | null; image_source: string | null; created_at: string };

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }
function Stars({ n }: { n: number }) { return <span className="syc-stars">{"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span></span>; }

export default function ReviewDetail() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [loading, setLoading] = useState(true);
  const [rv, setRv] = useState<Review | null>(null);
  const [author, setAuthor] = useState("익명");
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    setUid(me.user?.id ?? null);
    const { data } = await supabase.from("syus_reviews").select("id, user_id, work_title, work_type, rating, body, tags, image_url, image_source, created_at").eq("id", id).maybeSingle();
    if (data) {
      setRv(data as Review);
      const { data: p } = await supabase.from("profiles").select("name").eq("id", (data as Review).user_id).maybeSingle();
      setAuthor((p?.name as string) || "익명");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const del = async () => {
    if (!rv || !uid || rv.user_id !== uid || busy) return;
    if (!window.confirm("이 후기를 삭제할까요?")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("syus_reviews").delete().eq("id", id).eq("user_id", uid);
    router.push("/syus/blackbox");
  };

  if (loading) return <main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>;
  if (!rv) return <main className="syc-wrap"><p className="syc-loading">후기를 찾을 수 없습니다.</p><Link href="/syus/blackbox" className="syc-back" style={{ marginTop: 16 }}>← 관람의 잔상</Link></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-blackbox)" } as React.CSSProperties}>
      <Link href="/syus/blackbox" className="syc-back">← 관람의 잔상</Link>
      <article className="syc-detail">
        <div className="syc-card-row">
          <span className="syc-tag">{rv.work_type}</span>
          <Stars n={rv.rating} />
        </div>
        <h1 className="syc-detail-title">{rv.work_title}</h1>
        <p className="syc-detail-meta">{author} · {fmt(rv.created_at)}</p>
        {rv.image_url && <img src={rv.image_url} alt={rv.work_title} className="syc-media" />}
        {rv.image_source && <span className="syc-source">출처 · {rv.image_source}</span>}
        <p className="syc-detail-body">{rv.body}</p>
        {rv.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {rv.tags.map((t) => <span key={t} className="syc-tag">#{t}</span>)}
          </div>
        )}
        <div className="syc-detail-foot">
          <SyusLikeButton targetType="review" targetId={rv.id} />
          {uid === rv.user_id && <button type="button" className="syc-comment-del" onClick={del} disabled={busy}>후기 삭제</button>}
        </div>
      </article>
      <SyusComments targetType="review" targetId={rv.id} />
      <nav className="syc-bridge">
        <Link href="/syus/blackbox" className="syc-bridge-link">← 관람의 잔상</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
      </nav>
    </main>
  );
}
