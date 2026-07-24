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
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "사유유사 SYUS — 무대올림과 시우스, 두 개의 문.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/og-default.png"],
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
  // 다크 모드 auto — 시스템 테마에 따라 브라우저 상단바 색이 갈린다.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0EEE9" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1814" },
  ],
  width: "device-width",
  initialScale: 1,
  // OS 다크 모드일 때 네이티브 폼·스크롤바도 자동 톤 변환
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${notoSerifKR.variable} ${notoSansKR.variable} ${cormorant.variable} ${geist.variable}`}
    >
      <head>
        {/* 폰트 CDN 안정화 — preconnect로 DNS·TLS 라운드트립 단축 (제작팀 진단 #3 부분 완화) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://spoqa.github.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://spoqa.github.io" />
      </head>
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
