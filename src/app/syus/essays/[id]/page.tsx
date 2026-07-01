"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SyusLikeButton from "@/components/SyusLikeButton";
import SyusComments from "@/components/SyusComments";

type Essay = { id: string; user_id: string; title: string; excerpt: string | null; body: string; series_no: number | null; created_at: string };
function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }

export default function EssayDetail() {
  const params = useParams();
  const id = String(params.id);
  const [loading, setLoading] = useState(true);
  const [essay, setEssay] = useState<Essay | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("syus_essays").select("id, user_id, title, excerpt, body, series_no, created_at").eq("id", id).maybeSingle();
    setEssay((data as Essay | null) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>;
  if (!essay) return <main className="syc-wrap"><p className="syc-loading">글을 찾을 수 없습니다.</p><Link href="/syus/proscenium" className="syc-back" style={{ marginTop: 16 }}>← 주인장 견해글</Link></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-proscenium)" } as React.CSSProperties}>
      <Link href="/syus/proscenium" className="syc-back">← 주인장 견해글</Link>
      <article className="syc-detail">
        {essay.series_no != null && <span className="syc-card-meta">연기의 냉장고 · {String(essay.series_no).padStart(2, "0")}</span>}
        <h1 className="syc-detail-title">{essay.title}</h1>
        <p className="syc-detail-meta">주인장 · {fmt(essay.created_at)}</p>
        <p className="syc-detail-body" style={{ fontSize: "1.02rem", lineHeight: 1.95 }}>{essay.body}</p>
        <div className="syc-detail-foot">
          <SyusLikeButton targetType="essay" targetId={essay.id} />
        </div>
      </article>
      <SyusComments targetType="essay" targetId={essay.id} />
      <nav className="syc-bridge">
        <Link href="/syus/proscenium" className="syc-bridge-link">← 주인장 견해글</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
      </nav>
    </main>
  );
}
