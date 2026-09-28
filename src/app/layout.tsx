import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Geist } from "next/font/google";
import "./globals.css";
import NavMega from "@/components/NavMega";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import SessionManager from "@/components/SessionManager";
import PageViewTracker from "@/components/PageViewTracker";
import RealtimePresence from "@/components/RealtimePresence";
import { OG_GATEWAY } from "@/lib/ogCards";

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://syus.co.kr";
const SITE_NAME = "사유유사 SYUS";
const SITE_TAGLINE = "무대올림과 시우스";
const SITE_DESCRIPTION =
  "사유유사 SYUS의 두 문. 무대올림 — 한국 대학 무대예술의 진흥을 위해 공연을 올리고 지역 관객과 무대를 잇습니다. 시우스 — 연기를 깊게 기록하고 나누는 커뮤니티.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: "%s · 사유유사 SYUS",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "사유유사",
    "SYUS",
    "무대올림",
    "시우스",
    "대학 공연",
    "무대예술",
    "연기 커뮤니티",
    "대학 무대예술",
    "연기",
  ],
  authors: [{ name: "사유유사 SYUS" }],
  creator: "사유유사 SYUS",
  publisher: "사유유사 SYUS",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [OG_GATEWAY],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_GATEWAY.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: SITE_URL },
  verification: {
    google: "tZSn6BAkcc2u0SCQamwi31rLK6zYSPJxoH1tZTHKSYM",
    other: {
      "naver-site-verification": "334a8017b89bf3efd88fc0576ae843def1541440",
    },
  },
};

export const viewport: Viewport = {
  /* 2026-08-03 디자인팀 — 다크 모드 해제.
   * 사이트가 색을 hex로 직접 지정하는 구조라(533곳) 다크 대응이 사실상
   * 안 되어 있었는데, 아래 두 값만 다크를 켜두어 어긋남을 만들고 있었다.
   *   · themeColor 다크값 #1F1814 → 폰에서 주소창만 짙은 갈색, 본문은 크림색
   *   · colorScheme "light dark"  → 입력창·자동완성 등 브라우저 기본 부품만
   *                                 어두워져 밝은 폼 위에 얼룩짐
   * 자세한 배경과 "다시 켜는 순서"는 globals.css 다크모드 삭제 주석 참고. */
  themeColor: "#F0EEE9",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* 2026-08-03 디자인팀 — 아래 <html> 안에 있던 <head> 블록을 통째로 제거했다.
     그 안에는 폰트 CDN preconnect / dns-prefetch 4줄(cdn.jsdelivr.net, spoqa.github.io)만
     들어 있었는데, globals.css에서 Pretendard·Spoqa CDN import 자체를 없앴으므로
     더 이상 그 두 호스트에 접속하지 않는다(미리 연결을 여는 힌트만 남으면 낭비다).
     이제 한글 글꼴은 Noto Sans KR / Noto Serif KR — next/font가 자체 호스팅한다.
     <head>는 Next.js가 metadata 기준으로 자동 생성하므로 직접 둘 필요가 없다. */
  return (
    <html
      lang="ko"
      className={`${notoSerifKR.variable} ${notoSansKR.variable} ${cormorant.variable} ${geist.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased" style={{ backgroundColor: "#F0EEE9", color: "#4A3B33" }}>
        <LoadingScreen />
        <NavMega />
        <main className="flex-1">{children}</main>
        <Footer />
        <GoogleAnalytics />
        <SessionManager />
        <PageViewTracker />
        <RealtimePresence />
        {/* Microsoft Clarity — 세션 녹화·히트맵. NEXT_PUBLIC_CLARITY_PROJECT_ID 있을 때만 로드 */}
        {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ? (
          <Script
            id="ms-clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
              `,
            }}
          />
        ) : null}
      </body>
    </html>
  );
}
