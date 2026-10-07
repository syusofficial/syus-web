import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * 로그인·가입·비밀번호 찾기 등 인증 화면 묶음 (2026-10-07)
 *
 * 이 화면들은 검색 결과에 나올 이유가 없는 "문"이라 검색 색인에서 뺀다.
 * - 사이트맵(src/app/sitemap.ts)에서도 제외했다.
 * - robots.txt로 막지 않고 noindex를 거는 이유: robots.txt로 막으면 검색엔진이
 *   이 noindex 표시를 읽지 못해, 바깥 링크만으로 주소가 색인에 남을 수 있다.
 * - follow는 유지 — 화면 안의 약관·개인정보처리방침 링크는 계속 따라가게 한다.
 *
 * 하위 페이지가 대부분 "use client"라 각 page.tsx에 metadata를 둘 수 없어
 * 서버 컴포넌트인 이 layout에서 한 번에 건다. 화면 모양에는 아무 영향이 없다.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
