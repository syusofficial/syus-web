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
 * 1) 두 곳에서 대상을 모은다.
 *    (a) likes ⨝ shows(status='approved')            — 찜해 둔 공연
 *    (b) syus_reservations(status='confirmed') ⨝ shows — 좌석을 실제로 신청한 공연
 * 2) shows.schedule_start 가
 *    - D-3 윈도우: now+2.5일 ~ now+3.5일
 *    - D-1 윈도우: now+0.5일 ~ now+1.5일
 *    범위 안에 있는 행만 수집
 * 3) 사용자 id 별로 묶고, profiles.notify_show_reminders != false 인 사용자에게만 발송
 * 4) auth.users 에서 이메일 조회 후 메일 한 통 발송
 *    - 신청이 하나라도 섞이면 ShowReminderReservedEmail(신청자용 문구·취소 안내)
 *    - 찜만 있으면 기존 ShowReminderEmail (동작·문구 변경 없음)
 * 5) 멱등성: notification_log (user_id, show_id, kind)
 *
 * ── 2026-09-10 수정 (좌석 신청자 누락) ───────────────────────────────
 * 이 라우트는 그동안 likes 만 봤다. 즉 "찜만 눌러 둔 사람"에게는 알림이 가고,
 * "좌석을 실제로 신청한 사람" — 즉 올 확률이 가장 높은 사람에게는 가지 않았다.
 * 게다가 신청 폼(SeatReservationForm)은 화면에서 "공연 사흘 전과 하루 전, 잊지 않도록
 * 메일로 알려드립니다"라고 이미 약속하고 있었다. 약속과 구현이 어긋난 상태였고,
 * 그 대가(노쇼)는 학생 공연팀이 치른다. syus_reservations 를 발송 대상에 합친다.
 *
 * 멱등성 주의 — kind 가 4종으로 늘었다
 * - 찜 알림: D3 / D1   (기존)
 * - 신청 알림: D3R / D1R (신설, R = Reservation)
 * - 중복 발송 차단은 **(user_id, show_id, 남은 일수)** 단위다.
 *   같은 사람이 같은 공연을 찜도 하고 신청도 했다면 후보는 한 건으로 합쳐지고,
 *   이미 보낸 기록을 볼 때도 D3·D3R 두 kind 를 함께 조회한다(kindsFor 참고).
 *   그래서 어떤 경로로 잡혔든 한 사람에게 같은 공연 알림이 두 통 가지 않는다.
 * - notification_log.kind 의 CHECK 제약에 D3R/D1R 을 더하는 마이그레이션이 필요하다:
 *   db/migrations/2026-09-10_reservation_reminders.sql (사장님이 Supabase에서 1회 실행)
 *   아직 실행 전이라면 logSent 가 자동으로 기존 kind(D3/D1)로 되돌려 기록하므로,
 *   그동안에도 중복 발송은 일어나지 않는다.
 *
 * 게스트(비로그인) 신청자
 * - 이번 범위에서 제외한다. syus_reservations.guest_contact 는 전화번호일 수도 있고,
 *   수집 목적에 "알림 발송"이 포함되는지 개인정보 처리방침 확인이 필요하다.
 *   → 법무팀 확인 후 별도 판단. 제외된 건수는 응답의 guestSkipped 로 보인다.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { ShowReminderEmail } from "@/lib/email/templates/show-reminder";
import { ShowReminderReservedEmail } from "@/lib/email/templates/show-reminder-reserved";
import { showDateKey } from "@/lib/showDate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** D3/D1 = 찜(likes) 알림, D3R/D1R = 좌석 신청(syus_reservations) 알림 */
type ReminderKind = "D3" | "D1" | "D3R" | "D1R";

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

type ReservationRow = {
  user_id: string | null;
  show_id: string;
  party_size: number | null;
  reservation_code: string | null;
  shows: ShowRow | ShowRow[] | null;
};

type Profile = {
  id: string;
  name: string | null;
  notify_show_reminders?: boolean | null;
};

