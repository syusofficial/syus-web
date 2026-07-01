import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SyusWriteCta from "@/components/SyusWriteCta";

/** 자유 커뮤니티 허브 (/syus/arena) — 원형 무대. syus_posts. */
const COLOR = "var(--color-syus-stage-arena)";
const CATS = ["잡담", "소식", "모집", "연습후기", "질문"];

export const metadata: Metadata = {
  title: "자유 커뮤니티 · 원형 무대",
  description: "연기에 관한 이야기라면 무엇이든 자유롭게 오가는 광장. 시우스는 연기 커뮤니티입니다.",
  alternates: { canonical: "https://syus.co.kr/syus/arena" },
};

type Row = { id: string; category: string; title: string; body: string; created_at: string };

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }

export default async function ArenaHub({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  let posts: Row[] = [];
  try {
    const supabase = await createClient();
    let q = supabase.from("syus_posts").select("id, category, title, body, created_at").order("created_at", { ascending: false }).limit(40);
    if (cat && CATS.includes(cat)) q = q.eq("category", cat);
    const { data } = await q;
    posts = (data as Row[] | null) ?? [];
  } catch { posts = []; }

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>
      <span className="syc-badge">지금 열림 · 연기 커뮤니티</span>
      <h1 className="syc-title">자유 커뮤니티</h1>
      <p className="syc-tagline">원형 무대 · 사방이 객석인, 중심 없이 둘러앉은 광장</p>
      <p className="syc-lead">연기에 관한 이야기라면 무엇이든 자유롭게 오갑니다. 잡담도, 소식도, 함께할 사람을 찾는 일도 여기서.</p>

      <div className="syc-cta-row syc-rule">
        <SyusWriteCta stage="arena" label="글 올리기" color="var(--color-syus-stage-arena)" writeHref="/syus/community/write" />
      </div>

      <div className="syc-block">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
          <Link href="/syus/arena" className={`syc-chip ${!cat ? "is-on" : ""}`}>전체</Link>
          {CATS.map((c) => (
            <Link key={c} href={`/syus/arena?cat=${encodeURIComponent(c)}`} className={`syc-chip ${cat === c ? "is-on" : ""}`}>{c}</Link>
          ))}
        </div>

        {posts.length > 0 ? (
          <ul className="syc-list">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/syus/community/${p.id}`} className="syc-item">
                  <span className="syc-item-title">{p.title}</span>
                  <span className="syc-item-body">{p.body}</span>
                  <span className="syc-item-foot">
                    <span className="syc-tag">{p.category}</span>
                    <span className="syc-item-meta">{fmt(p.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="syc-empty">
            <p className="syc-empty-h">아직 글이 없어요{cat ? ` (${cat})` : ""}.</p>
            <p className="syc-empty-b">가장 먼저 이야기를 꺼내 두면, 둘러앉은 자리가 채워집니다.</p>
          </div>
        )}
      </div>

      <nav className="syc-bridge">
        <Link href="/syus" className="syc-bridge-link">← 다른 무대 둘러보기</Link>
        <Link href="/syus/about" className="syc-bridge-link">시우스란 →</Link>
        <Link href="/muol" className="syc-bridge-link is-muted">무대올림으로</Link>
      </nav>
    </main>
  );
}
