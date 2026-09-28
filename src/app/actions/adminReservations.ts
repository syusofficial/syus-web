"use server";

/**
 * 관리자 예약 관리 server action — 2026-09-28 신설.
 *
 * ─ 왜 만들었나 ────────────────────────────────────────────────
 * 관리자 페이지 「예약 관리」 탭은 신청 목록 한 장과 작은 "취소" 글자 하나뿐이었다.
 * 사장님 말씀 그대로 "관리자가 행할 수 있는 기능이 아무 것도 존재하지 않"았다.
 * 전화로 좌석을 부탁받아도 대신 넣어 줄 수 없었고, 잘못 취소한 신청을 되살릴 수도,
 * 대기자를 직접 확정할 수도, 정원을 고칠 수도 없었다. 이 파일이 그 손잡이들이다.
 *
 * ─ 설계 규칙 ──────────────────────────────────────────────────
 * - 모든 action은 `assertAdmin()`으로 시작한다. 클라이언트가 보낸 값은 믿지 않는다.
 * - 쓰기는 가능한 한 관리자 세션 클라이언트로 한다. RLS가 이미 관리자에게
 *   syus_reservations update, show_sessions 전체, shows update를 열어 두었기 때문이다.
 *   service role은 대리 신청(submit_reservation RPC) 한 곳에만 쓴다 — 관리자 세션으로
 *   부르면 auth.uid()가 관리자 본인이라 신청이 "관리자 계정의 신청"으로 저장되기 때문이다.
 *   service role로 부르면 auth.uid()가 비어 게스트 경로(이름·연락처 필수)를 타고,
 *   정원 잠금·마감·종료 가드는 그대로 적용된다.
 * - 메일은 best-effort. 발송이 실패해도 처리 자체는 되돌리지 않고, 결과 문장에
 *   "메일은 못 보냈다"를 분명히 적어 운영자가 직접 연락할 수 있게 한다.
 *
 * ─ 정원 변경·마감 해제와 메일 ────────────────────────────────────
 * DB 트리거(syus_promote_waitlist_on_capacity_change, ..._session_capacity_change)가
 * 정원이 늘거나 마감이 풀리면 대기자를 자동으로 확정한다. 그런데 트리거는 메일을 못 보낸다.
 * 그래서 여기서는 "바꾸기 전 대기 목록 → 바꾸기 → 바꾼 뒤 확정된 사람" 차이를 읽어,
 * 트리거가 올려 준 사람에게 확정 메일을 이어서 보낸다.
 *
 * ─ 수동 확정·되살리기·인원 수정의 한계 ──────────────────────────
 * 이 세 가지는 새 SQL 없이 행 update로 처리한다. DB 함수들이 쓰는 advisory lock을
 * 여기서는 잡을 수 없으므로, 관객 신청과 정확히 같은 순간에 겹치면 정원 계산이
 * 한 명쯤 어긋날 수 있다. 관리자가 한 건씩 눈으로 보고 누르는 조작이고, 정원 초과는
 * 어차피 "알고 넘기는" 경고를 거치므로 받아들일 수 있는 수준으로 보았다.
 * 같은 이유로 인원을 줄여 자리가 나도 대기자를 자동으로 올리지 않는다 — 잠금 없이
 * 여러 행을 연달아 바꾸는 것은 위험하고, 누구를 올릴지 운영자가 보고 정하는 편이 낫다.
 */

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { ReservationConfirmedEmail } from "@/lib/email/templates/reservation-confirmed";
import { ReservationWaitlistedEmail } from "@/lib/email/templates/reservation-waitlisted";

export type AdminReservationResult = {
  ok: boolean;
  message: string;
  /** 정원을 넘기게 되는 조작 — 화면이 한 번 더 확인을 받은 뒤 override로 다시 부른다. */
  needsOverride?: boolean;
  /** 되살리기·대리 신청 결과 상태 */
  status?: "confirmed" | "waitlisted";
  code?: string;
};

type RowLite = {
  id: string;
  show_id: string;
  session_id: string | null;
  guest_name: string | null;
  guest_contact: string | null;
  party_size: number;
  status: "confirmed" | "waitlisted" | "cancelled";
  reservation_code: string;
};

