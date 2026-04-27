/**
 * 좌측 사이드바 — 연관 기관 (클릭 시 해당 기관 공식 홈페이지로)
 * 공연예술 · 연극 · 뮤지컬 · 문화정책 관련 공신력 있는 기관들.
 */
export const INSTITUTIONS: { name: string; url: string; desc: string }[] = [
  { name: "문화체육관광부",         url: "https://www.mcst.go.kr",    desc: "정부 부처" },
  { name: "한국문화예술위원회",     url: "https://www.arko.or.kr",    desc: "예술 지원" },
  { name: "한국연극협회",           url: "http://www.ktheater.or.kr", desc: "공인 단체" },
  { name: "한국뮤지컬협회",         url: "http://musical.or.kr",      desc: "공인 단체" },
  { name: "국립극단",               url: "https://www.ntck.or.kr",    desc: "국립 극단" },
  { name: "예술의전당",             url: "https://www.sac.or.kr",     desc: "공연장" },
  { name: "문화포털",               url: "https://www.culture.go.kr", desc: "문화 정보" },
  { name: "한국예술인복지재단",     url: "https://www.kawf.kr",       desc: "복지 기관" },
  { name: "국립국악원",             url: "https://www.gugak.go.kr",   desc: "전통 예술" },
  { name: "한국공연예술경영인협회", url: "http://www.kapama.or.kr",   desc: "경영인 협회" },
];

/**
 * 우측 사이드바 — 제휴·추천 파트너 (광고)
 * 공연 홍보물 제작 / 연기 전공생 진로 관련 업체를 게재합니다.
 *
 * 카테고리 제안:
 *   - print       : 팸플릿·리플렛·포스터 제작
 *   - academy     : 연기·보이스·발성 아카데미
 *   - studio      : 프로필 사진 · 연출 영상 스튜디오
 *   - audition    : 오디션 정보 · 캐스팅 플랫폼
 *   - costume     : 의상·분장·소품 제공
 *   - venue       : 공연장 대관
 *   - publishing  : 희곡·시나리오·연극 전문서적
 *   - grant       : 장학금·지원금 안내
 *   - equipment   : 음향·조명 장비 대여
 */
export type PartnerAd = {
  name: string;
  category: string;
  desc: string;
  url?: string;
  tag?: string; // 예: "할인", "신규"
};

export const PARTNER_ADS: PartnerAd[] = [
  // 실제 광고 체결 후 이곳에 추가합니다.
];

/**
 * 런칭 협력사 (베타기 광고주)
 *
 * SYUS 베타기(2026-04~08)에 참여한 광고주 — 푸터에 'Launch Partners' 영역으로 노출.
 * 빈 배열이면 푸터에서 자동 숨김. 협력사가 확보되면 이 배열에 추가하세요.
 *
 * - name: 협력사명 (필수)
 * - category: 카테고리 (예: "공연 의상", "연기 학원", "소극장")
 * - url: 협력사 홈페이지·인스타 등 (선택)
 */
export type LaunchPartner = {
  name: string;
  category?: string;
  url?: string;
};

export const LAUNCH_PARTNERS: LaunchPartner[] = [
  // 협력사가 확보되면 여기에 추가
  // 예시:
  // { name: "OO 의상 대여", category: "공연 의상", url: "https://example.com" },
];
