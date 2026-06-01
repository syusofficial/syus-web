"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Props = {
  showId: string;
  /** 로그인 여부 — 미로그인 시 로그인 유도 */
  isLoggedIn: boolean;
  /** 본인이 이미 부여한 점수 (1~5) 또는 null */
  initialMyScore: number | null;
};

/**
 * 별점 입력 컴포넌트 — 공연 상세 페이지 전용.
 * 1인 1평 (DB UNIQUE 제약). 본인 점수 부여/수정/삭제 가능.
 * 마우스 호버 시 별이 채워짐. 클릭 시 점수 저장.
 */
export default function RatingInput({ showId, isLoggedIn, initialMyScore }: Props) {
  const router = useRouter();
  const [myScore, setMyScore] = useState<number | null>(initialMyScore);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const setRating = async (score: number) => {
    if (!isLoggedIn) return;
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    // upsert — 1인 1평 (show_id + user_id UNIQUE)
    const { error: upsertError } = await supabase
      .from("ratings")
      .upsert(
        { show_id: showId, user_id: user.id, score },
        { onConflict: "show_id,user_id" }
      );

    if (upsertError) {
      setError("저장 중 오류가 발생했습니다. (RLS 정책 확인 필요)");
      return;
    }

    setMyScore(score);
    // 서버 컴포넌트(평균) 재계산
    startTransition(() => router.refresh());
  };

  const removeRating = async () => {
    if (!isLoggedIn || myScore === null) return;
    const confirmed = window.confirm("부여하신 별점을 삭제하시겠습니까?");
    if (!confirmed) return;
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: deleteError } = await supabase
      .from("ratings")
      .delete()
      .eq("show_id", showId)
      .eq("user_id", user.id);

    if (deleteError) {
      setError("삭제 중 오류가 발생했습니다.");
      return;
    }

    setMyScore(null);
    setHoverScore(null);
    startTransition(() => router.refresh());
  };

  // 비로그인 — 안내 + 로그인 링크
  if (!isLoggedIn) {
    return (
      <div className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}>
        별점을 부여하시려면{" "}
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

  const displayScore = hoverScore ?? myScore ?? 0;

  return (
    <div>
      <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverScore(null)}>
        {[1, 2, 3, 4, 5].map((s) => {
          const filled = s <= displayScore;
          return (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHoverScore(s)}
              onClick={() => setRating(s)}
              disabled={isPending}
              className="transition-transform"
              style={{
                background: "none",
                border: "none",
                padding: "4px",
                cursor: isPending ? "wait" : "pointer",
                lineHeight: 0,
              }}
              aria-label={`${s}점 부여`}
            >
              <Star size={32} filled={filled} />
            </button>
          );
        })}
        {myScore !== null && (
          <button
            type="button"
            onClick={removeRating}
            disabled={isPending}
            className="ml-3 text-xs px-2 py-1 transition-colors"
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
        )}
      </div>
      <p
        className="text-xs mt-2"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
      >
        {myScore !== null
          ? `회원님의 평가: ${myScore}점 · 다시 누르면 점수가 갱신됩니다.`
          : "별을 눌러 1~5점 사이로 평가해주세요. 한 공연당 한 번 부여할 수 있습니다."}
      </p>
      {error && (
        <p
          className="text-xs mt-2"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#D54545" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** 별 아이콘 — SVG */
function Star({ size = 24, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#C8D96F" : "none"}
      stroke={filled ? "#C8D96F" : "#D8D3C9"}
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M12 2.5l2.92 6.43 7.08.75-5.27 4.84 1.51 6.98L12 18l-6.24 3.5 1.51-6.98L2 9.68l7.08-.75L12 2.5z" />
    </svg>
  );
}
