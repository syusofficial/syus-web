/**
 * 공연 날짜 공통 유틸 — 2026-08-03 신설.
 *
 * 배경: shows.schedule_start / schedule_end 는 DB에서 text 타입이고, 등록 폼이 오랫동안
 * 자유 텍스트를 받아왔다. 그 결과 같은 컬럼을 어떤 코드는 "문자열"로(showFilters의 종료 판정),
 * 어떤 코드는 "날짜"로(show-reminders cron) 취급해 조용히 어긋났다.
 * 예) "2026.5.10"(0 안 채운 값)은 문자열 비교에서 "2026-08-03"보다 크게 나와 지난 공연이
 *     영원히 진행 중으로 남고, 리마인더 메일도 발송 조건에서 빠진다. 그런데 에러는 안 난다.
 *
 * 그래서 날짜를 다루는 모든 화면이 이 파일 하나만 쓰도록 모았다.
 * 새 코드에서 날짜를 직접 문자열로 자르거나 replace 하지 말고 반드시 여기 함수를 쓸 것.
 *
 * 설계 원칙 3가지:
 *  1) 절대 throw 하지 않는다 — 날짜 하나 때문에 목록 페이지 전체가 죽으면 안 된다.
 *  2) 읽지 못하면 null / 원문 그대로 — 기존 데이터가 화면에서 사라지는 일이 없게 한다.
 *  3) 시간대는 항상 "로컬 자정" 기준 — toISOString()으로 만들면 UTC로 밀려 하루가 어긋난다.
 */

const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 오타·깨진 값이 날짜로 통과하는 걸 막는 상식선 (예: "0202-05-10")
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

/**
 * 자유 텍스트에서 날짜를 최대한 읽어낸다. 읽지 못하면 null (throw 하지 않음).
 *
 * 지원 형식:
 *   2026-05-10 / 2026.05.10 / 2026/05/10 / 2026.5.10 (0 안 채워도 됨)
 *   2026-05-10T19:30:00+09:00 같은 ISO 문자열 (날짜 부분만 사용)
 *   2026년 5월 10일
 *   "2026.05.10 ~ 05.12" 처럼 앞뒤에 다른 글자가 붙어 있어도 맨 앞 날짜를 집는다
 *
 * 지원하지 않는 형식(= null): 연도가 없는 "5월 10일", "미정", "5.10~5.12".
 * 연도 없는 값을 임의로 올해로 추정하면 아카이브 이관·리마인더가 엉뚱하게 틀어지므로
 * 일부러 추측하지 않는다. null이 오면 호출부는 "판정 불가 → 기존 동작 유지"로 처리한다.
 */
export function parseShowDate(raw: string | null | undefined): Date | null {
  if (raw == null) return null;
  try {
    const text = String(raw).trim();
    if (!text) return null;

    // 첫 번째 구분자는 . - / 년, 두 번째는 . - / 월 을 허용
    const m = text.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
    if (!m) return null;

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (year < MIN_YEAR || year > MAX_YEAR) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    // 로컬 자정으로 생성 — new Date("2026-05-10")는 UTC 자정이라 KST에서 하루 밀릴 수 있다.
    const d = new Date(year, month - 1, day);
    if (Number.isNaN(d.getTime())) return null;

    // "2026-02-30" 같은 없는 날짜는 Date가 3월로 넘겨버린다. 되돌려 확인해 걸러낸다.
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;

    d.setHours(0, 0, 0, 0);
    return d;
  } catch {
    return null;
  }
}

/**
 * Date → "YYYY-MM-DD".
 * <input type="date">의 value, DB 저장값, 정렬·비교 키가 전부 이 형식 하나다.
 * toISOString().slice(0,10)을 쓰면 KST 자정이 전날 15:00 UTC라 하루 어긋나므로 금지.
 */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 자유 텍스트 → "YYYY-MM-DD" (읽지 못하면 null).
 * 저장 형식 = 비교 키 = date input value 가 모두 같은 문자열이라 함수 하나로 쓴다.
 */
export function showDateKey(raw: string | null | undefined): string | null {
  const d = parseShowDate(raw);
  return d ? toDateInputValue(d) : null;
}

/** 날짜로 읽히는 값인지 (등록 폼 제출 검증용) */
export function isValidShowDate(raw: string | null | undefined): boolean {
  return parseShowDate(raw) !== null;
}

