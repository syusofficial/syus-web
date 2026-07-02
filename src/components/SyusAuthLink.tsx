"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 헤더의 계정 링크 — 통합 로그인 세션을 읽어 상태를 반영한다.
 * (기존 시우스 헤더는 세션을 읽지 않고 항상 "로그인"만 표시해, 무대올림에서 로그인해도
 *  시우스에선 비로그인처럼 보이던 문제를 해결.)
 * - 비로그인: "로그인" → /syus/login?next=/syus (로그인 후 시우스로 복귀)
 * - 로그인:  "마이페이지" → /syus/mypage (시우스 독립 마이페이지)
 * 세션 쿠키는 무대올림과 같은 도메인이라 공유되므로, 여기선 표시만 동기화한다.
 */
export default function SyusAuthLink({ style }: { style?: React.CSSProperties }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setLoggedIn(!!data.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setLoggedIn(!!session?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loggedIn) {
    return (
      <Link href="/syus/mypage" style={style}>
        마이페이지
      </Link>
    );
  }

  return (
    <Link href="/syus/login?next=/syus" style={style}>
      로그인
    </Link>
  );
}
