"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MONOLOGUE_DAILY_CAP, summarizeMonologues, nearCapUsers } from "@/lib/syusMonologueStats";

/**
 * 독백 관리 (/syus/monologues/review) — 운영자(profiles.role='admin')만 접근. URL은 예전 그대로 둔다.
 *
 * 왜 바꿨나(2026-09-28): 2026-07-29부터 신규 요청은 생성 성공 즉시 /api/syus/monologue/generate 안에서
 * delivered로 전달된다. 예전 이 화면은 pending·reviewing만 보여 줘서 늘 비어 있었고, 운영자가
 * 이미 전달된 독백을 보거나 내리거나 고칠 길이 없었다. 이제 전달된 것까지 전부 보고 손볼 수 있다.
 *
 * 예외 처리 흐름은 예전과 같다:
 * - reviewing: 변경 전에 검수 대기로 쌓여 있던 과거 건 → 승인(delivered, 동의 시 공개) / 반려(rejected)
 * - pending  : 생성이 안 됐거나 실패한 요청 → '생성 실행'으로 파이프라인 재호출
 *
 * 지켜야 할 선:
 * - 공개(is_public=true)는 요청자가 공개에 동의(allow_public)한 경우에만 켠다. 동의 규칙이라 운영자도 우회하지 않는다.
 * - "인공지능(AI) 생성물" 표시는 독백 상세(SyusMonologueView)·서고 카드가 늘 붙인다. 본문을 고쳐도 표시는 그대로 남는다
 *   (AI 기본법 §31). 이 화면에서도 AI 생성물임을 적어 둔다.
 * - RLS상 syus_monologues update·delete는 운영자 전용(syus_is_admin)이라 admin 세션의 브라우저 요청이 통과한다.
 *   변경 결과는 .select()로 돌려받아, 정책에 막혀 0건이 바뀐 경우도 실패로 알린다(조용한 실패 방지).
 */

type Mono = {
  id: string; user_id: string; char_type: string | null; emotion: string | null;
  length_spec: string | null; tone: string | null; purpose: string | null;
  gender: string | null; age_range: string | null; generated_text: string | null;
  status: string; allow_public: boolean; is_public: boolean; created_at: string; updated_at: string | null;
};

type Tab = "exceptions" | "delivered" | "rejected" | "all";
type Person = { name: string; isAdmin: boolean };
type Note = { text: string; err: boolean };

const COLS = "id, user_id, char_type, emotion, length_spec, tone, purpose, gender, age_range, generated_text, status, allow_public, is_public, created_at, updated_at";
const COLOR = "var(--color-syus-stage-flex)";
const STATUS_LABEL: Record<string, string> = { pending: "생성 대기", reviewing: "생성 중 · 과거 검수 대기", delivered: "전달 완료", rejected: "반려" };
const TABS: { key: Tab; label: string }[] = [
  { key: "exceptions", label: "예외 처리" },
  { key: "delivered", label: "전달 완료" },
  { key: "rejected", label: "반려" },
  { key: "all", label: "전체" },
];
const EXCERPT = 160;

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function inTab(m: Mono, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "exceptions") return m.status === "pending" || m.status === "reviewing";
  return m.status === tab;
}

