/**
 * 공연 D-3 / D-1 알림 cron — 매일 03:00 KST 실행.
 *
 * 트리거
 * - Vercel Cron (vercel.json 의 crons 항목)
 * - 또는 외부 스케줄러가 CRON_SECRET 헤더와 함께 호출
 *
 * 보안
 * - Authorization: Bearer ${CRON_SECRET} 또는 x-cron-secret 헤더 검증
 * - Vercel Cron은 자동으로 Authorization 헤더에 CRON_SECRET을 넣어 호출함
 *
 * 동작
 * 1) likes ⨝ shows(status='approved') 조인
 * 2) shows.schedule_start 가
 *    - D-3 윈도우: now+2.5일 ~ now+3.5일
 *    - D-1 윈도우: now+0.5일 ~ now+1.5일
 *    범위 안에 있는 행만 수집
 * 3) 사용자 id 별로 묶고, profiles.notify_show_reminders != false 인 사용자에게만 발송
 * 4) auth.users 에서 이메일 조회 후 ShowReminderEmail 한 통 발송
 * 5) 멱등성: notification_log 테이블이 있으면 (user_id, show_id, kind=D3|D1) 중복 차단
 *    없으면 best-effort (in-memory)
 *
 * 멱등성 주의
 * - cron이 같은 날 두 번 돌아도 사용자에게 같은 메일이 두 번 가지 않도록
 *   notification_log 가 핵심. 마이그레이션 SQL에 포함.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { ShowReminderEmail } from "@/lib/email/templates/show-reminder";
import { showDateKey } from "@/lib/showDate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ReminderKind = "D3" | "D1";

type ShowRow = {
  id: string;
  title: string;
  venue: string | null;
  schedule_start: string | null;
  status: string;
  poster_url: string | null;
};

type LikeRow = {
  user_id: string;
  show_id: string;
  shows: ShowRow | ShowRow[] | null;
};

type Profile = {
  id: string;
  name: string | null;
  notify_show_reminders?: boolean | null;
};

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
 * 공연 날짜 문자열("2026-05-10")을 **KST 자정의 실제 시각**으로 바꾼다.
 *
 * 2026-08-03 수정. 이전 구현은 `new Date("2026-05-10")`을 그대로 썼는데,
 * 이 형식은 자바스크립트가 UTC 자정으로 해석한다. 게다가 Vercel 서버 타임존은 UTC라
 * 로컬 자정 = UTC 자정이 되어, 한국 자정과 9시간 어긋난 채로 D-3/D-1 창을 계산하고 있었다.
 * 그 9시간이 창(윈도우) 밖으로 밀어내면 알림 메일이 **조용히 발송되지 않는다.**
 * 관객도 운영자도 "안 왔다"는 사실조차 모른다.
 */
function kstMidnight(raw: string | null): number | null {
  const ymd = showDateKey(raw);
  if (!ymd) return null;
  const t = Date.parse(`${ymd}T00:00:00+09:00`);
  return Number.isNaN(t) ? null : t;
}

/** 오늘로부터 offsetDays 뒤의 KST 날짜를 "YYYY-MM-DD"로 (DB 1차 필터용) */
function kstDateKey(now: number, offsetDays: number): string {
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  return new Date(now + KST_OFFSET + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * 공연 날짜가 (now + lowDays) ~ (now + highDays) 구간 안에 있는지.
 * 시간 단위까지 비교하므로 cron이 매일 같은 시각에 돌지 않아도
 * D-3 윈도우 24h, D-1 윈도우 24h가 빠지지 않고 잡힌다.
 */
function inDayWindow(iso: string | null, now: number, lowDays: number, highDays: number): boolean {
  const t = kstMidnight(iso);
  if (t === null) return false;
  const diffDays = (t - now) / (1000 * 60 * 60 * 24);
  return diffDays >= lowDays && diffDays < highDays;
}

async function logSent(userId: string, showId: string, kind: ReminderKind): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("notification_log").insert({
      user_id: userId,
      show_id: showId,
      kind,
    });
  } catch {
    // 테이블 없거나 중복 — 무시
  }
}

