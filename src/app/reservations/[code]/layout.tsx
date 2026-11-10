import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * 예약 확인·취소 화면 (/reservations/[신청번호]) — 검색 색인 제외 (2026-11-10 제작팀, 서치콘솔 색인 점검).
 *
 * 신청번호가 곧 주소라 한 사람 한 사람의 개인 화면이다. 검색 결과에 나올 이유가 없다.
 * 예전엔 루트 설정(index, follow)을 그대로 물려받아 「색인 허용」으로 나가고 있었다.
 * - robots.txt로 막지 않고 noindex를 거는 이유는 auth/layout.tsx와 같다(막으면 noindex를 못 읽는다).
 * - follow도 끈다 — 이 화면에서 따라갈 공개 링크가 없다.
 * 화면 모양에는 아무 영향이 없다.
 */
export const metadata: Metadata = {
  title: "예약 확인",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ReservationLayout({ children }: { children: ReactNode }) {
  return children;
}
