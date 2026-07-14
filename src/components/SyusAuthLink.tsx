"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 헤더의 계정 링크 — 통합 로그인 세션을 읽어 상태를 반영한다.
 * (기존 시우스 헤더는 세션을 읽지 않고 항상 "로그인"만 표시해, 무대올림에서 로그인해도
 *  시우스에선 비로그인처럼 보이던 문제를 해결.)
 * - 비로그인: "로그인" → /syus/login?next=/syus (로그인 후 시우스로 복귀)
 * - 로그인:  "마이페이지" + "로그아웃" → /syus/mypage (시우스 독립 마이페이지)
 * 세션 쿠키는 무대올림과 같은 도메인이라 공유되므로, 여기선 표시만 동기화한다.
 *
 * 2026-07-07: 시우스 쪽 어디에도 로그아웃 버튼이 없던 공백을 발견해 여기에 추가.
 * 무대올림 Nav.tsx의 handleLogout과 달리, 로그아웃 후 "/"(게이트웨이)가 아니라
 * "/syus"로 이동시켜 시우스 흐름을 벗어나지 않게 한다.
 */
export default function SyusAuthLink({ style }: { style?: React.CSSProperties }) {
  const router = useRouter();
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/syus");
    router.refresh();
  };

  if (loggedIn) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
        <Link href="/syus/mypage" style={style}>
          마이페이지
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="syus-hdr-btn"
          style={{ ...style, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          로그아웃
        </button>
      </span>
    );
  }

  // loggedIn === null → getUser() 응답 전 잠깐의 로딩 구간. 이때 "로그인"을 먼저 보여주면
  // 실제로는 로그인돼 있는데도 순간적으로 "로그인 안 됨"으로 보이는 깜빡임이 생긴다.
  // 확실히 비로그인(false)으로 판명 났을 때만 "로그인" 링크를 그린다.
  if (loggedIn === null) return null;

  return (
    <Link href="/syus/login?next=/syus" style={style}>
      로그인
    </Link>
  );
}
