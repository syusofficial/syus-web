"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sanitizeSearchTerm } from "@/lib/showFilters";
import { MONOLOGUE_DAILY_CAP, summarizeMonologues, nearCapUsers, type MonologueStatRow } from "@/lib/syusMonologueStats";

/**
 * 시우스 전용 관리자 페이지 (/syus/admin) — 무대올림 /admin 과 별개.
 * 운영자(profiles.role='admin')만. 실제 권한은 RLS로 보장(클라 게이트는 UI용).
 *
 * 2026-09-28 탭 구조로 확장(사장님: "시우스 관리 체계에도 관리자 권한·기능 강화가 필요"):
 * - 신고  : 신고된 글을 이 자리에서 바로 읽고 판단(댓글·답변은 따로 볼 페이지가 없어 미리보기가 유일한 판단 근거).
 *           삭제(콘텐츠+신고 처리) / 처리완료(신고만 종료). 처리된 신고 최근 50건도 볼 수 있다.
 * - 콘텐츠: 섹션별 최근 50건 + 검색 + 삭제.
 * - 견해글: 전체 목록, 공개/비공개 전환, 수정(/syus/essays/new?edit=), 삭제.
 * - 질문  : 견해글 질문받기 + 연기 고민 QnA 통합 인박스(QnA는 답변 수·미답변 표시).
 * - 독백  : 요약 숫자 + 독백 관리(/syus/monologues/review) 바로가기.
 *
 * RLS 한계(supabase/syus_community_full.sql): 운영자는 남의 자유 글·질문·답변·후기·책·댓글을
 * "지울" 수는 있지만 "고치거나 숨길" 수는 없다(update는 작성자 본인만). 그래서 콘텐츠 탭은 삭제만 둔다.
 * 숨김 기능이 필요해지면 SQL(운영자 update 정책 또는 hidden 컬럼)부터 추가해야 한다.
 */

type Report = { id: string; user_id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string };
// 통합 질문 인박스 항목 — 견해글 질문받기(essay) + 연기 고민 QnA(question)
type QItem = { id: string; source: "essay" | "question"; label: string; color: string; text: string; user_id: string; created_at: string; href?: string };
type Row = Record<string, unknown> & { id: string; user_id: string; created_at: string };
type Essay = { id: string; title: string; series_no: number | null; published: boolean; created_at: string; updated_at: string | null };
type Shown = { title: string | null; body: string; extra: string | null; href: string | null };
type Tab = "reports" | "content" | "essays" | "questions" | "monologues";
type SectionKey = "post" | "question" | "answer" | "review" | "book" | "comment";

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

// 미리보기·콘텐츠 목록에서 읽을 칸 — 표(테이블)마다 본문 칸 이름이 달라서 한 곳에 모은다
const COLS: Record<string, string> = {
  question:  "id, user_id, title, body, created_at",
  answer:    "id, user_id, question_id, body, is_accepted, created_at",
  essay:     "id, user_id, title, body, published, created_at",
  post:      "id, user_id, category, title, body, created_at",
  review:    "id, user_id, work_title, work_type, rating, body, image_url, created_at",
  monologue: "id, user_id, char_type, emotion, generated_text, status, is_public, created_at",
  book:      "id, user_id, title, author, topic, note, created_at",
  comment:   "id, user_id, target_type, target_id, body, created_at",
};

// 콘텐츠 탭 섹션 — 검색은 해당 표의 글자 칸에만 건다
const SECTIONS: { key: SectionKey; label: string; search: string[] }[] = [
  { key: "post",     label: "자유 글",   search: ["title", "body"] },
  { key: "question", label: "QnA 질문",  search: ["title", "body"] },
  { key: "answer",   label: "QnA 답변",  search: ["body"] },
  { key: "review",   label: "관람 후기", search: ["work_title", "body"] },
  { key: "book",     label: "책 후기",   search: ["title", "author", "note"] },
  { key: "comment",  label: "댓글",      search: ["body"] },
];

const STATS: { t: string; label: string; color: string }[] = [
  { t: "syus_essays",     label: "견해글",     color: "var(--color-syus-stage-proscenium)" },
  { t: "syus_questions",  label: "QnA 질문",   color: "var(--color-syus-stage-thrust)" },
  { t: "syus_posts",      label: "자유 글",    color: "var(--color-syus-stage-arena)" },
  { t: "syus_reviews",    label: "관람 후기",  color: "var(--color-syus-stage-blackbox)" },
  { t: "syus_monologues", label: "창작 독백",  color: "var(--color-syus-stage-flex)" },
  { t: "syus_books",      label: "책 후기",    color: "var(--color-syus-stage-corridor)" },
  { t: "syus_comments",   label: "댓글",       color: "#5A4A3E" },
];

