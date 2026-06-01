import type { RatingSummary } from "@/components/ShowCard";

/**
 * Supabase ratings 테이블에서 가져온 raw row 배열을
 * show_id 별 { avg, count } 요약 Map으로 변환.
 */
export function buildRatingMap(
  rows: { show_id: string; score: number }[] | null
): Map<string, RatingSummary> {
  const sumMap = new Map<string, { sum: number; count: number }>();
  for (const r of rows ?? []) {
    const cur = sumMap.get(r.show_id) ?? { sum: 0, count: 0 };
    cur.sum += r.score;
    cur.count += 1;
    sumMap.set(r.show_id, cur);
  }
  const out = new Map<string, RatingSummary>();
  sumMap.forEach((v, k) => out.set(k, { avg: v.sum / v.count, count: v.count }));
  return out;
}
