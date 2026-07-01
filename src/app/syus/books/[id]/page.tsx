"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SyusLikeButton from "@/components/SyusLikeButton";
import SyusComments from "@/components/SyusComments";

type Book = { id: string; user_id: string; title: string; author: string | null; topic: string | null; rating: number | null; note: string | null; cover_url: string | null; created_at: string };

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }
function Stars({ n }: { n: number }) { return <span className="syc-stars">{"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span></span>; }

export default function BookDetail() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<Book | null>(null);
  const [author, setAuthorName] = useState("익명");
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    setUid(me.user?.id ?? null);
    const { data } = await supabase.from("syus_books").select("id, user_id, title, author, topic, rating, note, cover_url, created_at").eq("id", id).maybeSingle();
    if (data) {
      setBook(data as Book);
      const { data: p } = await supabase.from("profiles").select("name").eq("id", (data as Book).user_id).maybeSingle();
      setAuthorName((p?.name as string) || "익명");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const del = async () => {
    if (!book || !uid || book.user_id !== uid || busy) return;
    if (!window.confirm("이 책 후기를 삭제할까요?")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("syus_books").delete().eq("id", id).eq("user_id", uid);
    router.push("/syus/corridor");
  };

  if (loading) return <main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>;
  if (!book) return <main className="syc-wrap"><p className="syc-loading">책을 찾을 수 없습니다.</p><Link href="/syus/corridor" className="syc-back" style={{ marginTop: 16 }}>← 책 서재</Link></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-corridor)" } as React.CSSProperties}>
      <Link href="/syus/corridor" className="syc-back">← 책 서재</Link>
      <article className="syc-detail">
        <div className="syc-card-row">
          {book.topic && <span className="syc-tag">{book.topic}</span>}
          {book.rating ? <Stars n={book.rating} /> : <span />}
        </div>
        <h1 className="syc-detail-title">{book.title}</h1>
        <p className="syc-detail-meta">{book.author ? `${book.author} · ` : ""}등록 {author} · {fmt(book.created_at)}</p>
        {book.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt={book.title} className="syc-media" style={{ maxWidth: "260px" }} />
        )}
        {book.note && <p className="syc-detail-body">{book.note}</p>}
        <div className="syc-detail-foot">
          <SyusLikeButton targetType="book" targetId={book.id} />
          {uid === book.user_id && <button type="button" className="syc-comment-del" onClick={del} disabled={busy}>후기 삭제</button>}
        </div>
      </article>
      <SyusComments targetType="book" targetId={book.id} />
      <nav className="syc-bridge">
        <Link href="/syus/corridor" className="syc-bridge-link">← 책 서재</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
      </nav>
    </main>
  );
}
