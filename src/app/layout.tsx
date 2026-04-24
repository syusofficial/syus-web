import type { Metadata } from "next";
import { Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";

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

export const metadata: Metadata = {
  title: "사유유사 · SYUS",
  description: "思惟流沙 — 깊게 생각하고 오래 머물러, 자연스럽게 흘러 젊은 무대 위에 쌓이는 공간",
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
      </body>
    </html>
  );
}
