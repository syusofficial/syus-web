/**
 * 제작대행(공연 홍보물 대행 제작) — 가격·구성 정본 (사이트 쪽)
 *
 * 쓰는 곳: /muol/production-service 페이지 한 곳.
 *          FAQ에는 금액을 적지 않고 페이지 링크만 둔다(가격이 두 곳에 흩어지지 않게).
 *
 * 사실 출처 (Content_Report 쪽 문서 — 가격이 바뀌면 거기와 여기를 같이 고친다)
 *   · 정가표:   output/finance/양식/제작대행_견적서_양식.md §2  (2026-08-21 회의록 L52 확정안)
 *   · 진행 순서: output/finance/양식/수금_순서.md
 *   · AI 고지:  output/legal/02_제작대행_계약세트/2026-09-22_제작대행_AI고지문_1줄.md (문안 그대로)
 *
 * 정가는 전부 「공급가액(부가세 별도)」 기준이다. 합계는 공급가액 × 1.1 로 계산한다.
 */

// ──────────────────────────────────────────────────────────────
// ★ 가격 공개 모드 — 이 한 줄만 바꾸면 페이지 전체의 가격 표시가 바뀐다.
//
//   "full"    → 공급가액 + 부가세 포함 합계까지 전부 공개   (2026-09-30 운영자 결정)
//   "partial" → 「35만원부터」처럼 시작 금액만 공개
//   "hidden"  → 금액 없이 「견적 문의」만 표시
//
// 컴플레인이 오거나 부서 판단으로 공개 범위를 좁혀야 할 때 여기만 고치고 푸시하면 된다.
// ──────────────────────────────────────────────────────────────
export type PriceDisplayMode = "full" | "partial" | "hidden";
export const PRICE_DISPLAY_MODE: PriceDisplayMode = "full";

export type ProductionTier = {
  code: "A" | "B" | "C";
  name: string;
  /** 누구에게 맞는가 */
  audience: string;
  /** 기간 */
  period: string;
  /** 제공 항목 */
  includes: string[];
  /** 수정 */
  revisions: string;
  /** 결제 */
  payment: string;
  /** 공급가액(부가세 별도). 월 단위 티어는 월 금액 */
  supply: number;
  /** 월 단위 티어의 개월 수. 단건이면 undefined */
  months?: number;
};

export const PRODUCTION_TIERS: readonly ProductionTier[] = [
  {
    code: "A",
    name: "한 무대",
    audience: "학과 정기공연 1편, 소극장 단발 공연",
    period: "단건 · 10영업일 납품",
    includes: [
      "카드뉴스 1세트(8장) — 공연 정보 전용 장 포함",
      "캡션 · 해시태그",
      "원본 파일 일체",
      "사유유사 인스타그램(@syus_official) 게재 1회",
    ],
    revisions: "세트당 2회",
    payment: "납품 후 7일 안에 전액",
    supply: 350_000,
  },
  {
    code: "B",
    name: "한 시즌",
    audience: "학과 · 극단 (한 학기 단위)",
    period: "3개월",
    includes: ["매달 카드뉴스 2세트 (총 6세트)", "기록글 1편", "월간 도달 리포트"],
    revisions: "세트당 2회",
    payment: "착수 50% · 종료 50%",
    supply: 650_000,
    months: 3,
  },
  {
    code: "C",
    name: "한 해의 기록",
    audience: "지역 문화재단 · 문화시설",
    period: "6개월",
    includes: [
      "매달 카드뉴스 3세트 (총 18세트)",
      "기록글 3편",
      "채널 톤 가이드",
      "월간 리포트",
    ],
    revisions: "세트당 2회 + 분기마다 방향 재조정 1회",
    payment: "매월 후불 (공공기관 정산 주기에 맞춤)",
    supply: 1_100_000,
    months: 6,
  },
];

/** 부가세 포함 합계 = 공급가액 × 1.1 (원 단위 반올림) */
export function withVat(supply: number): number {
  return Math.round(supply * 1.1);
}

/** 350000 → "350,000원" */
export function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 350000 → "35만원", 1100000 → "110만원" (만원 단위로 떨어지는 값만 쓴다) */
export function manwon(n: number): string {
  return `${(n / 10_000).toLocaleString("ko-KR")}만원`;
}

export type TierPriceView =
  | { kind: "full"; main: string; mainNote: string; lines: string[] }
  | { kind: "partial"; main: string; mainNote: string }
  | { kind: "hidden"; main: string; mainNote: string };

/**
 * 티어 가격을 공개 모드에 맞춰 화면용 문자열로 바꾼다.
 * 페이지는 이 함수의 결과만 그린다 — 모드 분기는 여기 한 곳에만 있다.
 */
export function tierPriceView(tier: ProductionTier, mode: PriceDisplayMode = PRICE_DISPLAY_MODE): TierPriceView {
  const monthly = tier.months !== undefined;
  const prefix = monthly ? "월 " : "";

  if (mode === "hidden") {
    return { kind: "hidden", main: "견적 문의", mainNote: "공연 규모에 맞춰 견적서로 알려드립니다" };
  }

  if (mode === "partial") {
    return { kind: "partial", main: `${prefix}${manwon(tier.supply)}부터`, mainNote: "부가세 별도 · 세부 금액은 견적서로" };
  }

  // full — 공급가액 / 부가세 포함 합계를 모두 적는다 (부가세 포함·별도를 헷갈리지 않게)
  const lines: string[] = [];
  if (monthly) {
    const months = tier.months as number;
    lines.push(`부가세 포함 월 ${won(withVat(tier.supply))}`);
    lines.push(
      `${months}개월 합계 ${won(tier.supply * months)} (부가세 포함 ${won(withVat(tier.supply * months))})`,
    );
  } else {
    lines.push(`부가세 포함 ${won(withVat(tier.supply))}`);
  }
  return { kind: "full", main: `${prefix}${won(tier.supply)}`, mainNote: "공급가액 · 부가세 별도", lines };
}

/**
 * 생성형 AI 사전 고지 — 인공지능 기본법 §31① (위반 시 과태료 500만원).
 * 법무팀 확정 문안(96자) 그대로. 직접 고쳐 쓰지 말 것 — 바꿀 일이 있으면 법무팀 문서부터 고친다.
 */
export const PRODUCTION_AI_NOTICE =
  "본 제작물의 이미지 일부는 생성형 AI로 만들어집니다. AI가 생성한 이미지에는 저작권이 발생하지 않아 독점 사용은 보장되지 않으며, 해당 이미지에는 AI 생성 표시가 붙습니다.";

/** 제작대행 문의로 바로 가는 문의폼 주소 — contact 페이지가 type=production을 읽어 유형을 미리 고른다 */
export const PRODUCTION_CONTACT_HREF = "/muol/contact?type=production";
export const PRODUCTION_PAGE_HREF = "/muol/production-service";