/** 사용자 한 명 + 공연 한 건에 대한 발송 후보. 찜과 신청은 여기서 하나로 합쳐진다. */
type Candidate = {
  showId: string;
  title: string;
  venue: string | null;
  schedule_start: string | null;
  poster_url: string | null;
  daysLeft: 1 | 3;
  /** 찜해 둔 공연인가 */
  liked: boolean;
  /** 확정(confirmed) 좌석 신청이 있는가 */
  reserved: boolean;
  /** 신청 인원 합계 (같은 공연에 신청이 여러 건이면 더한다) */
  partySize: number;
  /** 신청 건수 — 2건 이상이면 메일에 신청번호를 적지 않는다(하나만 적으면 오해를 부른다) */
  reservationCount: number;
  /** 첫 번째 신청번호 */
  reservationCode: string | null;
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

/** 이 공연이 지금 D-1 창인지, D-3 창인지, 둘 다 아닌지 */
function windowDaysLeft(iso: string | null, now: number): 1 | 3 | null {
  if (inDayWindow(iso, now, 0.5, 1.5)) return 1;
  if (inDayWindow(iso, now, 2.5, 3.5)) return 3;
  return null;
}

/**
 * 남은 일수에 대응하는 kind 두 짝.
 * base = 찜 알림, reserved = 신청 알림.
 * "이미 보냈는지" 판정은 항상 두 짝을 함께 본다 — 그래야 찜으로 한 번, 신청으로 한 번
 * 두 통이 나가는 일이 없다.
 */
function kindsFor(daysLeft: 1 | 3): { base: ReminderKind; reserved: ReminderKind } {
  return daysLeft === 1
    ? { base: "D1", reserved: "D1R" }
    : { base: "D3", reserved: "D3R" };
}

/**
 * 메일 제목.
 * 찜만 있는 메일의 제목은 기존과 한 글자도 다르지 않게 둔다(기존 수신자 경험 유지).
 * 신청이 섞이면 "신청하신"을 넣어, 받은 사람이 제목만 보고도 자기 자리가 있는 공연임을 안다.
 */
function buildSubject(fresh: Candidate[]): string {
  if (fresh.length !== 1) {
    return fresh.some((c) => c.reserved)
      ? `가까이 온 공연 ${fresh.length}건을 모아 보내드립니다`
      : `관심 공연 ${fresh.length}건이 가까이 와 있습니다`;
  }
  const only = fresh[0];
  const when = only.daysLeft === 1 ? "내일" : "사흘 뒤";
  const what = only.reserved ? `신청하신 ${only.title}` : only.title;
  return `${when}, ${what}의 막이 오릅니다`;
}

/** PostgREST 임베드 결과는 배열로 올 때가 있어 한 건으로 펴 준다. */
function pickShow(shows: ShowRow | ShowRow[] | null): ShowRow | null {
  if (!shows) return null;
  return Array.isArray(shows) ? (shows[0] ?? null) : shows;
}

async function logSent(
  userId: string,
  showId: string,
  daysLeft: 1 | 3,
  reserved: boolean
): Promise<void> {
  const { base, reserved: reservedKind } = kindsFor(daysLeft);
  const kind: ReminderKind = reserved ? reservedKind : base;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notification_log").insert({
      user_id: userId,
      show_id: showId,
      kind,
    });
    if (!error) return;

    // 23505 = unique 충돌. 이미 같은 기록이 있다는 뜻이니 정상이고, 할 일도 없다.
    if (error.code === "23505") return;

    // 그 밖의 실패 중 현실적으로 가능한 것은 "kind CHECK 제약에 아직 D3R/D1R 이 없는"
    // 경우다(마이그레이션 미실행). 기록이 남지 않으면 내일 같은 메일이 또 나간다.
    // 그 조용한 재발송을 막으려고 기존 kind(D3/D1)로 한 번 더 시도한다 —
    // 중복 판정은 어차피 두 kind 를 함께 보므로 차단 효과는 동일하다.
    // 마이그레이션을 실행하면 이 경로는 더 이상 타지 않는다.
    if (reserved) {
      console.error(
        "[cron/show-reminders] notification_log 기록 실패 — kind CHECK 제약에 D3R/D1R이 없을 수 있습니다. " +
          "db/migrations/2026-09-10_reservation_reminders.sql 실행이 필요합니다.",
        error
      );
      await admin.from("notification_log").insert({ user_id: userId, show_id: showId, kind: base });
    }
  } catch {
    // 테이블 없거나 중복 — 무시 (알림 하나 때문에 cron 전체가 죽지 않는다)
  }
}