export default function MonologueManage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [rows, setRows] = useState<Mono[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [tab, setTab] = useState<Tab>("delivered");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const note = (id: string, text: string, err = false) => setNotes((p) => ({ ...p, [id]: { text, err } }));

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) { setState("denied"); return; }
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", me.user.id).maybeSingle();
    if (prof?.role !== "admin") { setState("denied"); return; }

    const { data, error } = await supabase.from("syus_monologues").select(COLS).order("created_at", { ascending: false }).limit(1000);
    if (error) setMsg("독백 목록을 불러오지 못했어요. 새로고침해 주세요.");
    const list = ((data ?? []) as unknown) as Mono[];
    setRows(list);

    const ids = Array.from(new Set(list.map((m) => m.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name, role").in("id", ids);
      const map: Record<string, Person> = {};
      (profs ?? []).forEach((p: { id: string; name: string | null; role: string | null }) => { map[p.id] = { name: p.name || "익명", isAdmin: p.role === "admin" }; });
      setPeople(map);
    }
    // 손볼 예외 건이 있으면 그 탭부터 연다. 없으면 가장 자주 보는 '전달 완료'.
    setTab(list.some((m) => m.status === "pending" || m.status === "reviewing") ? "exceptions" : "delivered");
    setState("ready");
  }, []);

  useEffect(() => { load(); }, [load]);

  /** 한 건만 다시 읽어 목록에 반영 — 생성 라우트처럼 서버가 바꾼 값을 화면에 맞출 때 */
  const reloadOne = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("syus_monologues").select(COLS).eq("id", id).maybeSingle();
    if (data) setRows((p) => p.map((r) => (r.id === id ? ((data as unknown) as Mono) : r)));
  };

  /** update 공용 — 바뀐 행을 돌려받아 0건(권한에 막힘·이미 삭제됨)도 실패로 본다 */
  const patch = async (m: Mono, values: Partial<Mono>, okText: string, failText: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.from("syus_monologues").update(values).eq("id", m.id).select(COLS);
    if (error || !data || data.length === 0) { note(m.id, failText, true); return false; }
    const next = (data[0] as unknown) as Mono;
    setRows((p) => p.map((r) => (r.id === m.id ? next : r)));
    note(m.id, okText);
    return true;
  };

  const run = async (m: Mono, fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(m.id); setMsg("");
    try { await fn(); } finally { setBusy(null); }
  };

  // 과거 검수 대기(reviewing) 승인 — 예전 흐름 그대로: 전달 + 요청자가 동의했으면 공개
  const approve = (m: Mono) => run(m, () => patch(m, { status: "delivered", is_public: m.allow_public },
    m.allow_public ? "전달하고 서고에 공개했습니다." : "전달했습니다(요청자가 비공개를 원해 서고에는 올리지 않았습니다).",
    "승인 처리에 실패했어요. 권한/네트워크를 확인해 주세요."));

  const makePublic = (m: Mono) => {
    // 동의 규칙 — 버튼이 막혀 있어도 한 번 더 확인한다
    if (!m.allow_public) { note(m.id, "요청자가 공개에 동의하지 않았습니다.", true); return; }
    return run(m, () => patch(m, { is_public: true }, "서고에 공개했습니다.", "공개 전환에 실패했어요."));
  };

  const makePrivate = (m: Mono) => run(m, () => patch(m, { is_public: false }, "비공개로 돌렸습니다. 요청자만 볼 수 있어요.", "비공개 전환에 실패했어요."));

  // 반려(과거 검수·생성 대기) / 전달 회수(이미 전달된 건) — 둘 다 rejected + 서고에서 내림
  const reject = (m: Mono) => {
    const text = m.status === "delivered"
      ? "이 독백의 전달을 회수할까요?\n요청자 화면은 '반려됨'으로 바뀌고 본문이 가려지며, 서고에서도 내려갑니다."
      : "이 독백을 반려할까요? (요청자에게는 전달되지 않습니다)";
    if (busy || !window.confirm(text)) return;
    return run(m, () => patch(m, { status: "rejected", is_public: false },
      m.status === "delivered" ? "전달을 회수했습니다." : "반려했습니다.", "반려 처리에 실패했어요."));
  };

  // 반려를 잘못 눌렀을 때 되돌리는 길 — 공개는 따로 켜도록 비공개로만 되돌린다
  const restore = (m: Mono) => {
    if (busy || !window.confirm("이 독백을 요청자에게 다시 전달할까요?\n서고 공개는 되돌린 뒤 따로 켜야 합니다.")) return;
    return run(m, () => patch(m, { status: "delivered", is_public: false }, "다시 전달했습니다(비공개).", "전달 복원에 실패했어요."));
  };

  const saveEdit = (m: Mono) => {
    const text = (drafts[m.id] ?? "").trim();
    if (!text) { note(m.id, "본문이 비어 있으면 저장할 수 없어요.", true); return; }
    return run(m, async () => {
      const ok = await patch(m, { generated_text: text }, "본문을 고쳤습니다. 요청자에게도 고친 본문이 보입니다.", "본문 저장에 실패했어요.");
      if (ok) setDrafts((p) => { const n = { ...p }; delete n[m.id]; return n; });
    });
  };

  /**
   * 다시 생성 / 생성 실행 — 예전 화면과 같은 생성 라우트를 부른다.
   * 라우트는 원래 '생성 대기 건'용으로 짜여 있어서, 이미 전달·반려된 건에 쓰면 두 가지가 어긋난다. 그래서 여기서 바로잡는다.
   *  ① 실패하면 status를 pending으로 되돌린다 → 요청자 화면이 "생성 대기"로 바뀌므로 원래 상태로 복구(본문은 라우트가 안 건드림).
   *  ② 성공하면 공개 여부를 요청자 동의값으로 다시 맞춘다 → 운영자가 내려 둔 건이 되살아나지 않게 비공개였으면 비공개로 둔다.
   */
  const regenerate = (m: Mono) => {
    if (busy) return;
    const settled = m.status === "delivered" || m.status === "rejected";
    if (m.generated_text) {
      const text = m.status === "rejected"
        ? "새 독백을 지어 요청자에게 다시 전달할까요?\n지금 본문은 새 본문으로 바뀌고 되돌릴 수 없습니다. (서고 공개는 꺼 둔 채로 둡니다)"
        : "새 독백을 다시 지을까요?\n요청자가 받은 지금 본문이 새 본문으로 바뀌고, 되돌릴 수 없습니다.";
      if (!window.confirm(text)) return;
    }
    const prior = { status: m.status, is_public: m.is_public };
    return run(m, async () => {
      note(m.id, "짓는 중입니다. 30초쯤 걸릴 수 있어요.");
      let ok = false; let errText = "";
      try {
        const resp = await fetch("/api/syus/monologue/generate", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: m.id }),
        });
        const j = await resp.json().catch(() => ({}));
        ok = resp.ok;
        if (!ok) errText = j.error || "생성에 실패했어요.";
      } catch { errText = "생성 호출에 실패했어요."; }

      const supabase = createClient();
      if (!ok) {
        if (settled) await supabase.from("syus_monologues").update({ status: prior.status, is_public: prior.is_public }).eq("id", m.id);
        await reloadOne(m.id);
        note(m.id, settled ? `${errText} 이전 본문과 상태는 그대로 두었습니다.` : errText, true);
        return;
      }
      if (settled && !prior.is_public) await supabase.from("syus_monologues").update({ is_public: false }).eq("id", m.id);
      await reloadOne(m.id);
      note(m.id, settled && !prior.is_public ? "새 본문으로 전달했습니다. 서고 공개는 이전처럼 꺼 두었습니다." : "새 본문으로 전달했습니다.");
    });
  };

  const remove = (m: Mono) => {
    if (busy || !window.confirm("이 독백을 삭제할까요?\n요청자의 기록에서도 사라지며 되돌릴 수 없습니다.")) return;
    return run(m, async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("syus_monologues").delete().eq("id", m.id).select("id");
      if (error || !data || data.length === 0) { note(m.id, "삭제에 실패했어요(권한 또는 이미 삭제됨).", true); return; }
      // 이 독백에 걸려 있던 열린 신고도 함께 닫는다 — 대상이 없어진 신고가 큐에 남지 않게
      await supabase.from("syus_reports").update({ status: "resolved" }).eq("target_type", "monologue").eq("target_id", m.id).eq("status", "open");
      setRows((p) => p.filter((r) => r.id !== m.id));
      setMsg("독백 1건을 삭제했습니다.");
    });
  };

  const summary = useMemo(() => summarizeMonologues(rows), [rows]);
  const nearCap = useMemo(() => nearCapUsers(summary), [summary]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((m) => {
      if (!inTab(m, tab)) return false;
      if (!needle) return true;
      const hay = [m.generated_text, m.char_type, m.emotion, m.length_spec, m.tone, m.purpose, m.gender, m.age_range, people[m.user_id]?.name]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, tab, q, people]);

  if (state === "loading") return <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;
  if (state === "denied") return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <p className="syc-loading">운영자만 볼 수 있는 페이지입니다.</p>
      <button type="button" className="syc-back" style={{ marginTop: 16 }} onClick={() => router.push("/syus")}>← 여섯 무대로</button>
    </main>
  );

  const tabCount = (t: Tab) => rows.filter((m) => inTab(m, t)).length;

  const card = (m: Mono) => {
    const reqLine = [m.char_type, m.emotion, m.tone, m.purpose].filter(Boolean).join(" · ");
    const subLine = [m.length_spec, m.gender, m.age_range].filter(Boolean).join(" · ");
    const who = people[m.user_id];
    const isBusy = busy === m.id;
    const editing = drafts[m.id] !== undefined;
    const text = m.generated_text ?? "";
    const long = text.length > EXCERPT;
    const shown = open[m.id] || !long ? text : `${text.slice(0, EXCERPT)}…`;
    const publicLabel =
      m.status === "delivered" ? (m.is_public ? "서고에 공개 중" : "비공개 · 요청자만 봄")
      : m.status === "rejected" ? (m.is_public ? "반려됐지만 공개 표시가 남아 있음" : "반려 · 요청자에게도 본문 숨김")
      : "아직 전달 전";
    const n = notes[m.id];

    return (
      <article key={m.id} className="syc-card" style={{ cursor: "default" }}>
        <span className="syc-card-meta">{STATUS_LABEL[m.status] ?? m.status} · 요청 {fmt(m.created_at)} · {who?.name ?? "익명"}</span>
        <h3 className="syc-card-title" style={{ fontSize: "0.98rem" }}>{reqLine || "창작 독백"}</h3>
        {subLine && <p className="sym-sub">{subLine}</p>}
        <div className="sym-flags">
          <span className={`sym-flag${m.allow_public ? " is-on" : ""}`}>{m.allow_public ? "공개 동의함" : "공개 동의 안 함"}</span>
          <span className={`sym-flag${m.is_public ? " is-on" : ""}`}>{publicLabel}</span>
          {m.updated_at && m.updated_at.slice(0, 16) !== m.created_at.slice(0, 16) && <span className="sym-flag">최근 변경 {fmt(m.updated_at)}</span>}
        </div>

        {editing ? (
          <div className="sym-edit">
            <textarea className="syc-textarea" rows={12} maxLength={8000} value={drafts[m.id]}
              onChange={(e) => setDrafts((p) => ({ ...p, [m.id]: e.target.value }))} />
            <p className="syc-note" style={{ marginTop: 8 }}>저장하면 요청자에게(공개 중이면 서고 방문자에게도) 고친 본문이 그대로 보입니다. 「인공지능(AI) 생성물」 표시는 그대로 남습니다.</p>
            <div className="syc-actions sym-actions">
              <button type="button" className="syc-btn" disabled={isBusy} onClick={() => saveEdit(m)}>{isBusy ? "저장 중…" : "본문 저장"}</button>
              <button type="button" className="syc-cancel sym-link" disabled={isBusy} onClick={() => setDrafts((p) => { const x = { ...p }; delete x[m.id]; return x; })}>취소</button>
            </div>
          </div>
        ) : text ? (
          <>
            <span className="sym-ai">AI 생성물</span>
            <p className="syc-detail-body sym-text">{shown}</p>
            {long && (
              <button type="button" className="syc-cancel sym-link" onClick={() => setOpen((p) => ({ ...p, [m.id]: !p[m.id] }))}>
                {open[m.id] ? "접기" : `전문 펼치기 (${text.length}자)`}
              </button>
            )}
          </>
        ) : (
          <p className="syc-note" style={{ marginTop: 6 }}>아직 본문이 없습니다.</p>
        )}

        {!editing && (
          <div className="syc-actions sym-actions">
            {m.status === "reviewing" && (
              <button type="button" className="syc-btn" disabled={isBusy} onClick={() => approve(m)}>
                {isBusy ? "처리 중…" : m.allow_public ? "승인 · 전달 + 공개" : "승인 · 전달"}
              </button>
            )}
            {m.status === "pending" && (
              <button type="button" className="syc-btn" disabled={isBusy} onClick={() => regenerate(m)}>{isBusy ? "생성 중…" : "생성 실행"}</button>
            )}
            {m.status === "delivered" && !m.is_public && (
              <button type="button" className="syc-btn" disabled={isBusy || !m.allow_public} onClick={() => makePublic(m)}
                title={m.allow_public ? undefined : "요청자가 공개에 동의하지 않았습니다"}>공개로 전환</button>
            )}
            {m.is_public && (
              <button type="button" className="syc-cancel sym-link" disabled={isBusy} onClick={() => makePrivate(m)}>비공개로 전환</button>
            )}
            {m.status === "rejected" && m.generated_text && (
              <button type="button" className="syc-cancel sym-link" disabled={isBusy} onClick={() => restore(m)}>전달 복원</button>
            )}
            {m.generated_text && (
              <button type="button" className="syc-cancel sym-link" disabled={isBusy} onClick={() => setDrafts((p) => ({ ...p, [m.id]: m.generated_text ?? "" }))}>본문 수정</button>
            )}
            {m.status !== "pending" && (
              <button type="button" className="syc-cancel sym-link" disabled={isBusy} onClick={() => regenerate(m)}>{isBusy ? "처리 중…" : "다시 생성"}</button>
            )}
            {m.status !== "rejected" && (
              <button type="button" className="syc-comment-del" disabled={isBusy} onClick={() => reject(m)}>{m.status === "delivered" ? "전달 회수(반려)" : "반려"}</button>
            )}
            <button type="button" className="syc-comment-del" disabled={isBusy} onClick={() => remove(m)}>삭제</button>
          </div>
        )}
        {m.status === "delivered" && !m.is_public && !m.allow_public && (
          <p className="syc-note" style={{ marginTop: 8 }}>공개로 전환할 수 없습니다 — 요청자가 공개에 동의하지 않았습니다.</p>
        )}
        {n && <p className={n.err ? "syc-error sym-result" : "sym-result"}>{n.text}</p>}
        <Link href={`/syus/monologues/${m.id}`} className="sym-open" target="_blank">요청자가 보는 화면 ↗</Link>
      </article>
    );
  };

  const reviewing = filtered.filter((m) => m.status === "reviewing");
  const pending = filtered.filter((m) => m.status === "pending");

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <Link href="/syus/admin" className="syc-back">← 시우스 관리</Link>
      <span className="syc-badge">운영자 전용</span>
      <h1 className="syc-title">독백 관리</h1>
      <p className="syc-tagline">요청은 AI가 곧바로 지어 전달합니다. 여기서는 전달된 독백을 살피고, 공개를 조정하고, 필요하면 고치거나 내립니다.</p>
      {msg && <p className="syc-error">{msg}</p>}

      {/* 요약 */}
      <div className="syc-block">
        <div className="sym-stats">
          {[
            { n: summary.total, l: "전체" },
            { n: summary.publicNow, l: "공개 중" },
            { n: summary.privateDelivered, l: "비공개" },
            { n: summary.rejected, l: "반려" },
            { n: summary.exceptions, l: "예외 처리" },
            { n: summary.generated24h, l: "최근 24시간 생성" },
          ].map((s) => (
            <div key={s.l} className="sym-stat"><span className="sym-stat-n">{s.n}</span><span className="sym-stat-l">{s.l}</span></div>
          ))}
        </div>
        <p className="sym-cap-h">하루 한도({MONOLOGUE_DAILY_CAP}건)에 가까운 요청자</p>
        {nearCap.length === 0 ? (
          <p className="syc-note" style={{ marginTop: 4 }}>최근 24시간 안에 한도에 가까운 사람은 없습니다.</p>
        ) : (
          <ul className="sym-cap">
            {nearCap.map((u) => (
              <li key={u.user_id}>
                {people[u.user_id]?.name ?? "익명"} · {u.count}/{MONOLOGUE_DAILY_CAP}
                {people[u.user_id]?.isAdmin ? " (운영자 — 한도 없음)" : u.count >= MONOLOGUE_DAILY_CAP ? " · 오늘은 더 청할 수 없음" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 필터 + 검색 */}
      <div className="sym-filter" role="tablist" aria-label="독백 상태">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            className={`syc-chip sym-tab${tab === t.key ? " is-on" : ""}`} onClick={() => setTab(t.key)}>
            {t.label} {tabCount(t.key)}
          </button>
        ))}
      </div>
      <input className="syc-input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="본문·인물·감정·톤·요청자 이름으로 찾기" aria-label="독백 검색" style={{ marginBottom: 22 }} />

      {tab === "exceptions" ? (
        <>
          <div className="syc-block">
            <h2 className="syc-h2">과거 검수 대기 · {reviewing.length}건</h2>
            {reviewing.length === 0 ? (
              <div className="syc-empty"><p className="syc-empty-h">검수할 독백이 없어요.</p></div>
            ) : <div className="syc-cards">{reviewing.map(card)}</div>}
          </div>
          <div className="syc-block">
            <h2 className="syc-h2">생성 대기 · {pending.length}건</h2>
            <p className="syc-lead" style={{ fontSize: "0.95rem", marginBottom: 14 }}>생성이 아직 안 됐거나 실패한 요청입니다. ‘생성 실행’으로 다시 시도할 수 있어요.</p>
            {pending.length === 0 ? (
              <div className="syc-empty"><p className="syc-empty-h">생성을 기다리는 요청이 없어요.</p></div>
            ) : <div className="syc-cards">{pending.map(card)}</div>}
          </div>
        </>
      ) : (
        <div className="syc-block">
          {filtered.length === 0 ? (
            <div className="syc-empty"><p className="syc-empty-h">{q.trim() ? "찾는 말에 맞는 독백이 없어요." : "이 자리에 해당하는 독백이 없어요."}</p></div>
          ) : <div className="syc-cards">{filtered.map(card)}</div>}
        </div>
      )}

      <nav className="syc-bridge">
        <Link href="/syus/admin" className="syc-bridge-link">← 시우스 관리</Link>
        <Link href="/syus/flex" className="syc-bridge-link is-muted">창작 독백 아카이브</Link>
      </nav>

      <style>{`
        .sym-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; }
        .sym-stat { display: flex; flex-direction: column; gap: 3px; background: #FFFFFF; border: 1px solid #E4DFD4; border-left: 3px solid var(--c, #0B5563); padding: 12px 14px; }
        .sym-stat-n { font-family: var(--font-noto-serif-kr); font-size: 1.4rem; font-weight: 700; color: #241C18; }
        .sym-stat-l { font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #5A4A3E; }
        .sym-cap-h { font-family: var(--font-noto-sans-kr); font-size: 0.85rem; font-weight: 700; color: #241C18; margin: 20px 0 6px; }
        .sym-cap { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; color: #5A4A3E; line-height: 1.8; padding-left: 1.1em; list-style: disc; }
        .sym-filter { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .sym-tab { cursor: pointer; }
        .sym-sub { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; color: #5A4A3E; margin: -2px 0 10px; }
        .sym-flags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .sym-flag { font-family: var(--font-noto-sans-kr); font-size: 0.72rem; color: #5A4A3E; border: 1px solid #E4DFD4; border-radius: 100px; padding: 2px 10px; }
        .sym-flag.is-on { color: var(--c, #0B5563); border-color: var(--c, #0B5563); font-weight: 600; }
        .sym-ai { display: inline-block; font-family: var(--font-noto-sans-kr); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; color: var(--c, #0B5563); margin-bottom: 4px; }
        .sym-text { white-space: pre-wrap; margin: 4px 0 6px; }
        .sym-edit { margin-top: 4px; }
        .sym-actions { flex-wrap: wrap; gap: 10px 18px; margin-top: 14px; }
        .sym-link { appearance: none; background: none; border: 0; padding: 0; cursor: pointer; }
        .sym-link:disabled, .syc-comment-del:disabled { opacity: 0.5; cursor: not-allowed; }
        .sym-result { font-family: var(--font-noto-sans-kr); font-size: 0.85rem; color: #0B5563; margin: 10px 0 0; }
        .sym-open { display: inline-block; margin-top: 12px; font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #5A4A3E; text-decoration: none; border-bottom: 1px solid #D4CFC1; }
      `}</style>
    </main>
  );
}