const ROW_COLUMNS = "id, show_id, session_id, guest_name, guest_contact, party_size, status, reservation_code";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 정원 상한 — 오타(0 하나 더)로 정원이 사실상 무제한이 되는 것을 막는 상식선. */
const CAPACITY_MAX = 100000;

/** submit_reservation 실패 사유 → 관리자에게 보여 줄 문장. 관객용(reservations.ts)과 달리 "무엇을 하면 되는지"까지 적는다. */
const SUBMIT_REASON_MESSAGES: Record<string, string> = {
  invalid_party_size: "인원은 1~10명 사이로 넣어 주세요.",
  guest_info_required: "이름과 연락처를 모두 넣어 주세요.",
  show_not_found: "승인된 공연에서만 신청을 받을 수 있습니다. 공연 상태를 확인해 주세요.",
  reservation_closed: "예약이 마감된 공연입니다. 대신 접수하려면 공연 카드에서 '예약 다시 열기'를 누른 뒤 넣어 주세요.",
  session_required: "회차가 여러 개인 공연입니다. 관람 회차를 골라 주세요.",
  session_not_found: "고른 회차를 찾을 수 없습니다. 새로고침 후 다시 골라 주세요.",
  show_ended: "이미 끝난 공연이라 신청을 받을 수 없습니다.",
  session_ended: "이미 지난 회차입니다. 다른 회차를 골라 주세요.",
};

function isEmail(contact: string | null | undefined): contact is string {
  return !!contact && EMAIL_RE.test(contact.trim());
}

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

/** 정원 입력값 검증 — null은 "무제한"(공연) 또는 "공연 정원 따름"(회차). */
function validateCapacity(capacity: number | null): string | null {
  if (capacity === null) return null;
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > CAPACITY_MAX) {
    return "정원은 1 이상의 숫자로 넣어 주세요. 제한을 두지 않으려면 칸을 비워 주세요.";
  }
  return null;
}

async function fetchRow(supabase: SupabaseClient, id: string): Promise<RowLite | null> {
  const { data } = await supabase.from("syus_reservations").select(ROW_COLUMNS).eq("id", id).maybeSingle();
  return (data as RowLite | null) ?? null;
}

async function fetchShowTitle(supabase: SupabaseClient, showId: string): Promise<string> {
  const { data } = await supabase.from("shows").select("title").eq("id", showId).maybeSingle();
  return (data?.title as string | undefined) ?? "공연";
}

/**
 * 한 신청이 속한 "정원 계산 단위"의 정원과 현재 확정 인원.
 *
 * submit_reservation과 똑같은 규칙을 따른다.
 *   - 회차가 있으면: 회차 정원(비어 있으면 공연 정원 상속), 확정 인원은 그 회차 안에서만.
 *   - 회차가 없으면(레거시): 공연 정원, 확정 인원은 공연 전체.
 * excludeId를 주면 그 신청은 확정 합계에서 뺀다(인원 수정 때 자기 자신을 두 번 세지 않게).
 */
async function seatUnit(
  supabase: SupabaseClient,
  row: Pick<RowLite, "show_id" | "session_id">,
  excludeId?: string
): Promise<{ capacity: number | null; confirmed: number; closed: boolean }> {
  const { data: show } = await supabase
    .from("shows")
    .select("capacity, reservation_closed")
    .eq("id", row.show_id)
    .maybeSingle();
  const showCapacity = (show?.capacity as number | null | undefined) ?? null;
  const closed = !!show?.reservation_closed;

  let capacity = showCapacity;
  let query = supabase.from("syus_reservations").select("id, party_size").eq("status", "confirmed");

  if (row.session_id) {
    const { data: session } = await supabase
      .from("show_sessions")
      .select("capacity")
      .eq("id", row.session_id)
      .maybeSingle();
    capacity = (session?.capacity as number | null | undefined) ?? showCapacity;
    query = query.eq("session_id", row.session_id);
  } else {
    query = query.eq("show_id", row.show_id);
  }

  const { data: confirmedRows } = await query;
  const confirmed = ((confirmedRows ?? []) as { id: string; party_size: number }[])
    .filter((r) => r.id !== excludeId)
    .reduce((sum, r) => sum + (r.party_size ?? 0), 0);

  return { capacity, confirmed, closed };
}

