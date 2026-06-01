"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitReview } from "@/app/actions/reviews";

type Props = {
  showId: string;
  isLoggedIn: boolean;
  /** 본인의 기존 후기 본문 (없으면 null) */
  initialBody: string | null;
};

/**
 * 공연 후기 입력 — 1인 1후기 (서버에서 자동 검열)
 * 비로그인 시 로그인 유도. 본인 후기가 있으면 수정 모드.
 */
export default function ReviewInput({ showId, isLoggedIn, initialBody }: Props) {
  const [body, setBody] = useState(initialBody ?? "");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitReview(fd);
      setFeedback({ ok: res.ok, message: res.message });
    });
  };

  if (!isLoggedIn) {
    return (
      <div
        className="p-5 text-sm"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          color: "#7A746C",
          backgroundColor: "#F0EBE0",
        }}
      >
        후기를 작성하시려면{" "}
        <Link
          href="/auth/login"
          className="underline"
          style={{ color: "#3B5A6B", fontWeight: 600 }}
        >
          로그인
        </Link>
        해주세요.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="show_id" value={showId} />
      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        minLength={10}
        rows={4}
        placeholder={
          initialBody
            ? "후기를 수정해주세요."
            : "관람하신 공연의 인상을 남겨주세요. (10~1000자, 비방·욕설·차별 표현은 자동 차단됩니다)"
        }
        disabled={isPending}
        className="w-full p-3 text-sm leading-relaxed transition-colors"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          color: "#202833",
          backgroundColor: "#FBF8F1",
          border: "1px solid #D8D3C9",
          resize: "vertical",
          minHeight: "120px",
        }}
      />
      <div className="flex items-center justify-between">
        <p
          className="text-[0.7rem]"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
        >
          {body.length} / 1000자 · 한 공연당 한 번 작성, 다시 제출하면 갱신됩니다.
        </p>
        <button
          type="submit"
          disabled={isPending || body.trim().length < 10}
          className="px-5 py-2 text-xs tracking-wider transition-colors"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            backgroundColor: isPending || body.trim().length < 10 ? "#D8D3C9" : "#C8D96F",
            color: "#202833",
            fontWeight: 600,
            cursor: isPending ? "wait" : "pointer",
          }}
        >
          {isPending ? "제출 중…" : initialBody ? "후기 수정" : "후기 등록"}
        </button>
      </div>
      {feedback && (
        <div
          className="px-4 py-3 text-xs leading-relaxed"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            backgroundColor: feedback.ok ? "#F0EBE0" : "#FDECEC",
            color: feedback.ok ? "#202833" : "#D54545",
            border: `1px solid ${feedback.ok ? "#7BA86F" : "#D54545"}`,
          }}
        >
          {feedback.message}
        </div>
      )}
    </form>
  );
}
