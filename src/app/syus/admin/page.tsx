"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 전용 관리자 페이지 (/syus/admin) — 무대올림 /admin 과 별개.
 * 운영자(profiles.role='admin')만. 실제 권한은 RLS로 보장(클라 게이트는 UI용).
 * - 신고 큐: 신고된 콘텐츠 확인 → 삭제(콘텐츠+신고 처리) / 처리완료(신고만 종료)
 * - 질문받기 인박스: 사용자가 견해글에 남긴 질문(읽기)
 * - 독백 검수 바로가기(대기 수)
 * - 섹션별 누적 통계
 */

type Report = { id: string; user_id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };
// 통합 질문 인박스 항목 — 견해글 질문받기(essay) + 연기 고민 QnA(question)
type QItem = { id: string; source: "essay" | "question"; label: string; color: string; text: string; user_id: string; created_at: string; href?: string };

const TEAL = "#0B5563";

const TARGET: Record<string, { table: string; label: string; href?: (id: string) => string }> = {
  question:  { table: "syus_questions",  label: "QnA 질문",  href: (id) => `/syus/qna/${id}` },
  answer:    { table: "syus_answers",    label: "QnA 답변" },
  essay:     { table: "syus_essays",     label: "견해글",    href: (id) => `/syus/essays/${id}` },
  post:      { table: "syus_posts",      label: "자유 글",   href: (id) => `/syus/community/${id}` },
  review:    { table: "syus_reviews",    label: "관람 후기", href: (id) => `/syus/reviews/${id}` },
  monologue: { table: "syus_monologues", label: "창작 독백", href: (id) => `/syus/monologues/${id}` },
  book:      { table: "syus_books",      label: "책 후기",   href: (id) => `/syus/books/${id}` },
  comment:   { table: "syus_comments",   label: "댓글" },
};

const STATS: { t: string; label: string; color: string }[] = [
  { t: "syus_essays",     label: "견해글",     color: "var(--color-syus-stage-proscenium)" },
  { t: "syus_questions",  label: "QnA 질문",   color: "var(--color-syus-stage-thrust)" },
  { t: "syus_posts",      label: "자유 글",    color: "var(--color-syus-stage-arena)" },
  { t: "syus_reviews",    label: "관람 후기",  color: "var(--color-syus-stage-blackbox)" },
  { t: "syus_monologues", label: "창작 독백",  color: "var(--color-syus-stage-flex)" },
  { t: "syus_books",      label: "책 후기",    color: "var(--color-syus-stage-corridor)" },
  { t: "syus_comments",   label: "댓글",       color: "#6B5C50" },
];

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