/** 같은 정원 단위에 대기 중인 신청 수 — 인원을 줄여 자리가 났을 때 안내용. */
async function waitlistedCountInUnit(supabase: SupabaseClient, row: Pick<RowLite, "show_id" | "session_id">): Promise<number> {
  let query = supabase
    .from("syus_reservations")
    .select("id", { count: "exact", head: true })
    .eq("status", "waitlisted");
  query = row.session_id ? query.eq("session_id", row.session_id) : query.eq("show_id", row.show_id).is("session_id", null);
  const { count } = await query;
  return count ?? 0;
}

/** 확정 메일 한 통. 이메일 연락처가 아니면 보내지 않고 "skipped"를 돌려준다. */
async function mailConfirmed(
  row: Pick<RowLite, "guest_contact" | "guest_name" | "reservation_code" | "party_size">,
  showTitle: string,
  subject: string
): Promise<"sent" | "failed" | "skipped"> {
  if (!isEmail(row.guest_contact)) return "skipped";
  const res = await sendMail({
    to: row.guest_contact.trim(),
    subject,
    react: ReservationConfirmedEmail({
      name: row.guest_name,
      showTitle,
      code: row.reservation_code,
      partySize: row.party_size,
    }),
  });
  if (!res.ok) console.warn("[adminReservations] 확정 메일 발송 실패:", res.error);
  return res.ok ? "sent" : "failed";
}

async function mailWaitlisted(
  row: Pick<RowLite, "guest_contact" | "guest_name" | "reservation_code" | "party_size">,
  showTitle: string,
  subject: string
): Promise<"sent" | "failed" | "skipped"> {
  if (!isEmail(row.guest_contact)) return "skipped";
  const res = await sendMail({
    to: row.guest_contact.trim(),
    subject,
    react: ReservationWaitlistedEmail({
      name: row.guest_name,
      showTitle,
      code: row.reservation_code,
      partySize: row.party_size,
    }),
  });
  if (!res.ok) console.warn("[adminReservations] 대기 접수 메일 발송 실패:", res.error);
  return res.ok ? "sent" : "failed";
}

/** 메일 결과 한 마디 — 결과 문장 끝에 붙인다. */
function mailPhrase(result: "sent" | "failed" | "skipped"): string {
  if (result === "sent") return "안내 메일을 보냈습니다.";
  if (result === "failed") return "안내 메일은 보내지 못했습니다 — 직접 연락이 필요합니다.";
  return "연락처가 이메일이 아니라 메일은 나가지 않았습니다 — 필요하면 직접 연락해 주세요.";
}

/** 이 공연에서 지금 대기 중인 신청 id 목록 — 트리거 자동 확정 전후를 비교하기 위한 스냅샷. */
async function snapshotWaitlisted(supabase: SupabaseClient, showId: string): Promise<string[]> {
  const { data } = await supabase
    .from("syus_reservations")
    .select("id")
    .eq("show_id", showId)
    .eq("status", "waitlisted");
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

/**
 * 스냅샷에 있던 대기 신청 중 지금 확정이 된 것 = 트리거가 올려 준 사람.
 * 그들에게 확정 메일을 보내고, 결과를 한 문장으로 돌려준다(없으면 빈 문자열).
 */
async function mailPromotedSince(
  supabase: SupabaseClient,
  showId: string,
  waitlistedBefore: string[]
): Promise<string> {
  if (waitlistedBefore.length === 0) return "";
  const { data } = await supabase
    .from("syus_reservations")
    .select(ROW_COLUMNS)
    .in("id", waitlistedBefore)
    .eq("status", "confirmed");
  const promoted = (data ?? []) as RowLite[];
  if (promoted.length === 0) return "";

  const showTitle = await fetchShowTitle(supabase, showId);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const p of promoted) {
    const r = await mailConfirmed(p, showTitle, "대기하시던 좌석이 확정되었습니다");
    if (r === "sent") sent += 1;
    else if (r === "failed") failed += 1;
    else skipped += 1;
  }

  const parts = [`대기 ${promoted.length}건이 확정으로 옮겨졌습니다`];
  if (sent) parts.push(`${sent}건에 확정 메일을 보냈습니다`);
  if (failed) parts.push(`${failed}건은 메일 발송에 실패했습니다`);
  if (skipped) parts.push(`${skipped}건은 이메일이 아닌 연락처라 직접 연락이 필요합니다`);
  return ` ${parts.join(" · ")}.`;
}