/**
 * <input type="date">의 min 속성용 하한선.
 * 지난 공연을 아카이브에 올리는 경우가 있어 과거 입력 자체를 막지는 않되,
 * "1926-05-10" 같은 오타(연도 한 자리 실수)는 브라우저가 막아주도록 기본 1년 전까지만 허용.
 */
export function showDateInputMin(yearsBack = 1): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsBack);
  d.setHours(0, 0, 0, 0);
  return toDateInputValue(d);
}

type FormatOptions = {
  /** 요일 "(월)" 포함 여부. 기본 true */
  weekday?: boolean;
};

/**
 * 화면 표시용 단일 포맷 — "2026. 5. 10. (일)" (weekday:false 면 "2026. 5. 10.")
 *
 * 읽지 못한 값은 **원문을 그대로 돌려준다.** 예전 데이터가 화면에서 통째로 사라지는 것보다
 * 형식이 조금 어긋난 채로라도 보이는 편이 낫다(관객·공연자 양쪽에).
 */
export function formatShowDate(raw: string | null | undefined, opts: FormatOptions = {}): string {
  const fallback = raw == null ? "" : String(raw).trim();
  const d = parseShowDate(raw);
  if (!d) return fallback;
  return formatDate(d, opts.weekday !== false);
}

/** 내부용 — 이미 파싱된 Date를 표시 문자열로 */
function formatDate(d: Date, withWeekday: boolean): string {
  const base = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  return withWeekday ? `${base} (${WEEKDAYS_KR[d.getDay()]})` : base;
}

/**
 * 시작~종료를 한 줄로 — 공연 기간 표시의 표준.
 *   같은 날      → "2026. 5. 10. (일)"
 *   같은 달      → "2026. 5. 10.~12. (일~화)"
 *   같은 해      → "2026. 5. 10. ~ 6. 2. (일~화)"
 *   해가 다름    → "2026. 12. 30. (수) ~ 2027. 1. 2. (토)"
 *
 * 한쪽만 읽히거나 둘 다 못 읽으면 읽은 만큼만 포맷하고 나머지는 원문을 붙인다(데이터 보존).
 */
export function formatShowPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  opts: FormatOptions = {}
): string {
  const withWeekday = opts.weekday !== false;
  const rawStart = start == null ? "" : String(start).trim();
  const rawEnd = end == null ? "" : String(end).trim();
  if (!rawStart && !rawEnd) return "";

  const s = parseShowDate(rawStart);
  const e = parseShowDate(rawEnd);

  // 둘 다 못 읽음 — 원문 보존
  if (!s && !e) {
    if (rawStart && rawEnd && rawStart !== rawEnd) return `${rawStart} — ${rawEnd}`;
    return rawStart || rawEnd;
  }
  // 한쪽만 읽힘 — 읽은 쪽만 포맷, 나머지는 원문
  if (s && !e) {
    return rawEnd ? `${formatDate(s, withWeekday)} — ${rawEnd}` : formatDate(s, withWeekday);
  }
  if (!s && e) {
    return rawStart ? `${rawStart} — ${formatDate(e, withWeekday)}` : formatDate(e, withWeekday);
  }

  const a = s as Date;
  const b = e as Date;

  // 종료가 시작보다 빠른 비정상 데이터는 축약하지 않고 그대로 둘 다 보여준다(오류가 눈에 띄게).
  if (b.getTime() < a.getTime()) {
    return `${formatDate(a, withWeekday)} — ${formatDate(b, withWeekday)}`;
  }

  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();
  const sameDay = sameMonth && a.getDate() === b.getDate();

  if (sameDay) return formatDate(a, withWeekday);

  const span = withWeekday ? ` (${WEEKDAYS_KR[a.getDay()]}~${WEEKDAYS_KR[b.getDay()]})` : "";

  if (sameMonth) {
    return `${a.getFullYear()}. ${a.getMonth() + 1}. ${a.getDate()}.~${b.getDate()}.${span}`;
  }
  if (sameYear) {
    return `${a.getFullYear()}. ${a.getMonth() + 1}. ${a.getDate()}. ~ ${b.getMonth() + 1}. ${b.getDate()}.${span}`;
  }
  return `${formatDate(a, withWeekday)} ~ ${formatDate(b, withWeekday)}`;
}
