"use client";

/**
 * 관리자 「예약 관리」 탭 — 2026-09-28 신설.
 *
 * 그전 탭은 신청 목록 한 장과 작은 "취소" 글자 하나뿐이어서, 신청이 0건이거나 전부
 * 취소된 날에는 관리자가 누를 수 있는 것이 하나도 없었다. 이 패널은 세 덩어리로 나뉜다.
 *   1) 공연별 예약 현황 — 정원·마감·자체 예매·회차를 공연 단위로 손본다.
 *   2) 전화·현장 접수 — 관객 대신 신청을 넣는다(정원 잠금·마감·종료 가드는 그대로).
 *   3) 신청 목록 — 걸러 보고, 한 건씩 확정·인원 수정·취소·되살리기·메일 재발송.
 *
 * 쓰기는 전부 server action(`@/app/actions/adminReservations`)으로 보낸다. 권한은
 * 서버에서 다시 판정하므로, 이 화면은 "무엇을 누를 수 있는지"만 보여 준다.
 * 읽기(신청·회차 목록 새로고침)는 관리자 세션의 브라우저 클라이언트로 한다 — RLS가
 * 관리자에게 두 테이블 조회를 열어 두었다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cancelReservationAction } from "@/app/actions/reservations";
import {
  adminAddSession,
  adminConfirmWaitlisted,
  adminCreateReservation,
  adminDeleteSession,
  adminResendConfirmation,
  adminRestoreReservation,
  adminSetInhouseReservation,
  adminSetReservationClosed,
  adminSetSessionCapacity,
  adminSetShowCapacity,
  adminUpdatePartySize,
  type AdminReservationResult,
} from "@/app/actions/adminReservations";
import { isEnded } from "@/lib/showFilters";
import { formatShowPeriod } from "@/lib/showDate";
import type { Reservation, Show, ShowSession } from "@/types";

export type AdminReservationsPanelProps = {
  shows: Show[];
  reservations: Reservation[];
  /** 부모의 신청 목록을 다시 읽는다. 탭 전체를 로딩 화면으로 바꾸지 않는 가벼운 새로고침이 좋다. */
  onRefresh: () => void | Promise<void>;
  /** 공연 한 건의 필드가 바뀌었을 때(마감·정원·자체 예매) 부모 목록에 반영한다. */
  onShowPatched: (showId: string, patch: Partial<Show>) => void;
};

type Notice = { tone: "ok" | "error"; text: string };

type DialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => void | Promise<void>;
} | null;

type StatusFilter = "all" | "confirmed" | "waitlisted" | "cancelled";

/**
 * 결과 한 줄을 모듈 변수에도 남겨 둔다.
 * 부모의 새로고침이 탭 전체를 로딩 화면으로 바꾸면 이 패널이 다시 마운트되면서 state가
 * 사라진다. 그러면 "메일을 보냈는지" 같은 결과를 운영자가 못 보고 지나친다. 그걸 막는 장치다.
 */
let persistedNotice: Notice | null = null;

const RESERVATION_SELECT = "*, shows(title, schedule_start, schedule_end)";

// ── 색 ──
const C = {
  bg: "#F0EEE9",
  surface: "#E6E1D6",
  border: "#D4CFC1",
  teal: "#0B5563",
  text: "#4A3B33",
  sub: "#5A4A3E",
  damson: "#5C2A42",
  ok: "#3A5E42",
  okBg: "#D4EDD4",
  danger: "#A63D2F",
  dangerBg: "#EDD4D4",
} as const;

const SANS = "var(--font-noto-sans-kr)";
const SERIF = "var(--font-noto-serif-kr)";
const INTER = "var(--font-inter)";

// 버튼 4상태 공통(공연자 명단 페이지와 같은 규칙) — 초점은 테두리선으로, 비활성은 흐리게.
const BTN_STATES =
  "transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor] disabled:opacity-50 disabled:cursor-not-allowed";
const FIELD_STATES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0B5563] disabled:opacity-50";

const RESERVATION_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: "확정", bg: C.okBg, color: C.ok },
  waitlisted: { label: "대기", bg: C.surface, color: C.teal },
  cancelled: { label: "취소됨", bg: C.dangerBg, color: C.sub },
};

const SHOW_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "승인 대기", bg: C.surface, color: C.teal },
  approved: { label: "게시 중", bg: C.okBg, color: C.ok },
  rejected: { label: "반려됨", bg: C.dangerBg, color: C.danger },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (v: string | null | undefined) => !!v && EMAIL_RE.test(v.trim());

/** "2026-10-03T10:30:00+00:00" → "10월 3일(토) 19:30" (한국 시간) */
function formatSessionAt(iso: string): string {
  try {
    const d = new Date(iso);
    const datePart = new Intl.DateTimeFormat("ko-KR", {
      month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul",
    }).format(d);
    return `${datePart} ${timePart}`;
  } catch {
    return iso;
  }
}

/** 신청일시 — "9. 28. 14:03" (한국 시간) */
function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** 한국 기준 "YYYY-MM-DD" — 회차가 지났는지 날짜 단위로만 본다(DB 가드와 같은 규칙: 당일은 열려 있다). */
function seoulDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function sessionPassed(iso: string): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return seoulDateKey(t) < seoulDateKey(new Date());
}

/** 연락처가 전화번호면 tel:, 이메일이면 mailto: 로 감싼다(공연자 명단 페이지와 같은 규칙). */
function ContactLink({ contact }: { contact: string | null | undefined }) {
  if (!contact) return <>-</>;
  const digitsOnly = contact.replace(/[\s-]/g, "");
  if (/^01[0-9]{8,9}$/.test(digitsOnly)) {
    return <a href={`tel:${digitsOnly}`} className="underline" style={{ color: C.teal }}>{contact}</a>;
  }
  if (isEmail(contact)) {
    return <a href={`mailto:${contact.trim()}`} className="underline break-all" style={{ color: C.teal }}>{contact}</a>;
  }
  return <>{contact}</>;
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span className="px-2 py-0.5 text-xs whitespace-nowrap" style={{ backgroundColor: bg, color, fontFamily: SANS }}>
      {label}
    </span>
  );
}

