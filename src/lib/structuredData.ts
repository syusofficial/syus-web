/**
 * Schema.org JSON-LD 빌더.
 * BreadcrumbList — 홈에서 현재 페이지까지의 경로를 검색엔진에 알려 Rich Result로 노출되게 함.
 */

const SITE_URL = "https://syus.co.kr";

export type BreadcrumbItem = {
  name: string;
  /** 절대 경로 (예: "/shows"). 마지막 항목은 생략 권장 */
  path?: string;
};

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.path ? `${SITE_URL}${item.path}` : undefined,
    })),
  };
}
