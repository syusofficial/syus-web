import type { Review } from "@/types";

/**
 * 후기 표시용 가공 — 작성자 식별은 닉네임만(법무팀 권고: 실명·이니셜+학과 금지).
 * profiles 조인 결과의 name이 비어 있으면 익명 처리.
 */
export type ReviewView = {
  id: string;
  body: string;
  createdAt: string;
  authorLabel: string;
  isMine: boolean;
  reportedByMe: boolean;
  status: Review["status"];
};

export function toReviewView(
  row: Review & { profiles?: { name: string | null } | null },
  currentUserId: string | null,
  reportedByMeIds: Set<string>
): ReviewView {
  const rawName = row.author_nickname ?? row.profiles?.name ?? null;
  const authorLabel = (rawName ?? "").trim() || "익명 관람객";
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    authorLabel,
    isMine: currentUserId !== null && row.user_id === currentUserId,
    reportedByMe: reportedByMeIds.has(row.id),
    status: row.status,
  };
}

/** 짧은 상대 시간 포맷 ("방금", "12시간 전", "3일 전", "2026.04.12") */
export function formatReviewDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 5) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