function revalidateShow(showId: string) {
  revalidatePath(`/muol/shows/${showId}`);
}

// ═══════════════════════════════════════════════════════════════
// 공연 단위 설정
// ═══════════════════════════════════════════════════════════════

/** 예약 마감 / 다시 열기. 다시 열면 트리거가 밀린 대기자를 올리므로 메일까지 이어서 보낸다. */
export async function adminSetReservationClosed(showId: string, closed: boolean): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(showId)) return { ok: false, message: "공연 정보가 올바르지 않습니다." };
  const { supabase } = guard;

  const before = closed ? [] : await snapshotWaitlisted(supabase, showId);
  const { data, error } = await supabase
    .from("shows")
    .update({ reservation_closed: closed })
    .eq("id", showId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[adminSetReservationClosed]", error);
    return { ok: false, message: "마감 상태를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidateShow(showId);
  if (closed) {
    return { ok: true, message: "예약을 마감했습니다. 관객은 이제 새로 신청할 수 없고, 이미 받은 신청은 그대로 남습니다." };
  }
  const promotedNote = await mailPromotedSince(supabase, showId, before);
  return { ok: true, message: `예약을 다시 열었습니다.${promotedNote}` };
}

/**
 * 공연 전체 정원 변경. null = 무제한.
 * 정원이 늘면 트리거가 대기자를 올린다(회차 정원이 비어 공연 정원을 따르는 회차 포함).
 * 줄여도 이미 확정된 신청은 그대로 둔다 — 트리거도 강등은 하지 않는다.
 */
export async function adminSetShowCapacity(showId: string, capacity: number | null): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(showId)) return { ok: false, message: "공연 정보가 올바르지 않습니다." };
  const invalid = validateCapacity(capacity);
  if (invalid) return { ok: false, message: invalid };
  const { supabase } = guard;

  const before = await snapshotWaitlisted(supabase, showId);
  const { data, error } = await supabase
    .from("shows")
    .update({ capacity })
    .eq("id", showId)
    .select("id, reservation_closed")
    .maybeSingle();
  if (error || !data) {
    console.error("[adminSetShowCapacity]", error);
    return { ok: false, message: "정원을 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidateShow(showId);
  const promotedNote = await mailPromotedSince(supabase, showId, before);
  const head = capacity === null ? "정원을 무제한으로 바꿨습니다." : `정원을 ${capacity}석으로 바꿨습니다.`;
  const closedNote = data.reservation_closed ? " 지금은 예약이 마감된 상태라 대기자는 다시 열 때 확정됩니다." : "";
  return { ok: true, message: `${head}${promotedNote}${closedNote}` };
}

/** 자체 예매(좌석 신청 폼) 켜기/끄기. 끄면 공연 페이지에서 신청 폼이 사라진다(기존 신청은 남는다). */
export async function adminSetInhouseReservation(showId: string, enabled: boolean): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(showId)) return { ok: false, message: "공연 정보가 올바르지 않습니다." };

  const { data, error } = await guard.supabase
    .from("shows")
    .update({ use_inhouse_reservation: enabled })
    .eq("id", showId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[adminSetInhouseReservation]", error);
    return { ok: false, message: "자체 예매 설정을 바꾸지 못했습니다." };
  }
  revalidateShow(showId);
  return {
    ok: true,
    message: enabled
      ? "자체 예매를 켰습니다. 공연 페이지에 좌석 신청 폼이 보입니다."
      : "자체 예매를 껐습니다. 공연 페이지에서 신청 폼이 사라지고, 이미 받은 신청은 그대로 남습니다.",
  };
}

// ═══════════════════════════════════════════════════════════════
// 회차
// ═══════════════════════════════════════════════════════════════

