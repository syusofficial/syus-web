"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateReview } from "@/lib/moderation";

export type SubmitReviewState =
  | { ok: true; status: "public" | "hidden"; message: string }
  | { ok: false; message: string };

/**
 * 후기 작성 / 수정 (1인 1후기 — show_id+user_id UNIQUE)
 * 1) 비로그인·정지된 계정 차단
 * 2) 한국어 사전 → 매칭 시 즉시 'blocked'
 * 3) OpenAI Moderation → 의심 시 'hidden', 통과 시 'public'
 */
export async function submitReview(formData: FormData): Promise<SubmitReviewState> {
  const showId = String(formData.get("show_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!showId) return { ok: false, message: "공연 정보가 없습니다." };
  if (body.length < 10) return { ok: false, message: "최소 10자 이상 작성해주세요." };
  if (body.length > 1000) return { ok: false, message: "최대 1000자까지 작성 가능합니다." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  // 계정 정지 확인
  const { data: banned } = await supabase
    .from("banned_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (banned) {
    return { ok: false, message: "후기 작성이 제한된 계정입니다. 1:1 문의로 문의해주세요." };
  }

  // 검열
  const outcome = await moderateReview(body);

  if (outcome.status === "blocked") {
    // 정책 위반 — DB에 저장하되 본인만 볼 수 있도록 hidden 처리하지 않고
    // 사용자에게 거절만 통보. (DB에 남기지 않음으로써 운영 부담 감소)
    return {
      ok: false,
      message: "정책에 위배되는 표현이 포함되어 게시되지 않았습니다. 비방·욕설·차별 표현은 자동 차단됩니다.",
    };
  }

  const moderation = {
    score: outcome.api.maxScore,
    matched: outcome.dict.matched,
    source: outcome.source,
    api_categories: outcome.api.categories,
  };

  const { error: upsertError } = await supabase
    .from("reviews")
    .upsert(
      {
        show_id: showId,
        user_id: user.id,
        body,
        status: outcome.status,
        moderation,
      },
      { onConflict: "show_id,user_id" }
    );

  if (upsertError) {
    console.error("[submitReview] DB error:", upsertError);
    return { ok: false, message: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath(`/shows/${showId}`);

  return {
    ok: true,
    status: outcome.status as "public" | "hidden",
    message:
      outcome.status === "public"
        ? "후기가 등록되었습니다. 감사합니다."
        : "후기가 접수되었습니다. 검토 후 공개됩니다.",
  };
}

/** 본인 후기 삭제 */
export async function deleteMyReview(reviewId: string, showId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: "삭제 중 오류가 발생했습니다." };
  }

  revalidatePath(`/shows/${showId}`);
  return { ok: true, message: "후기가 삭제되었습니다." };
}

/** 후기 신고 — 신고 3건 누적 시 trigger가 자동 hidden 처리 */
export async function reportReview(
  reviewId: string,
  showId: string,
  reason: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("review_reports")
    .insert({ review_id: reviewId, reporter_id: user.id, reason: reason || null });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "이미 신고하신 후기입니다." };
    }
    return { ok: false, message: "신고 접수 중 오류가 발생했습니다." };
  }

  revalidatePath(`/shows/${showId}`);
  return { ok: true, message: "신고가 접수되었습니다. 운영자가 24시간 내 확인합니다." };
}

// ─── 관리자 전용 ─────────────────────────────────────────────────────

/** 관리자: 후기 즉시 삭제 */
export async function adminDeleteReview(reviewId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, message: "관리자만 가능합니다." };

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) return { ok: false, message: "삭제 실패: " + error.message };

  revalidatePath("/admin");
  return { ok: true, message: "삭제되었습니다." };
}

/** 관리자: 상태 변경 (hidden ↔ public) */
export async function adminUpdateReviewStatus(
  reviewId: string,
  newStatus: "public" | "hidden"
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, message: "관리자만 가능합니다." };

  const { error } = await supabase
    .from("reviews")
    .update({ status: newStatus, report_count: 0 })
    .eq("id", reviewId);

  if (error) return { ok: false, message: "상태 변경 실패: " + error.message };

  revalidatePath("/admin");
  return { ok: true, message: `상태가 ${newStatus}로 변경되었습니다.` };
}

/** 관리자: 계정 제재 (후기 작성 차단) */
export async function adminBanUser(
  userId: string,
  reason: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, message: "관리자만 가능합니다." };

  const { error } = await supabase
    .from("banned_users")
    .upsert({ user_id: userId, reason: reason || "운영자 판단", banned_by: user.id });

  if (error) return { ok: false, message: "제재 실패: " + error.message };

  revalidatePath("/admin");
  return { ok: true, message: "계정 제재가 적용되었습니다." };
}
