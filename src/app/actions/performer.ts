"use server";

/**
 * 공연자 신청 처리 server action.
 *
 * 승인 흐름 (사장님 결정 2026-06-08)
 * - 관리자 페이지에서 "승인" 버튼 클릭
 * - profiles.role = "performer", performer_status = "approved"로 갱신
 * - 같은 트랜잭션 흐름에서 승인 메일 1회 발송
 *
 * 반려는 이번 단계에서는 메일 발송 없이 status만 변경한다.
 * (사장님 결정 — 반려 사유 표준 카피가 준비된 뒤 메일 가동)
 *
 * 보안
 * - 호출자가 admin 권한인지 server 측에서 검증
 * - 메일 발송은 best-effort: 실패해도 DB 갱신은 유지 (운영자가 수동 안내)
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email/send";
import { PerformerApprovedEmail } from "@/lib/email/templates/performer-approved";

type ActionResult = { ok: boolean; message: string };

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "로그인이 필요합니다." } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { supabase, error: "관리자만 가능합니다." } as const;
  }

  return { supabase, error: null } as const;
}

/**
 * 공연자 신청 승인 — role을 performer로, status를 approved로,
 * 그리고 신청자에게 승인 메일을 1회 발송한다.
 */
export async function approvePerformerApplication(profileId: string): Promise<ActionResult> {
  if (!profileId) return { ok: false, message: "잘못된 요청입니다." };

  const { supabase, error: authError } = await assertAdmin();
  if (authError) return { ok: false, message: authError };

  // 1) 대상 프로필 조회 — 메일·이름을 미리 확보
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, email, name, performer_status, role")
    .eq("id", profileId)
    .maybeSingle();

  if (fetchError || !target) {
    return { ok: false, message: "대상 회원을 찾을 수 없습니다." };
  }

  // 멱등성 — 이미 승인된 경우 중복 메일 방지
  const alreadyApproved =
    target.role === "performer" && target.performer_status === "approved";

  // 2) 상태 갱신
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "performer", performer_status: "approved" })
    .eq("id", profileId);

  if (updateError) {
    return { ok: false, message: "승인 처리에 실패했습니다: " + updateError.message };
  }

  // 3) 승인 메일 발송 (이미 승인 상태였다면 스킵)
  if (!alreadyApproved && target.email) {
    const result = await sendMail({
      to: target.email,
      subject: "공연자 등록이 승인되었습니다",
      react: PerformerApprovedEmail({ name: target.name }),
    });
    if (!result.ok) {
      // 메일 실패해도 DB 갱신은 유지 — 화면에는 경고만
      console.warn("[approvePerformerApplication] 메일 발송 실패:", result.error);
    }
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: alreadyApproved
      ? "이미 승인된 회원입니다. 상태만 정리했습니다."
      : "승인 완료. 안내 메일을 발송했습니다.",
  };
}

/**
 * 공연자 신청 반려 — role은 member 그대로, performer_status만 rejected로.
 * (메일 발송은 이번 단계에서 보류 — 사유 표준 카피 확정 후 가동)
 */
export async function rejectPerformerApplication(profileId: string): Promise<ActionResult> {
  if (!profileId) return { ok: false, message: "잘못된 요청입니다." };

  const { supabase, error: authError } = await assertAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase
    .from("profiles")
    .update({ performer_status: "rejected" })
    .eq("id", profileId);

  if (error) return { ok: false, message: "반려 처리에 실패했습니다: " + error.message };

  revalidatePath("/admin");
  return { ok: true, message: "반려 처리되었습니다." };
}
