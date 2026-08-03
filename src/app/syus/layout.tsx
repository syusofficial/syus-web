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

/**
 * 2026-08-03 SEO 수정 — 레이아웃 canonical이 하위 전체를 오염시키던 문제.
 *
 * 예전엔 여기서 canonical을 "https://syus.co.kr/syus" 로 못박아, 자기 canonical이 없는
 * 하위 페이지(견해글 /syus/essays/[id], QnA, 후기, 잔상 …)가 전부 "나는 /syus의 중복"이라고
 * 선언해 검색에서 통째로 사라졌다.
 *
 * 그렇다고 canonical을 그냥 지우면 더 나빠진다 — 루트 app/layout.tsx가
 * `alternates: { canonical: "https://syus.co.kr" }` 를 갖고 있어서, 지우는 순간
 * 하위 전부가 "홈페이지의 중복"으로 승계된다(루트 layout은 이번 작업 범위 밖 파일).
 *
 * 그래서 상대 경로 "./" 를 쓴다. Next.js는 "./" 로 시작하는 metadata URL을 현재 pathname
 * 기준으로 풀어주므로(next/dist/lib/metadata/resolvers/resolve-url.js:resolveRelativeUrl),
 * /syus/essays/xxx → https://syus.co.kr/syus/essays/xxx 로 각자 자기 자신을 가리키게 된다.
 * 자기 canonical을 따로 선언한 페이지(6개 무대 등)는 그대로 그 값이 우선한다.
 * og:url도 같은 이유로 "./" — 그러지 않으면 모든 시우스 페이지의 공유 카드가 /syus 하나로 뭉친다.
 */
export const metadata: Metadata = {
  title: {
    default: "시우스 SYUS — 연기를 깊게 들여다보다",
    template: "%s · 시우스 SYUS",
  },
  description:
    "시우스(SYUS, system of young unbound society) — 연기를 기록하고, 고민을 나누고, 무대를 오래 들여다보는 커뮤니티. 사유유사 SYUS가 운영합니다.",
  alternates: { canonical: "./" },
  openGraph: {
    title: "시우스 SYUS — 연기를 깊게 들여다보다",
    description: "연기를 기록하고, 고민을 나누고, 무대를 오래 들여다보는 커뮤니티.",
    url: "./",
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
