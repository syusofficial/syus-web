"use client";

import { useState, useEffect, MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LikeButton({ showId, size = 24 }: { showId: string; size?: number }) {
  const [liked, setLiked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      setUserId(data.user.id);
      const { data: like } = await supabase
        .from("likes")
        .select("user_id")
        .eq("user_id", data.user.id)
        .eq("show_id", showId)
        .maybeSingle();
      setLiked(!!like);
      setLoading(false);
    });
  }, [showId]);

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) {
      alert("로그인 후 이용하실 수 있습니다.");
      return;
    }

    const supabase = createClient();
    if (liked) {
      await supabase.from("likes").delete().eq("user_id", userId).eq("show_id", showId);
      setLiked(false);
    } else {
      await supabase.from("likes").insert({ user_id: userId, show_id: showId });
      setLiked(true);
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={handleClick}
      aria-label={liked ? "찜 해제" : "찜하기"}
      className="p-2 transition-transform active:scale-90"
      style={{
        backgroundColor: "rgba(244, 237, 227, 0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      {liked ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#A63D2F" stroke="#A63D2F" strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6D3115" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      )}
    </button>
  );
}
