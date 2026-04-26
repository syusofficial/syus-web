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
