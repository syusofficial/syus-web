import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SyusWriteCta from "@/components/SyusWriteCta";

/**
 * 연기 고민 QnA 허브 (/syus/thrust) — 1차 실기능 vertical slice.
 * /syus/[stage] 공용 템플릿을 thrust에 한해 이 전용 페이지가 대체(정적 세그먼트 우선).
 * 실제 질문을 syus_questions에서 읽어 목록으로. 테이블 미생성/빈 경우 시드 예시로 폴백(그레이스풀).
 * 작성/답변/좋아요는 /syus/qna/* 에서.
 */

const COLOR = "var(--color-syus-stage-thrust)";

export const metadata: Metadata = {
  title: "연기 고민 QnA · 돌출 무대",
  description:
    "연기 고민을 혼자 삼키지 않고 함께 답을 더듬는 자리. 시우스는 연기 커뮤니티입니다.",
  alternates: { canonical: "https://syus.co.kr/syus/thrust" },
};

const SEED_QNAS = [
  { q: "무대에서 대사를 잊을까 봐 불안해서 오히려 더 떨려요.", a: "대사를 ‘암기한 정보’가 아니라 ‘상대에게 건네는 말’로 바꾸면 불안이 줄어요. 상대 배우의 말에 진짜로 반응하려 하면 다음 대사는 상황에서 따라옵니다.", tags: ["심리", "대본"] },
  { q: "발성이 약하다는 피드백을 자주 받아요.", a: "발성은 ‘크게 지르기’가 아니라 ‘몸으로 받치기’예요. 누운 자세로 배가 오르내리는 호흡을 먼저 익히고, 그 호흡 위에 소리를 얹어 보세요.", tags: ["발성", "호흡"] },
  { q: "오디션만 가면 너무 긴장해서 평소 실력이 안 나와요.", a: "심사위원을 평가자가 아니라 ‘내 장면의 상대’로 바꿔 생각하면 시선이 장면 안으로 모입니다. 첫 한 줄에서 ‘하려는 것’ 하나에만 집중하세요.", tags: ["오디션", "심리"] },
];

