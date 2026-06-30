import type { Metadata } from "next";
import Link from "next/link";

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
        backgroundColor: "var(--color-syus-ink)",
        color: "var(--color-syus-cream)",
        minHeight: "100svh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px clamp(20px, 5vw, 56px)",
          borderBottom: "1px solid var(--color-syus-line)",
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
            color: "var(--color-syus-cream)",
          }}
        >
          <span style={{ fontFamily: "var(--font-noto-serif-kr)", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "0.02em" }}>
            시우스
          </span>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: "0.7rem", letterSpacing: "0.32em", fontWeight: 600, color: "#6BB0C0" }}>
            SYUS
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "clamp(16px, 4vw, 32px)" }}>
          <Link
            href="/syus/about"
            style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.82rem", letterSpacing: "0.1em", textDecoration: "none", color: "var(--color-syus-cream-dim)" }}
          >
            소개
          </Link>
          <Link
            href="/muol"
            style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.82rem", letterSpacing: "0.1em", textDecoration: "none", color: "var(--color-syus-cream-dim)" }}
          >
            무대올림
          </Link>
          <Link
            href="/"
            aria-label="사유유사 갈림길로"
            style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.82rem", letterSpacing: "0.1em", textDecoration: "none", color: "var(--color-syus-cream-dim)" }}
          >
            사유유사
          </Link>
        </nav>
      </header>

      {children}
    </div>
  );
}
