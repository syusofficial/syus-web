import type { Show } from "@/types";

/** 오늘 자정 기준 비교 키 (YYYY-MM-DD, 로컬 시간대) */
export function todayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** schedule_end 또는 schedule_start를 비교 가능한 키로 정규화 (".─" → "-") */
export function showEndKey(show: Show): string | null {
  const raw = (show.schedule_end || show.schedule_start || "").trim();
  if (!raw) return null;
  return raw.replace(/\./g, "-");
}

/** 종료된 공연인지 (schedule_end < 오늘) */
export function isEnded(show: Show, today: string = todayKey()): boolean {
  const key = showEndKey(show);
  if (!key) return false; // 날짜 없으면 active로 간주
  return key < today;
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
