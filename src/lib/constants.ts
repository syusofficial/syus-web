export const REGIONS = [
  "전체",
  "서울", "경기", "인천",
  "충북", "충남", "대전",
  "전북", "전남", "광주",
  "경북", "경남", "대구",
  "부산", "강원", "제주",
] as const;

export const REGIONS_EXCLUDE_ALL = REGIONS.slice(1);

/**
 * 무대예술 장르 — 무대올림 정체성 "장르는 넓게, 대상은 좁게"에 따라 확장.
 * 2026-06-01 사장님 결정: 연기·뮤지컬 한정 → 무대예술 전체로 확장.
 * 추가된 장르(무용·발레·국악·음악·전통연희)는 기존 DB의 '기타'로 분류된 공연을 사장님이 직접 재분류할 수 있음.
 */
export const GENRES = [
  "연극",
  "뮤지컬",
  "무용",
  "발레",
  "국악",
  "음악",
  "전통연희",
  "기타",
] as const;

/** 공연 구분 — 등록 시 필수 선택. 장르(작품 형식)와 별개로 공연의 성격을 분류. */
export const SHOW_CATEGORIES = ["교내 공연", "외부 공연", "워크샵"] as const;

export type Region = typeof REGIONS[number];
export type Genre = typeof GENRES[number];
export type ShowCategory = typeof SHOW_CATEGORIES[number];

/**
 * 장르별 도트/막대 컬러 — 미네랄 슬레이트(#3B5A6B) 한 계열 안에서
 * 채도·명도만 변주한 8단계. 2026-06-15 사장님 잠금 (Phase 1 시안).
 * 다른 색상 차용 금지. 사용처: ShowCard 도트, HeroPosterStream 도트, ShowsCalendar 셀 막대.
 */
export const GENRE_TINT: Record<Genre, string> = {
  연극: "#3B5A6B",     // 미네랄 베이스
  뮤지컬: "#5C7C8E",    // 라이트
  무용: "#7C9AAA",     // 페일
  발레: "#2C4555",     // 딥
  국악: "#4A6D7E",     // 중간
  음악: "#1F3340",     // 다크
  전통연희: "#6F8C9C",  // 미들 페일
  기타: "#B6BFC5",     // 그레이
};

/**
 * 캘린더 셀 막대 — 자주 등록 5장르만 컬러 분기, 나머지는 회색 통합.
 * 2026-06-15 시안 권고 4. 운영팀 실데이터로 5장르 확정 후 교체 가능.
 */
export const CALENDAR_PRIMARY_GENRES: ReadonlyArray<Genre> = [
  "연극",
  "뮤지컬",
  "음악",
  "무용",
  "국악",
];
export const CALENDAR_ETC_COLOR = "#B6BFC5"; // 발레·전통연희·기타 통합

/** Genre 문자열을 받아 캘린더 막대 컬러를 반환 (5장르 외는 회색 통합). */
export function calendarGenreColor(genre?: string | null): string {
  if (!genre) return CALENDAR_ETC_COLOR;
  if ((CALENDAR_PRIMARY_GENRES as ReadonlyArray<string>).includes(genre)) {
    return GENRE_TINT[genre as Genre];
  }
  return CALENDAR_ETC_COLOR;
}

/** Genre 문자열을 받아 도트(8장르 모두 구분) 컬러를 반환. */
export function genreDotColor(genre?: string | null): string {
  if (!genre) return GENRE_TINT["기타"];
  if (genre in GENRE_TINT) return GENRE_TINT[genre as Genre];
  return GENRE_TINT["기타"];
}

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
