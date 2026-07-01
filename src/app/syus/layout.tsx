import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

/**
 * 시우스(SYUS) 세그먼트 레이아웃 — 2026-06-30 3층 구조.
 * 루트 NavMega는 /syus에서 숨겨지므로(컴포넌트 내부 조건부) 시우스는 자체 미니 헤더를 갖는다.
 * 어두운 '극장' 톤(--color-syus-ink)으로 무대올림(밝음)과 대비. Footer는 루트 layout이 공통 제공.
 */

const SITE_URL = "https://syus.co.kr";

export const metadata: Metadata = {
  title: {
    default: "시우스 SYUS — 연기를 깊게 들여다보다",
    template: "%s · 시우스 SYUS",
  },
  description:
    "시우스(SYUS, system of young unbound society) — 연기를 기록하고, 고민을 나누고, 무대를 오래 들여다보는 커뮤니티. 사유유사 SYUS가 운영합니다.",
  alternates: { canonical: `${SITE_URL}/syus` },
  openGraph: {
    title: "시우스 SYUS — 연기를 깊게 들여다보다",
    description: "연기를 기록하고, 고민을 나누고, 무대를 오래 들여다보는 커뮤니티.",
    url: `${SITE_URL}/syus`,
    siteName: "사유유사 SYUS",
    locale: "ko_KR",
    type: "website",
  },
};

export default function SyusLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      style={{
        backgroundColor: "#F4F2ED",
        color: "#241C18",
        minHeight: "100svh",
      }}
    >
      <header
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px clamp(20px, 5vw, 56px)",
          borderBottom: "1px solid #E0DBD0",
        }}
      >
        <Link
          href="/syus"
          aria-label="시우스 홈"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: "8px",
            textDecoration: "none",
            color: "#241C18",
          }}
        >
          <span style={{ fontFamily: "var(--font-noto-serif-kr)", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.02em" }}>
            시우스
          </span>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: "0.7rem", letterSpacing: "0.32em", fontWeight: 600, color: "#0B5563" }}>
            SYUS
          </span>
        </Link>

        {/* 중앙 — 사유유사 브랜드 로고(갈림길로) */}
        <Link
          href="/"
          aria-label="사유유사 갈림길로"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Image src="/sayuyusa-logo.png" alt="사유유사 SYUS" width={104} height={42} style={{ height: "26px", width: "auto", display: "block" }} priority />
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "clamp(16px, 4vw, 32px)" }}>
          <Link
            href="/auth/login"
            style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.82rem", letterSpacing: "0.1em", textDecoration: "none", color: "#0B5563", fontWeight: 600 }}
          >
            로그인
          </Link>
          <Link
            href="/muol"
            style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.82rem", letterSpacing: "0.1em", textDecoration: "none", color: "#6B5C50" }}
          >
            무대올림
          </Link>
          <Link
            href="/"
            aria-label="사유유사 갈림길로"
            style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.82rem", letterSpacing: "0.1em", textDecoration: "none", color: "#6B5C50" }}
          >
            사유유사
          </Link>
        </nav>
      </header>

      {children}
    </div>
  );
}