const TABS: { key: Tab; label: string }[] = [
  { key: "reports", label: "신고" },
  { key: "content", label: "콘텐츠" },
  { key: "essays", label: "견해글" },
  { key: "questions", label: "질문" },
  { key: "monologues", label: "독백" },
];

const MONO_STATUS: Record<string, string> = { pending: "생성 대기", reviewing: "생성 중", delivered: "전달 완료", rejected: "반려" };
const EXCERPT = 180;

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function str(v: unknown): string | null { return typeof v === "string" && v.trim() ? v : null; }

/** 표마다 다른 칸을 "제목·본문·덧말·링크" 한 모양으로 맞춘다 — 미리보기와 콘텐츠 목록이 같이 쓴다 */
function describe(type: string, r: Row): Shown {
  const id = r.id;
  switch (type) {
    case "question":  return { title: str(r.title), body: str(r.body) ?? "", extra: null, href: `/syus/qna/${id}` };
    case "answer":    return { title: null, body: str(r.body) ?? "", extra: r.is_accepted ? "채택된 답변" : null, href: str(r.question_id) ? `/syus/qna/${r.question_id}` : null };
    case "essay":     return { title: str(r.title), body: str(r.body) ?? "", extra: r.published === false ? "비공개" : null, href: `/syus/essays/${id}` };
    case "post":      return { title: str(r.title), body: str(r.body) ?? "", extra: str(r.category), href: `/syus/community/${id}` };
    case "review":    return {
      title: str(r.work_title), body: str(r.body) ?? "",
      extra: [str(r.work_type), typeof r.rating === "number" ? `별 ${r.rating}` : null, r.image_url ? "사진 첨부" : null].filter(Boolean).join(" · ") || null,
      href: `/syus/reviews/${id}`,
    };
    case "monologue": return {
      title: str(r.char_type) ?? "창작 독백", body: str(r.generated_text) ?? "(아직 본문 없음)",
      // AI 기본법 §31 — 운영 화면에서도 AI 생성물임을 드러낸다
      extra: ["AI 생성물", MONO_STATUS[String(r.status)] ?? str(r.status), r.is_public ? "공개" : "비공개"].filter(Boolean).join(" · "),
      href: `/syus/monologues/${id}`,
    };
    case "book":      return { title: str(r.title), body: str(r.note) ?? "", extra: [str(r.author), str(r.topic)].filter(Boolean).join(" · ") || null, href: `/syus/books/${id}` };
    case "comment": {
      const tt = String(r.target_type ?? "");
      const parent = TARGET[tt];
      return { title: null, body: str(r.body) ?? "", extra: `${parent?.label ?? tt}에 단 댓글`, href: parent?.href && str(r.target_id) ? parent.href(String(r.target_id)) : null };
    }
    default: return { title: null, body: "", extra: null, href: null };
  }
}

