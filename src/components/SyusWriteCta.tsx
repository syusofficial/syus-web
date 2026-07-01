"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 상세페이지의 쓰기 CTA — 세션을 읽어 로그인 상태에서는 로그인 화면으로 튕기지 않는다.
 * (기존엔 로그인했어도 /auth/login 으로 보내 '로그아웃된 것처럼' 보이던 버그.)
 * - 비로그인: "로그인하고 {label}" → /auth/login?next=/syus/{stage}
 * - 로그인:  실제 글쓰기(DB·스토리지)는 다음 단계라, 지금은 로그인 상태임을 알리고 '내 시우스'로 안내.
 *            (DB 연결 후 이 자리에 실제 작성 폼 라우트를 연결)
 */
export default function SyusWriteCta({
  stage,
  label,
  color,
  writeHref,
}: {
  stage: string;
  label: string;
  color: string;
  writeHref?: string; // 실제 작성 페이지가 준비된 섹션(예: QnA)은 이 경로로 연결
}) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setLoggedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setLoggedIn(!!session?.user);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loggedIn) {
    // 실제 작성 페이지가 있는 섹션 → 바로 작성으로
    if (writeHref) {
      return (
        <Link href={writeHref} className="syd-cta-btn" style={{ background: color }}>
          {label} →
        </Link>
      );
    }
    // 아직 DB 미연결 섹션 → 로그인 화면으로 튕기지 않고 안내
    return (
      <div className="syd-cta-in">
        <span className="syd-cta-badge" style={{ background: color }}>로그인됨</span>
        <p className="syd-cta-note">
          {label}는 곧 열립니다. 글쓰기·사진 첨부 기능을 준비하고 있어요.
        </p>
        <Link href="/syus/mypage" className="syd-cta-btn" style={{ background: color }}>
          내 시우스로 →
        </Link>
      </div>
    );
  }

  const loginNext = writeHref ?? `/syus/${stage}`;
  return (
    <Link href={`/auth/login?next=${encodeURIComponent(loginNext)}`} className="syd-cta-btn" style={{ background: color }}>
      로그인하고 {label} →
    </Link>
  );
}