type QRow = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  syus_answers?: { count: number }[];
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ThrustQnaHub() {
  let questions: QRow[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("syus_questions")
      .select("id, title, body, tags, created_at, syus_answers(count)")
      .order("created_at", { ascending: false })
      .limit(30);
    questions = (data as QRow[] | null) ?? [];
  } catch {
    questions = []; // 테이블 미생성(프로비저닝 전) 등 — 시드로 폴백
  }

  return (
    <main className="syq-wrap">
      <Link href="/syus" className="syq-back">← 여섯 무대로</Link>

      <span className="syc-badge" style={{ color: COLOR }}>지금 열림 · 연기 커뮤니티</span>
      <h1 className="syq-title">연기 고민 QnA</h1>
      <p className="syq-tagline" style={{ color: COLOR }}>돌출 무대 · 객석 속으로 뻗어, 가장 가까이 주고받는 대화</p>
      <p className="syq-lead">
        연기 고민을 혼자 삼키지 않고 꺼내 두면, 먼저 겪은 동료와 운영자가 함께 답을 더듬습니다.
        시우스에서 가장 가까운 코너입니다.
      </p>

      <div className="syq-cta-row">
        <SyusWriteCta stage="thrust" label="질문 올리기" color="var(--color-syus-stage-thrust)" writeHref="/syus/qna/ask" />
      </div>

      {questions.length > 0 ? (
        <section className="syq-block">
          <h2 className="syq-h2">함께 더듬는 고민들</h2>
          <ul className="syq-list">
            {questions.map((q) => (
              <li key={q.id}>
                <Link href={`/syus/qna/${q.id}`} className="syq-item">
                  <span className="syq-item-title">{q.title}</span>
                  <span className="syq-item-body">{q.body}</span>
                  <span className="syq-item-foot">
                    {q.tags?.slice(0, 3).map((t) => (
                      <span key={t} className="syq-tag" style={{ borderColor: COLOR, color: COLOR }}>#{t}</span>
                    ))}
                    <span className="syq-item-meta">
                      답변 {q.syus_answers?.[0]?.count ?? 0} · {fmtDate(q.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="syq-block">
          <div className="syq-empty">
            <p className="syq-empty-h">아직 첫 질문이 없어요.</p>
            <p className="syq-empty-b">가장 먼저 고민을 꺼내 두면, 동료들의 답이 이 자리에 쌓입니다.</p>
          </div>
          <h2 className="syq-h2" style={{ marginTop: "36px" }}>미리 보는 질문의 결</h2>
          <div className="syq-seedlist">
            {SEED_QNAS.map((qa) => (
              <article key={qa.q} className="syq-seed">
                <p className="syq-seed-q"><span style={{ color: COLOR }}>Q.</span> {qa.q}</p>
                <p className="syq-seed-a">{qa.a}</p>
                <div className="syq-seed-tags">
                  {qa.tags.map((t) => (
                    <span key={t} className="syq-tag" style={{ borderColor: COLOR, color: COLOR }}>#{t}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <nav className="syq-bridge">
        <Link href="/syus" className="syq-bridge-link">← 다른 무대 둘러보기</Link>
        <Link href="/syus/about" className="syq-bridge-link">시우스란 →</Link>
        <Link href="/muol" className="syq-bridge-link syq-bridge-muted">무대올림으로</Link>
      </nav>

      <style>{`
        .syq-wrap { max-width: 46rem; margin: 0 auto; padding: clamp(40px, 8vh, 88px) clamp(24px, 6vw, 48px) 120px; }
        .syq-back { display: inline-block; font-family: var(--font-noto-sans-kr); font-size: 0.82rem; letter-spacing: 0.08em; color: #6B5C50; text-decoration: none; margin-bottom: 32px; }
        .syq-back:hover { color: #241C18; }
        .syq-badge { display: inline-block; font-family: var(--font-inter); font-size: 0.66rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600; color: #F4F2ED; padding: 6px 14px; margin-bottom: 20px; }
        .syq-title { font-family: var(--font-noto-serif-kr); font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; letter-spacing: -0.02em; color: #241C18; margin-bottom: 10px; }
        .syq-tagline { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; font-weight: 600; margin-bottom: 24px; word-break: keep-all; }
        .syq-lead { font-family: var(--font-noto-serif-kr); font-size: clamp(1.15rem, 2.4vw, 1.4rem); line-height: 1.7; color: #241C18; word-break: keep-all; margin-bottom: 28px; }
        .syq-cta-row { padding-bottom: 36px; margin-bottom: 36px; border-bottom: 1px solid #E0DBD0; }

        .syq-block { margin-bottom: 40px; }
        .syq-h2 { font-family: var(--font-noto-serif-kr); font-size: 1.35rem; font-weight: 700; color: #241C18; margin-bottom: 18px; }
        .syq-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        .syq-item { display: flex; flex-direction: column; gap: 6px; background: #FFFFFF; border: 1px solid #E4DFD4; border-left: 3px solid var(--color-syus-stage-thrust); padding: 18px 20px; text-decoration: none; transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .syq-item:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(36,28,24,0.08); }
        .syq-item-title { font-family: var(--font-noto-sans-kr); font-size: 1.02rem; font-weight: 700; color: #241C18; word-break: keep-all; }
        .syq-item-body { font-family: var(--font-noto-sans-kr); font-size: 0.9rem; font-weight: 300; color: #6B5C50; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .syq-item-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .syq-item-meta { font-family: var(--font-noto-sans-kr); font-size: 0.75rem; color: #A79E90; margin-left: auto; }
        .syq-tag { font-family: var(--font-noto-sans-kr); font-size: 0.72rem; font-weight: 600; border: 1px solid; border-radius: 100px; padding: 2px 10px; }

        .syq-empty { background: #FFFFFF; border: 1px solid #E4DFD4; padding: 34px 26px; text-align: center; }
        .syq-empty-h { font-family: var(--font-noto-serif-kr); font-size: 1.15rem; font-weight: 700; color: #241C18; margin-bottom: 8px; }
        .syq-empty-b { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; line-height: 1.7; font-weight: 300; color: #6B5C50; word-break: keep-all; }
        .syq-seedlist { display: grid; gap: 12px; }
        .syq-seed { background: #FFFFFF; border: 1px solid #E4DFD4; padding: 18px 20px; }
        .syq-seed-q { font-family: var(--font-noto-sans-kr); font-size: 0.98rem; font-weight: 700; color: #241C18; margin-bottom: 8px; word-break: keep-all; }
        .syq-seed-a { font-family: var(--font-noto-sans-kr); font-size: 0.9rem; line-height: 1.7; font-weight: 300; color: #6B5C50; word-break: keep-all; margin-bottom: 10px; }
        .syq-seed-tags { display: flex; gap: 8px; flex-wrap: wrap; }

        .syq-bridge { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 48px; padding-top: 28px; border-top: 1px solid #E0DBD0; }
        .syq-bridge-link { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; font-weight: 600; color: #241C18; text-decoration: none; border-bottom: 1px solid #241C18; padding-bottom: 3px; }
        .syq-bridge-link.syq-bridge-muted { color: #6B5C50; border-bottom-color: #E0DBD0; font-weight: 500; }
        .syq-bridge-link:hover { opacity: 0.7; }

        @media (prefers-reduced-motion: reduce) { .syq-item { transition: none; } }
      `}</style>
    </main>
  );
}
