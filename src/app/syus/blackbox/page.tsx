import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SyusWriteCta from "@/components/SyusWriteCta";

/** 관람의 잔상 허브 (/syus/blackbox) — 블랙박스. syus_reviews. */
const COLOR = "var(--color-syus-stage-blackbox)";

export const metadata: Metadata = {
  title: "관람의 잔상 · 블랙박스",
  description: "공연·영화·드라마를 본 뒤 남은 잔상을 나누는 자리. 시우스는 연기 커뮤니티입니다.",
  alternates: { canonical: "https://syus.co.kr/syus/blackbox" },
};

type Row = { id: string; work_title: string; work_type: string; rating: number; body: string; created_at: string };
function Stars({ n }: { n: number }) { return <span className="syc-stars">{"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span></span>; }

const SEED_REVIEWS = [
  { work: "연극 「갈매기」", type: "공연", stars: 5, excerpt: "니나가 마지막에 웃으며 나가던 뒷모습이 며칠째 남는다. 무너지지 않으려 애쓰는 사람의 등이 그렇게 크게 보일 줄이야." },
  { work: "영화 「버드맨」", type: "영화", stars: 4, excerpt: "배우가 배우를 연기하는 층이 겹칠수록, 무대 뒤의 불안이 더 진짜처럼 다가왔다." },
  { work: "드라마 「나의 아저씨」", type: "드라마", stars: 5, excerpt: "대사보다 말줄임에 더 많은 게 담겨 있었다. 참는 연기가 어디까지 갈 수 있는지." },
];

export default async function BlackboxHub() {
  let reviews: Row[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("syus_reviews").select("id, work_title, work_type, rating, body, created_at").order("created_at", { ascending: false }).limit(40);
    reviews = (data as Row[] | null) ?? [];
  } catch { reviews = []; }

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>
      <span className="syc-badge">연기 커뮤니티</span>
      <h1 className="syc-title">관람의 잔상</h1>
      <p className="syc-tagline">블랙박스 · 암전 뒤에 남는 인상, 무엇이든 될 수 있는 빈 상자</p>
      <p className="syc-lead">공연·영화·드라마를 보고 남은 잔상을 서로 나눕니다. 같은 작품의 다른 잔상이 포개질 때, 혼자 본 것보다 오래 남습니다.</p>

      <div className="syc-cta-row syc-rule">
        <SyusWriteCta stage="blackbox" label="후기 남기기" color="var(--color-syus-stage-blackbox)" writeHref="/syus/reviews/new" />
      </div>

      <div className="syc-block">
        <h2 className="syc-h2">남겨진 잔상</h2>
        {reviews.length > 0 ? (
          <div className="syc-cards">
            {reviews.map((r) => (
              <Link key={r.id} href={`/syus/reviews/${r.id}`} className="syc-card">
                <div className="syc-card-row">
                  <span className="syc-tag">{r.work_type}</span>
                  <Stars n={r.rating} />
                </div>
                <h3 className="syc-card-title">{r.work_title}</h3>
                <p className="syc-card-body" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.body}</p>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="syc-empty">
              <p className="syc-empty-h">아직 남겨진 잔상이 없어요.</p>
              <p className="syc-empty-b">가장 먼저 본 작품의 잔상을 적어, 이 빈 상자를 채워 주세요.</p>
            </div>
            <h3 className="syc-h2" style={{ fontSize: "1.05rem", marginTop: "32px", marginBottom: "14px", color: "#6B5C50" }}>이런 잔상들이 쌓일 거예요</h3>
            <div className="syc-cards">
              {SEED_REVIEWS.map((r) => (
                <article key={r.work} className="syc-card" style={{ opacity: 0.74 }}>
                  <div className="syc-card-row"><span className="syc-tag">{r.type}</span><Stars n={r.stars} /></div>
                  <h3 className="syc-card-title">{r.work}</h3>
                  <p className="syc-card-body">{r.excerpt}</p>
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