/** 회차 정원 변경. null = 공연 전체 정원을 따른다(무제한이 아니다). */
export async function adminSetSessionCapacity(sessionId: string, capacity: number | null): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(sessionId)) return { ok: false, message: "회차 정보가 올바르지 않습니다." };
  const invalid = validateCapacity(capacity);
  if (invalid) return { ok: false, message: invalid };
  const { supabase } = guard;

  const { data: session } = await supabase
    .from("show_sessions")
    .select("id, show_id, session_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, message: "회차를 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요." };

  const before = await snapshotWaitlisted(supabase, session.show_id as string);
  const { data, error } = await supabase
    .from("show_sessions")
    .update({ capacity })
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[adminSetSessionCapacity]", error);
    return { ok: false, message: "회차 정원을 바꾸지 못했습니다." };
  }

  revalidateShow(session.show_id as string);
  const promotedNote = await mailPromotedSince(supabase, session.show_id as string, before);
  const label = formatSessionAt(session.session_at as string);
  const head =
    capacity === null
      ? `${label} 회차는 이제 공연 전체 정원을 따릅니다.`
      : `${label} 회차 정원을 ${capacity}석으로 바꿨습니다.`;
  return { ok: true, message: `${head}${promotedNote}` };
}

/**
 * 회차 추가. 화면의 datetime-local 값("2026-10-03T19:30")을 한국 시간으로 읽는다.
 * 브라우저 시간대에 기대지 않으려고 문자열 그대로 받아 서버에서 +09:00을 붙인다.
 */
export async function adminAddSession(
  showId: string,
  localDateTime: string,
  capacity: number | null
): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(showId)) return { ok: false, message: "공연 정보가 올바르지 않습니다." };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) {
    return { ok: false, message: "회차 날짜와 시간을 모두 골라 주세요." };
  }
  const invalid = validateCapacity(capacity);
  if (invalid) return { ok: false, message: invalid };

  const sessionAt = new Date(`${localDateTime}:00+09:00`);
  if (Number.isNaN(sessionAt.getTime())) return { ok: false, message: "회차 날짜를 읽을 수 없습니다." };
  const { supabase } = guard;

  const { count: existing } = await supabase
    .from("show_sessions")
    .select("id", { count: "exact", head: true })
    .eq("show_id", showId);

  const { error } = await supabase
    .from("show_sessions")
    .insert({ show_id: showId, session_at: sessionAt.toISOString(), capacity });
  if (error) {
    console.error("[adminAddSession]", error);
    return { ok: false, message: "회차를 추가하지 못했습니다." };
  }
  revalidateShow(showId);

  const label = formatSessionAt(sessionAt.toISOString());
  // 회차가 0개였던 공연에 첫 회차를 만들면, 그 전에 받은 신청(회차 없음)은 새 회차 정원에
  // 잡히지 않는다. 1개 → 2개가 되면 관객은 이제 회차를 골라야 신청할 수 있다. 둘 다 알린다.
  let note = "";
  if ((existing ?? 0) === 0) {
    note = " 이 공연의 첫 회차입니다. 이전에 받은 신청은 '회차 미지정'으로 남고 이 회차 정원에는 잡히지 않습니다.";
  } else if ((existing ?? 0) === 1) {
    note = " 회차가 두 개가 되어, 관객은 이제 신청할 때 회차를 골라야 합니다.";
  }
  return { ok: true, message: `${label} 회차를 추가했습니다.${note}` };
}

/** 회차 삭제 — 취소되지 않은 신청이 걸려 있으면 막는다(신청자가 가리키던 날짜가 사라지면 안 된다). */
export async function adminDeleteSession(sessionId: string): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(sessionId)) return { ok: false, message: "회차 정보가 올바르지 않습니다." };
  const { supabase } = guard;

  const { data: session } = await supabase
    .from("show_sessions")
    .select("id, show_id, session_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, message: "이미 지워졌거나 찾을 수 없는 회차입니다." };

  const { count } = await supabase
    .from("syus_reservations")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .neq("status", "cancelled");
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `이 회차에 살아 있는 신청이 ${count}건 있어 지울 수 없습니다. 신청을 먼저 취소하거나 정리해 주세요.`,
    };
  }

  // 취소된 신청이 이 회차를 가리키고 있어도 FK가 on delete set null이라 기록은 남는다.
  const { error } = await supabase.from("show_sessions").delete().eq("id", sessionId);
  if (error) {
    console.error("[adminDeleteSession]", error);
    return { ok: false, message: "회차를 지우지 못했습니다." };
  }
  revalidateShow(session.show_id as string);
  return { ok: true, message: `${formatSessionAt(session.session_at as string)} 회차를 지웠습니다.` };
}

