export const REGIONS = [
  "전체",
  "서울", "경기", "인천",
  "충북", "충남", "대전",
  "전북", "전남", "광주",
  "경북", "경남", "대구",
  "부산", "강원", "제주",
] as const;

export const REGIONS_EXCLUDE_ALL = REGIONS.slice(1);

export const GENRES = ["연극", "뮤지컬", "넌버벌", "기타"] as const;

export type Region = typeof REGIONS[number];
export type Genre = typeof GENRES[number];
