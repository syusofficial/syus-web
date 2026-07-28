/**
 * 광역시·도 17개 (전체 포함 18개).
 * 2026-06-17: 울산·세종 신규 추가, 강원 단독 라인.
 *   - 수도권: 서울·경기·인천
 *   - 강원: 단독 권역 (영동·영서 클러스터, 수도권/충청 어디에도 안 속함)
 *   - 충청권: 충북·충남·대전·세종
 *   - 호남권: 전북·전남·광주
 *   - 영남권: 경북·경남·대구·부산·울산
 *   - 제주
 */
export const REGIONS = [
  "전체",
  "서울", "경기", "인천",
  "강원",
  "충북", "충남", "대전", "세종",
  "전북", "전남", "광주",
  "경북", "경남", "대구", "부산", "울산",
  "제주",
] as const;

export const REGIONS_EXCLUDE_ALL = REGIONS.slice(1);

/**
 * 무대예술 장르 — 무대올림 정체성 "장르는 넓게, 대상은 좁게"에 따라 확장.
 * 2026-06-01: 연기·뮤지컬 한정 → 무대예술 전체로 확장.
 * 2026-06-17: 발레 제거(무용 sub-genre로 통합). 무용·음악은 sub-genre로 세분화.
 *   - 무용 sub: 발레 / 현대무용 / 한국무용
 *   - 음악 sub: 클래식 / 실용음악 / 합창·앙상블
 *   - 국악은 별도 유지 (음대와 분리된 단과대 구조, 정악·민속악·창작국악 별도 검토)
 * 2026-07-28: "무용" 최상위 장르를 "순수무용"·"실용무용" 2개로 분리(사장님 결정).
 *   - 순수무용 sub: 한국무용 / 발레 / 현대무용
 *   - 실용무용 sub: 대중무용 / 댄스
 *   - 배열 내 위치는 기존 "무용" 자리를 그대로 이어받아 인접 배치(연극·뮤지컬 뒤, 국악 앞)
 */
export const GENRES = [
  "연극",
  "뮤지컬",
  "순수무용",
  "실용무용",
  "국악",
  "음악",
  "전통연희",
  "기타",
] as const;

/**
 * 장르 sub-genre 매핑.
 * 순수무용·실용무용·음악 선택 시 추가로 상세 분류 선택 (드롭다운).
 * 다른 장르는 sub-genre 없음 — 단순 선택만.
 */
export const GENRE_DETAILS = {
  "순수무용": ["한국무용", "발레", "현대무용"],
  "실용무용": ["대중무용", "댄스"],
  "음악": ["클래식", "실용음악", "합창·앙상블"],
} as const satisfies Partial<Record<typeof GENRES[number], readonly string[]>>;

export type GenreWithDetails = keyof typeof GENRE_DETAILS;
export function hasGenreDetails(genre: string): genre is GenreWithDetails {
  return genre in GENRE_DETAILS;
}

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
