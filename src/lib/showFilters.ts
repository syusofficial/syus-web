import type { Show } from "@/types";
import { parseShowDate, showDateKey, toDateInputValue } from "@/lib/showDate";

/** 오늘 자정 기준 비교 키 (YYYY-MM-DD, 로컬 시간대) */
export function todayKey(): string {
  return toDateInputValue(new Date());
}

/**
 * schedule_end(없으면 schedule_start)를 비교·정렬용 키로 정규화.
 *
 * 2026-08-03 수정: 예전에는 점(.)만 하이픈으로 바꿔 문자열 비교했다. 그래서
 * "2026.5.10"(0 안 채운 값)·"2026/05/10"·"2026년 5월 10일" 같은 값이 조용히 틀린 키가 되어
 * 지난 공연이 아카이브로 넘어가지 않았다(에러도 안 남). 이제 parseShowDate로 실제 날짜를
 * 읽어 "YYYY-MM-DD"로 만든다.
 *
 * 읽지 못한 값은 **예전과 동일한 문자열 정규화 결과**를 그대로 돌려준다.
 * muol/page.tsx 등에서 이 키를 정렬에도 쓰기 때문에, 여기서 null을 반환하면 정렬 순서가
 * 통째로 흔들린다. 종료 판정은 아래 isEnded가 별도로(파싱 실패 = active) 처리한다.
 */
export function showEndKey(show: Show): string | null {
  const raw = (show.schedule_end || show.schedule_start || "").trim();
  if (!raw) return null;
  return showDateKey(raw) ?? raw.replace(/\./g, "-");
}

/**
 * 종료된 공연인지 (공연 종료일 < 오늘).
 * 날짜가 없거나 읽지 못하면 false(= 진행 중)로 둔다. 판정 불가한 공연을 임의로 아카이브로
 * 내려버리면 공연자가 등록한 공연이 관객에게 안 보이게 되므로, 애매할 땐 남겨두는 쪽.
 */
export function isEnded(show: Show, today: string = todayKey()): boolean {
  const raw = (show.schedule_end || show.schedule_start || "").trim();
  if (!raw) return false; // 날짜 없으면 active로 간주
  const parsed = parseShowDate(raw);
  if (!parsed) return false; // 읽지 못하는 형식도 active로 간주 (기존 동작 유지)
  return toDateInputValue(parsed) < today;
}

/** school_department 필드에서 학교명만 추출 (첫 어절) */
export function extractSchoolName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().split(/[\s,·/]/)[0].trim();
}

/**
 * Supabase PostgREST `.or()` 안에 들어가는 사용자 입력을 정제.
 * - `,` `(` `)` 는 .or() 의 구분자/그룹 문법이라 검색어에 섞이면 쿼리가 깨짐
 * - `*` `\` 는 PostgREST 패턴 메타문자
 * - `%` `_` 는 ilike 와일드카드. 의도치 않은 광범위 매칭 방지 위해 제거
 * - 결과는 최대 50자로 잘라 비정상 입력 차단
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()*\\%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}
