import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SyusWriteCta from "@/components/SyusWriteCta";

/** 책 서재 허브 (/syus/corridor) — 사잇 무대. syus_books. */
const COLOR = "var(--color-syus-stage-corridor)";

export const metadata: Metadata = {
  title: "책 서재 · 사잇 무대",
  description: "연기와 무대 곁에 둘 책을 함께 모으는 서가. 시우스는 연기 커뮤니티입니다.",
  alternates: { canonical: "https://syus.co.kr/syus/corridor" },
};

type Row = { id: string; title: string; author: string | null; topic: string | null; rating: number | null; note: string | null; created_at: string };

function Stars({ n }: { n: number }) {
  return <span className="syc-stars">{"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span></span>;
}

const SEED_BOOKS = [
  { title: "배우 수업", author: "콘스탄틴 스타니슬랍스키", topic: "이론", stars: 5, note: "‘만약에’ 하나로 장면이 어떻게 살아나는지. 처음 한 권으로 자주 권해지는 고전." },
  { title: "빈 공간", author: "피터 브룩", topic: "연출", stars: 5, note: "아무것도 없는 공간이 어떻게 무대가 되는가. 블랙박스를 사랑하게 되는 책." },
  { title: "배우와 표적", author: "디클런 도넬란", topic: "신체", stars: 4, note: "‘느끼려 하지 말고 보라’. 긴장으로 굳은 몸에 길을 터주는 문장들." },
];

export default async function CorridorHub() {
  let books: Row[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("syus_books").select("id, title, author, topic, rating, note, created_at").order("created_at", { ascending: false }).limit(40);
    books = (data as Row[] | null) ?? [];
  } catch { books = []; }

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>
      <h1 className="syc-title">책 서재</h1>
      <p className="syc-tagline">사잇 무대 · 관문이자 문지방, 지식으로 들어가는 아치</p>
      <p className="syc-lead">연기와 무대 곁에 둘 책을 함께 모읍니다. 한 사람의 추천이 다른 사람의 다음 한 권이 되는, 천천히 자라는 서가입니다.</p>

      <div className="syc-cta-row syc-rule">
        <SyusWriteCta stage="corridor" label="책 등록하기" color="var(--color-syus-stage-corridor)" writeHref="/syus/books/new" />
      </div>

      <div className="syc-block">
        <h2 className="syc-h2">서가에 놓인 책</h2>
        {books.length > 0 ? (
          <div className="syc-cards">
            {books.map((b) => (
              <Link key={b.id} href={`/syus/books/${b.id}`} className="syc-card">
                <div className="syc-card-row">
                  {b.topic && <span className="syc-tag">{b.topic}</span>}
                  {b.rating ? <Stars n={b.rating} /> : <span />}
                </div>
                <h3 className="syc-card-title">{b.title}</h3>
                {b.author && <span className="syc-card-meta" style={{ color: "#6B5C50" }}>{b.author}</span>}
                {b.note && <p className="syc-card-body">{b.note}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="syc-empty">
              <p className="syc-empty-h">아직 서가가 비어 있어요.</p>
              <p className="syc-empty-b">곁에 두고 싶은 첫 책을 올려, 서가의 문을 열어 주세요.</p>
            </div>
            <h3 className="syc-h2" style={{ fontSize: "1.05rem", marginTop: "32px", marginBottom: "14px", color: "#6B5C50" }}>이런 책들이 놓일 거예요</h3>
            <div className="syc-cards">
              {SEED_BOOKS.map((b) => (
                <article key={b.title} className="syc-card" style={{ opacity: 0.74 }}>
                  <div className="syc-card-row"><span className="syc-tag">{b.topic}</span><Stars n={b.stars} /></div>
                  <h3 className="syc-card-title">{b.title}</h3>
                  <span className="syc-card-meta" style={{ color: "#6B5C50" }}>{b.author}</span>
                  <p className="syc-card-body">{b.note}</p>
                </article>
              ))}
            </div>
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