type BtnVariant = "primary" | "outline" | "danger" | "dangerOutline" | "quiet";
function Btn({
  variant = "outline",
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, CSSProperties> = {
    primary: { backgroundColor: C.teal, color: C.bg, border: `1px solid ${C.teal}`, fontWeight: 600 },
    outline: { backgroundColor: "transparent", color: C.text, border: `1px solid ${C.border}` },
    danger: { backgroundColor: C.danger, color: C.bg, border: `1px solid ${C.danger}`, fontWeight: 600 },
    dangerOutline: { backgroundColor: "transparent", color: C.danger, border: `1px solid ${C.danger}` },
    quiet: { backgroundColor: "transparent", color: C.teal, border: "1px solid transparent", textDecoration: "underline" },
  };
  return (
    <button
      type="button"
      {...rest}
      className={`px-3 py-1.5 text-xs tracking-wide whitespace-nowrap ${BTN_STATES} ${className}`}
      style={{ fontFamily: SANS, ...styles[variant], ...(rest.style ?? {}) }}
    >
      {children}
    </button>
  );
}

const fieldStyle: CSSProperties = {
  fontFamily: SANS,
  backgroundColor: C.bg,
  border: `1px solid ${C.border}`,
  color: C.text,
};

/** 신청 행들 → CSV 내려받기. BOM + CRLF(엑셀에서 한글이 깨지지 않게). */
function downloadCsv(filename: string, rows: Reservation[], sessionLabel: (id: string | null | undefined) => string, showTitle: (r: Reservation) => string) {
  const header = ["공연", "회차", "이름", "연락처", "인원수", "상태", "신청번호", "신청일시"];
  const lines = rows.map((r) => [
    showTitle(r),
    sessionLabel(r.session_id),
    r.guest_name ?? "",
    r.guest_contact ?? "",
    String(r.party_size),
    RESERVATION_STATUS[r.status]?.label ?? r.status,
    r.reservation_code,
    new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, "_");
  a.click();
  URL.revokeObjectURL(url);
}

const PRIVACY_LINE = "ⓘ 명단에는 신청자의 이름·연락처가 들어 있습니다 — 내려받은 파일은 공연이 끝나면 안전하게 지워 주세요.";

export function AdminReservationsPanel({ shows, reservations, onRefresh, onShowPatched }: AdminReservationsPanelProps) {
  // 부모가 새 목록을 내려 주면 그대로 받되, 이 패널이 스스로 다시 읽은 목록도 쓸 수 있게 로컬로 든다.
  const [rows, setRows] = useState<Reservation[]>(reservations);
  const [prevProp, setPrevProp] = useState<Reservation[]>(reservations);
  if (prevProp !== reservations) {
    setPrevProp(reservations);
    setRows(reservations);
  }

  const [sessions, setSessions] = useState<ShowSession[]>([]);
  /** show_sessions를 읽을 수 없으면(테이블 없음·권한 오류) 회차 관리 자체를 감춘다. */
  const [sessionsAvailable, setSessionsAvailable] = useState(true);

  const [notice, setNoticeState] = useState<Notice | null>(persistedNotice);
  const setNotice = useCallback((n: Notice | null) => {
    persistedNotice = n;
    setNoticeState(n);
  }, []);

  /** 처리 중인 대상 키 — "row:{id}", "show:{id}", "session:{id}", "create" 등. 같은 버튼 두 번 누르기를 막는다. */
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  // 목록 필터
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilter, setShowFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  /** 자체 예매를 끈 공연까지 카드로 볼지 — 끈 공연을 다시 켜려면 카드가 보여야 한다. */
  const [includeInhouseOff, setIncludeInhouseOff] = useState(false);

  // 인라인 편집기
  const [capacityEdit, setCapacityEdit] = useState<{ showId: string; value: string } | null>(null);
  const [sessionCapEdit, setSessionCapEdit] = useState<{ sessionId: string; value: string } | null>(null);
  const [addSession, setAddSession] = useState<{ showId: string; at: string; cap: string } | null>(null);
  const [partyEdit, setPartyEdit] = useState<{ id: string; value: number } | null>(null);

  // 전화·현장 접수 폼
  const [proxy, setProxy] = useState({ showId: "", sessionId: "", name: "", contact: "", partySize: 1 });

  const loadSessions = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("show_sessions")
      .select("id, show_id, session_at, capacity, created_at")
      .order("session_at", { ascending: true });
    if (error) {
      setSessionsAvailable(false);
      setSessions([]);
      return;
    }
    setSessionsAvailable(true);
    setSessions((data as ShowSession[]) ?? []);
  }, []);

  // 처음 열 때 회차 목록을 한 번 읽는다. 결과는 응답 콜백 안에서만 state에 넣는다
  // (effect 본문에서 바로 setState를 부르지 않게 — 불필요한 연쇄 렌더 방지).
  useEffect(() => {
    let alive = true;
    createClient()
      .from("show_sessions")
      .select("id, show_id, session_at, capacity, created_at")
      .order("session_at", { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        setSessionsAvailable(!error);
        setSessions(error ? [] : ((data as ShowSession[]) ?? []));
      });
    return () => {
      alive = false;
    };
  }, []);

  /** 신청·회차를 다시 읽고 부모에도 알린다. 새 신청 목록을 돌려준다(취소 뒤 자동 확정 판별용). */
  const reload = useCallback(async (): Promise<Reservation[] | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("syus_reservations")
      .select(RESERVATION_SELECT)
      .order("created_at", { ascending: false })
      .limit(500);
    let next: Reservation[] | null = null;
    if (!error && Array.isArray(data)) {
      next = (data as (Reservation & { shows?: { title?: string; schedule_start?: string; schedule_end?: string } | null })[]).map((r) => ({
        ...r,
        show_title: r.shows?.title,
        schedule_start: r.shows?.schedule_start,
        schedule_end: r.shows?.schedule_end,
      }));
      setRows(next);
    }
    await loadSessions();
    try {
      await onRefresh();
    } catch {
      // 부모 새로고침 실패는 이 패널의 결과 표시를 막지 않는다.
    }
    return next;
  }, [loadSessions, onRefresh]);

  /**
   * server action 실행 공통 틀 — 바쁨 표시, 결과 한 줄, 성공 시 새로고침.
   * needsOverride(정원 초과 확인 필요)는 결과 줄 대신 호출부가 확인창을 띄우도록 그대로 돌려준다.
   */
  const runAction = useCallback(
    async (key: string, fn: () => Promise<AdminReservationResult>): Promise<AdminReservationResult> => {
      setBusy(key);
      let res: AdminReservationResult;
      try {
        res = await fn();
      } catch (e) {
        console.error("[AdminReservationsPanel]", e);
        res = { ok: false, message: "처리 중 오류가 났습니다. 잠시 후 다시 시도해 주세요." };
      }
      if (!res.needsOverride) setNotice({ tone: res.ok ? "ok" : "error", text: res.message });
      if (res.ok) await reload();
      setBusy(null);
      return res;
    },
    [reload, setNotice]
  );

  // ── 파생 데이터 ──
  const showById = useMemo(() => new Map(shows.map((s) => [s.id, s])), [shows]);

  const sessionsByShow = useMemo(() => {
    const map = new Map<string, ShowSession[]>();
    for (const s of sessions) {
      if (!map.has(s.show_id)) map.set(s.show_id, []);
      map.get(s.show_id)!.push(s);
    }
    return map;
  }, [sessions]);

  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  const statsByShow = useMemo(() => {
    const map = new Map<string, { confirmed: number; waitlisted: number; activeCount: number; total: number }>();
    for (const r of rows) {
      const cur = map.get(r.show_id) ?? { confirmed: 0, waitlisted: 0, activeCount: 0, total: 0 };
      cur.total += 1;
      if (r.status === "confirmed") cur.confirmed += r.party_size;
      if (r.status === "waitlisted") cur.waitlisted += r.party_size;
      if (r.status !== "cancelled") cur.activeCount += 1;
      map.set(r.show_id, cur);
    }
    return map;
  }, [rows]);

  const statsBySession = useMemo(() => {
    const map = new Map<string, { confirmed: number; waitlisted: number; activeCount: number }>();
    for (const r of rows) {
      if (!r.session_id) continue;
      const cur = map.get(r.session_id) ?? { confirmed: 0, waitlisted: 0, activeCount: 0 };
      if (r.status === "confirmed") cur.confirmed += r.party_size;
      if (r.status === "waitlisted") cur.waitlisted += r.party_size;
      if (r.status !== "cancelled") cur.activeCount += 1;
      map.set(r.session_id, cur);
    }
    return map;
  }, [rows]);

  const approvedShows = useMemo(() => shows.filter((s) => s.status === "approved"), [shows]);

  /** 카드로 보여 줄 공연 — 반려되지 않았고 자체 예매를 쓰는 공연, 또는 신청이 한 건이라도 있는 공연. */
  const cardShows = useMemo(() => {
    const list = shows.filter((s) => {
      if (statsByShow.has(s.id)) return true;
      if (s.status === "rejected") return false;
      return includeInhouseOff || s.use_inhouse_reservation !== false;
    });
    // 게시 중인 공연을 앞으로 — 실제로 신청을 받는 곳이 먼저 보여야 한다.
    return [...list].sort((a, b) => Number(b.status === "approved") - Number(a.status === "approved"));
  }, [shows, statsByShow, includeInhouseOff]);

  const inhouseOffCount = useMemo(
    () => shows.filter((s) => s.status !== "rejected" && s.use_inhouse_reservation === false && !statsByShow.has(s.id)).length,
    [shows, statsByShow]
  );

  const sessionLabel = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "—";
      const s = sessionById.get(id);
      return s ? formatSessionAt(s.session_at) : "—";
    },
    [sessionById]
  );
  const titleOf = useCallback(
    (r: Reservation) => r.show_title ?? showById.get(r.show_id)?.title ?? "(공연 정보 없음)",
    [showById]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/[\s-]/g, "");
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (showFilter !== "all" && r.show_id !== showFilter) return false;
      if (!q) return true;
      const name = (r.guest_name ?? "").toLowerCase();
      const contact = (r.guest_contact ?? "").toLowerCase();
      const code = r.reservation_code.toLowerCase();
      if (name.includes(q) || contact.includes(q) || code.includes(q)) return true;
      // 전화번호는 하이픈 유무와 상관없이 찾히게
      return qDigits.length >= 3 && contact.replace(/[\s-]/g, "").includes(qDigits);
    });
  }, [rows, statusFilter, showFilter, search]);

  const filteredTotals = useMemo(() => {
    let confirmed = 0;
    let waitlisted = 0;
    for (const r of filteredRows) {
      if (r.status === "confirmed") confirmed += r.party_size;
      if (r.status === "waitlisted") waitlisted += r.party_size;
    }
    return { confirmed, waitlisted };
  }, [filteredRows]);

  /** 목록 필터의 공연 선택지 — 신청이 있는 공연 + 카드에 보이는 공연 */
  const filterShowOptions = useMemo(() => {
    const ids = new Set<string>([...rows.map((r) => r.show_id), ...cardShows.map((s) => s.id)]);
    return [...ids].map((id) => ({
      id,
      title: showById.get(id)?.title ?? rows.find((r) => r.show_id === id)?.show_title ?? "(공연 정보 없음)",
    }));
  }, [rows, cardShows, showById]);

  // ═════════════════════ 공연 단위 조작 ═════════════════════

  const toggleClosed = (show: Show) => {
    const next = !show.reservation_closed;
    const apply = async () => {
      const res = await runAction(`show:${show.id}`, () => adminSetReservationClosed(show.id, next));
      if (res.ok) onShowPatched(show.id, { reservation_closed: next });
    };
    if (next) {
      setDialog({
        title: "예약 마감",
        message: `「${show.title}」의 좌석 신청을 마감합니다.\n\n관객은 더 이상 새로 신청할 수 없고, 이미 받은 신청은 그대로 남습니다. 취소로 자리가 나도 마감 중에는 대기자가 올라가지 않습니다.`,
        confirmLabel: "마감하기",
        danger: true,
        run: apply,
      });
      return;
    }
    void apply();
  };

  const saveCapacity = async (show: Show) => {
    if (!capacityEdit || capacityEdit.showId !== show.id) return;
    const raw = capacityEdit.value.trim();
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      setNotice({ tone: "error", text: "정원은 1 이상의 숫자로 넣어 주세요. 제한을 두지 않으려면 칸을 비워 주세요." });
      return;
    }
    const res = await runAction(`show:${show.id}`, () => adminSetShowCapacity(show.id, value));
    if (res.ok) {
      onShowPatched(show.id, { capacity: value });
      setCapacityEdit(null);
    }
  };

  const toggleInhouse = (show: Show) => {
    const next = show.use_inhouse_reservation === false;
    const apply = async () => {
      const res = await runAction(`show:${show.id}`, () => adminSetInhouseReservation(show.id, next));
      if (res.ok) onShowPatched(show.id, { use_inhouse_reservation: next });
    };
    if (!next) {
      setDialog({
        title: "자체 예매 끄기",
        message: `「${show.title}」 공연 페이지에서 좌석 신청 폼을 감춥니다.\n\n이미 받은 신청은 지워지지 않고 이 화면에 남습니다. 공연팀이 외부 신청 링크를 따로 쓰는 경우에만 꺼 주세요.`,
        confirmLabel: "끄기",
        danger: true,
        run: apply,
      });
      return;
    }
    void apply();
  };

  // ═════════════════════ 회차 조작 ═════════════════════

  const saveSessionCapacity = async (session: ShowSession) => {
    if (!sessionCapEdit || sessionCapEdit.sessionId !== session.id) return;
    const raw = sessionCapEdit.value.trim();
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      setNotice({ tone: "error", text: "회차 정원은 1 이상의 숫자로 넣어 주세요. 공연 전체 정원을 따르게 하려면 칸을 비워 주세요." });
      return;
    }
    const res = await runAction(`session:${session.id}`, () => adminSetSessionCapacity(session.id, value));
    if (res.ok) setSessionCapEdit(null);
  };

  const submitAddSession = async (show: Show) => {
    if (!addSession || addSession.showId !== show.id) return;
    if (!addSession.at) {
      setNotice({ tone: "error", text: "회차 날짜와 시간을 골라 주세요." });
      return;
    }
    const raw = addSession.cap.trim();
    const cap = raw === "" ? null : Number(raw);
    if (cap !== null && (!Number.isInteger(cap) || cap < 1)) {
      setNotice({ tone: "error", text: "회차 정원은 1 이상의 숫자로 넣어 주세요. 비워 두면 공연 전체 정원을 따릅니다." });
      return;
    }
    const res = await runAction(`addsession:${show.id}`, () => adminAddSession(show.id, addSession.at, cap));
    if (res.ok) setAddSession(null);
  };

  const deleteSession = (session: ShowSession) => {
    setDialog({
      title: "회차 지우기",
      message: `${formatSessionAt(session.session_at)} 회차를 지웁니다.\n\n이 회차에 걸린 신청은 모두 취소된 것들이라, 기록은 '회차 미지정'으로 남습니다.`,
      confirmLabel: "지우기",
      danger: true,
      run: async () => {
        await runAction(`session:${session.id}`, () => adminDeleteSession(session.id));
      },
    });
  };

  // ═════════════════════ 신청 한 건 조작 ═════════════════════

  const cancelRow = (r: Reservation) => {
    setDialog({
      title: "신청 취소",
      message: `${r.guest_name ?? "신청자"}님(${r.party_size}명, ${r.reservation_code})의 좌석 신청을 취소합니다.\n\n확정 신청이었다면 난 자리만큼 대기자가 자동으로 확정되고, 이메일 연락처인 분께 확정 메일이 나갑니다. 취소한 신청은 나중에 '되살리기'로 돌릴 수 있습니다.`,
      confirmLabel: "취소하기",
      danger: true,
      run: async () => {
        const waitingBefore = rows
          .filter((x) => x.show_id === r.show_id && x.status === "waitlisted")
          .map((x) => x.id);
        setBusy(`row:${r.id}`);
        let res: { ok: boolean; message: string };
        try {
          res = await cancelReservationAction(r.reservation_code, r.guest_contact ?? "");
        } catch {
          res = { ok: false, message: "취소 처리 중 오류가 났습니다." };
        }
        if (!res.ok) {
          setNotice({ tone: "error", text: res.message });
          setBusy(null);
          return;
        }
        const next = await reload();
        const promoted = next
          ? next.filter((x) => waitingBefore.includes(x.id) && x.status === "confirmed").length
          : 0;
        setNotice({
          tone: "ok",
          text:
            `${r.guest_name ?? "신청자"}님 신청을 취소했습니다.` +
            (promoted > 0
              ? ` 자리가 나서 대기 ${promoted}건이 자동으로 확정되었고, 이메일 연락처인 분께는 확정 메일이 나갔습니다.`
              : "") +
            (isEmail(r.guest_contact) ? " 취소 안내 메일은 따로 나가지 않으니, 필요하면 직접 알려 주세요." : ""),
        });
        setBusy(null);
      },
    });
  };

  const confirmRow = async (r: Reservation) => {
    const res = await runAction(`row:${r.id}`, () => adminConfirmWaitlisted(r.id));
    if (res.needsOverride) {
      setDialog({
        title: "정원을 넘겨 확정",
        message: `${res.message}\n\n정원을 넘긴 확정은 현장 좌석 사정을 공연팀과 먼저 확인한 뒤에 해 주세요.`,
        confirmLabel: "넘겨서 확정",
        danger: true,
        run: async () => {
          await runAction(`row:${r.id}`, () => adminConfirmWaitlisted(r.id, true));
        },
      });
    }
  };

  const restoreRow = (r: Reservation) => {
    setDialog({
      title: "신청 되살리기",
      message: `${r.guest_name ?? "신청자"}님(${r.party_size}명) 신청을 되살립니다.\n\n자리가 남아 있으면 '확정', 없으면 '대기'로 돌아가고, 이메일 연락처라면 바뀐 상태를 알리는 메일이 나갑니다.`,
      confirmLabel: "되살리기",
      run: async () => {
        await runAction(`row:${r.id}`, () => adminRestoreReservation(r.id));
      },
    });
  };

  const savePartySize = async (r: Reservation) => {
    if (!partyEdit || partyEdit.id !== r.id) return;
    const size = partyEdit.value;
    const res = await runAction(`row:${r.id}`, () => adminUpdatePartySize(r.id, size));
    if (res.ok) {
      setPartyEdit(null);
      return;
    }
    if (res.needsOverride) {
      setDialog({
        title: "정원을 넘겨 인원 늘리기",
        message: `${res.message}\n\n현장 좌석 사정을 공연팀과 먼저 확인한 뒤에 진행해 주세요.`,
        confirmLabel: "넘겨서 바꾸기",
        danger: true,
        run: async () => {
          const again = await runAction(`row:${r.id}`, () => adminUpdatePartySize(r.id, size, true));
          if (again.ok) setPartyEdit(null);
        },
      });
    }
  };

  const resendMail = async (r: Reservation) => {
    await runAction(`row:${r.id}`, () => adminResendConfirmation(r.id));
  };

  // ═════════════════════ 전화·현장 접수 ═════════════════════

  const proxyShowOptions = useMemo(() => approvedShows.filter((s) => !isEnded(s)), [approvedShows]);
  const proxyShow = proxy.showId ? showById.get(proxy.showId) ?? null : null;
  const proxySessions = proxy.showId ? sessionsByShow.get(proxy.showId) ?? [] : [];

  const submitProxy = async (e: FormEvent) => {
    e.preventDefault();
    if (!proxy.showId) {
      setNotice({ tone: "error", text: "공연을 골라 주세요." });
      return;
    }
    if (proxySessions.length > 1 && !proxy.sessionId) {
      setNotice({ tone: "error", text: "회차가 여러 개인 공연입니다. 관람 회차를 골라 주세요." });
      return;
    }
    const res = await runAction("create", () =>
      adminCreateReservation({
        showId: proxy.showId,
        sessionId: proxySessions.length > 1 ? proxy.sessionId : null,
        name: proxy.name,
        contact: proxy.contact,
        partySize: proxy.partySize,
      })
    );
    if (res.ok) {
      // 공연·회차는 그대로 두어 같은 공연의 전화 신청을 연달아 받기 쉽게 한다.
      setProxy((p) => ({ ...p, name: "", contact: "", partySize: 1 }));
    }
  };

  // ═════════════════════ 그리기 ═════════════════════

  const rowActions = (r: Reservation) => {
    const isBusy = busy === `row:${r.id}`;
    if (partyEdit?.id === r.id) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <label className="sr-only" htmlFor={`party-${r.id}`}>인원</label>
          <select
            id={`party-${r.id}`}
            value={partyEdit.value}
            onChange={(e) => setPartyEdit({ id: r.id, value: Number(e.target.value) })}
            disabled={isBusy}
            className={`px-2 py-1 text-xs ${FIELD_STATES}`}
            style={fieldStyle}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}명</option>
            ))}
          </select>
          <Btn variant="primary" disabled={isBusy} onClick={() => savePartySize(r)}>
            {isBusy ? "저장 중…" : "저장"}
          </Btn>
          <Btn variant="quiet" disabled={isBusy} onClick={() => setPartyEdit(null)}>닫기</Btn>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {r.status === "waitlisted" && (
          <Btn variant="primary" disabled={isBusy} onClick={() => confirmRow(r)}>
            {isBusy ? "처리 중…" : "확정"}
          </Btn>
        )}
        {r.status !== "cancelled" && (
          <Btn disabled={isBusy} onClick={() => setPartyEdit({ id: r.id, value: r.party_size })}>인원</Btn>
        )}
        {r.status === "confirmed" && isEmail(r.guest_contact) && (
          <Btn disabled={isBusy} onClick={() => resendMail(r)} title="확정 메일을 다시 보냅니다">
            메일 다시
          </Btn>
        )}
        {r.status !== "cancelled" && (
          <Btn variant="dangerOutline" disabled={isBusy} onClick={() => cancelRow(r)}>취소</Btn>
        )}
        {r.status === "cancelled" && (
          <Btn disabled={isBusy} onClick={() => restoreRow(r)}>{isBusy ? "처리 중…" : "되살리기"}</Btn>
        )}
      </div>
    );
  };

  const sectionTitle = (id: string, text: string, sub?: string) => (
    <div className="mb-4">
      <h2 id={id} className="text-lg font-bold" style={{ fontFamily: SERIF, color: C.teal }}>{text}</h2>
      {sub && (
        <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: SANS, color: C.sub }}>{sub}</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-12" style={{ fontFamily: SANS, color: C.text }}>
      {/* 처리 결과 한 줄 */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3 text-xs flex items-start justify-between gap-3"
          style={{
            backgroundColor: notice.tone === "ok" ? C.surface : C.dangerBg,
            color: notice.tone === "ok" ? "#3A2E27" : C.danger,
            border: `1px solid ${notice.tone === "ok" ? C.border : C.danger}`,
            lineHeight: 1.7,
          }}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="알림 닫기"
            className={`shrink-0 ${BTN_STATES}`}
            style={{ color: C.sub }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────── 1) 공연별 예약 현황 ─────────── */}
      <section aria-labelledby="rsv-shows-heading">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 id="rsv-shows-heading" className="text-lg font-bold" style={{ fontFamily: SERIF, color: C.teal }}>
              공연별 예약 현황
            </h2>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: C.sub }}>
              정원·마감·자체 예매·회차를 공연마다 손볼 수 있습니다. 정원을 늘리거나 마감을 풀면
              대기자가 순서대로 확정되고, 그분들께 확정 메일이 나갑니다.
            </p>
          </div>
          <Btn onClick={() => { void reload(); }} disabled={busy !== null}>새로고침</Btn>
        </div>

        {approvedShows.length === 0 && (
          <div className="p-5 mb-4 text-sm leading-relaxed" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: SERIF, color: C.teal, fontWeight: 600 }} className="mb-2">
              아직 게시 중인 공연이 없습니다.
            </p>
            <p className="text-xs" style={{ color: C.sub }}>
              좌석 신청은 승인된 공연에서만 받을 수 있습니다. 공연이 승인되면 이곳에서 정원과 마감을
              조정하고, 회차를 나누고, 전화로 받은 신청을 대신 넣을 수 있습니다.
              승인을 기다리는 공연은{" "}
              <a href="/admin?tab=shows" className={`underline ${BTN_STATES}`} style={{ color: C.teal }}>
                공연 승인 탭
              </a>
              에서 살펴보실 수 있습니다.
            </p>
          </div>
        )}

        {cardShows.length === 0 ? (
          approvedShows.length > 0 && (
            <p className="text-xs py-6" style={{ color: C.sub }}>
              자체 예매를 쓰는 공연이 아직 없습니다. 아래 &lsquo;자체 예매를 끈 공연도 보기&rsquo;로 꺼 둔 공연을 열어 켤 수 있습니다.
            </p>
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cardShows.map((show) => {
              const st = statsByShow.get(show.id) ?? { confirmed: 0, waitlisted: 0, activeCount: 0, total: 0 };
              const showSessions = sessionsByShow.get(show.id) ?? [];
              const ended = isEnded(show);
              const inhouseOff = show.use_inhouse_reservation === false;
              const isBusy = busy === `show:${show.id}`;
              const showBadge = SHOW_STATUS[show.status] ?? { label: show.status, bg: C.surface, color: C.sub };
              const period = formatShowPeriod(show.schedule_start, show.schedule_end);
              const legacyRows = showSessions.length > 0
                ? rows.filter((r) => r.show_id === show.id && !r.session_id && r.status !== "cancelled").length
                : 0;
              const showRows = rows.filter((r) => r.show_id === show.id);

              return (
                <article
                  key={show.id}
                  className="p-5 flex flex-col gap-3"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold leading-snug break-keep" style={{ fontFamily: SERIF, color: C.text }}>
                      {show.title}
                    </h3>
                    <Badge {...showBadge} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ended && <Badge label="종료된 공연" bg={C.bg} color={C.sub} />}
                    {show.reservation_closed && <Badge label="예약 마감 중" bg={C.dangerBg} color={C.danger} />}
                    {inhouseOff && <Badge label="자체 예매 꺼짐" bg={C.bg} color={C.damson} />}
                  </div>
                  {(period || show.venue) && (
                    <p className="text-xs" style={{ color: C.sub }}>
                      {period}{period && show.venue ? " · " : ""}{show.venue}
                    </p>
                  )}

                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <div className="py-2" style={{ backgroundColor: C.bg }}>
                      <dt className="text-[11px]" style={{ color: C.sub }}>확정 / 정원</dt>
                      <dd className="text-sm font-semibold" style={{ fontFamily: INTER, color: C.teal }}>
                        {st.confirmed}
                        <span style={{ color: C.sub, fontWeight: 400 }}> / {show.capacity != null ? show.capacity : "무제한"}</span>
                      </dd>
                    </div>
                    <div className="py-2" style={{ backgroundColor: C.bg }}>
                      <dt className="text-[11px]" style={{ color: C.sub }}>대기</dt>
                      <dd className="text-sm font-semibold" style={{ fontFamily: INTER, color: st.waitlisted ? C.damson : C.sub }}>
                        {st.waitlisted}명
                      </dd>
                    </div>
                    <div className="py-2" style={{ backgroundColor: C.bg }}>
                      <dt className="text-[11px]" style={{ color: C.sub }}>회차</dt>
                      <dd className="text-sm font-semibold" style={{ fontFamily: INTER, color: C.text }}>
                        {sessionsAvailable ? `${showSessions.length}개` : "—"}
                      </dd>
                    </div>
                  </dl>

                  {show.status !== "approved" && (
                    <p className="text-xs" style={{ color: C.sub }}>
                      승인 전 공연이라 아직 관객 신청을 받지 않습니다. 정원과 회차는 미리 맞춰 둘 수 있습니다.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Btn
                      variant={show.reservation_closed ? "primary" : "dangerOutline"}
                      disabled={isBusy}
                      onClick={() => toggleClosed(show)}
                    >
                      {show.reservation_closed ? "예약 다시 열기" : "예약 마감"}
                    </Btn>
                    <Btn
                      disabled={isBusy}
                      aria-expanded={capacityEdit?.showId === show.id}
                      onClick={() =>
                        setCapacityEdit(
                          capacityEdit?.showId === show.id
                            ? null
                            : { showId: show.id, value: show.capacity != null ? String(show.capacity) : "" }
                        )
                      }
                    >
                      정원 변경
                    </Btn>
                    <Btn disabled={isBusy} onClick={() => toggleInhouse(show)}>
                      {inhouseOff ? "자체 예매 켜기" : "자체 예매 끄기"}
                    </Btn>
                    <a
                      href={`/muol/performer/reservations/${show.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-3 py-1.5 text-xs tracking-wide whitespace-nowrap ${BTN_STATES}`}
                      style={{ fontFamily: SANS, color: C.text, border: `1px solid ${C.border}` }}
                    >
                      명단 페이지 ↗
                    </a>
                    <Btn
                      disabled={showRows.length === 0}
                      onClick={() => downloadCsv(`예약자명단_${show.title}.csv`, showRows, sessionLabel, titleOf)}
                    >
                      CSV
                    </Btn>
                  </div>

                  {capacityEdit?.showId === show.id && (
                    <form
                      className="flex flex-wrap items-end gap-2 p-3"
                      style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                      onSubmit={(e) => { e.preventDefault(); void saveCapacity(show); }}
                    >
                      <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
                        공연 전체 정원(석)
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={capacityEdit.value}
                          onChange={(e) => setCapacityEdit({ showId: show.id, value: e.target.value })}
                          placeholder="비우면 무제한"
                          className={`w-32 px-2 py-1.5 text-sm ${FIELD_STATES}`}
                          style={fieldStyle}
                          disabled={isBusy}
                        />
                      </label>
                      <Btn type="submit" variant="primary" disabled={isBusy}>{isBusy ? "저장 중…" : "저장"}</Btn>
                      <Btn variant="quiet" disabled={isBusy} onClick={() => setCapacityEdit(null)}>닫기</Btn>
                      <p className="w-full text-[11px] leading-relaxed" style={{ color: C.sub }}>
                        칸을 비우면 무제한입니다. 줄여도 이미 확정된 신청은 그대로 남습니다.
                        회차 정원을 비워 둔 회차는 이 숫자를 따릅니다.
                      </p>
                    </form>
                  )}

                  {sessionsAvailable && (
                    <details className="group" style={{ borderTop: `1px solid ${C.border}` }}>
                      <summary
                        className={`cursor-pointer pt-3 text-xs select-none ${BTN_STATES}`}
                        style={{ color: C.teal, fontWeight: 600 }}
                      >
                        회차 관리 ({showSessions.length})
                      </summary>
                      <div className="mt-3 flex flex-col gap-2">
                        {showSessions.length === 0 && (
                          <p className="text-xs leading-relaxed" style={{ color: C.sub }}>
                            회차가 없는 공연입니다. 신청은 공연 전체 정원 하나로 셉니다.
                            날짜·시간마다 정원을 나누려면 아래에서 회차를 추가해 주세요.
                          </p>
                        )}
                        {legacyRows > 0 && (
                          <p className="text-[11px]" style={{ color: C.damson }}>
                            회차가 정해지지 않은 신청 {legacyRows}건이 있습니다(회차 기능 이전 신청). 회차 정원에는 잡히지 않습니다.
                          </p>
                        )}
                        {showSessions.map((s) => {
                          const ss = statsBySession.get(s.id) ?? { confirmed: 0, waitlisted: 0, activeCount: 0 };
                          const effective = s.capacity ?? show.capacity ?? null;
                          const passed = sessionPassed(s.session_at);
                          const sBusy = busy === `session:${s.id}`;
                          const editing = sessionCapEdit?.sessionId === s.id;
                          return (
                            <div key={s.id} className="p-3 flex flex-col gap-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                <span className="text-sm" style={{ fontFamily: SERIF, color: passed ? C.sub : C.text }}>
                                  {formatSessionAt(s.session_at)}
                                  {passed && <span className="text-[11px] ml-1.5" style={{ color: C.sub }}>(지난 회차)</span>}
                                </span>
                                <span className="text-xs" style={{ color: C.sub }}>
                                  확정 {ss.confirmed} / {effective != null ? `${effective}석` : "무제한"}
                                  {s.capacity == null && show.capacity != null && " (공연 정원 따름)"}
                                  {ss.waitlisted > 0 && ` · 대기 ${ss.waitlisted}명`}
                                </span>
                              </div>
                              {editing ? (
                                <form
                                  className="flex flex-wrap items-end gap-2"
                                  onSubmit={(e) => { e.preventDefault(); void saveSessionCapacity(s); }}
                                >
                                  <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
                                    회차 정원(석)
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      value={sessionCapEdit.value}
                                      onChange={(e) => setSessionCapEdit({ sessionId: s.id, value: e.target.value })}
                                      placeholder="비우면 공연 정원"
                                      className={`w-32 px-2 py-1.5 text-sm ${FIELD_STATES}`}
                                      style={fieldStyle}
                                      disabled={sBusy}
                                    />
                                  </label>
                                  <Btn type="submit" variant="primary" disabled={sBusy}>{sBusy ? "저장 중…" : "저장"}</Btn>
                                  <Btn variant="quiet" disabled={sBusy} onClick={() => setSessionCapEdit(null)}>닫기</Btn>
                                </form>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Btn
                                    disabled={sBusy}
                                    onClick={() => setSessionCapEdit({ sessionId: s.id, value: s.capacity != null ? String(s.capacity) : "" })}
                                  >
                                    정원 변경
                                  </Btn>
                                  <Btn
                                    variant="dangerOutline"
                                    disabled={sBusy || ss.activeCount > 0}
                                    onClick={() => deleteSession(s)}
                                    aria-describedby={ss.activeCount > 0 ? `session-lock-${s.id}` : undefined}
                                  >
                                    회차 지우기
                                  </Btn>
                                  {ss.activeCount > 0 && (
                                    <span id={`session-lock-${s.id}`} className="text-[11px]" style={{ color: C.sub }}>
                                      살아 있는 신청 {ss.activeCount}건이 있어 지울 수 없습니다.
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {addSession?.showId === show.id ? (
                          <form
                            className="p-3 flex flex-wrap items-end gap-2"
                            style={{ backgroundColor: C.bg, border: `1px dashed ${C.border}` }}
                            onSubmit={(e) => { e.preventDefault(); void submitAddSession(show); }}
                          >
                            <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
                              날짜·시간(한국 시간)
                              <input
                                type="datetime-local"
                                value={addSession.at}
                                onChange={(e) => setAddSession({ ...addSession, at: e.target.value })}
                                className={`px-2 py-1.5 text-sm ${FIELD_STATES}`}
                                style={fieldStyle}
                                required
                                disabled={busy === `addsession:${show.id}`}
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
                              회차 정원(선택)
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={addSession.cap}
                                onChange={(e) => setAddSession({ ...addSession, cap: e.target.value })}
                                placeholder="비우면 공연 정원"
                                className={`w-32 px-2 py-1.5 text-sm ${FIELD_STATES}`}
                                style={fieldStyle}
                                disabled={busy === `addsession:${show.id}`}
                              />
                            </label>
                            <Btn type="submit" variant="primary" disabled={busy === `addsession:${show.id}`}>
                              {busy === `addsession:${show.id}` ? "추가 중…" : "추가"}
                            </Btn>
                            <Btn variant="quiet" onClick={() => setAddSession(null)}>닫기</Btn>
                            {showSessions.length === 1 && (
                              <p className="w-full text-[11px]" style={{ color: C.sub }}>
                                회차가 두 개가 되면 관객은 신청할 때 회차를 골라야 합니다.
                              </p>
                            )}
                          </form>
                        ) : (
                          <div>
                            <Btn onClick={() => setAddSession({ showId: show.id, at: "", cap: "" })}>+ 회차 추가</Btn>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {(inhouseOffCount > 0 || includeInhouseOff) && (
          <label className="mt-4 inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: C.sub }}>
            <input
              type="checkbox"
              checked={includeInhouseOff}
              onChange={(e) => setIncludeInhouseOff(e.target.checked)}
              className={FIELD_STATES}
            />
            자체 예매를 끈 공연도 보기{inhouseOffCount > 0 ? ` (${inhouseOffCount})` : ""}
          </label>
        )}
      </section>

      {/* ─────────── 2) 전화·현장 접수 ─────────── */}
      <section aria-labelledby="rsv-proxy-heading">
        {sectionTitle(
          "rsv-proxy-heading",
          "전화·현장 접수",
          "전화나 현장에서 부탁받은 좌석을 대신 넣습니다. 관객 신청과 같은 규칙(정원·마감·종료)을 거치고, 연락처가 이메일이면 확인 메일이 나갑니다."
        )}
        {proxyShowOptions.length === 0 ? (
          <p className="text-xs leading-relaxed p-4" style={{ color: C.sub, backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            지금 신청을 받을 수 있는 공연(게시 중이고 아직 끝나지 않은 공연)이 없습니다.
            공연이 승인되면 이곳에서 바로 접수할 수 있습니다.
          </p>
        ) : (
          <form
            onSubmit={submitProxy}
            className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
            data-clarity-mask="True"
          >
            <label className="flex flex-col gap-1 text-xs sm:col-span-2 lg:col-span-1" style={{ color: C.sub }}>
              공연
              <select
                value={proxy.showId}
                onChange={(e) => setProxy((p) => ({ ...p, showId: e.target.value, sessionId: "" }))}
                className={`px-2 py-2 text-sm ${FIELD_STATES}`}
                style={fieldStyle}
                required
              >
                <option value="">공연을 골라 주세요</option>
                {proxyShowOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}{s.reservation_closed ? " (마감 중)" : ""}
                  </option>
                ))}
              </select>
            </label>

            {proxySessions.length > 1 && (
              <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
                회차
                <select
                  value={proxy.sessionId}
                  onChange={(e) => setProxy((p) => ({ ...p, sessionId: e.target.value }))}
                  className={`px-2 py-2 text-sm ${FIELD_STATES}`}
                  style={fieldStyle}
                  required
                >
                  <option value="">회차를 골라 주세요</option>
                  {proxySessions.map((s) => {
                    const passed = sessionPassed(s.session_at);
                    return (
                      <option key={s.id} value={s.id} disabled={passed}>
                        {formatSessionAt(s.session_at)}{passed ? " (지난 회차)" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
            {proxySessions.length === 1 && (
              <p className="text-xs self-end pb-2" style={{ color: C.sub }}>
                회차: {formatSessionAt(proxySessions[0].session_at)} (하나뿐이라 자동으로 잡힙니다)
              </p>
            )}

            <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
              이름
              <input
                type="text"
                value={proxy.name}
                onChange={(e) => setProxy((p) => ({ ...p, name: e.target.value }))}
                maxLength={50}
                autoComplete="off"
                className={`px-2 py-2 text-sm ${FIELD_STATES}`}
                style={fieldStyle}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
              연락처(전화 또는 이메일)
              <input
                type="text"
                value={proxy.contact}
                onChange={(e) => setProxy((p) => ({ ...p, contact: e.target.value }))}
                maxLength={100}
                autoComplete="off"
                className={`px-2 py-2 text-sm ${FIELD_STATES}`}
                style={fieldStyle}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
              인원
              <select
                value={proxy.partySize}
                onChange={(e) => setProxy((p) => ({ ...p, partySize: Number(e.target.value) }))}
                className={`px-2 py-2 text-sm ${FIELD_STATES}`}
                style={fieldStyle}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}명</option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              {proxyShow?.reservation_closed && (
                <p className="text-[11px]" style={{ color: C.danger }}>
                  이 공연은 예약이 마감되어 있어 접수되지 않습니다. 대신 넣으려면 위 공연 카드에서 &lsquo;예약 다시 열기&rsquo;를 먼저 눌러 주세요.
                </p>
              )}
              <div>
                <Btn type="submit" variant="primary" disabled={busy === "create"}>
                  {busy === "create" ? "넣는 중…" : "신청 넣기"}
                </Btn>
              </div>
              <p className="text-[11px]" style={{ color: C.sub }}>
                받은 분께 신청 사실과 연락처 사용 목적(공연 안내)을 말씀드린 뒤 넣어 주세요.
              </p>
            </div>
          </form>
        )}
      </section>

      {/* ─────────── 3) 신청 목록 ─────────── */}
      <section aria-labelledby="rsv-list-heading">
        <h2 id="rsv-list-heading" className="text-lg font-bold" style={{ fontFamily: SERIF, color: C.teal }}>
          신청 목록
        </h2>
        <p className="text-xs mt-1 mb-4 leading-relaxed" style={{ color: C.sub }}>
          대기자 확정, 인원 수정, 취소와 되살리기, 확정 메일 다시 보내기를 한 건씩 할 수 있습니다.
        </p>

        {rows.length === 0 ? (
          <div className="p-5 text-xs leading-relaxed" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.sub }}>
            <p className="text-sm mb-2" style={{ fontFamily: SERIF, color: C.teal, fontWeight: 600 }}>
              아직 접수된 좌석 신청이 없습니다.
            </p>
            관객이 공연 페이지에서 좌석을 신청하거나, 위 &lsquo;전화·현장 접수&rsquo;로 대신 넣으면 이곳에 차례로 쌓입니다.
            쌓인 신청은 걸러 보고, 대기자를 확정하고, 인원을 고치고, CSV로 내려받을 수 있습니다.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <label className="flex flex-col gap-1 text-xs" style={{ color: C.sub }}>
                상태
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className={`px-2 py-1.5 text-sm ${FIELD_STATES}`}
                  style={fieldStyle}
                >
                  <option value="all">전체</option>
                  <option value="confirmed">확정</option>
                  <option value="waitlisted">대기</option>
                  <option value="cancelled">취소</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs min-w-0 max-w-full" style={{ color: C.sub }}>
                공연
                <select
                  value={showFilter}
                  onChange={(e) => setShowFilter(e.target.value)}
                  className={`px-2 py-1.5 text-sm max-w-[16rem] ${FIELD_STATES}`}
                  style={fieldStyle}
                >
                  <option value="all">모든 공연</option>
                  {filterShowOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs flex-1 min-w-[10rem]" style={{ color: C.sub }}>
                찾기
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="이름·연락처·신청번호"
                  className={`px-2 py-1.5 text-sm w-full ${FIELD_STATES}`}
                  style={fieldStyle}
                />
              </label>
              <Btn
                variant="primary"
                disabled={filteredRows.length === 0}
                onClick={() => {
                  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).replace(/-/g, "");
                  downloadCsv(`예약신청_${stamp}.csv`, filteredRows, sessionLabel, titleOf);
                }}
              >
                보이는 목록 CSV
              </Btn>
            </div>
            <p className="text-xs mb-1" style={{ color: C.sub }}>
              {filteredRows.length}건 · 확정 {filteredTotals.confirmed}명 · 대기 {filteredTotals.waitlisted}명
            </p>
            <p className="text-[11px] mb-4" style={{ color: C.sub }}>{PRIVACY_LINE}</p>

            {filteredRows.length === 0 ? (
              <p className="text-xs py-10 text-center" style={{ color: C.sub }}>
                조건에 맞는 신청이 없습니다. 상태·공연·검색어를 풀어 보세요.
              </p>
            ) : (
              <>
                {/* 넓은 화면 — 표 */}
                <div className="hidden md:block overflow-x-auto" data-clarity-mask="True">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["신청일시", "공연", "회차", "신청자", "연락처", "인원", "신청번호", "상태", "관리"].map((h) => (
                          <th key={h} scope="col" className="text-left py-3 px-2 text-xs tracking-wider whitespace-nowrap" style={{ fontFamily: INTER, color: C.sub }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => {
                        const s = RESERVATION_STATUS[r.status] ?? RESERVATION_STATUS.confirmed;
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${C.surface}`, opacity: r.status === "cancelled" ? 0.75 : 1 }}>
                            <td className="py-3 px-2 text-xs whitespace-nowrap" style={{ color: C.sub }}>{formatCreatedAt(r.created_at)}</td>
                            <td className="py-3 px-2" style={{ fontFamily: SERIF, color: C.text }}>{titleOf(r)}</td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap" style={{ color: C.sub }}>{sessionLabel(r.session_id)}</td>
                            <td className="py-3 px-2" style={{ color: C.text }}>{r.guest_name ?? "-"}</td>
                            <td className="py-3 px-2 text-xs" style={{ color: C.sub }}><ContactLink contact={r.guest_contact} /></td>
                            <td className="py-3 px-2 whitespace-nowrap" style={{ color: C.text }}>{r.party_size}명</td>
                            <td className="py-3 px-2 text-xs whitespace-nowrap" style={{ fontFamily: INTER, color: C.sub }}>{r.reservation_code}</td>
                            <td className="py-3 px-2"><Badge {...s} /></td>
                            <td className="py-3 px-2">{rowActions(r)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 좁은 화면 — 카드 */}
                <ul className="md:hidden flex flex-col gap-3" data-clarity-mask="True">
                  {filteredRows.map((r) => {
                    const s = RESERVATION_STATUS[r.status] ?? RESERVATION_STATUS.confirmed;
                    return (
                      <li
                        key={r.id}
                        className="p-4 flex flex-col gap-2"
                        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, opacity: r.status === "cancelled" ? 0.8 : 1 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold" style={{ color: C.text }}>
                            {r.guest_name ?? "-"} · {r.party_size}명
                          </span>
                          <Badge {...s} />
                        </div>
                        <p className="text-xs" style={{ fontFamily: SERIF, color: C.text }}>{titleOf(r)}</p>
                        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1 text-xs" style={{ color: C.sub }}>
                          <dt>회차</dt><dd>{sessionLabel(r.session_id)}</dd>
                          <dt>연락처</dt><dd className="min-w-0 break-all"><ContactLink contact={r.guest_contact} /></dd>
                          <dt>신청번호</dt><dd style={{ fontFamily: INTER }}>{r.reservation_code}</dd>
                          <dt>신청일시</dt><dd>{formatCreatedAt(r.created_at)}</dd>
                        </dl>
                        <div className="pt-1">{rowActions(r)}</div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title}
        message={dialog?.message ?? ""}
        confirmLabel={dialog?.confirmLabel}
        danger={dialog?.danger}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          const run = dialog?.run;
          setDialog(null);
          if (run) void run();
        }}
      />
    </div>
  );
}

export default AdminReservationsPanel;