// ═══════════════════════════════════════════════════════════════
// 신청 한 건
// ═══════════════════════════════════════════════════════════════

/**
 * 대기 → 확정(수동). 정원을 넘기게 되면 override 없이는 멈추고 needsOverride를 돌려준다.
 * 화면이 숫자를 보여 주고 한 번 더 확인받은 뒤 override=true로 다시 부른다.
 */
export async function adminConfirmWaitlisted(reservationId: string, override = false): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(reservationId)) return { ok: false, message: "신청 정보가 올바르지 않습니다." };
  const { supabase } = guard;

  const row = await fetchRow(supabase, reservationId);
  if (!row) return { ok: false, message: "신청을 찾을 수 없습니다." };
  if (row.status !== "waitlisted") return { ok: false, message: "대기 중인 신청만 확정할 수 있습니다. 새로고침해 주세요." };

  const unit = await seatUnit(supabase, row);
  if (!override && unit.capacity !== null && unit.confirmed + row.party_size > unit.capacity) {
    const over = unit.confirmed + row.party_size - unit.capacity;
    return {
      ok: false,
      needsOverride: true,
      message: `지금 확정 ${unit.confirmed}명 / 정원 ${unit.capacity}석입니다. 이 신청(${row.party_size}명)을 확정하면 정원을 ${over}명 넘깁니다. 그래도 확정할까요?`,
    };
  }

  const { data, error } = await supabase
    .from("syus_reservations")
    .update({ status: "confirmed" })
    .eq("id", row.id)
    .eq("status", "waitlisted")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[adminConfirmWaitlisted]", error);
    return { ok: false, message: "확정하지 못했습니다. 그사이 상태가 바뀌었을 수 있으니 새로고침해 주세요." };
  }

  revalidateShow(row.show_id);
  const showTitle = await fetchShowTitle(supabase, row.show_id);
  const mail = await mailConfirmed(row, showTitle, "대기하시던 좌석이 확정되었습니다");
  return { ok: true, status: "confirmed", message: `${row.guest_name ?? "신청자"}님(${row.party_size}명)을 확정했습니다. ${mailPhrase(mail)}` };
}

/**
 * 취소 → 되살리기. 자리가 있으면 확정, 없으면 대기로 돌린다(정원 규칙은 submit_reservation과 같다).
 * 잘못 누른 취소를 바로잡는 용도라, 신청자에게 지금 상태를 메일로 다시 알린다.
 */
export async function adminRestoreReservation(reservationId: string): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(reservationId)) return { ok: false, message: "신청 정보가 올바르지 않습니다." };
  const { supabase } = guard;

  const row = await fetchRow(supabase, reservationId);
  if (!row) return { ok: false, message: "신청을 찾을 수 없습니다." };
  if (row.status !== "cancelled") return { ok: false, message: "취소된 신청만 되살릴 수 있습니다. 새로고침해 주세요." };

  const unit = await seatUnit(supabase, row);
  const next: "confirmed" | "waitlisted" =
    unit.capacity === null || unit.confirmed + row.party_size <= unit.capacity ? "confirmed" : "waitlisted";

  const { data, error } = await supabase
    .from("syus_reservations")
    .update({ status: next })
    .eq("id", row.id)
    .eq("status", "cancelled")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[adminRestoreReservation]", error);
    return { ok: false, message: "되살리지 못했습니다. 새로고침 후 다시 시도해 주세요." };
  }

  revalidateShow(row.show_id);
  const showTitle = await fetchShowTitle(supabase, row.show_id);
  const mail =
    next === "confirmed"
      ? await mailConfirmed(row, showTitle, "좌석 신청이 다시 확정되었습니다")
      : await mailWaitlisted(row, showTitle, "좌석 신청이 대기로 다시 접수되었습니다");
  const head =
    next === "confirmed"
      ? `${row.guest_name ?? "신청자"}님 신청을 되살려 '확정'으로 돌렸습니다.`
      : `${row.guest_name ?? "신청자"}님 신청을 되살렸지만 자리가 없어 '대기'로 돌렸습니다(확정 ${unit.confirmed}명 / 정원 ${unit.capacity}석).`;
  return { ok: true, status: next, message: `${head} ${mailPhrase(mail)}` };
}

