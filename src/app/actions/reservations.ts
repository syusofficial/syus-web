"use server";

/**
 * 좌석 신청(자체 예매) server action.
 *
 * 정원 원자적 체크는 DB 함수(submit_reservation, supabase/syus_reservations.sql)가
 * advisory lock으로 처리한다 — 여기서는 RPC 호출·에러 매핑·확인 메일 발송만 담당.
 * 게스트(비로그인) 신청을 지원하므로 이름·연락처는 로그인 여부와 무관하게 항상 받는다.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email/send";
import { ReservationConfirmedEmail } from "@/lib/email/templates/reservation-confirmed";
import { ReservationWaitlistedEmail } from "@/lib/email/templates/reservation-waitlisted";

export type SubmitReservationState =
  | { ok: true; status: "confirmed" | "waitlisted"; code: string; message: string }
  | { ok: false; message: string };

const REASON_MESSAGES: Record<string, string> = {
  invalid_party_size: "인원수는 1~10명 사이로 입력해주세요.",
  guest_info_required: "이름과 연락처를 입력해주세요.",
  show_not_found: "공연 정보를 찾을 수 없습니다.",
};

export async function submitReservation(formData: FormData): Promise<SubmitReservationState> {
  const showId = String(formData.get("show_id") ?? "").trim();
  const partySize = Number(formData.get("party_size") ?? "1");
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestContact = String(formData.get("guest_contact") ?? "").trim();

  if (!showId) return { ok: false, message: "공연 정보가 없습니다." };
  if (!guestName || !guestContact) return { ok: false, message: "이름과 연락처를 입력해주세요." };
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 10) {
    return { ok: false, message: "인원수는 1~10명 사이로 입력해주세요." };
  }

  const supabase = await createClient();

  const { data: rpcData, error } = await supabase.rpc("submit_reservation", {
    p_show_id: showId,
    p_party_size: partySize,
    p_guest_name: guestName,
    p_guest_contact: guestContact,
  });

  if (error) {
    console.error("[submitReservation] RPC error:", error);
    return { ok: false, message: "신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  const result = rpcData as { ok: boolean; reason?: string; status?: "confirmed" | "waitlisted"; code?: string };
  if (!result.ok) {
    return { ok: false, message: REASON_MESSAGES[result.reason ?? ""] ?? "신청이 접수되지 않았습니다." };
  }

  // 연락처가 이메일 형식이면 확인 메일 발송 (best-effort — 실패해도 신청 자체는 유효)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestContact);
  if (isEmail && result.code && result.status) {
    const { data: show } = await supabase
      .from("shows")
      .select("title")
      .eq("id", showId)
      .maybeSingle();

    const emailProps = { name: guestName, showTitle: show?.title ?? "공연", code: result.code, partySize };
    const sendResult = await sendMail({
      to: guestContact,
      subject: result.status === "confirmed" ? "좌석 신청이 확정되었습니다" : "좌석 신청이 대기 접수되었습니다",
      react:
        result.status === "confirmed"
          ? ReservationConfirmedEmail(emailProps)
          : ReservationWaitlistedEmail(emailProps),
    });
    if (!sendResult.ok) {
      console.warn("[submitReservation] 확인 메일 발송 실패:", sendResult.error);
    }
  }

  revalidatePath(`/muol/shows/${showId}`);

  return {
    ok: true,
    status: result.status!,
    code: result.code!,
    message:
      result.status === "confirmed"
        ? `신청이 확정되었습니다. 신청번호: ${result.code}`
        : `정원이 마감되어 대기자로 접수되었습니다. 신청번호: ${result.code}`,
  };
}

/** 게스트 셀프 취소 — 신청번호 + 연락처가 일치할 때만. 로그인 사용자는 본인 세션으로 처리. */
export async function cancelReservationAction(
  code: string,
  contact: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_reservation", { p_code: code, p_contact: contact || null });

  if (error) {
    console.error("[cancelReservationAction] RPC error:", error);
    return { ok: false, message: "취소 처리 중 오류가 발생했습니다." };
  }

  const result = data as { ok: boolean; reason?: string };
  if (!result.ok) {
    const reasonMap: Record<string, string> = {
      not_found: "신청 내역을 찾을 수 없습니다.",
      forbidden: "신청번호 또는 연락처가 일치하지 않습니다.",
      already_cancelled: "이미 취소된 신청입니다.",
    };
    return { ok: false, message: reasonMap[result.reason ?? ""] ?? "취소할 수 없습니다." };
  }

  return { ok: true, message: "신청이 취소되었습니다." };
}

export type LookupReservationResult =
  | {
      ok: true;
      show_title: string;
      schedule_start?: string;
      schedule_end?: string;
      party_size: number;
      status: string;
      code: string;
    }
  | { ok: false; message: string };

/** 게스트 셀프 조회 — 신청번호 + 연락처로 본인 신청 확인 */
export async function lookupReservationAction(code: string, contact: string): Promise<LookupReservationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_reservation", { p_code: code, p_contact: contact || null });

  if (error) {
    console.error("[lookupReservationAction] RPC error:", error);
    return { ok: false, message: "조회 중 오류가 발생했습니다." };
  }

  const result = data as {
    ok: boolean;
    reason?: string;
    show_title?: string;
    schedule_start?: string;
    schedule_end?: string;
    party_size?: number;
    status?: string;
    code?: string;
  };

  if (!result.ok) {
    const reasonMap: Record<string, string> = {
      not_found: "신청 내역을 찾을 수 없습니다. 신청번호를 다시 확인해주세요.",
      forbidden: "신청번호 또는 연락처가 일치하지 않습니다.",
    };
    return { ok: false, message: reasonMap[result.reason ?? ""] ?? "조회할 수 없습니다." };
  }

  return {
    ok: true,
    show_title: result.show_title!,
    schedule_start: result.schedule_start,
    schedule_end: result.schedule_end,
    party_size: result.party_size!,
    status: result.status!,
    code: result.code!,
  };
}