export default function SyusAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [reports, setReports] = useState<Report[]>([]);
  const [questions, setQuestions] = useState<QItem[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [monoPending, setMonoPending] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) { setState("denied"); return; }
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", me.user.id).maybeSingle();
    if (prof?.role !== "admin") { setState("denied"); return; }

    const { data: rep } = await supabase.from("syus_reports").select("*").eq("status", "open").order("created_at", { ascending: false });
    const reportList = ((rep ?? []) as unknown) as Report[];
    setReports(reportList);

    // 통합 질문 인박스: 견해글 질문받기 + 연기 고민 QnA
    const { data: ask } = await supabase.from("syus_essay_asks").select("id, user_id, body, created_at").order("created_at", { ascending: false }).limit(50);
    const { data: qna } = await supabase.from("syus_questions").select("id, user_id, title, created_at").order("created_at", { ascending: false }).limit(50);
    const askRows = ((ask ?? []) as unknown) as { id: string; user_id: string; body: string; created_at: string }[];
    const qnaRows = ((qna ?? []) as unknown) as { id: string; user_id: string; title: string; created_at: string }[];
    const qItems: QItem[] = [
      ...askRows.map((a) => ({ id: a.id, source: "essay" as const, label: "주인장 견해글", color: "var(--color-syus-stage-proscenium)", text: a.body, user_id: a.user_id, created_at: a.created_at })),
      ...qnaRows.map((q) => ({ id: q.id, source: "question" as const, label: "연기 고민 QnA", color: "var(--color-syus-stage-thrust)", text: q.title, user_id: q.user_id, created_at: q.created_at, href: `/syus/qna/${q.id}` })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setQuestions(qItems);

    const ids = Array.from(new Set([...reportList.map((r) => r.user_id), ...qItems.map((q) => q.user_id)]));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; name: string | null }) => { map[p.id] = p.name || "익명"; });
      setNames(map);
    }

    const { count: mc } = await supabase.from("syus_monologues").select("id", { count: "exact", head: true }).in("status", ["reviewing", "pending"]);
    setMonoPending(mc ?? 0);

    const c: Record<string, number> = {};
    await Promise.all(STATS.map(async (s) => {
      try { const { count } = await supabase.from(s.t).select("id", { count: "exact", head: true }); c[s.t] = count ?? 0; } catch { c[s.t] = 0; }
    }));
    setCounts(c);
    setState("ready");
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolveReport = async (r: Report) => {
    if (busy) return;
    setBusy(r.id); setMsg("");
    const supabase = createClient();
    const { error } = await supabase.from("syus_reports").update({ status: "resolved" }).eq("id", r.id);
    if (error) { setMsg("처리에 실패했어요."); setBusy(null); return; }
    setReports((p) => p.filter((x) => x.id !== r.id)); setBusy(null);
  };

  const deleteContent = async (r: Report) => {
    const meta = TARGET[r.target_type];
    if (!meta || busy) return;
    if (!window.confirm(`${meta.label} 콘텐츠를 삭제하고 관련 신고를 처리할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(r.id); setMsg("");
    const supabase = createClient();
    const { error: delErr } = await supabase.from(meta.table).delete().eq("id", r.target_id);
    if (delErr) { setMsg("콘텐츠 삭제에 실패했어요(권한 또는 이미 삭제됨)."); setBusy(null); return; }
    // 같은 대상에 걸린 신고 일괄 처리
    await supabase.from("syus_reports").update({ status: "resolved" }).eq("target_id", r.target_id);
    setReports((p) => p.filter((x) => x.target_id !== r.target_id)); setBusy(null);
  };

  const deleteQuestion = async (q: QItem) => {
    if (busy) return;
    if (!window.confirm(`이 질문(${q.label})을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(`${q.source}:${q.id}`); setMsg("");
    const supabase = createClient();
    const table = q.source === "essay" ? "syus_essay_asks" : "syus_questions";
    const { error } = await supabase.from(table).delete().eq("id", q.id);
    if (error) { setMsg("질문 삭제에 실패했어요(권한 또는 이미 삭제됨)."); setBusy(null); return; }
    setQuestions((p) => p.filter((x) => !(x.id === q.id && x.source === q.source))); setBusy(null);
  };

  if (state === "loading") return <main className="syc-wrap" style={{ ["--c" as string]: TEAL } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;
  if (state === "denied") return (
    <main className="syc-wrap" style={{ ["--c" as string]: TEAL } as React.CSSProperties}>
      <p className="syc-loading">운영자만 볼 수 있는 페이지입니다.</p>
      <button type="button" className="syc-back" style={{ marginTop: 16 }} onClick={() => router.push("/syus")}>← 여섯 무대로</button>
    </main>
  );

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: TEAL } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>
      <span className="syc-badge">시우스 운영</span>
      <h1 className="syc-title">시우스 관리</h1>
      <p className="syc-tagline">신고를 살피고, 남겨진 질문을 보고, 독백을 검수합니다.</p>
      {msg && <p className="syc-error">{msg}</p>}

      {/* 바로가기 + 통계 */}
      <div className="syc-block">
        <div className="sya-links">
          <Link href="/syus/monologues/review" className="syc-btn-ghost">독백 검수{monoPending > 0 ? ` · ${monoPending}` : ""}</Link>
          <Link href="/syus/essays/new" className="syc-btn-ghost">견해글 쓰기</Link>
          <Link href="/admin" className="syc-btn-ghost">무대올림 관리</Link>
        </div>
        <div className="sya-stats">
          {STATS.map((s) => (
            <div key={s.t} className="sya-stat" style={{ ["--c" as string]: s.color } as React.CSSProperties}>
              <span className="sya-stat-n">{counts[s.t] ?? "–"}</span>
              <span className="sya-stat-l">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 신고 큐 */}
      <div className="syc-block">
        <h2 className="syc-h2">신고 · {reports.length}건</h2>
        {reports.length === 0 ? (
          <div className="syc-empty"><p className="syc-empty-h">처리할 신고가 없어요.</p></div>
        ) : (
          <div className="syc-cards">
            {reports.map((r) => {
              const meta = TARGET[r.target_type];
              return (
                <article key={r.id} className="syc-card" style={{ cursor: "default" }}>
                  <span className="syc-card-meta">{meta?.label ?? r.target_type} · 신고 {names[r.user_id] ?? "익명"} · {fmt(r.created_at)}</span>
                  <p className="syc-detail-body" style={{ margin: "6px 0 12px" }}>사유: {r.reason}</p>
                  <div className="syc-actions" style={{ flexWrap: "wrap" }}>
                    {meta?.href && <Link href={meta.href(r.target_id)} className="syc-btn-ghost" target="_blank">내용 보기 ↗</Link>}
                    <button type="button" className="syc-comment-del" disabled={busy === r.id} onClick={() => deleteContent(r)}>콘텐츠 삭제</button>
                    <button type="button" className="syc-cancel" disabled={busy === r.id} onClick={() => resolveReport(r)} style={{ cursor: "pointer" }}>처리완료(유지)</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 질문 인박스 — 섹션 출처 표시 + 삭제 */}
      <div className="syc-block">
        <h2 className="syc-h2">질문 · {questions.length}</h2>
        {questions.length === 0 ? (
          <div className="syc-empty"><p className="syc-empty-h">아직 들어온 질문이 없어요.</p></div>
        ) : (
          <ul className="syc-list">
            {questions.map((q) => (
              <li key={`${q.source}:${q.id}`} className="syc-comment">
                <span className="sya-qsrc" style={{ color: q.color }}>{q.label}</span>
                <p className="syc-comment-body" style={{ margin: "6px 0 10px" }}>{q.text}</p>
                <div className="syc-comment-foot">
                  <span className="syc-comment-meta">{names[q.user_id] ?? "익명"} · {fmt(q.created_at)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {q.href && <Link href={q.href} className="syc-comment-meta" style={{ color: "#0B5563" }} target="_blank">보기 ↗</Link>}
                    <button type="button" className="syc-comment-del" disabled={busy === `${q.source}:${q.id}`} onClick={() => deleteQuestion(q)}>삭제</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav className="syc-bridge">
        <Link href="/syus" className="syc-bridge-link">← 여섯 무대로</Link>
        <Link href="/syus/mypage" className="syc-bridge-link is-muted">내 시우스</Link>
      </nav>

      <style>{`
        .sya-links { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 22px; }
        .sya-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; }
        .sya-stat { display: flex; flex-direction: column; gap: 3px; background: #FFFFFF; border: 1px solid #E4DFD4; border-left: 3px solid var(--c, #0B5563); padding: 12px 14px; }
        .sya-stat-n { font-family: var(--font-noto-serif-kr); font-size: 1.4rem; font-weight: 700; color: #241C18; }
        .sya-stat-l { font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #6B5C50; }
        .sya-qsrc { display: inline-block; font-family: var(--font-noto-sans-kr); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; }
      `}</style>
    </main>
  );
}