export default function SyusAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  // 탭을 주소 #에 남겨 새로고침·뒤로가기에도 같은 탭으로 돌아오게 한다(견해글 수정 후 복귀 등).
  // 첫 화면은 "불러오는 중…"이라 탭이 그려지지 않으므로, 서버 렌더와 어긋날 걱정 없이 여기서 바로 읽는다.
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "reports";
    const h = window.location.hash.replace("#", "");
    return TABS.some((t) => t.key === h) ? (h as Tab) : "reports";
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [resolved, setResolved] = useState<Report[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [previews, setPreviews] = useState<Record<string, (Shown & { user_id: string }) | "missing">>({});
  const [questions, setQuestions] = useState<QItem[]>([]);
  const [answerInfo, setAnswerInfo] = useState<Record<string, { n: number; accepted: boolean }>>({});
  const [essays, setEssays] = useState<Essay[]>([]);
  const [essayQ, setEssayQ] = useState("");
  const [monoRows, setMonoRows] = useState<MonologueStatRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [section, setSection] = useState<SectionKey>("post");
  const [contentRows, setContentRows] = useState<Row[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  /** 작성자 이름을 모아 둔다 — 여러 탭이 따로 불러와 합친다 */
  const addNames = useCallback(async (ids: string[]) => {
    const uniq = Array.from(new Set(ids.filter(Boolean)));
    if (!uniq.length) return;
    const supabase = createClient();
    const { data: profs } = await supabase.from("profiles").select("id, name").in("id", uniq);
    const map: Record<string, string> = {};
    (profs ?? []).forEach((p: { id: string; name: string | null }) => { map[p.id] = p.name || "익명"; });
    setNames((prev) => ({ ...prev, ...map }));
  }, []);

  /** 신고 대상 미리보기 — 대상 표별로 한 번씩만 읽는다. 못 찾으면 이미 삭제된 것으로 본다 */
  const loadPreviews = useCallback(async (list: Report[]) => {
    const supabase = createClient();
    const byType: Record<string, string[]> = {};
    list.forEach((r) => { if (TARGET[r.target_type]) (byType[r.target_type] ??= []).push(r.target_id); });
    const next: Record<string, (Shown & { user_id: string }) | "missing"> = {};
    const authorIds: string[] = [];
    await Promise.all(Object.entries(byType).map(async ([type, ids]) => {
      const uniq = Array.from(new Set(ids));
      const { data } = await supabase.from(TARGET[type].table).select(COLS[type]).in("id", uniq);
      const found = ((data ?? []) as unknown) as Row[];
      const byId = new Map(found.map((r) => [r.id, r]));
      uniq.forEach((id) => {
        const r = byId.get(id);
        if (!r) { next[`${type}:${id}`] = "missing"; return; }
        next[`${type}:${id}`] = { ...describe(type, r), user_id: r.user_id };
        authorIds.push(r.user_id);
      });
    }));
    setPreviews((prev) => ({ ...prev, ...next }));
    await addNames(authorIds);
  }, [addNames]);

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

    // QnA 질문별 답변 수·채택 여부 — 미답변 질문을 먼저 챙기도록
    if (qnaRows.length) {
      const { data: ans } = await supabase.from("syus_answers").select("question_id, is_accepted").in("question_id", qnaRows.map((q) => q.id));
      const info: Record<string, { n: number; accepted: boolean }> = {};
      ((ans ?? []) as { question_id: string; is_accepted: boolean }[]).forEach((a) => {
        const cur = info[a.question_id] ?? { n: 0, accepted: false };
        info[a.question_id] = { n: cur.n + 1, accepted: cur.accepted || a.is_accepted };
      });
      setAnswerInfo(info);
    }

    // 견해글 — 운영자는 RLS상 비공개 글도 읽힌다
    const { data: es } = await supabase.from("syus_essays").select("id, title, series_no, published, created_at, updated_at").order("created_at", { ascending: false }).limit(500);
    setEssays(((es ?? []) as unknown) as Essay[]);

    // 독백 요약용 — 본문은 빼고 상태만
    const { data: mono } = await supabase.from("syus_monologues").select("user_id, status, is_public, created_at").limit(5000);
    const monoList = ((mono ?? []) as unknown) as MonologueStatRow[];
    setMonoRows(monoList);

    await addNames([...reportList.map((r) => r.user_id), ...qItems.map((q) => q.user_id), ...monoList.map((m) => m.user_id)]);
    await loadPreviews(reportList);

    const c: Record<string, number> = {};
    await Promise.all(STATS.map(async (s) => {
      try { const { count } = await supabase.from(s.t).select("id", { count: "exact", head: true }); c[s.t] = count ?? 0; } catch { c[s.t] = 0; }
    }));
    setCounts(c);
    setState("ready");
  }, [addNames, loadPreviews]);

  useEffect(() => { load(); }, [load]);

  const pickTab = (t: Tab) => {
    setTab(t); setMsg(""); setOk("");
    try { window.history.replaceState(null, "", `#${t}`); } catch { /* 주소 갱신 실패는 무시 */ }
  };

  // 콘텐츠 탭 — 섹션·검색어가 바뀔 때만 읽는다
  useEffect(() => {
    if (state !== "ready" || tab !== "content") return;
    let alive = true;
    (async () => {
      setContentLoading(true);
      const supabase = createClient();
      const meta = TARGET[section];
      let query = supabase.from(meta.table).select(COLS[section]);
      // 검색어는 sanitizeSearchTerm으로 쉼표·괄호·와일드카드를 걷어낸 뒤에만 .or()에 넣는다(필터 문법 주입 방지)
      const safe = sanitizeSearchTerm(term);
      if (safe) {
        const cols = SECTIONS.find((s) => s.key === section)?.search ?? [];
        query = query.or(cols.map((c) => `${c}.ilike.%${safe}%`).join(","));
      }
      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (!alive) return;
      if (error) setMsg("목록을 불러오지 못했어요.");
      const list = ((data ?? []) as unknown) as Row[];
      setContentRows(list);
      setContentLoading(false);
      await addNames(list.map((r) => r.user_id));
    })();
    return () => { alive = false; };
  }, [state, tab, section, term, addNames]);

  /**
   * 콘텐츠 삭제 공용 — 신고 큐·콘텐츠 탭·견해글 탭이 같이 쓴다.
   * 댓글은 대상 id만 들고 있는 다형 참조라 대상이 지워져도 DB가 따라 지우지 않는다 → 여기서 함께 지운다.
   * (답변은 질문에 외래키 cascade가 걸려 있어 DB가 알아서 지운다.)
   */
  const deleteTarget = async (type: string, id: string): Promise<boolean> => {
    const meta = TARGET[type];
    if (!meta) return false;
    const supabase = createClient();
    const { data, error } = await supabase.from(meta.table).delete().eq("id", id).select("id");
    if (error || !data || data.length === 0) return false;
    if (type !== "comment" && type !== "answer") {
      await supabase.from("syus_comments").delete().eq("target_type", type).eq("target_id", id);
    }
    await supabase.from("syus_reports").update({ status: "resolved" }).eq("target_id", id).eq("status", "open");
    setCounts((p) => (p[meta.table] != null ? { ...p, [meta.table]: Math.max(0, p[meta.table] - 1) } : p));
    return true;
  };

  const resolveReport = async (r: Report) => {
    if (busy) return;
    setBusy(r.id); setMsg(""); setOk("");
    const supabase = createClient();
    const { error } = await supabase.from("syus_reports").update({ status: "resolved" }).eq("id", r.id);
    if (error) { setMsg("처리에 실패했어요."); setBusy(null); return; }
    setReports((p) => p.filter((x) => x.id !== r.id));
    setResolved((p) => (p ? [{ ...r, status: "resolved" }, ...p] : p));
    setOk("신고를 처리완료로 닫았습니다. 콘텐츠는 그대로 남아 있습니다.");
    setBusy(null);
  };

  const deleteContent = async (r: Report) => {
    const meta = TARGET[r.target_type];
    if (!meta || busy) return;
    const withComments = r.target_type !== "comment" && r.target_type !== "answer";
    if (!window.confirm(`${meta.label} 콘텐츠를 삭제하고 관련 신고를 처리할까요?${withComments ? "\n달린 댓글도 함께 지워집니다." : ""} 되돌릴 수 없습니다.`)) return;
    setBusy(r.id); setMsg(""); setOk("");
    const done = await deleteTarget(r.target_type, r.target_id);
    if (!done) { setMsg("콘텐츠 삭제에 실패했어요(권한 또는 이미 삭제됨)."); setBusy(null); return; }
    setReports((p) => p.filter((x) => x.target_id !== r.target_id));
    setPreviews((p) => ({ ...p, [`${r.target_type}:${r.target_id}`]: "missing" }));
    setOk(`${meta.label} 1건을 삭제하고 관련 신고를 닫았습니다.`);
    setBusy(null);
  };

  const toggleResolved = async () => {
    const next = !showResolved;
    setShowResolved(next);
    if (!next || resolved) return;
    const supabase = createClient();
    const { data } = await supabase.from("syus_reports").select("*").eq("status", "resolved").order("created_at", { ascending: false }).limit(50);
    const list = ((data ?? []) as unknown) as Report[];
    setResolved(list);
    await addNames(list.map((r) => r.user_id));
    await loadPreviews(list);
  };

  const deleteRow = async (r: Row) => {
    const meta = TARGET[section];
    if (busy) return;
    const withComments = section !== "comment" && section !== "answer";
    const extra = section === "question" ? "\n달린 답변과 댓글도 함께 지워집니다." : withComments ? "\n달린 댓글도 함께 지워집니다." : "";
    if (!window.confirm(`이 ${meta.label}을(를) 삭제할까요?${extra}\n되돌릴 수 없습니다.`)) return;
    setBusy(`c:${r.id}`); setMsg(""); setOk("");
    const done = await deleteTarget(section, r.id);
    if (!done) { setMsg("삭제에 실패했어요(권한 또는 이미 삭제됨)."); setBusy(null); return; }
    setContentRows((p) => p.filter((x) => x.id !== r.id));
    setReports((p) => p.filter((x) => x.target_id !== r.id));
    setOk(`${meta.label} 1건을 삭제했습니다.`);
    setBusy(null);
  };

  const toggleEssay = async (e: Essay) => {
    if (busy) return;
    setBusy(`e:${e.id}`); setMsg(""); setOk("");
    const supabase = createClient();
    const { data, error } = await supabase.from("syus_essays").update({ published: !e.published }).eq("id", e.id).select("id, published");
    if (error || !data || data.length === 0) { setMsg("공개 상태를 바꾸지 못했어요."); setBusy(null); return; }
    setEssays((p) => p.map((x) => (x.id === e.id ? { ...x, published: !e.published } : x)));
    setOk(e.published ? `「${e.title}」을(를) 비공개로 돌렸습니다. 목록과 검색에서 내려갑니다.` : `「${e.title}」을(를) 다시 공개했습니다.`);
    setBusy(null);
  };

  const deleteEssay = async (e: Essay) => {
    if (busy) return;
    if (!window.confirm(`견해글 「${e.title}」을(를) 삭제할까요?\n달린 댓글도 함께 지워지며 되돌릴 수 없습니다.\n(잠시 내리기만 하려면 '비공개로'를 쓰세요.)`)) return;
    setBusy(`e:${e.id}`); setMsg(""); setOk("");
    const done = await deleteTarget("essay", e.id);
    if (!done) { setMsg("견해글 삭제에 실패했어요(권한 또는 이미 삭제됨)."); setBusy(null); return; }
    setEssays((p) => p.filter((x) => x.id !== e.id));
    setOk(`「${e.title}」을(를) 삭제했습니다.`);
    setBusy(null);
  };

  const deleteQuestion = async (q: QItem) => {
    if (busy) return;
    if (!window.confirm(`이 질문(${q.label})을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setBusy(`${q.source}:${q.id}`); setMsg(""); setOk("");
    if (q.source === "question") {
      // QnA 질문은 답변·댓글·신고까지 함께 정리하는 공용 삭제로
      const done = await deleteTarget("question", q.id);
      if (!done) { setMsg("질문 삭제에 실패했어요(권한 또는 이미 삭제됨)."); setBusy(null); return; }
    } else {
      const supabase = createClient();
      const { error } = await supabase.from("syus_essay_asks").delete().eq("id", q.id);
      if (error) { setMsg("질문 삭제에 실패했어요(권한 또는 이미 삭제됨)."); setBusy(null); return; }
    }
    setQuestions((p) => p.filter((x) => !(x.id === q.id && x.source === q.source))); setBusy(null);
  };

  const monoSummary = useMemo(() => summarizeMonologues(monoRows), [monoRows]);
  const monoNearCap = useMemo(() => nearCapUsers(monoSummary), [monoSummary]);
  // 같은 대상에 걸린 신고 수 — 여러 사람이 신고한 글을 먼저 보도록
  const reportDup = useMemo(() => {
    const m: Record<string, number> = {};
    reports.forEach((r) => { m[r.target_id] = (m[r.target_id] ?? 0) + 1; });
    return m;
  }, [reports]);
  const shownEssays = useMemo(() => {
    const n = essayQ.trim().toLowerCase();
    return n ? essays.filter((e) => e.title.toLowerCase().includes(n)) : essays;
  }, [essays, essayQ]);

  if (state === "loading") return <main className="syc-wrap" style={{ ["--c" as string]: TEAL } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;
  if (state === "denied") return (
    <main className="syc-wrap" style={{ ["--c" as string]: TEAL } as React.CSSProperties}>
      <p className="syc-loading">운영자만 볼 수 있는 페이지입니다.</p>
      <button type="button" className="syc-back" style={{ marginTop: 16 }} onClick={() => router.push("/syus")}>← 여섯 무대로</button>
    </main>
  );

  /** 본문 미리보기 — 길면 접어 두고 펼치기 */
  const excerpt = (key: string, body: string) => {
    const long = body.length > EXCERPT;
    return (
      <>
        <p className="sya-body">{open[key] || !long ? body : `${body.slice(0, EXCERPT)}…`}</p>
        {long && (
          <button type="button" className="sya-more" onClick={() => setOpen((p) => ({ ...p, [key]: !p[key] }))}>
            {open[key] ? "접기" : `전문 펼치기 (${body.length}자)`}
          </button>
        )}
      </>
    );
  };

  const preview = (r: Report) => {
    const pv = previews[`${r.target_type}:${r.target_id}`];
    if (pv === undefined) return <div className="sya-preview"><p className="syc-note" style={{ margin: 0 }}>내용을 불러오는 중…</p></div>;
    if (pv === "missing") return <div className="sya-preview"><p className="syc-note" style={{ margin: 0 }}>이미 삭제된 콘텐츠입니다.</p></div>;
    return (
      <div className="sya-preview">
        {pv.title && <p className="sya-ptitle">{pv.title}</p>}
        {pv.extra && <p className="sya-pextra">{pv.extra}</p>}
        {excerpt(`r:${r.id}`, pv.body)}
        <p className="sya-pauthor">작성 {names[pv.user_id] ?? "익명"}</p>
      </div>
    );
  };

  const monoPending = monoSummary.exceptions;
  const tabCount: Partial<Record<Tab, number>> = { reports: reports.length, essays: essays.length, questions: questions.length };

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: TEAL } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>
      <span className="syc-badge">시우스 운영</span>
      <h1 className="syc-title">시우스 관리</h1>
      <p className="syc-tagline">신고를 살피고, 올라온 글과 견해글을 돌보고, 남겨진 질문과 독백을 봅니다.</p>

      {/* 바로가기 + 통계 */}
      <div className="syc-block">
        <div className="sya-links">
          <Link href="/syus/monologues/review" className="syc-btn-ghost">독백 관리{monoPending > 0 ? ` · 예외 ${monoPending}` : ""}</Link>
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

      <div className="sya-tabs" role="tablist" aria-label="관리 영역">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            className={`syc-chip sya-tab${tab === t.key ? " is-on" : ""}`} onClick={() => pickTab(t.key)}>
            {t.label}{tabCount[t.key] != null ? ` ${tabCount[t.key]}` : ""}
          </button>
        ))}
      </div>
      {msg && <p className="syc-error" style={{ marginBottom: 14 }}>{msg}</p>}
      {ok && <p className="sya-ok">{ok}</p>}

      {/* ── 신고 ── */}
      {tab === "reports" && (
        <div className="syc-block">
          <h2 className="syc-h2">신고 · {reports.length}건</h2>
          {reports.length === 0 ? (
            <div className="syc-empty"><p className="syc-empty-h">처리할 신고가 없어요.</p></div>
          ) : (
            <div className="syc-cards">
              {reports.map((r) => {
                const meta = TARGET[r.target_type];
                const pv = previews[`${r.target_type}:${r.target_id}`];
                const href = (pv && pv !== "missing" ? pv.href : null) ?? meta?.href?.(r.target_id) ?? null;
                return (
                  <article key={r.id} className="syc-card" style={{ cursor: "default" }}>
                    <span className="syc-card-meta">
                      {meta?.label ?? r.target_type} · 신고 {names[r.user_id] ?? "익명"} · {fmt(r.created_at)}
                      {reportDup[r.target_id] > 1 ? ` · 같은 글 신고 ${reportDup[r.target_id]}건` : ""}
                    </span>
                    {preview(r)}
                    <p className="syc-detail-body" style={{ margin: "10px 0 12px" }}>사유: {r.reason}</p>
                    <div className="syc-actions sya-actions">
                      {href && pv !== "missing" && <Link href={href} className="syc-btn-ghost" target="_blank">{r.target_type === "comment" || r.target_type === "answer" ? "달린 곳 보기 ↗" : "내용 보기 ↗"}</Link>}
                      <button type="button" className="syc-comment-del" disabled={busy === r.id || pv === "missing"} onClick={() => deleteContent(r)}>콘텐츠 삭제</button>
                      <button type="button" className="syc-cancel sya-link" disabled={busy === r.id} onClick={() => resolveReport(r)}>처리완료(유지)</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <button type="button" className="syc-cancel sya-link" style={{ marginTop: 22 }} onClick={toggleResolved}>
            {showResolved ? "처리된 신고 접기" : "처리된 신고 보기 (최근 50건)"}
          </button>
          {showResolved && (
            resolved === null ? <p className="syc-note">불러오는 중…</p>
            : resolved.length === 0 ? <p className="syc-note">처리된 신고가 아직 없어요.</p>
            : (
              <ul className="syc-list" style={{ marginTop: 12 }}>
                {resolved.map((r) => {
                  const pv = previews[`${r.target_type}:${r.target_id}`];
                  const gone = pv === "missing";
                  const label = pv && pv !== "missing" ? (pv.title ?? pv.body.slice(0, 60)) : null;
                  return (
                    <li key={r.id} className="syc-comment">
                      <span className="sya-qsrc" style={{ color: "#5A4A3E" }}>{TARGET[r.target_type]?.label ?? r.target_type} · {gone ? "삭제됨" : "남아 있음"}</span>
                      {label && <p className="syc-comment-body" style={{ margin: "4px 0 0" }}>{label}</p>}
                      <p className="syc-comment-body" style={{ margin: "4px 0 8px" }}>사유: {r.reason}</p>
                      <div className="syc-comment-foot">
                        <span className="syc-comment-meta">신고 {names[r.user_id] ?? "익명"} · {fmt(r.created_at)}</span>
                        {!gone && pv && pv.href && <Link href={pv.href} className="syc-comment-meta" style={{ color: TEAL }} target="_blank">보기 ↗</Link>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </div>
      )}

      {/* ── 콘텐츠 ── */}
      {tab === "content" && (
        <div className="syc-block">
          <div className="sya-tabs" style={{ marginBottom: 12 }}>
            {SECTIONS.map((s) => (
              <button key={s.key} type="button" className={`syc-chip sya-tab${section === s.key ? " is-on" : ""}`}
                onClick={() => { setSection(s.key); setSearchInput(""); setTerm(""); setOk(""); }}>{s.label}</button>
            ))}
          </div>
          <form className="sya-search" onSubmit={(e) => { e.preventDefault(); setTerm(searchInput); }}>
            <input className="syc-input" type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="제목·본문에서 찾기" aria-label="콘텐츠 검색" />
            <button type="submit" className="syc-btn-ghost">찾기</button>
          </form>
          <p className="syc-note" style={{ margin: "0 0 16px" }}>
            최신 50건까지 보입니다. 운영자는 남의 글을 고치거나 숨길 수 없고 삭제만 할 수 있습니다(보안 규칙).
          </p>
          {contentLoading ? <p className="syc-loading">불러오는 중…</p>
          : contentRows.length === 0 ? (
            <div className="syc-empty"><p className="syc-empty-h">{term.trim() ? "찾는 말에 맞는 글이 없어요." : "아직 올라온 글이 없어요."}</p></div>
          ) : (
            <ul className="syc-list">
              {contentRows.map((r) => {
                const d = describe(section, r);
                return (
                  <li key={r.id} className="syc-comment">
                    {d.extra && <span className="sya-qsrc" style={{ color: "#5A4A3E" }}>{d.extra}</span>}
                    {d.title && <p className="sya-ptitle" style={{ marginTop: 4 }}>{d.title}</p>}
                    <div style={{ margin: "4px 0 10px" }}>{excerpt(`c:${r.id}`, d.body)}</div>
                    <div className="syc-comment-foot">
                      <span className="syc-comment-meta">{names[r.user_id] ?? "익명"} · {fmt(r.created_at)}</span>
                      <div className="sya-row-actions">
                        {d.href && <Link href={d.href} className="syc-comment-meta" style={{ color: TEAL }} target="_blank">{section === "comment" || section === "answer" ? "달린 곳 ↗" : "보기 ↗"}</Link>}
                        <button type="button" className="syc-comment-del" disabled={busy === `c:${r.id}`} onClick={() => deleteRow(r)}>삭제</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── 견해글 ── */}
      {tab === "essays" && (
        <div className="syc-block">
          <div className="sya-head">
            <h2 className="syc-h2" style={{ margin: 0 }}>견해글 · {essays.length}편 <span className="sya-h2sub">공개 {essays.filter((e) => e.published).length}</span></h2>
            <Link href="/syus/essays/new" className="syc-btn-ghost">새 견해글</Link>
          </div>
          <input className="syc-input" type="search" value={essayQ} onChange={(e) => setEssayQ(e.target.value)}
            placeholder="제목으로 찾기" aria-label="견해글 검색" style={{ margin: "14px 0 16px" }} />
          {shownEssays.length === 0 ? (
            <div className="syc-empty"><p className="syc-empty-h">{essayQ.trim() ? "찾는 제목이 없어요." : "아직 걸린 견해글이 없어요."}</p></div>
          ) : (
            <ul className="syc-list">
              {shownEssays.map((e) => {
                const isBusy = busy === `e:${e.id}`;
                return (
                  <li key={e.id} className="syc-comment">
                    <span className="sya-qsrc" style={{ color: e.published ? TEAL : "#A79E90" }}>
                      {e.published ? "공개" : "비공개"}{e.series_no != null ? ` · 연기와 냉장고 ${e.series_no}` : ""}
                    </span>
                    <p className="sya-ptitle" style={{ margin: "4px 0 10px" }}>{e.title}</p>
                    <div className="syc-comment-foot">
                      <span className="syc-comment-meta">{fmt(e.created_at)}</span>
                      <div className="sya-row-actions">
                        <Link href={`/syus/essays/${e.id}`} className="syc-comment-meta" style={{ color: TEAL }} target="_blank">보기 ↗</Link>
                        <Link href={`/syus/essays/new?edit=${e.id}`} className="syc-comment-meta" style={{ color: TEAL }}>수정</Link>
                        <button type="button" className="sya-toggle" disabled={isBusy} onClick={() => toggleEssay(e)}>{e.published ? "비공개로" : "공개로"}</button>
                        <button type="button" className="syc-comment-del" disabled={isBusy} onClick={() => deleteEssay(e)}>삭제</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── 질문 인박스 — 섹션 출처 표시 + 삭제 ── */}
      {tab === "questions" && (
        <div className="syc-block">
          <h2 className="syc-h2">질문 · {questions.length}</h2>
          {questions.length === 0 ? (
            <div className="syc-empty"><p className="syc-empty-h">아직 들어온 질문이 없어요.</p></div>
          ) : (
            <ul className="syc-list">
              {questions.map((q) => {
                const info = q.source === "question" ? answerInfo[q.id] : undefined;
                return (
                  <li key={`${q.source}:${q.id}`} className="syc-comment">
                    <span className="sya-qsrc" style={{ color: q.color }}>{q.label}</span>
                    {q.source === "question" && (
                      info && info.n > 0
                        ? <span className="sya-badge">답변 {info.n}{info.accepted ? " · 채택됨" : ""}</span>
                        : <span className="sya-badge is-warn">미답변</span>
                    )}
                    <p className="syc-comment-body" style={{ margin: "6px 0 10px" }}>{q.text}</p>
                    <div className="syc-comment-foot">
                      <span className="syc-comment-meta">{names[q.user_id] ?? "익명"} · {fmt(q.created_at)}</span>
                      <div className="sya-row-actions">
                        {q.href && <Link href={q.href} className="syc-comment-meta" style={{ color: TEAL }} target="_blank">보기 ↗</Link>}
                        <button type="button" className="syc-comment-del" disabled={busy === `${q.source}:${q.id}`} onClick={() => deleteQuestion(q)}>삭제</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── 독백 ── */}
      {tab === "monologues" && (
        <div className="syc-block" style={{ ["--c" as string]: "var(--color-syus-stage-flex)" } as React.CSSProperties}>
          <h2 className="syc-h2">창작 독백</h2>
          <div className="sya-stats">
            {[
              { n: monoSummary.total, l: "전체" },
              { n: monoSummary.publicNow, l: "공개 중" },
              { n: monoSummary.privateDelivered, l: "비공개" },
              { n: monoSummary.rejected, l: "반려" },
              { n: monoSummary.exceptions, l: "예외 처리" },
              { n: monoSummary.generated24h, l: "최근 24시간 생성" },
            ].map((s) => (
              <div key={s.l} className="sya-stat"><span className="sya-stat-n">{s.n}</span><span className="sya-stat-l">{s.l}</span></div>
            ))}
          </div>
          <p className="syc-note">
            {monoNearCap.length === 0
              ? `최근 24시간 안에 하루 한도(${MONOLOGUE_DAILY_CAP}건)에 가까운 요청자는 없습니다.`
              : `하루 한도(${MONOLOGUE_DAILY_CAP}건)에 가까운 요청자: ${monoNearCap.map((u) => `${names[u.user_id] ?? "익명"} ${u.count}/${MONOLOGUE_DAILY_CAP}`).join(", ")}`}
          </p>
          <Link href="/syus/monologues/review" className="syc-btn-ghost" style={{ marginTop: 10 }}>독백 관리로 가기 →</Link>
        </div>
      )}

      <nav className="syc-bridge">
        <Link href="/syus" className="syc-bridge-link">← 여섯 무대로</Link>
        <Link href="/syus/mypage" className="syc-bridge-link is-muted">내 시우스</Link>
      </nav>

      <style>{`
        .sya-links { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 22px; }
        .sya-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; }
        .sya-stat { display: flex; flex-direction: column; gap: 3px; background: #FFFFFF; border: 1px solid #E4DFD4; border-left: 3px solid var(--c, #0B5563); padding: 12px 14px; }
        .sya-stat-n { font-family: var(--font-noto-serif-kr); font-size: 1.4rem; font-weight: 700; color: #241C18; }
        .sya-stat-l { font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #5A4A3E; }
        .sya-qsrc { display: inline-block; font-family: var(--font-noto-sans-kr); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; }
        .sya-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
        .sya-tab { cursor: pointer; }
        .sya-ok { font-family: var(--font-noto-sans-kr); font-size: 0.85rem; color: #0B5563; margin: 0 0 14px; }
        .sya-preview { background: #F7F5F0; border-left: 2px solid #D4CFC1; padding: 12px 14px; margin-top: 6px; }
        .sya-ptitle { font-family: var(--font-noto-serif-kr); font-size: 0.98rem; font-weight: 700; color: #241C18; margin: 0 0 4px; word-break: keep-all; }
        .sya-pextra { font-family: var(--font-noto-sans-kr); font-size: 0.74rem; color: #5A4A3E; margin: 0 0 6px; }
        .sya-body { font-family: var(--font-noto-sans-kr); font-size: 0.9rem; line-height: 1.7; color: #3A2F28; white-space: pre-wrap; word-break: keep-all; margin: 0; }
        .sya-more { appearance: none; background: none; border: 0; padding: 0; margin-top: 6px; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #5A4A3E; border-bottom: 1px solid #D4CFC1; }
        .sya-pauthor { font-family: var(--font-noto-sans-kr); font-size: 0.74rem; color: #A79E90; margin: 8px 0 0; }
        .sya-actions { flex-wrap: wrap; gap: 10px 18px; }
        .sya-link { appearance: none; background: none; border: 0; padding: 0; cursor: pointer; }
        .sya-link:disabled, .syc-comment-del:disabled, .sya-toggle:disabled { opacity: 0.5; cursor: not-allowed; }
        .sya-row-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
        .sya-toggle { appearance: none; background: none; border: 0; padding: 0; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.74rem; color: #5A4A3E; }
        .sya-toggle:hover { color: #241C18; }
        .sya-search { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .sya-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .sya-h2sub { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; font-weight: 400; color: #5A4A3E; margin-left: 6px; }
        .sya-badge { display: inline-block; margin-left: 8px; font-family: var(--font-noto-sans-kr); font-size: 0.7rem; color: #5A4A3E; border: 1px solid #E4DFD4; border-radius: 100px; padding: 1px 8px; }
        .sya-badge.is-warn { color: #5C2A42; border-color: #5C2A42; }
      `}</style>
    </main>
  );
}
