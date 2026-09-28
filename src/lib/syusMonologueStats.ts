/**
 * 창작 독백 운영 요약 — /syus/monologues/review(독백 관리)와 /syus/admin(시우스 관리) 두 화면이 같이 쓴다.
 *
 * 왜 한 곳에 두나: 두 화면이 "공개 중"·"한도 근접"을 각자 세면 기준이 어긋나기 쉽다.
 * 특히 하루 한도는 DB 함수 syus_start_generation(supabase/syus_monologue_ratelimit.sql)과
 * 생성 라우트(src/app/api/syus/monologue/generate/route.ts)의 DAILY_CAP과 같아야 하므로,
 * 화면 쪽 계산은 여기 하나로 모은다. 한도를 바꾸면 세 곳을 함께 고친다.
 */

/** 유저당 24시간 생성 한도 — SQL 함수·생성 라우트와 값 일치 */
export const MONOLOGUE_DAILY_CAP = 3;

/** 한도 계산에 들어가는 상태 — SQL 함수와 같다(생성 중·전달 완료만 센다) */
const CAP_STATUSES = new Set(["reviewing", "delivered"]);

const DAY_MS = 24 * 60 * 60 * 1000;

export type MonologueStatRow = {
  user_id: string;
  status: string;
  is_public: boolean;
  generated_text?: string | null;
  created_at: string;
};

export type MonologueSummary = {
  total: number;
  /** 서고에 실제로 보이는 것 — 전달 완료 + 공개 처리 */
  publicNow: number;
  /** 전달은 됐지만 서고에는 안 보이는 것 */
  privateDelivered: number;
  rejected: number;
  /** 운영자가 손봐야 하는 예외(생성 대기·생성 중에 멈춘 것) */
  exceptions: number;
  /** 최근 24시간 안에 생성된 수(한도 계산과 같은 기준) */
  generated24h: number;
  /** 24시간 생성 수를 유저별로 — 한도 근접자 표시용 */
  perUser24h: Record<string, number>;
};

export function summarizeMonologues(rows: MonologueStatRow[], now = Date.now()): MonologueSummary {
  const since = now - DAY_MS;
  const perUser24h: Record<string, number> = {};
  let publicNow = 0, privateDelivered = 0, rejected = 0, exceptions = 0, generated24h = 0;

  for (const m of rows) {
    if (m.status === "delivered") {
      if (m.is_public) publicNow += 1; else privateDelivered += 1;
    } else if (m.status === "rejected") {
      rejected += 1;
    } else if (m.status === "pending" || m.status === "reviewing") {
      exceptions += 1;
    }
    const t = new Date(m.created_at).getTime();
    if (CAP_STATUSES.has(m.status) && !isNaN(t) && t > since) {
      generated24h += 1;
      perUser24h[m.user_id] = (perUser24h[m.user_id] ?? 0) + 1;
    }
  }

  return { total: rows.length, publicNow, privateDelivered, rejected, exceptions, generated24h, perUser24h };
}

/**
 * 한도에 가까운 요청자 — 하루 한도에서 1건 이하로 남은 사람.
 * 한도에 닿은 사람이 "왜 안 되냐"고 물어 올 때 운영자가 먼저 알아보도록 띄운다.
 */
export function nearCapUsers(summary: MonologueSummary): { user_id: string; count: number }[] {
  return Object.entries(summary.perUser24h)
    .filter(([, n]) => n >= MONOLOGUE_DAILY_CAP - 1)
    .map(([user_id, count]) => ({ user_id, count }))
    .sort((a, b) => b.count - a.count);
}
