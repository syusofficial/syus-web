import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SyusWriteCta from "@/components/SyusWriteCta";

/** 창작 독백 아카이브 허브 (/syus/flex) — 변형 무대. syus_monologues(공개분). */
const COLOR = "var(--color-syus-stage-flex)";

export const metadata: Metadata = {
  title: "창작 독백 아카이브 · 변형 무대",
  description: "요청할 때마다 새 독백이 지어지는 서고. AI 창작 원본을 운영자 검수를 거쳐 건넵니다. 시우스는 연기 커뮤니티입니다.",
  alternates: { canonical: "https://syus.co.kr/syus/flex" },
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
      <span className="syc-badge">연기 커뮤니티</span>
      <h1 className="syc-title">창작 독백 아카이브</h1>
      <p className="syc-tagline">변형 무대 · 형태가 계속 바뀌는, 끝없이 새로 지어지는 무대</p>
      <p className="syc-lead">원하는 결의 독백을 요청하면, AI가 기존 작품을 베끼지 않은 창작 독백을 지어 전달합니다. 운영자 검수를 거쳐 건네지고, 동의하면 서고에 쌓여 다른 사람도 둘러봅니다.</p>

      <div className="syc-cta-row syc-rule">
        <SyusWriteCta stage="flex" label="독백 요청하기" color="var(--color-syus-stage-flex)" writeHref="/syus/monologues/request" />
        <Link href="/syus/mypage" className="syc-btn-ghost">내 요청 보기</Link>
        {isAdmin && <Link href="/syus/monologues/review" className="syc-btn-ghost">독백 검수{pendingCount > 0 ? ` · ${pendingCount}` : ""}</Link>}
      </div>

      <div className="syc-block">
        <h2 className="syc-h2">서고에 쌓인 독백</h2>
        {items.length > 0 ? (
          <div className="syc-cards">
            {items.map((m) => (
              <Link key={m.id} href={`/syus/monologues/${m.id}`} className="syc-card">
                <span className="syc-card-meta">{[m.char_type, m.emotion, m.tone].filter(Boolean).join(" · ") || "창작 독백"}</span>
                <p className="syc-card-body" style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.generated_text}</p>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="syc-empty">
              <p className="syc-empty-h">아직 공개된 독백이 없어요.</p>
              <p className="syc-empty-b">첫 독백을 요청하면, 검수를 거쳐 이 서고의 문이 열립니다.</p>
            </div>
            <h3 className="syc-h2" style={{ fontSize: "1.05rem", marginTop: "32px", marginBottom: "14px", color: "#6B5C50" }}>이렇게 지어져 쌓일 거예요</h3>
            <article className="syc-card" style={{ opacity: 0.82 }}>
              <span className="syc-card-meta">{SEED_MONO.line} · 예시</span>
              <p className="syc-card-body" style={{ lineHeight: 1.9 }}>{SEED_MONO.body}</p>
            </article>
          </>
        )}
        <p className="syc-note">※ 모든 독백은 AI가 지은 창작 원본입니다. 운영자 검수 뒤 전달되며(컨시어지 방식), 연습·오디션에 자유롭게 쓸 수 있어요.</p>
      </div>

      <nav className="syc-bridge">
        <Link href="/syus" className="syc-bridge-link">← 다른 무대 둘러보기</Link>
        <Link href="/syus/about" className="syc-bridge-link">시우스란 →</Link>
        <Link href="/muol" className="syc-bridge-link is-muted">무대올림으로</Link>
      </nav>
    </main>
  );
}
