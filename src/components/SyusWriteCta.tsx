"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 상세/허브의 쓰기 CTA — 세션을 읽어 로그인 상태에서 로그인 화면으로 튕기지 않는다.
 * - 비로그인: "로그인하고 {label}" → /syus/login?next=(writeHref 또는 섹션)
 * - 로그인 + writeHref: 바로 작성 페이지로
 * - 로그인 + writeHref 없음: 로그인됨 안내 + 내 시우스로 (아직 작성 미연결 섹션)
 * 공용 .syc-* 클래스 사용(전역 globals.css).
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
  writeHref?: string;
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
    if (writeHref) {
      return (
        <Link href={writeHref} className="syc-btn">
          {label} →
        </Link>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span className="syc-badge syc-badge--static" style={{ color, marginBottom: 0 }}>로그인됨</span>
        <p className="syc-note" style={{ margin: 0, fontSize: "0.92rem", color: "#4A3B33" }}>
          {label}는 곧 열립니다. 기능을 준비하고 있어요.
        </p>
        <Link href="/syus/mypage" className="syc-btn" style={{ alignSelf: "start" }}>내 시우스로 →</Link>
      </div>
    );
  }

  const loginNext = writeHref ?? `/syus/${stage}`;
  return (
    <Link href={`/syus/login?next=${encodeURIComponent(loginNext)}`} className="syc-btn">
      로그인하고 {label} →
    </Link>
  );
}
