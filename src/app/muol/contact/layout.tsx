import type { Metadata } from "next";

/**
 * 1:1 문의 — 메타데이터 전용 레이아웃 (2026-10-12)
 *
 * page.tsx가 "use client"라 metadata를 내보낼 수 없어, 자기 제목이 없던 이 페이지는
 * 무대올림 메인과 같은 제목으로 검색에 나갔다. 제목·설명만 여기서 준다.
 * (「· 무대올림」은 muol/layout.tsx template이 붙인다)
 */
export const metadata: Metadata = {
  title: "1:1 문의",
  description:
    "공연 등록·제작대행·광고·제휴 등 무대올림과 사유유사에 묻고 싶은 것을 남겨 주세요. 운영: 사유유사 SYUS.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
