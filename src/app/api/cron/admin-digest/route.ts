/**
 * 운영자 아침 요약 cron — 매일 09:00 KST (= 00:00 UTC) 실행.
 *
 * 왜 필요한가
 * - 무대올림·시우스에는 지금까지 관리자 방향 알림 채널이 하나도 없었다. sendMail 호출처가
 *   전부 사용자 방향이라, 문의·신고·공연 등록 신청·공연자 승인 요청이 들어와도 사장님이
 *   /admin에 직접 들어가 보기 전에는 알 수 없었다. 이 cron이 그 유일한 알림 채널이다.
 *
 * 왜 09:00인가
 * - 사장님 업무 시간이 평일 10:00~16:00 (KST). 업무 시작 직전에 도착해야 그날 오전에
 *   바로 처리로 이어진다. Vercel Cron은 UTC 기준이므로 vercel.json에는 "0 0 * * *".
 *
 * 조용한 날은 보내지 않는다 (이 시스템의 핵심)
 * - 처리 대기도 0, 어제 발생도 0이면 메일을 만들지 않는다. 빈 메일이 매일 오면 열어보지
 *   않게 되고, 그러면 정작 중요한 날의 메일도 함께 놓친다.
 *
 * 견고성
 * - 집계 쿼리는 전부 개별 try/catch(safeCount)로 격리한다. 한 항목이 실패해도(테이블 미생성·
 *   RLS·컬럼 없음) 나머지 항목으로 메일을 보내고, 빠진 항목명만 메일 하단에 한 줄로 알린다.
 *   라우트 전체가 500으로 죽어 그날 요약이 통째로 사라지는 상황을 만들지 않는다.
 *
 * 보안
 * - show-reminders와 동일: Authorization: Bearer ${CRON_SECRET} 또는 x-cron-secret 헤더.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import {
  AdminDigestEmail,
  buildAdminDigestSubject,
  type DigestRow,
} from "@/lib/email/templates/admin-digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** /admin 은 탭이 로컬 state라 ?tab= 을 아직 읽지 않는다(2026-08-03 기준).
 *  링크는 정상적으로 관리자 페이지에 착지하며, 훗날 admin이 ?tab을 읽게 되면 그대로 동작한다. */
const adminLink = (tab: string) => `https://syus.co.kr/admin?tab=${tab}`;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === secret) return true;

  return false;
}

/**
 * KST 기준 하루의 시작(00:00)을 UTC Date로 돌려준다.
 * 서버 타임존이 무엇이든(Vercel은 UTC) 동일하게 동작하도록 오프셋을 직접 계산한다.
 * daysAgo=0 → 오늘 00:00 KST, daysAgo=1 → 어제 00:00 KST
 */
function kstDayStart(now: Date, daysAgo: number): Date {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  const midnightKstAsUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - daysAgo
  );
  return new Date(midnightKstAsUtc - KST_OFFSET_MS);
}

/** "8월 2일 (토)" */
function formatKstDateLabel(d: Date): string {
  const month = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric" }).format(d);
  const day = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", day: "numeric" }).format(d);
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(d);
  return `${month} ${day} (${weekday})`;
}

/** Supabase count 쿼리의 응답에서 우리가 보는 부분만. */
type CountShape = { count?: number | null; error?: { message?: string } | null };

/**
 * 개별 집계 — 실패하면 null을 돌려준다(그 줄만 메일에서 빠진다).
 * 테이블 자체가 없거나(예: syus_reservations 마이그레이션 미실행) 컬럼이 없어도
 * 여기서 흡수되어 나머지 항목은 정상 발송된다.
 */
