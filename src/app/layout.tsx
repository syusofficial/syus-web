import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://syus-web.vercel.app";
const SITE_NAME = "사유유사 · SYUS";
const SITE_DESCRIPTION =
  "思惟流沙 — System of Young Unbound Society. 젊은 예술가들의 무대를 기록하고, 연결하고, 알리는 공간.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: "%s · SYUS",
  },
  description: SITE_DESCRIPTION,
  keywords: ["사유유사", "SYUS", "思惟流沙", "연극", "뮤지컬", "공연", "젊은 예술가", "연기예술", "대학로"],
  authors: [{ name: "SYUS" }],
  creator: "SYUS",
  publisher: "SYUS",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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
};

export const viewport: Viewport = {
  themeColor: "#F4EDE3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${notoSerifKR.variable} ${notoSansKR.variable} ${cormorant.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased" style={{ backgroundColor: "#F4EDE3", color: "#1A1A1A" }}>
        <LoadingScreen />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
