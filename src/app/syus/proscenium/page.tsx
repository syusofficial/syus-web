import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EssayAskForm from "@/components/EssayAskForm";

/** 주인장 견해글 허브 (/syus/proscenium) — 프로시니엄. syus_essays(운영자 발행) + 질문받기. */
const COLOR = "var(--color-syus-stage-proscenium)";

export const metadata: Metadata = {
  title: "주인장 견해글 · 프로시니엄 무대",
  description: "운영자가 연기를 오래 들여다본 글 '연기의 냉장고'. 시우스는 연기 커뮤니티입니다.",
  alternates: { canonical: "https://syus.co.kr/syus/proscenium" },
};

type Row = { id: string; title: string; excerpt: string | null; series_no: number | null; created_at: string };
function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }

export default async function ProsceniumHub() {
  let essays: Row[] = [];
  let isAdmin = false;
  try {
    const supabase = await createClient();
    const { data: me } = await supabase.auth.getUser();
    if (me.user) {
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", me.user.id).maybeSingle();
      isAdmin = prof?.role === "admin";
    }
    const { data } = await supabase.from("syus_essays").select("id, title, excerpt, series_no, created_at").eq("published", true).order("created_at", { ascending: false }).limit(40);
    essays = (data as Row[] | null) ?? [];
  } catch { essays = []; }

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>
      <span className="syc-badge">연기 커뮤니티</span>
      <h1 className="syc-title">주인장 견해글</h1>
      <p className="syc-tagline">프로시니엄 무대 · 액자 너머, 정면으로 마주하는 정제된 시선</p>
      <p className="syc-lead">운영자가 연기를 오래 들여다본 글을 한 편씩 액자에 걸듯 내겁니다. ‘연기의 냉장고’ — 차곡차곡 재워둔 관찰입니다.</p>

      {isAdmin && (
        <div className="syc-cta-row syc-rule">
          <Link href="/syus/essays/new" className="syc-btn">새 견해글 쓰기</Link>
        </div>
      )}

      <div className="syc-block" style={{ marginTop: isAdmin ? 0 : "12px" }}>
        <h2 className="syc-h2">걸린 글</h2>
        {essays.length > 0 ? (
          <div className="syc-cards">
            {essays.map((e) => (
              <Link key={e.id} href={`/syus/essays/${e.id}`} className="syc-card">
                {e.series_no != null && <span className="syc-card-meta">연기의 냉장고 · {String(e.series_no).padStart(2, "0")}</span>}
                <h3 className="syc-card-title">{e.title}</h3>
                {e.excerpt && <p className="syc-card-body">{e.excerpt}</p>}
                <span className="syc-item-meta" style={{ display: "block", marginTop: 8 }}>{fmt(e.created_at)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="syc-empty">
            <p className="syc-empty-h">아직 걸린 글이 없어요.</p>
            <p className="syc-empty-b">운영자의 첫 견해글이 곧 이 액자에 걸립니다.</p>
          </div>
        )}
      </div>

      <div className="syc-block">
        <h2 className="syc-h2">질문 받기</h2>
        <p className="syc-lead" style={{ fontSize: "1rem", marginBottom: 16 }}>궁금한 연기 이야기를 남겨두면, 운영자가 골라 다음 글로 답합니다.</p>
        <EssayAskForm />
      </div>

      <nav className="syc-bridge">
        <Link href="/syus" className="syc-bridge-link">← 다른 무대 둘러보기</Link>
        <Link href="/syus/about" className="syc-bridge-link">시우스란 →</Link>
        <Link href="/muol" className="syc-bridge-link is-muted">무대올림으로</Link>
      </nav>
    </main>
  );
}
