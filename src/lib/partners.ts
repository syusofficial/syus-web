/**
 * 좌측 사이드바 — 연관 기관 (클릭 시 해당 기관 공식 홈페이지로)
 * 무대예술(연극·뮤지컬·무용·국악·음악·전통연희) · 문화정책 관련 공신력 있는 기관들.
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
 * ─────────────────────────────────────────────────────────────
 * 제휴 · 추천 파트너 (광고 지면)
 * ─────────────────────────────────────────────────────────────
 *
 * ■ 광고 등록 방법 (운영자용)
 *
 *   아래 PARTNER_ADS 배열에 객체 하나를 추가하면 끝입니다.
 *   PC와 모바일 양쪽에 자동으로 함께 노출되므로, 두 군데를 고칠 필요가 없습니다.
 *
 *   - PC(가로 1280px 이상)  → 메인 페이지 우측 사이드바 (PartnerAdSidebar)
 *   - 모바일·태블릿(1280px 미만) → 본문 아래 인라인 지면 (MobilePartnerStrip)
 *
 *   두 지면은 동시에 뜨지 않습니다(한 화면에 하나만). 광고주에게 노출수를
 *   이중으로 세지 않기 위한 장치입니다.
 *
 * ■ 각 필드가 화면 어디에 나오는가
 *
 *   name     (필수) 업체명            — 카드 가운데, 가장 크게
 *   category (필수) 카테고리 라벨      — 카드 맨 위 작은 글씨 (대문자로 표시됨)
 *   desc     (필수) 설명 한두 줄       — 카드 아래쪽 본문. PC 사이드바에 그대로 나옴
 *   short    (선택) 짧은 한 줄 카피     — 모바일 카드에서 desc 대신 쓰임.
 *                                        비워두면 desc가 그대로 쓰입니다.
 *                                        모바일은 가로가 넓어 긴 글이 늘어져 보이므로
 *                                        25자 안팎으로 줄인 문장을 넣어주시면 좋습니다.
 *   url      (선택) 홈페이지 주소       — 넣으면 카드 전체가 클릭됩니다.
 *                                        없으면 클릭되지 않는 안내 카드가 됩니다.
 *   tag      (선택) 우측 상단 작은 배지  — 예: "신규", "할인". 2~3자를 권합니다.
 *
 * ■ category에 넣을 수 있는 값
 *
 *   print       팸플릿·리플렛·포스터 제작
 *   academy     연기·보이스·발성 아카데미
 *   studio      프로필 사진 · 연출 영상 스튜디오
 *   audition    오디션 정보 · 캐스팅 플랫폼
 *   costume     의상·분장·소품 제공
 *   venue       공연장 대관
 *   publishing  희곡·시나리오·연극 전문서적
 *   grant       장학금·지원금 안내
 *   equipment   음향·조명 장비 대여
 *
 * ■ 광고 표시 의무
 *
 *   게재료를 받고 싣는 자리이므로, 두 지면 모두 "제휴 · 추천" 제목과 "광고" 표기를
 *   화면에 함께 띄우고 링크에는 rel="sponsored"를 붙입니다(표시광고법 · 검색엔진 정책).
 *   이 표기는 컴포넌트가 자동으로 처리하므로 아래 배열에는 신경 쓰지 않으셔도 됩니다.
 */
export type PartnerAd = {
  name: string;
  category: string;
  desc: string;
  /** 모바일 카드에서 desc 대신 쓰는 짧은 한 줄 (25자 안팎). 없으면 desc 사용. */
  short?: string;
  url?: string;
  tag?: string; // 예: "할인", "신규"
};

export const PARTNER_ADS: PartnerAd[] = [
  // 실제 광고 체결 후 이곳에 추가합니다.
  //
  // 예시 — 아래 주석을 풀고 내용만 바꾸면 바로 노출됩니다.
  // {
  //   name: "OO 인쇄",
  //   category: "print",
  //   desc: "대학 공연 팸플릿·포스터를 소량으로도 인쇄합니다.",
  //   short: "팸플릿·포스터 소량 인쇄",
  //   url: "https://example.com",
  //   tag: "신규",
  // },
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
