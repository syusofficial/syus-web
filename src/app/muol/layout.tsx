import type { Metadata } from "next";
import MuolRegisterPrompt from "@/components/MuolRegisterPrompt";
import { OG_MUOL } from "@/lib/ogCards";

/**
 * 무대올림 세그먼트 레이아웃.
 * 2026-06-30 3층 구조 재편: 루트(/)가 게이트웨이가 되면서, 무대올림 전용 metadata를
 * 루트 layout에서 이 세그먼트로 이관한다. NavMega·Footer 등 셸은 루트 layout이
 * 경로 기준 조건부로 계속 렌더하므로 여기서는 metadata + children 패스스루만 담당한다.
 */

const SITE_NAME = "무대올림";
const SITE_TAGLINE = "운영: 사유유사 SYUS";
const SITE_DESCRIPTION =
  "한국 대학 무대예술의 진흥을 위해 — 무대올림은 대학 무대예술 공연을 올리고 지역 관객이 좌석을 예약하는 플랫폼입니다. 공연팀 게재료 없음. 연극·뮤지컬·무용·국악·음악·전통연희.";

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
    "대학 무용",
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
    url: "./",
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    // 2026-09-01: 동적 생성(muol/opengraph-image.tsx)을 접고 한글 로고타입 카드(정적 PNG)로 통일.
    // 하위 페이지가 openGraph를 선언하면 이 값이 통째로 갈리므로, 그 페이지들도 각자 OG_MUOL을 적는다.
    images: [OG_MUOL],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_MUOL.url],
  },
  /**
   * 2026-08-03 SEO 수정 — 레이아웃 canonical이 하위 전체를 오염시키던 문제.
   *
   * 예전엔 "https://syus.co.kr/muol" 로 못박혀 있어, 자기 canonical이 없는 하위 페이지
   * (/muol/contact, /muol/archive, /muol/shows/calendar, 그리고 공연 상세 전부)가
   * "나는 /muol의 중복"이라고 선언했다.
   *
   * 그냥 지우면 루트 app/layout.tsx의 `canonical: "https://syus.co.kr"` 가 승계되어 더 나쁘므로
   * (루트 layout은 이번 작업 범위 밖 파일), 현재 경로로 풀리는 상대 경로 "./" 를 쓴다.
   * 자기 canonical을 선언한 페이지(about·faq·shows·universities·공연 상세)는 그 값이 우선한다.
   * og:url도 같은 이유로 "./".
   */
  alternates: { canonical: "./" },
};

export default function MuolLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      {/* 공연 등록 유도 카드 — 무대올림 안에서만, 등록 화면(/muol/performer*)은 제외.
          노출·억제 판단은 컴포넌트 내부에서 한다(2026-08-06 사장님 지시). */}
      <MuolRegisterPrompt />
    </>
  );
}
