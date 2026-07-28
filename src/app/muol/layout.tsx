import type { Metadata } from "next";

/**
 * 무대올림 세그먼트 레이아웃.
 * 2026-06-30 3층 구조 재편: 루트(/)가 게이트웨이가 되면서, 무대올림 전용 metadata를
 * 루트 layout에서 이 세그먼트로 이관한다. NavMega·Footer 등 셸은 루트 layout이
 * 경로 기준 조건부로 계속 렌더하므로 여기서는 metadata + children 패스스루만 담당한다.
 */

const SITE_URL = "https://syus.co.kr";
const SITE_NAME = "무대올림";
const SITE_TAGLINE = "운영: 사유유사 SYUS";
const SITE_DESCRIPTION =
  "한국 대학 무대예술의 진흥을 위해 — 무대올림은 대학 무대예술 공연을 올리고 지역 관객이 좌석을 예약하는 플랫폼입니다. 공연팀 게재료 없음. 연극·뮤지컬·순수무용·실용무용·국악·음악·전통연희.";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: "%s · 무대올림",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "공연팀 게재료 없는 공연 등록",
    "대학 공연 정보",
    "학교별 공연 검색",
    "공연 아카이브",
    "무대올림",
    "대학 공연",
    "무대예술",
    "대학 연극",
    "대학 뮤지컬",
    "대학 순수무용",
    "대학 실용무용",
    "대학 국악",
    "대학 음악",
    "전통연희",
    "대학로",
    "지역 공연",
    "구글폼 예약",
    "학교 공연",
    "사유유사",
    "SYUS",
  ],
  openGraph: {
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/muol`,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    // og:image는 muol/opengraph-image.tsx(동적)가 자동 생성 — 여기 images 중복 지정 안 함
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  alternates: { canonical: `${SITE_URL}/muol` },
};

export default function MuolLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
