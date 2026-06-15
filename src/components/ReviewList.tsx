"use client";

import { useState, useTransition } from "react";
import { reportReview, deleteMyReview } from "@/app/actions/reviews";
import { formatReviewDate, type ReviewView } from "@/lib/reviews";

type Props = {
  showId: string;
  reviews: ReviewView[];
};

const REPORT_REASONS = [
  "욕설/비방",
  "허위·근거 없음",
  "스포일러 노출",
  "개인정보 노출",
  "광고/홍보",
  "기타",
];

export default function ReviewList({ showId, reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <p
        className="text-sm py-8 text-center"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}
      >
        아직 후기가 없습니다. 첫 후기를 남겨주세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} showId={showId} />
      ))}
    </div>
  );
}

function ReviewCard({ review, showId }: { review: ReviewView; showId: string }) {
  const [isPending, startTransition] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const handleReport = () => {
    if (!reportReason) {
      setToast("신고 사유를 선택해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await reportReview(review.id, showId, reportReason);
      setToast(res.message);
      if (res.ok) {
        setReportOpen(false);
        setReportReason("");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("작성하신 후기를 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const res = await deleteMyReview(review.id, showId);
      setToast(res.message);
    });
  };

  return (
    <article
      className="p-5"
      style={{
        backgroundColor: "#F0EEE9",
        border: "1px solid #D4CFC1",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33" }}
          >
            {review.authorLabel}
          </p>
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}
          >
            {formatReviewDate(review.createdAt)}
          </p>
          {/* 본인이고 status가 hidden일 때만 '검토 중' 라벨 노출 (제작팀 진단 #4) */}
          {review.isMine && review.status === "hidden" && (
            <span
              className="text-[0.65rem] px-2 py-0.5 tracking-wider"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#E6E1D6",
                color: "#6B5C50",
                border: "1px solid #D4CFC1",
              }}
              title="자동 검열 통과 후 운영자 검토 대기 중입니다. 다른 분에게는 보이지 않습니다."
            >
              검토 중 · 비공개
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {review.isMine ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-[0.7rem] px-2 py-1 transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#D54545",
                border: "1px solid #D54545",
                background: "none",
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              삭제
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setReportOpen((v) => !v)}
              disabled={isPending || review.reportedByMe}
              className="text-[0.7rem] px-2 py-1 transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: review.reportedByMe ? "#6B5C50" : "#6B5C50",
                border: "1px solid #D4CFC1",
                background: "none",
                cursor: review.reportedByMe ? "default" : "pointer",
              }}
              title="허위·비방·욕설 등 부적절한 후기를 신고합니다."
            >
              {review.reportedByMe ? "신고됨" : "신고"}
            </button>
          )}
        </div>
      </div>

      <p
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
      >
        {review.body}
      </p>

      {reportOpen && !review.isMine && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #D4CFC1" }}>
          <p
            className="text-xs mb-2"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}
          >
            신고 사유를 선택해주세요. 운영자가 24시간 내 확인합니다.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReportReason(r)}
                className="text-[0.7rem] px-2 py-1 transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: reportReason === r ? "#0B5563" : "transparent",
                  color: reportReason === r ? "#F0EEE9" : "#4A3B33",
                  border: "1px solid #0B5563",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReport}
              disabled={isPending || !reportReason}
              className="text-xs px-3 py-1.5"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: reportReason ? "#D54545" : "#D4CFC1",
                color: "#F0EEE9",
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              신고 접수
            </button>
            <button
              type="button"
              onClick={() => { setReportOpen(false); setReportReason(""); }}
              className="text-xs px-3 py-1.5"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#6B5C50",
                border: "1px solid #D4CFC1",
                background: "none",
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {toast && (
        <p
          className="mt-3 text-[0.7rem]"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}
        >
          {toast}
        </p>
      )}
    </article>
  );
}
