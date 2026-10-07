import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SyusWriteCta from "@/components/SyusWriteCta";
import { OG_SYUS } from "@/lib/ogCards";

/** 창작 독백 아카이브 허브 (/syus/flex) — 변형 무대. syus_monologues(공개분). */
const COLOR = "var(--color-syus-stage-flex)";

// 2026-10-07 검색 제목·설명 교체 — 기록팀 표 1안(Content_Report/output/archive/04_검색제목·색인/2026-10-07_책서재·독백모음_검색제목표.md).
// 「변형 무대」는 시우스 안의 이름이라 아무도 검색하지 않는다. 사람들이 치는 말(입시 독백·1분 독백·남자/여자 독백)을 앞에 둔다.
// 설명의 사실은 시드(supabase/syus_monologue_seed_2026-09-09.sql)로 확인: 남·여 배역, 1분판·2분판, 현대극·경상도 말씨 시대극.
// 화면의 h1 「창작 독백 아카이브」는 그대로 둔다. 「생성형 AI가 지은」 = AI 기본법 §31 표시.
const FLEX_TITLE = "입시 독백 모음 — 남자·여자 1분 독백, 2분 독백";
const FLEX_DESC =
  "연기 입시 실기와 오디션 연습에 쓸 수 있는 창작 독백을 모았습니다. 남자·여자 배역, 1분판과 2분판, 현대극과 사투리 시대극. 모두 생성형 AI가 지은 창작 원본이며, 원하는 결을 적으면 새로 지어 드립니다(하루 3건).";

export const metadata: Metadata = {
  title: FLEX_TITLE,
  description: FLEX_DESC,
  alternates: { canonical: "https://syus.co.kr/syus/flex" },
  // Next.js는 openGraph·twitter를 통째로 교체하므로 layout의 siteName·locale·images를 다시 적는다.
  openGraph: {
    title: `${FLEX_TITLE} · 시우스 SYUS`,
    description: FLEX_DESC,
    url: "https://syus.co.kr/syus/flex",
    siteName: "사유유사 SYUS",
    locale: "ko_KR",
    type: "website",
    images: [OG_SYUS],
  },
  twitter: {
    card: "summary_large_image",
    title: `${FLEX_TITLE} · 시우스 SYUS`,
    description: FLEX_DESC,
    images: [OG_SYUS.url],
  },
};

type Row = { id: string; char_type: string | null; emotion: string | null; tone: string | null; generated_text: string | null; created_at: string };

const SEED_MONO = {
  line: "20대 후반 · 체념과 미련 사이 · 오디션용",
  body: "불 꺼진 객석을 보면 아직도 심장이 뛰어. 웃기지. 아무도 없는데. …나는 이 자리가 나를 안 불러줄까 봐 오래 무서웠어. 그런데 오늘 알았어. 무대가 나를 부르는 게 아니라, 내가 계속 여기로 걸어 들어온 거였구나. 그러니까 이건 포기가 아니라… 한 번 더, 제대로 인사하는 거야.",
};

export default async function FlexHub() {
  let items: Row[] = [];
  let isAdmin = false;
  let pendingCount = 0;
  try {
    const supabase = await createClient();
    const { data: me } = await supabase.auth.getUser();
    if (me.user) {
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", me.user.id).maybeSingle();
      isAdmin = prof?.role === "admin";
      if (isAdmin) {
        const { count } = await supabase
          .from("syus_monologues")
          .select("id", { count: "exact", head: true })
          .in("status", ["reviewing", "pending"]);
        pendingCount = count ?? 0;
      }
    }
    const { data } = await supabase
      .from("syus_monologues")
      .select("id, char_type, emotion, tone, generated_text, created_at")
      .eq("is_public", true)
      .not("generated_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);
    items = (data as Row[] | null) ?? [];
  } catch { items = []; }

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>
      <h1 className="syc-title">창작 독백 아카이브</h1>
      <p className="syc-tagline">변형 무대 · 형태가 계속 바뀌는, 끝없이 새로 지어지는 무대</p>
      <p className="syc-lead">원하는 결의 독백을 요청하면, AI가 기존 작품을 베끼지 않은 창작 독백을 요청 즉시 지어 바로 전달합니다. 동의하면 서고에 쌓여 다른 사람도 둘러봅니다.</p>

      <p className="syc-note" style={{ marginTop: 0, marginBottom: 18 }}>
        이 기능은 <strong>생성형 인공지능을 기반으로 제공되는 서비스</strong>입니다. 여기 쌓인 독백은 모두 인공지능이 생성한 결과물이며, 각 독백에 그 표시가 함께 붙습니다.
      </p>

      <div className="syc-cta-row syc-rule">
        <SyusWriteCta stage="flex" label="독백 요청하기" color="var(--color-syus-stage-flex)" writeHref="/syus/monologues/request" />
        <Link href="/syus/mypage" className="syc-btn-ghost">내 요청 보기</Link>
        {isAdmin && <Link href="/syus/monologues/review" className="syc-btn-ghost">독백 관리{pendingCount > 0 ? ` · 예외 ${pendingCount}` : ""}</Link>}
      </div>

      <div className="syc-block">
        <h2 className="syc-h2">서고에 쌓인 독백</h2>
        {items.length > 0 ? (
          <div className="syc-cards">
            {items.map((m) => (
              <Link key={m.id} href={`/syus/monologues/${m.id}`} className="syc-card">
                <span className="syc-card-meta">AI 생성 · {[m.char_type, m.emotion, m.tone].filter(Boolean).join(" · ") || "창작 독백"}</span>
                <p className="syc-card-body" style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.generated_text}</p>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="syc-empty">
              <p className="syc-empty-h">아직 공개된 독백이 없어요.</p>
              <p className="syc-empty-b">첫 독백을 요청하면, AI가 곧바로 지어 이 서고의 문을 엽니다.</p>
            </div>
            <h3 className="syc-h2" style={{ fontSize: "1.05rem", marginTop: "32px", marginBottom: "14px", color: "#5A4A3E" }}>이렇게 지어져 쌓일 거예요</h3>
            <article className="syc-card" style={{ opacity: 0.82 }}>
              <span className="syc-card-meta">{SEED_MONO.line} · 예시</span>
              <p className="syc-card-body" style={{ lineHeight: 1.9 }}>{SEED_MONO.body}</p>
            </article>
          </>
        )}
        <p className="syc-note">※ 모든 독백은 인공지능이 생성한 창작 원본입니다. 요청 즉시 지어져 곧바로 전달되며(하루 3건까지), 연습·오디션에 자유롭게 쓸 수 있어요.</p>
      </div>

      <nav className="syc-bridge">
        <Link href="/syus" className="syc-bridge-link">← 다른 무대 둘러보기</Link>
        <Link href="/syus/about" className="syc-bridge-link">시우스란 →</Link>
        <Link href="/muol" className="syc-bridge-link is-muted">무대올림으로</Link>
      </nav>
    </main>
  );
}
