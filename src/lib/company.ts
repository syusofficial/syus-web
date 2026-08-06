/**
 * 사업자 정보 단일 정본 — 2026-08-03 신설.
 *
 * 왜 만들었나
 *   회사 주소가 화면마다 다르게 적혀 있었다.
 *     · 시우스 푸터   "경기 남양주시 진접읍 엠타워 E-35호"      (도로명·층·호 누락)
 *     · 메일 푸터     "경기도 남양주시 진접읍 해밀예당1로 220, 본동 7층 07호 E-35호(엠타워)"
 *     · 무대올림 푸터 · 개인정보처리방침 · 광고 안내 — 아예 없음
 *   같은 회사인데 페이지마다 다른 주소가 뜨면 신뢰가 깎이고,
 *   통신판매법 §3 · 정보통신망법 §50의2 의 사업자 정보 표기와도 어긋난다.
 *
 * 규칙
 *   **사업자 정보를 화면에 적을 때는 문자열을 직접 쓰지 말고 반드시 여기서 가져온다.**
 *   주소가 바뀌면 이 파일 한 줄만 고치면 사이트·메일 전체가 함께 바뀐다.
 *
 * 주의 — 이 주소는 공유오피스 입주실이다(호실 단위 임대).
 *   우편 수령은 되지만 상시 출근 사무실이 아닐 수 있어, 방문 미팅은 사전 확인이 필요하다.
 */
export const COMPANY = {
  /** 상호 (개인사업자) */
  name: "사유유사",
  /** 서비스명 — 무대올림은 사유유사가 운영하는 서비스이지 별도 사업자가 아니다 */
  serviceName: "무대올림",
  /** 대표자 */
  representative: "이혁호",
  /** 사업자등록번호 */
  bizNumber: "168-05-03666",
  /** 사업장 주소 — 사업자등록증 기재 그대로 (2026-08-03 사장님 확정 표기) */
  address: "경기도 남양주시 진접읍 해밀예당1로 220 본동 7층 07호, E-35",
  /** 대표 이메일 */
  email: "syusflux@gmail.com",
  /** 카카오톡 채널 */
  kakaoUrl: "https://pf.kakao.com/_xkPVTX",
  /** 인스타그램 */
  instagramUrl: "https://instagram.com/syus_official",
  /** 서비스 도메인 */
  siteUrl: "https://syus.co.kr",
} as const;

/**
 * 푸터·안내문에 공통으로 들어가는 사업자 정보 행 목록.
 * 순서도 정본이다 — 화면마다 순서가 달라지면 그것도 "중구난방"으로 읽힌다.
 */
export const COMPANY_ROWS: readonly { label: string; value: string }[] = [
  { label: "상호", value: COMPANY.name },
  { label: "대표", value: COMPANY.representative },
  { label: "사업자등록번호", value: COMPANY.bizNumber },
  { label: "주소", value: COMPANY.address },
  { label: "이메일", value: COMPANY.email },
];

/** 한 줄 표기 — 좁은 자리(미디어킷 하단, 메일 푸터 등)용 */
export const COMPANY_ONELINE = `${COMPANY.name} · 대표 ${COMPANY.representative} · 사업자등록번호 ${COMPANY.bizNumber}`;
