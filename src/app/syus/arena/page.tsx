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

const SEED_POSTS = [
  { cat: "모집", title: "이번 주말 대본 리딩 같이 하실 분 (2명)", body: "졸업 작품 준비 중인데, 리딩 호흡을 맞춰볼 동료를 찾습니다. 부담 없이 오세요." },
  { cat: "잡담", title: "막이 내린 밤은 왜 이렇게 허전할까요", body: "분장을 지우는 그 순간의 기분, 다들 어떻게 보내시나요." },
  { cat: "소식", title: "지역 소극장 무료 워크숍 정보 공유", body: "다음 달 발성·움직임 워크숍이 열린대요. 관심 있으면 같이 신청해요." },
];

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
      <span className="syc-badge">연기 커뮤니티</span>
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
          <>
            <div className="syc-empty">
              <p className="syc-empty-h">아직 글이 없어요{cat ? ` (${cat})` : ""}.</p>
              <p className="syc-empty-b">가장 먼저 이야기를 꺼내 두면, 둘러앉은 자리가 채워집니다.</p>
            </div>
            <h3 className="syc-h2" style={{ fontSize: "1.05rem", marginTop: "32px", marginBottom: "14px", color: "#6B5C50" }}>이런 이야기들이 오갈 거예요</h3>
            <ul className="syc-list">
              {SEED_POSTS.map((p) => (
                <li key={p.title} className="syc-item" style={{ opacity: 0.72, cursor: "default" }}>
                  <span className="syc-item-title">{p.title}</span>
                  <span className="syc-item-body">{p.body}</span>
                  <span className="syc-item-foot"><span className="syc-tag">{p.cat}</span><span className="syc-item-meta">예시</span></span>
                </li>
              ))}
            </ul>
          </>
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
