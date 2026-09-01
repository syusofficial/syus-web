import type { Metadata } from "next";
import { buildBreadcrumbList } from "@/lib/structuredData";
import { OG_MUOL } from "@/lib/ogCards";

/**
 * /faq 메타데이터 — 자주 묻는 질문 페이지.
 *
 * faq/page.tsx 가 "use client" 라 metadata를 직접 export할 수 없어,
 * 서버 컴포넌트인 이 layout에서 메타와 BreadcrumbList JSON-LD를 함께 발행한다.
 */
export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description:
    "무대올림 이용 중 자주 묻는 질문을 모았습니다. 회원·관람·공연자 등록·후기 작성 등 카테고리별로 빠르게 답을 찾아보세요.",
  keywords: [
    "무대올림 FAQ",
    "공연 예약 방법",
    "공연자 등록",
    "후기 작성",
    "회원 가입",
    "자주 묻는 질문",
  ],
  // 구 경로 /faq 는 next.config.ts에서 /muol/faq 로 308 영구 리다이렉트된다.
  // 리다이렉트되는 URL을 canonical로 쓰면 구글이 그 canonical을 무효 처리하므로 현재 경로를 가리킨다. (2026-08-03)
  alternates: { canonical: "https://syus.co.kr/muol/faq" },
  openGraph: {
    title: "자주 묻는 질문 · 무대올림",
    description:
      "회원·관람·공연자 등록·후기까지. 무대올림 이용 중 자주 묻는 질문을 카테고리별로 정리했습니다.",
    url: "https://syus.co.kr/muol/faq",
    type: "website",
    images: [OG_MUOL],
  },
  twitter: {
    card: "summary_large_image",
    title: "자주 묻는 질문 · 무대올림",
    description:
      "회원·관람·공연자 등록·후기까지. 무대올림 이용 중 자주 묻는 질문 모음.",
    images: [OG_MUOL.url],
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "자주 묻는 질문" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      {children}
    </>
  );
}
