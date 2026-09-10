"use server";

/**
 * 공연 승인·반려·대리 등록 server action — 2026-09-10 신설.
 *
 * ─ 왜 만들었나 ────────────────────────────────────────────────
 * (1) 승인·반려에 통보가 없었다.
 *     admin 페이지의 승인 버튼은 `shows.update({ status })` 한 줄이었다. 공연팀은
 *     자기 무대가 걸렸는지 알려면 다시 로그인해 확인해야 했고, 결국 "언제부터
 *     홍보해도 되는지"를 아무도 알려 주지 않았다. 승인 메일에 공연 주소를 넣어
 *     그 주소가 학과 SNS로 그대로 흘러가게 하는 것이 이 파일의 첫 번째 목적이다.
 *
 * (2) 관리자가 공연을 "만들" 수가 없었다.
 *     사이트 전체에서 `shows.insert`는 공연자 페이지 한 곳뿐이었다. 그래서 대면
 *     미팅이나 메일로 포스터와 일정을 이미 받아도, 상대를 "가입 → 공연자 신청 →
 *     승인 대기 → 직접 등록"이라는 네 개의 문으로 되돌려 보내야 했다.
 *     영업이 등록으로 이어지지 않던 직접 원인이라 대리 등록을 연다.
 *
 * ─ 설계 규칙 ──────────────────────────────────────────────────
 * - 권한은 서버에서만 판정한다(`@/lib/adminGuard`).
 * - 메일은 best-effort. 발송이 실패해도 승인·반려 자체는 되돌리지 않는다
 *   (app/actions/performer.ts의 승인 메일과 같은 규칙). 대신 결과 문장에
 *   "메일은 못 보냈다"를 분명히 적어 운영자가 직접 연락할 수 있게 한다.
 * - 날짜는 `@/lib/showDate` 하나만 쓴다. 새 파싱 함수를 만들지 않는다.
 *   schedule_start/end는 text 컬럼이고 저장 형식은 언제나 "YYYY-MM-DD".
 * - 관람료·가격은 어떤 필드로도 받지 않는다(무대올림 관람료 무단언 정책).
 *
 * ─ RLS 메모 ───────────────────────────────────────────────────
 * 승인·반려는 관리자 세션(anon key)으로 그대로 통한다 — 지금까지 admin 페이지가
 * 브라우저에서 하던 일과 같다. 반면 대리 등록·공연자 재지정은 `organizer_id`가
 * 로그인한 사람과 달라지는 쓰기라 RLS에 막힐 수 있어, 관리자 검증을 통과한 뒤
 * service role 클라이언트로 처리한다(update-role·delete-user API와 같은 방식).
 */

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdmin } from "@/lib/adminGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { ShowApprovedEmail } from "@/lib/email/templates/show-approved";
import { ShowRejectedEmail } from "@/lib/email/templates/show-rejected";
import { isValidShowDate, showDateKey } from "@/lib/showDate";
import {
  GENRES,
  GENRE_DETAILS,
  REGIONS_EXCLUDE_ALL,
  SHOW_CATEGORIES,
  hasGenreDetails,
} from "@/lib/constants";
import type { Show } from "@/types";

type ActionResult = { ok: boolean; message: string };
type CreateResult = ActionResult & { show?: Show };

/** 반려 사유 입력 상한 — 메일 본문에 그대로 들어가므로 상식선에서 막는다. */
const REASON_MAX = 500;

/**
 * 공연 등록자(공연자)의 이름·이메일을 찾는다.
 * 등록자가 없거나(대리 등록 직후) 이메일이 비어 있으면 null.
 */
