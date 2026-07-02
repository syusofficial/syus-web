import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SyusAuthLink from "@/components/SyusAuthLink";
import SyusAdminLink from "@/components/SyusAdminLink";
import SyusFooter from "@/components/SyusFooter";

/**
 * 시우스(SYUS) 세그먼트 레이아웃 — 2026-06-30 3층 구조.
 * 루트 NavMega는 /syus에서 숨겨지므로(컴포넌트 내부 조건부) 시우스는 자체 미니 헤더를 갖는다.
 * 헤더는 .syus-hdr(전역 globals.css)로 반응형 — 모바일에서 중앙 로고 숨김·간격 축소(nav 붕괴 방지).
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
    <div style={{ color: "#241C18", minHeight: "100svh", position: "relative" }}>
      <div className="syus-canvas" aria-hidden="true" />
      <div className="syus-shell">
        <header className="syus-hdr">
          {/* 좌 — 시우스 워드마크 */}
          <Link href="/syus" className="syus-hdr-brand" aria-label="시우스 홈">
            <span className="syus-hdr-brand-ko">시우스</span>
            <span className="syus-hdr-brand-en">SYUS</span>
          </Link>

          {/* 중앙 — 사유유사 브랜드 로고(갈림길로). 모바일에서는 숨김 */}
          <Link href="/" className="syus-hdr-logo" aria-label="사유유사 갈림길로">
            <Image src="/sayuyusa-logo.png" alt="사유유사 SYUS" width={158} height={64} className="syus-hdr-logo-img" priority />
          </Link>

          {/* 우 — 내비 */}
          <nav className="syus-hdr-nav">
            <SyusAdminLink style={{ color: "#5C2A42", fontWeight: 700 }} />
            <SyusAuthLink style={{ color: "#0B5563", fontWeight: 600 }} />
            <Link href="/muol">무대올림</Link>
            <Link href="/" aria-label="사유유사 갈림길로">사유유사</Link>
          </nav>
        </header>

        {children}

        <SyusFooter />
      </div>
    </div>
  );
}
