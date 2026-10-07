import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * 시우스 로그인 화면 — 검색 색인 제외 (2026-10-07)
 * src/app/auth/layout.tsx 와 같은 이유: 검색 결과에 나올 이유가 없는 "문"이다.
 * page.tsx가 "use client"라 metadata를 이 layout에서 건다. 화면 모양에는 영향 없음.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function SyusLoginLayout({ children }: { children: ReactNode }) {
  return children;
}