async function findOrganizerContact(
  supabase: Awaited<ReturnType<typeof assertAdmin>>["supabase"],
  organizerId: string | null | undefined
): Promise<{ email: string; name: string | null } | null> {
  if (!organizerId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("email, name")
    .eq("id", organizerId)
    .maybeSingle();
  if (!data?.email) return null;
  return { email: data.email as string, name: (data.name as string | null) ?? null };
}

/** 승인·반려 후 다시 그려야 하는 자리들 */
function revalidateShowSurfaces(showId: string) {
  revalidatePath("/admin");
  revalidatePath("/muol/shows");
  revalidatePath(`/muol/shows/${showId}`);
}

/**
 * 공연 승인 — status를 approved로 바꾸고, 등록자에게 공연 주소가 담긴 메일을 1회 보낸다.
 *
 * 메일을 건너뛰는 경우가 셋 있고, 어느 경우든 반환 문장에 이유를 적는다.
 *   1) 이미 게시 중이던 공연 (중복 발송 방지 — performer.ts의 멱등성 규칙과 동일)
 *   2) 등록자가 운영자 본인 (대리 등록한 공연을 스스로 승인하는 경우)
 *   3) 등록자 이메일이 없음
 */
export async function approveShow(showId: string): Promise<ActionResult> {
  if (!showId) return { ok: false, message: "잘못된 요청입니다." };

  const guard = await assertAdmin();
  if (guard.error || !guard.userId) {
    return { ok: false, message: guard.error ?? "관리자만 가능합니다." };
  }
  const { supabase, userId } = guard;

  const { data: show, error: fetchError } = await supabase
    .from("shows")
    .select("id, title, status, organizer_id")
    .eq("id", showId)
    .maybeSingle();

  if (fetchError || !show) {
    return { ok: false, message: "공연을 찾을 수 없습니다." };
  }

  const alreadyApproved = show.status === "approved";

  const { error: updateError } = await supabase
    .from("shows")
    .update({ status: "approved" })
    .eq("id", showId);

  if (updateError) {
    return { ok: false, message: "승인 처리에 실패했습니다: " + updateError.message };
  }

  let mailNote: string;
  if (alreadyApproved) {
    mailNote = "이미 게시 중이던 공연이라 안내 메일은 보내지 않았습니다.";
  } else if (show.organizer_id === userId) {
    mailNote = "운영자 본인이 올린 공연이라 안내 메일은 보내지 않았습니다.";
  } else {
    const organizer = await findOrganizerContact(supabase, show.organizer_id as string | null);
    if (!organizer) {
      mailNote = "등록자 이메일이 없어 안내 메일은 보내지 못했습니다. 직접 연락이 필요합니다.";
    } else {
      const sent = await sendMail({
        to: organizer.email,
        subject: `「${show.title}」이 무대올림에 게시되었습니다`,
        react: ShowApprovedEmail({
          name: organizer.name,
          showTitle: show.title as string,
          showId: show.id as string,
        }),
      });
      if (sent.ok) {
        mailNote = `안내 메일을 보냈습니다 (${organizer.email}).`;
      } else {
        // 메일이 실패해도 승인은 유지한다 — 운영자가 수동으로 알릴 수 있게 사실만 알린다.
        console.warn("[approveShow] 메일 발송 실패:", sent.error, { showId });
        mailNote = "다만 안내 메일 발송에 실패했습니다. 직접 연락이 필요합니다.";
      }
    }
  }

  revalidateShowSurfaces(showId);
  return { ok: true, message: `「${show.title}」 게시했습니다. ${mailNote}` };
}

/**
 * 공연 반려 — status를 rejected로 바꾸고, 사유가 있으면 그 사유를 담은 메일을 보낸다.
 *
 * 사유가 비어 있으면 **메일을 보내지 않는다.** "게시하지 못했습니다"만 적힌 메일은
 * 받는 쪽에 아무 도움이 되지 않고, 무엇을 고쳐야 할지 모르면 그 팀은 다시 등록하지 않는다.
 * 그래서 사유 없는 반려는 상태만 바꾸고, 반환 문장에 "메일은 안 나갔다"를 분명히 적는다.
 *
 * 사유는 DB에 저장하지 않는다(shows에 해당 컬럼이 없고, 컬럼 추가는 사장님 SQL 실행이
 * 필요한 일이라 이번 범위에서 제외). 사유의 기록은 발송된 메일과 답장 스레드에 남는다.
 */
export async function rejectShow(showId: string, reason: string): Promise<ActionResult> {
  if (!showId) return { ok: false, message: "잘못된 요청입니다." };

  const guard = await assertAdmin();
  if (guard.error || !guard.userId) {
    return { ok: false, message: guard.error ?? "관리자만 가능합니다." };
  }
  const { supabase, userId } = guard;

  const trimmedReason = (reason ?? "").trim().slice(0, REASON_MAX);

  const { data: show, error: fetchError } = await supabase
    .from("shows")
    .select("id, title, status, organizer_id")
    .eq("id", showId)
    .maybeSingle();

  if (fetchError || !show) {
    return { ok: false, message: "공연을 찾을 수 없습니다." };
  }

  const alreadyRejected = show.status === "rejected";

  const { error: updateError } = await supabase
    .from("shows")
    .update({ status: "rejected" })
    .eq("id", showId);

  if (updateError) {
    return { ok: false, message: "반려 처리에 실패했습니다: " + updateError.message };
  }

  let mailNote: string;
  if (!trimmedReason) {
    mailNote = "사유가 비어 있어 안내 메일은 보내지 않았습니다.";
  } else if (alreadyRejected) {
    mailNote = "이미 반려 상태였던 공연이라 안내 메일은 보내지 않았습니다.";
  } else if (show.organizer_id === userId) {
    mailNote = "운영자 본인이 올린 공연이라 안내 메일은 보내지 않았습니다.";
  } else {
    const organizer = await findOrganizerContact(supabase, show.organizer_id as string | null);
    if (!organizer) {
      mailNote = "등록자 이메일이 없어 안내 메일은 보내지 못했습니다.";
    } else {
      const sent = await sendMail({
        to: organizer.email,
        subject: `「${show.title}」 등록을 이번에는 게시하지 못했습니다`,
        react: ShowRejectedEmail({
          name: organizer.name,
          showTitle: show.title as string,
          reason: trimmedReason,
        }),
      });
      if (sent.ok) {
        mailNote = `사유를 담아 안내 메일을 보냈습니다 (${organizer.email}).`;
      } else {
        console.warn("[rejectShow] 메일 발송 실패:", sent.error, { showId });
        mailNote = "다만 안내 메일 발송에 실패했습니다. 직접 연락이 필요합니다.";
      }
    }
  }

  revalidateShowSurfaces(showId);
  return { ok: true, message: `「${show.title}」 반려했습니다. ${mailNote}` };
}

/**
 * 관리자 대리 등록 입력값.
 *
 * 공연 폼의 필드는 서른 개가 넘지만 여기서는 **최소 항목만** 받는다.
 * 대리 등록은 대면 미팅이나 메일에서 막 받은 정보를 그 자리에서 넣는 자리라,
 * 항목이 많으면 결국 "나중에 넣자"가 되어 지금과 똑같이 등록이 0건이 된다.
 * 나머지 필드(오시는 길·출연진·러닝타임·관람 연령·지도 링크·좌석 신청 설정)는
 * 나중에 공연팀이 자기 계정으로 넘겨받아 공연자 페이지에서 채우면 된다.
 * (넘겨주는 수단이 아래 reassignShowOrganizer다.)
 */
type AdminShowInput = {
  title: string;
  performerName: string;
  genre: string;
  genreDetail?: string | null;
  genreCustom?: string | null;
  region: string;
  venue: string;
  /** "YYYY-MM-DD" — <input type="date">가 주는 형식 그대로 */
  scheduleStart: string;
  scheduleEnd: string;
  organizerId: string;
  status: "pending" | "approved";
  /** 여기서부터는 선택 */
  showCategory?: string | null;
  schoolDepartment?: string | null;
  showTime?: string | null;
  description?: string | null;
  venueAddress?: string | null;
  posterUrl?: string | null;
};

/**
 * 관리자가 공연을 대신 등록한다.
 *
 * status를 approved로 주면 바로 게시된다. 단 그때는 작품 소개를 비워 둘 수 없다 —
 * 소개가 빈 채로 목록에 걸리면 그 자리가 그대로 사이트의 얼굴이 되기 때문이다.
 * 소개를 아직 못 받았다면 pending으로 저장해 두고 나중에 승인하면 된다.
 */
export async function createShowAsAdmin(input: AdminShowInput): Promise<CreateResult> {
  const guard = await assertAdmin();
  if (guard.error || !guard.userId) {
    return { ok: false, message: guard.error ?? "관리자만 가능합니다." };
  }
  const { supabase } = guard;

  // ── 입력 검증 ────────────────────────────────────────────
  const title = (input.title ?? "").trim();
  const performerName = (input.performerName ?? "").trim();
  const venue = (input.venue ?? "").trim();
  const description = (input.description ?? "").trim();

  if (!title) return { ok: false, message: "공연명을 적어 주세요." };
  if (!performerName) return { ok: false, message: "공연자(단체)명을 적어 주세요." };
  if (!venue) return { ok: false, message: "공연장을 적어 주세요." };

  if (!(GENRES as readonly string[]).includes(input.genre)) {
    return { ok: false, message: "장르를 선택해 주세요." };
  }
  if (!(REGIONS_EXCLUDE_ALL as readonly string[]).includes(input.region)) {
    return { ok: false, message: "지역을 선택해 주세요." };
  }

  const genreCustom = (input.genreCustom ?? "").trim();
  if (input.genre === "기타" && !genreCustom) {
    return { ok: false, message: "장르를 '기타'로 고르셨습니다. 어떤 장르인지 적어 주세요." };
  }

  let genreDetail: string | null = null;
  if (hasGenreDetails(input.genre)) {
    const detail = (input.genreDetail ?? "").trim();
    if (detail) {
      const allowed = GENRE_DETAILS[input.genre] as readonly string[];
      if (!allowed.includes(detail)) {
        return { ok: false, message: "상세 장르 값이 올바르지 않습니다." };
      }
      genreDetail = detail;
    }
  }

  const showCategory = (input.showCategory ?? "").trim();
  if (showCategory && !(SHOW_CATEGORIES as readonly string[]).includes(showCategory)) {
    return { ok: false, message: "공연 구분 값이 올바르지 않습니다." };
  }

  // 날짜 — 저장 형식은 언제나 "YYYY-MM-DD" 하나 (showDate.ts가 정본)
  if (!isValidShowDate(input.scheduleStart) || !isValidShowDate(input.scheduleEnd)) {
    return { ok: false, message: "공연 시작일과 종료일을 날짜로 읽을 수 있게 적어 주세요." };
  }
  const scheduleStart = showDateKey(input.scheduleStart) as string;
  const scheduleEnd = showDateKey(input.scheduleEnd) as string;
  // 두 값 모두 "YYYY-MM-DD"라 문자열 비교로 앞뒤가 정확히 판정된다.
  if (scheduleEnd < scheduleStart) {
    return { ok: false, message: "종료일이 시작일보다 앞섭니다. 날짜를 다시 확인해 주세요." };
  }

  if (input.status !== "pending" && input.status !== "approved") {
    return { ok: false, message: "저장 상태 값이 올바르지 않습니다." };
  }
  if (input.status === "approved" && !description) {
    return {
      ok: false,
      message:
        "바로 게시하려면 작품 소개가 필요합니다. 아직 소개를 받지 못하셨다면 '검토 대기'로 저장해 두셔도 됩니다.",
    };
  }

  // 등록자(공연자) 확인 — 존재하지 않는 id가 들어가면 그 공연은 주인이 없는 채로 남는다.
  const organizerId = (input.organizerId ?? "").trim();
  if (!organizerId) return { ok: false, message: "이 공연을 누구 이름으로 둘지 골라 주세요." };

  const { data: organizer } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", organizerId)
    .maybeSingle();
  if (!organizer) {
    return { ok: false, message: "고르신 회원을 찾을 수 없습니다. 목록을 새로고침해 주세요." };
  }

  // ── 저장 ─────────────────────────────────────────────────
  // organizer_id가 로그인한 사람과 다를 수 있어 RLS에 막힐 수 있다 → service role.
  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[createShowAsAdmin] service role 미설정:", err);
  }
  if (!admin) {
    return { ok: false, message: "서버 설정 오류로 저장하지 못했습니다. (SERVICE_KEY 미설정)" };
  }

  const { data: inserted, error: insertError } = await admin
    .from("shows")
    .insert({
      title,
      performer_name: performerName,
      description, // NOT NULL 컬럼 — 아직 못 받았으면 빈 문자열로 둔다(지어내지 않는다)
      venue,
      venue_address: (input.venueAddress ?? "").trim() || null,
      schedule_start: scheduleStart,
      schedule_end: scheduleEnd,
      genre: input.genre,
      genre_detail: genreDetail,
      genre_custom: input.genre === "기타" ? genreCustom : null,
      show_category: showCategory || null,
      region: input.region,
      school_department: (input.schoolDepartment ?? "").trim() || null,
      show_time: (input.showTime ?? "").trim() || null,
      poster_url: (input.posterUrl ?? "").trim() || null,
      organizer_id: organizerId,
      status: input.status,
      // 좌석 신청은 공연팀과 합의된 적이 없으므로 대리 등록에서는 켜지 않는다.
      // 나중에 공연팀이 계정을 넘겨받아 공연자 페이지에서 직접 켤 수 있다.
      use_inhouse_reservation: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[createShowAsAdmin] insert 실패:", insertError);
    return { ok: false, message: `등록 중 오류가 발생했습니다: ${insertError.message}` };
  }

  revalidateShowSurfaces((inserted as Show).id);
  return {
    ok: true,
    show: inserted as Show,
    message:
      input.status === "approved"
        ? `「${title}」 등록했고 바로 게시했습니다.`
        : `「${title}」 등록했습니다. 지금은 검토 대기 상태입니다.`,
  };
}

/**
 * 공연의 등록자(공연자)를 다른 회원으로 넘긴다.
 *
 * 대리 등록한 공연은 일단 운영자 계정에 매여 있다. 나중에 그 학과가 가입하면
 * 자기 공연으로 넘겨받아 직접 고칠 수 있어야 한다 — 그 수단이 없으면 그 공연은
 * 영원히 운영자 계정에 남고, 수정 요청이 전부 사람 손을 거치게 된다.
 */
export async function reassignShowOrganizer(
  showId: string,
  newOrganizerId: string
): Promise<ActionResult> {
  if (!showId || !newOrganizerId) return { ok: false, message: "잘못된 요청입니다." };

  const guard = await assertAdmin();
  if (guard.error || !guard.userId) {
    return { ok: false, message: guard.error ?? "관리자만 가능합니다." };
  }
  const { supabase } = guard;

  const { data: show } = await supabase
    .from("shows")
    .select("id, title, organizer_id")
    .eq("id", showId)
    .maybeSingle();
  if (!show) return { ok: false, message: "공연을 찾을 수 없습니다." };

  if (show.organizer_id === newOrganizerId) {
    return { ok: false, message: "이미 그 회원의 공연입니다." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("id", newOrganizerId)
    .maybeSingle();
  if (!target) {
    return { ok: false, message: "넘겨받을 회원을 찾을 수 없습니다. 목록을 새로고침해 주세요." };
  }

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[reassignShowOrganizer] service role 미설정:", err);
  }
  if (!admin) {
    return { ok: false, message: "서버 설정 오류로 변경하지 못했습니다. (SERVICE_KEY 미설정)" };
  }

  const { error } = await admin
    .from("shows")
    .update({ organizer_id: newOrganizerId })
    .eq("id", showId);

  if (error) {
    console.error("[reassignShowOrganizer] update 실패:", error);
    return { ok: false, message: `공연자 변경 중 오류가 발생했습니다: ${error.message}` };
  }

  const label = (target.name as string | null) || (target.email as string | null) || "선택한 회원";
  revalidateShowSurfaces(showId);
  return {
    ok: true,
    message: `「${show.title}」의 공연자를 ${label}(으)로 넘겼습니다. 이제 그 계정의 공연자 페이지에서 직접 수정할 수 있습니다.`,
  };
}