async function alreadySent(userId: string, showId: string, kind: ReminderKind): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("notification_log")
      .select("id")
      .eq("user_id", userId)
      .eq("show_id", showId)
      .eq("kind", kind)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();

  // 1) 모든 likes ⨝ shows(approved) 조인
  // 효율을 위해 미래 14일 안의 공연만 1차 필터한 뒤, 메모리에서 윈도우 컷.
  // (likes 테이블이 매우 커지면 SQL view·rpc로 전환 필요 — 운영팀 모니터링)
  // 2026-08-03 수정: schedule_start 컬럼은 text("2026-05-10")인데 여기에 전체 ISO 문자열
  // ("2026-05-10T00:00:00.000Z")을 넘기고 있었다. PostgREST는 글자 비교를 하므로
  // 같은 날짜라도 "2026-05-10" < "2026-05-10T00:00..." 이 되어 경계일이 통째로 잘려나갔다.
  // 컬럼과 같은 형식(날짜만)으로 넘긴다.
  const horizon = kstDateKey(now, 14);
  const floor = kstDateKey(now, -1);

  const { data: likeRows, error: likeErr } = await admin
    .from("likes")
    .select("user_id, show_id, shows(id, title, venue, schedule_start, status, poster_url)")
    .gte("shows.schedule_start", floor)
    .lte("shows.schedule_start", horizon);

  if (likeErr) {
    console.error("[cron/show-reminders] likes 조회 실패:", likeErr);
    return NextResponse.json({ ok: false, error: "likes_query_failed" }, { status: 500 });
  }

  // 2) 사용자별로 D-3 / D-1 윈도우에 해당하는 공연만 묶기
  type Candidate = {
    showId: string;
    title: string;
    venue: string | null;
    schedule_start: string | null;
    poster_url: string | null;
    daysLeft: 1 | 3;
  };
  const byUser = new Map<string, Candidate[]>();

  for (const row of (likeRows ?? []) as LikeRow[]) {
    const show = Array.isArray(row.shows) ? row.shows[0] : row.shows;
    if (!show) continue;
    if (show.status !== "approved") continue;

    let kind: 1 | 3 | null = null;
    if (inDayWindow(show.schedule_start, now, 0.5, 1.5)) kind = 1;
    else if (inDayWindow(show.schedule_start, now, 2.5, 3.5)) kind = 3;
    if (kind === null) continue;

    const list = byUser.get(row.user_id) ?? [];
    list.push({
      showId: show.id,
      title: show.title,
      venue: show.venue,
      schedule_start: show.schedule_start,
      poster_url: show.poster_url,
      daysLeft: kind,
    });
    byUser.set(row.user_id, list);
  }

  if (byUser.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, scanned: likeRows?.length ?? 0, message: "no candidates" });
  }

  // 3) 프로필 조회 — 알림 거부 사용자 컷
  const userIds = [...byUser.keys()];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, notify_show_reminders")
    .in("id", userIds);

  const profileMap = new Map<string, Profile>();
  for (const p of (profiles ?? []) as Profile[]) profileMap.set(p.id, p);

  // 4) 각 사용자별 발송
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [userId, candidates] of byUser.entries()) {
    const profile = profileMap.get(userId);
    if (profile?.notify_show_reminders === false) {
      skipped += 1;
      continue;
    }

    // 멱등성 컷 — 이미 보낸 항목 제거
    const fresh: Candidate[] = [];
    for (const c of candidates) {
      const kind: ReminderKind = c.daysLeft === 1 ? "D1" : "D3";
      const seen = await alreadySent(userId, c.showId, kind);
      if (!seen) fresh.push(c);
    }
    if (fresh.length === 0) {
      skipped += 1;
      continue;
    }

    // 이메일 주소 조회 (auth.admin.getUserById)
    let email: string | null = null;
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data.user?.email ?? null;
    } catch (err) {
      console.warn("[cron/show-reminders] auth 조회 실패:", userId, err);
    }
    if (!email) {
      skipped += 1;
      continue;
    }

    const subject =
      fresh.length === 1
        ? fresh[0].daysLeft === 1
          ? `내일, ${fresh[0].title}의 막이 오릅니다`
          : `사흘 뒤, ${fresh[0].title}의 막이 오릅니다`
        : `관심 공연 ${fresh.length}건이 가까이 와 있습니다`;

    const result = await sendMail({
      to: email,
      subject,
      react: ShowReminderEmail({
        name: profile?.name ?? null,
        shows: fresh.map((c) => ({
          id: c.showId,
          title: c.title,
          venue: c.venue,
          schedule_start: c.schedule_start,
          poster_url: c.poster_url,
          daysLeft: c.daysLeft,
        })),
      }),
    });

    if (result.ok) {
      sent += 1;
      for (const c of fresh) {
        await logSent(userId, c.showId, c.daysLeft === 1 ? "D1" : "D3");
      }
    } else {
      errors.push(`${userId}: ${result.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: likeRows?.length ?? 0,
    users: byUser.size,
    sent,
    skipped,
    errors: errors.slice(0, 10),
  });
}