/**
 * 인원 수정(1~10).
 * 확정 신청의 인원을 늘려 정원을 넘기게 되면 override 확인을 거친다.
 * 줄여서 자리가 나도 대기자는 자동으로 올리지 않는다(파일 머리 주석 참고) — 결과 문장으로 알린다.
 * 인원이 바뀌었다는 메일은 자동으로 보내지 않는다. 필요하면 '확정 메일 다시 보내기'가
 * 바뀐 인원이 적힌 확정 메일을 보낸다.
 */
export async function adminUpdatePartySize(
  reservationId: string,
  partySize: number,
  override = false
): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(reservationId)) return { ok: false, message: "신청 정보가 올바르지 않습니다." };
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 10) {
    return { ok: false, message: "인원은 1~10명 사이로 넣어 주세요." };
  }
  const { supabase } = guard;

  const row = await fetchRow(supabase, reservationId);
  if (!row) return { ok: false, message: "신청을 찾을 수 없습니다." };
  if (row.status === "cancelled") return { ok: false, message: "취소된 신청은 인원을 고칠 수 없습니다. 먼저 되살려 주세요." };
  if (row.party_size === partySize) return { ok: true, message: "인원이 그대로라 바꾼 것이 없습니다." };

  const increasing = partySize > row.party_size;
  if (row.status === "confirmed" && increasing && !override) {
    const unit = await seatUnit(supabase, row, row.id);
    if (unit.capacity !== null && unit.confirmed + partySize > unit.capacity) {
      const over = unit.confirmed + partySize - unit.capacity;
      return {
        ok: false,
        needsOverride: true,
        message: `이 신청을 ${partySize}명으로 늘리면 정원 ${unit.capacity}석을 ${over}명 넘깁니다(다른 확정 ${unit.confirmed}명). 그래도 바꿀까요?`,
      };
    }
  }

  const { data, error } = await supabase
    .from("syus_reservations")
    .update({ party_size: partySize })
    .eq("id", row.id)
    .eq("status", row.status)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[adminUpdatePartySize]", error);
    return { ok: false, message: "인원을 바꾸지 못했습니다. 새로고침 후 다시 시도해 주세요." };
  }
  revalidateShow(row.show_id);

  let note = "";
  if (row.status === "confirmed" && !increasing) {
    const waiting = await waitlistedCountInUnit(supabase, row);
    if (waiting > 0) {
      note = ` ${row.party_size - partySize}석이 비었고 같은 회차에 대기 ${waiting}건이 있습니다. 대기자 확정은 신청 목록에서 직접 눌러 주세요.`;
    }
  }
  return {
    ok: true,
    message: `인원을 ${row.party_size}명에서 ${partySize}명으로 바꿨습니다.${note} 신청자에게 알리려면 '확정 메일 다시 보내기'를 써 주세요.`,
  };
}

/** 확정 메일 다시 보내기 — 확정 상태이고 연락처가 이메일일 때만. */
export async function adminResendConfirmation(reservationId: string): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };
  if (!UUID_RE.test(reservationId)) return { ok: false, message: "신청 정보가 올바르지 않습니다." };
  const { supabase } = guard;

  const row = await fetchRow(supabase, reservationId);
  if (!row) return { ok: false, message: "신청을 찾을 수 없습니다." };
  if (row.status !== "confirmed") return { ok: false, message: "확정된 신청에만 확정 메일을 보낼 수 있습니다." };
  if (!isEmail(row.guest_contact)) return { ok: false, message: "연락처가 이메일이 아니라 메일을 보낼 수 없습니다." };

  const showTitle = await fetchShowTitle(supabase, row.show_id);
  const mail = await mailConfirmed(row, showTitle, "좌석 신청 확정 안내를 다시 보내드립니다");
  if (mail !== "sent") return { ok: false, message: "메일을 보내지 못했습니다. 잠시 후 다시 시도하시거나 직접 연락해 주세요." };
  return { ok: true, message: `${row.guest_contact}로 확정 메일을 다시 보냈습니다.` };
}