async function safeCount(label: string, query: () => PromiseLike<unknown>): Promise<number | null> {
  try {
    const res = (await query()) as CountShape | null;
    if (res?.error) {
      console.warn(`[cron/admin-digest] 집계 실패(${label}):`, res.error.message ?? res.error);
      return null;
    }
    return res?.count ?? 0;
  } catch (err) {
    console.warn(`[cron/admin-digest] 집계 예외(${label}):`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 수신자 결정
 * 1) ADMIN_DIGEST_TO (쉼표 구분 다중 허용) — 최우선
 * 2) 없으면 profiles.role = 'admin' 인 회원의 이메일
 *    profiles.email이 비어 있으면 auth.users에서 한 번 더 확인한다.
 * → 환경변수를 안 넣어도 동작해야 한다.
 */
async function resolveRecipients(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const fromEnv = (process.env.ADMIN_DIGEST_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;

  try {
    const { data, error } = await admin.from("profiles").select("id, email").eq("role", "admin");
    if (error) {
      console.error("[cron/admin-digest] 관리자 프로필 조회 실패:", error.message);
      return [];
    }

    const emails: string[] = [];
    for (const row of (data ?? []) as { id: string; email: string | null }[]) {
      if (row.email) {
        emails.push(row.email);
        continue;
      }
      // profiles.email이 비어 있는 계정 대비 — auth.users에서 보강
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(row.id);
        if (authUser.user?.email) emails.push(authUser.user.email);
      } catch {
        // 무시 — 다른 관리자 계정으로 계속 진행
      }
    }
    return [...new Set(emails)];
  } catch (err) {
    console.error("[cron/admin-digest] 수신자 확인 중 예외:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // 어제 00:00 KST ~ 오늘 00:00 KST
  const from = kstDayStart(now, 1).toISOString();
  const to = kstDayStart(now, 0).toISOString();
  const dateLabel = formatKstDateLabel(kstDayStart(now, 1));

  const failed: string[] = [];

  // ── 1) 지금 처리 대기 ─────────────────────────────────────────
  // 근거: src/app/admin/page.tsx 상단 통계 카드 + 탭 배지가 세는 것과 동일한 조건
  const [
    pendingShows,       // shows.status = 'pending'
    pendingPerformers,  // profiles.performer_status = 'pending'
    pendingContacts,    // contacts.status = 'pending' (휴지통 제외)
    hiddenReviews,      // reviews.status = 'hidden' — 사전검열 또는 신고 3건 자동 숨김
    reportedReviews,    // reviews.status = 'public' && report_count > 0 — 신고 접수됐지만 아직 공개 중
  ] = await Promise.all([
    safeCount("승인 대기 공연", () =>
      admin.from("shows").select("id", { count: "exact", head: true }).eq("status", "pending")
    ),
    safeCount("공연자 승인 대기", () =>
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("performer_status", "pending")
    ),
    safeCount("미처리 문의", () =>
      admin
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .is("deleted_at", null)
    ),
    safeCount("검토 대기 후기", () =>
      admin.from("reviews").select("id", { count: "exact", head: true }).eq("status", "hidden")
    ),
    safeCount("신고 접수된 후기", () =>
      admin
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "public")
        .gt("report_count", 0)
    ),
  ]);

  // ── 2) 어제 하루 동안 새로 생긴 것 ────────────────────────────
  const [
    newMembers,       // profiles.created_at
    newShows,         // shows.created_at
    newContacts,      // contacts.created_at
    newReviews,       // reviews.created_at
    newReservations,  // syus_reservations.created_at
  ] = await Promise.all([
    safeCount("신규 가입", () =>
      admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)
    ),
    safeCount("신규 공연 등록", () =>
      admin.from("shows").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)
    ),
    safeCount("신규 문의", () =>
      admin.from("contacts").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)
    ),
    safeCount("신규 후기", () =>
      admin.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to)
    ),
    safeCount("신규 좌석 신청", () =>
      admin
        .from("syus_reservations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from)
        .lt("created_at", to)
    ),
  ]);

  /** null(조회 실패)은 행에서 빼고 실패 목록에 남긴다. 0은 애초에 표시하지 않는다. */
  const toRow = (
    key: string,
    label: string,
    count: number | null,
    unit: string,
    tab: string
  ): DigestRow | null => {
    if (count === null) {
      failed.push(label);
      return null;
    }
    if (count === 0) return null;
    return { key, label, count, unit, href: adminLink(tab) };
  };

  const pending = [
    toRow("p-shows", "승인 대기 공연", pendingShows, "건", "shows"),
    toRow("p-performers", "공연자 승인 대기", pendingPerformers, "명", "applications"),
    toRow("p-contacts", "미처리 문의", pendingContacts, "건", "contacts"),
    toRow("p-reviews-hidden", "검토 대기 후기", hiddenReviews, "건", "reviews"),
    toRow("p-reviews-reported", "신고 접수된 후기", reportedReviews, "건", "reviews"),
  ].filter((r): r is DigestRow => r !== null);

  const yesterday = [
    toRow("y-members", "신규 가입", newMembers, "명", "members"),
    toRow("y-shows", "신규 공연 등록", newShows, "건", "shows"),
    toRow("y-contacts", "신규 문의", newContacts, "건", "contacts"),
    toRow("y-reviews", "신규 후기", newReviews, "건", "reviews"),
    toRow("y-reservations", "신규 좌석 신청", newReservations, "건", "reservations"),
  ].filter((r): r is DigestRow => r !== null);

  // ── 3) 조용한 날이면 보내지 않는다 ────────────────────────────
  if (pending.length === 0 && yesterday.length === 0) {
    console.log(
      `[cron/admin-digest] 보고할 내용 없음 (${dateLabel}) — 발송하지 않음.` +
        (failed.length > 0 ? ` 조회 실패 항목: ${failed.join(", ")}` : "")
    );
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "nothing to report",
      date: dateLabel,
      failed,
    });
  }

  // ── 4) 발송 ──────────────────────────────────────────────────
  const recipients = await resolveRecipients(admin);
  if (recipients.length === 0) {
    console.error(
      "[cron/admin-digest] 수신자를 찾지 못했습니다. " +
        "ADMIN_DIGEST_TO 환경변수를 설정하거나 profiles.role='admin' 계정의 이메일을 확인해주세요."
    );
    return NextResponse.json({ ok: false, sent: 0, reason: "no_recipient", date: dateLabel, failed });
  }

  const subject = buildAdminDigestSubject(pending, yesterday);

  let sent = 0;
  const errors: string[] = [];
  for (const recipient of recipients) {
    const result = await sendMail({
      to: recipient,
      subject,
      react: AdminDigestEmail({
        dateLabel,
        pending,
        yesterday,
        failed: failed.length > 0 ? failed : undefined,
      }),
    });
    if (result.ok) sent += 1;
    else errors.push(`${recipient}: ${result.error}`);
  }

  console.log(
    `[cron/admin-digest] ${dateLabel} 요약 발송 — 수신자 ${recipients.length}명 중 성공 ${sent}, ` +
      `처리 대기 ${pending.length}종 / 어제 발생 ${yesterday.length}종` +
      (failed.length > 0 ? ` / 조회 실패: ${failed.join(", ")}` : "")
  );

  return NextResponse.json({
    ok: true,
    sent,
    date: dateLabel,
    subject,
    pending: pending.map((r) => ({ label: r.label, count: r.count })),
    yesterday: yesterday.map((r) => ({ label: r.label, count: r.count })),
    failed,
    errors: errors.slice(0, 10),
  });
}
