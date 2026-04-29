export const REGIONS = [
  "전체",
  "서울", "경기", "인천",
  "충북", "충남", "대전",
  "전북", "전남", "광주",
  "경북", "경남", "대구",
  "부산", "강원", "제주",
] as const;

export const REGIONS_EXCLUDE_ALL = REGIONS.slice(1);

export const GENRES = ["연극", "뮤지컬", "기타"] as const;

/** 공연 구분 — 등록 시 필수 선택. 장르(작품 형식)와 별개로 공연의 성격을 분류. */
export const SHOW_CATEGORIES = ["교내 공연", "외부 공연", "워크샵"] as const;

export type Region = typeof REGIONS[number];
export type Genre = typeof GENRES[number];
export type ShowCategory = typeof SHOW_CATEGORIES[number];

export const CONTACT_CATEGORIES = [
  "공연자 신청",
  "공연 등록 문의",
  "예매 / 환불",
  "협업 / 후원 제안",
  "광고 / 제휴",
  "미디어 / 인터뷰",
  "사이트 오류 신고",
  "개인정보 / 계정",
  "기타",
] as const;

export type ContactCategory = typeof CONTACT_CATEGORIES[number];