// ═══════════════════════════════════════════════════════════════
// 전화·현장 접수 (대리 신청)
// ═══════════════════════════════════════════════════════════════

export type AdminCreateReservationInput = {
  showId: string;
  /** 회차가 2개 이상인 공연은 필수. 1개면 비워도 DB가 그 회차로 잡는다. */
  sessionId?: string | null;
  name: string;
  contact: string;
  partySize: number;
};

/**
 * 전화·현장에서 받은 좌석 신청을 관리자가 대신 넣는다.
 * 관객 신청과 똑같이 submit_reservation을 거치므로 정원 잠금·마감·종료 가드가 그대로 걸린다.
 */
export async function adminCreateReservation(input: AdminCreateReservationInput): Promise<AdminReservationResult> {
  const guard = await assertAdmin();
  if (guard.error) return { ok: false, message: guard.error };

  const showId = String(input.showId ?? "").trim();
  const sessionId = String(input.sessionId ?? "").trim();
  const name = String(input.name ?? "").trim();
  const contact = String(input.contact ?? "").trim();
  const partySize = Number(input.partySize);

  if (!UUID_RE.test(showId)) return { ok: false, message: "공연을 골라 주세요." };
  if (sessionId && !UUID_RE.test(sessionId)) return { ok: false, message: "회차 정보가 올바르지 않습니다." };
  if (!name || !contact) return { ok: false, message: "이름과 연락처를 모두 넣어 주세요." };
  if (name.length > 50 || contact.length > 100) return { ok: false, message: "이름 또는 연락처가 너무 깁니다." };
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 10) {
    return { ok: false, message: "인원은 1~10명 사이로 넣어 주세요." };
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[adminCreateReservation] service role 미설정:", e);
    return { ok: false, message: "서버 설정(비밀 키)이 없어 대리 신청을 넣을 수 없습니다. 운영 환경변수를 확인해 주세요." };
  }

  const payload: Record<string, unknown> = {
    p_show_id: showId,
    p_party_size: partySize,
    p_guest_name: name,
    p_guest_contact: contact,
  };
  if (sessionId) payload.p_session_id = sessionId;

  const { data: rpcData, error } = await admin.rpc("submit_reservation", payload);
  if (error) {
    console.error("[adminCreateReservation] RPC error:", error);
    return { ok: false, message: "신청을 넣는 중 오류가 났습니다. 잠시 후 다시 시도해 주세요." };
  }
  const result = rpcData as { ok: boolean; reason?: string; status?: "confirmed" | "waitlisted"; code?: string };
  if (!result.ok || !result.code || !result.status) {
    return { ok: false, message: SUBMIT_REASON_MESSAGES[result.reason ?? ""] ?? "신청이 접수되지 않았습니다." };
  }

  revalidateShow(showId);

  const showTitle = await fetchShowTitle(guard.supabase, showId);
  const rowForMail = { guest_contact: contact, guest_name: name, reservation_code: result.code, party_size: partySize };
  const mail =
    result.status === "confirmed"
      ? await mailConfirmed(rowForMail, showTitle, "좌석 신청이 확정되었습니다")
      : await mailWaitlisted(rowForMail, showTitle, "좌석 신청이 대기 접수되었습니다");

  const head =
    result.status === "confirmed"
      ? `${name}님(${partySize}명) 신청을 확정으로 넣었습니다. 신청번호 ${result.code}.`
      : `정원이 차서 ${name}님(${partySize}명) 신청은 대기로 들어갔습니다. 신청번호 ${result.code}.`;
  const mailNote =
    mail === "skipped"
      ? "전화로 받으셨다면 신청번호를 불러 드려 주세요."
      : mailPhrase(mail);
  return { ok: true, status: result.status, code: result.code, message: `${head} ${mailNote}` };
}
