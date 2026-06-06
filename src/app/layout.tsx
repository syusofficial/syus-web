import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import SessionManager from "@/components/SessionManager";

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
const SITE_NAME = "무대올림";
const SITE_TAGLINE = "운영: 사유유사 SYUS";
const SITE_DESCRIPTION =
  "오늘, 어느 대학의 막이 오른다. 무대올림은 대학 무대예술 공연을 올리고 지역 관객이 관람료 없이 좌석을 예약하는 비상업적 플랫폼입니다. 연극·뮤지컬·무용·발레·국악·음악·전통연희.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: "%s · 무대올림",
  },
  description: SITE_DESCRIPTION,
  keywords: ["무대올림", "대학 공연", "무대예술", "비상업 공연", "관람료 없는 공연", "대학 연극", "대학 뮤지컬", "대학 무용", "대학 발레", "대학 국악", "대학 음악", "전통연희", "대학로", "지역 공연", "구글폼 예약", "학교 공연", "사유유사", "SYUS"],
  authors: [{ name: "무대올림 (운영: 사유유사 SYUS)" }],
  creator: "사유유사 SYUS",
  publisher: "사유유사 SYUS",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
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
        alt: "무대올림 — 오늘, 어느 대학의 막이 오른다. 운영: 사유유사 SYUS.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · ${SITE_TAGLINE}`,
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
  themeColor: "#FBF8F1",
  width: "device-width",
  initialScale: 1,
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
      <body className="min-h-screen flex flex-col antialiased" style={{ backgroundColor: "#FBF8F1", color: "#202833" }}>
        <LoadingScreen />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <GoogleAnalytics />
        <SessionManager />
      </body>
    </html>
  );
}
