"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SyusLikeButton from "@/components/SyusLikeButton";
import SyusComments from "@/components/SyusComments";

type Post = { id: string; user_id: string; category: string; title: string; body: string; created_at: string };

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }

export default function CommunityDetail() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState("익명");
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    setUid(me.user?.id ?? null);
    const { data } = await supabase.from("syus_posts").select("id, user_id, category, title, body, created_at").eq("id", id).maybeSingle();
    if (data) {
      setPost(data as Post);
      const { data: p } = await supabase.from("profiles").select("name").eq("id", (data as Post).user_id).maybeSingle();
      setAuthor((p?.name as string) || "익명");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const del = async () => {
    if (!post || !uid || post.user_id !== uid || busy) return;
    if (!window.confirm("이 글을 삭제할까요?")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("syus_posts").delete().eq("id", id).eq("user_id", uid);
    router.push("/syus/arena");
  };

  if (loading) return <main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>;
  if (!post) return <main className="syc-wrap"><p className="syc-loading">글을 찾을 수 없습니다.</p><Link href="/syus/arena" className="syc-back" style={{ marginTop: 16 }}>← 자유 커뮤니티</Link></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-arena)" } as React.CSSProperties}>
      <Link href="/syus/arena" className="syc-back">← 자유 커뮤니티</Link>
      <article className="syc-detail">
        <span className="syc-tag" style={{ marginBottom: 10, display: "inline-block" }}>{post.category}</span>
        <h1 className="syc-detail-title">{post.title}</h1>
        <p className="syc-detail-meta">{author} · {fmt(post.created_at)}</p>
        <p className="syc-detail-body">{post.body}</p>
        <div className="syc-detail-foot">
          <SyusLikeButton targetType="post" targetId={post.id} />
          {uid === post.user_id && <button type="button" className="syc-comment-del" onClick={del} disabled={busy}>글 삭제</button>}
        </div>
      </article>
      <SyusComments targetType="post" targetId={post.id} />
      <nav className="syc-bridge">
        <Link href="/syus/arena" className="syc-bridge-link">← 자유 커뮤니티</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
      </nav>
    </main>
  );
}