/**
 * 이미 보낸 알림인지.
 * (user_id, show_id, 남은 일수) 단위로 판정한다 — 찜 kind와 신청 kind를 함께 조회하므로
 * 경로가 달라도 같은 공연 알림이 두 번 나가지 않는다.
 */
async function alreadySent(userId: string, showId: string, daysLeft: 1 | 3): Promise<boolean> {
  try {
    const { base, reserved } = kindsFor(daysLeft);
    const admin = createAdminClient();
    const { data } = await admin
      .from("notification_log")
      .select("id")
      .eq("user_id", userId)
      .eq("show_id", showId)
      .in("kind", [base, reserved])
      .limit(1);
    return (data?.length ?? 0) > 0;
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

  // 1) 후보 수집 — 미래 14일 안의 공연만 1차 필터한 뒤, 메모리에서 윈도우 컷.
  // 2026-08-03 수정: schedule_start 컬럼은 text("2026-05-10")인데 여기에 전체 ISO 문자열
  // ("2026-05-10T00:00:00.000Z")을 넘기고 있었다. PostgREST는 글자 비교를 하므로
  // 같은 날짜라도 "2026-05-10" < "2026-05-10T00:00..." 이 되어 경계일이 통째로 잘려나갔다.
  // 컬럼과 같은 형식(날짜만)으로 넘긴다.
  const horizon = kstDateKey(now, 14);
  const floor = kstDateKey(now, -1);

  // 2026-09-10 수정: shows(...) → shows!inner(...)
  // PostgREST에서 임베드한 테이블에 건 필터는 **부모 행을 거르지 않는다.** 조건에 맞지
  // 않으면 부모는 그대로 오고 shows 만 null이 되어 돌아온다. 즉 지금까지 이 쿼리는
  // 의도한 "14일 안" 1차 필터가 DB에서 동작하지 않아 매일 likes 전체를 실어 왔고,
  // 실제 컷은 아래 `if (!show) continue;` 가 메모리에서 대신 하고 있었다.
  // (결과는 같지만 likes가 커질수록 통째로 스캔한다.) !inner 면 DB가 부모까지 거른다.
  const { data: likeRows, error: likeErr } = await admin
    .from("likes")
    .select("user_id, show_id, shows!inner(id, title, venue, schedule_start, status, poster_url)")
    .gte("shows.schedule_start", floor)
    .lte("shows.schedule_start", horizon);

  if (likeErr) {
    console.error("[cron/show-reminders] likes 조회 실패:", likeErr);
    return NextResponse.json({ ok: false, error: "likes_query_failed" }, { status: 500 });
  }

  // 좌석 신청자 — 확정(confirmed) 건만. 대기(waitlisted)·취소(cancelled)는 제외한다.
  // 실패해도 cron 전체를 세우지 않는다(찜 알림만이라도 나가도록). 대신 응답에 남겨
  // 조용히 묻히지 않게 한다.
  let reservationRows: ReservationRow[] = [];
  let reservationError: string | null = null;
  {
    const { data, error } = await admin
      .from("syus_reservations")
      .select(
        "user_id, show_id, party_size, reservation_code, shows!inner(id, title, venue, schedule_start, status, poster_url)"
      )
      .eq("status", "confirmed")
      .gte("shows.schedule_start", floor)
      .lte("shows.schedule_start", horizon);

    if (error) {
      console.error("[cron/show-reminders] syus_reservations 조회 실패:", error);
      reservationError = error.message ?? String(error);
    } else {
      reservationRows = (data ?? []) as unknown as ReservationRow[];
    }
  }

  // 2) 사용자별 · 공연별로 후보를 하나로 합친다.
  //    같은 사람이 같은 공연을 찜도 하고 신청도 했으면 여기서 한 건이 된다 → 메일도 한 통.
  const byUser = new Map<string, Map<string, Candidate>>();

  function ensureCandidate(userId: string, show: ShowRow, daysLeft: 1 | 3): Candidate {
    let perShow = byUser.get(userId);
    if (!perShow) {
      perShow = new Map<string, Candidate>();
      byUser.set(userId, perShow);
    }
    let candidate = perShow.get(show.id);
    if (!candidate) {
      candidate = {
        showId: show.id,
        title: show.title,
        venue: show.venue,
        schedule_start: show.schedule_start,
        poster_url: show.poster_url,
        daysLeft,
        liked: false,
        reserved: false,
        partySize: 0,
        reservationCount: 0,
        reservationCode: null,
      };
      perShow.set(show.id, candidate);
    }
    return candidate;
  }

  for (const row of (likeRows ?? []) as unknown as LikeRow[]) {
    const show = pickShow(row.shows);
    if (!show) continue;
    if (show.status !== "approved") continue;

    const daysLeft = windowDaysLeft(show.schedule_start, now);
    if (daysLeft === null) continue;

    ensureCandidate(row.user_id, show, daysLeft).liked = true;
  }

  // 게스트(비로그인) 신청은 이번 범위 밖 — 몇 건이 빠졌는지만 세어 응답에 남긴다.
  let guestSkipped = 0;

  for (const row of reservationRows) {
    const show = pickShow(row.shows);
    if (!show) continue;
    if (show.status !== "approved") continue;

    const daysLeft = windowDaysLeft(show.schedule_start, now);
    if (daysLeft === null) continue;

    if (!row.user_id) {
      guestSkipped += 1;
      continue;
    }

    const candidate = ensureCandidate(row.user_id, show, daysLeft);
    candidate.reserved = true;
    candidate.partySize += row.party_size ?? 1;
    candidate.reservationCount += 1;
    // 신청이 두 건 이상이면 신청번호를 적지 않는다 — 하나만 적으면 나머지가 없는 것처럼 보인다.
    candidate.reservationCode =
      candidate.reservationCount > 1 ? null : row.reservation_code ?? null;
  }

  const scanned = (likeRows?.length ?? 0) + reservationRows.length;

  if (byUser.size === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      scanned,
      likesScanned: likeRows?.length ?? 0,
      reservationsScanned: reservationRows.length,
      guestSkipped,
      reservationError,
      message: "no candidates",
    });
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
  let reservedRecipients = 0;
  const errors: string[] = [];

  for (const [userId, perShow] of byUser.entries()) {
    const profile = profileMap.get(userId);
    if (profile?.notify_show_reminders === false) {
      skipped += 1;
      continue;
    }

    // 멱등성 컷 — 이미 보낸 항목 제거.
    // 찜 kind와 신청 kind를 함께 보므로, 어제 찜으로 보낸 공연이 오늘 신청 때문에
    // 다시 후보로 잡혀도 두 번 나가지 않는다.
    const fresh: Candidate[] = [];
    for (const c of perShow.values()) {
      const seen = await alreadySent(userId, c.showId, c.daysLeft);
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

    // 신청이 하나라도 섞이면 신청자용 메일(취소 안내 포함), 아니면 기존 찜 메일 그대로.
    const hasReservation = fresh.some((c) => c.reserved);

    const subject = buildSubject(fresh);

    const react = hasReservation
      ? ShowReminderReservedEmail({
          name: profile?.name ?? null,
          shows: fresh.map((c) => ({
            id: c.showId,
            title: c.title,
            venue: c.venue,
            schedule_start: c.schedule_start,
            poster_url: c.poster_url,
            daysLeft: c.daysLeft,
            reserved: c.reserved,
            liked: c.liked,
            partySize: c.partySize,
            reservationCode: c.reservationCode,
          })),
        })
      : ShowReminderEmail({
          name: profile?.name ?? null,
          shows: fresh.map((c) => ({
            id: c.showId,
            title: c.title,
            venue: c.venue,
            schedule_start: c.schedule_start,
            poster_url: c.poster_url,
            daysLeft: c.daysLeft,
          })),
        });

    const result = await sendMail({ to: email, subject, react });

    if (result.ok) {
      sent += 1;
      if (hasReservation) reservedRecipients += 1;
      for (const c of fresh) {
        await logSent(userId, c.showId, c.daysLeft, c.reserved);
      }
    } else {
      errors.push(`${userId}: ${result.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned,
    likesScanned: likeRows?.length ?? 0,
    reservationsScanned: reservationRows.length,
    guestSkipped,
    reservationError,
    users: byUser.size,
    sent,
    reservedRecipients,
    skipped,
    errors: errors.slice(0, 10),
  });
}
