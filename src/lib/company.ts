/**
 * 사업자 정보 단일 정본 — 2026-08-03 신설, 2026-08-19 전자상거래법 §10 항목 보강.
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
 *
 * 표기 금지 — 사유유사는 개인사업자다.
 *   "(주)" · "㈜" · "주식회사" · "대표이사" 를 쓰지 않는다. 대표자는 "대표".
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
  /**
   * 대표 전화번호 — **아직 비어 있다(2026-08-19).**
   *
   * 전자상거래법 §10①3호는 전화번호를 초기화면 표시 의무 항목으로 규정한다.
   * 지어낸 번호를 넣으면 표시 자체가 허위가 되므로, 사장님이 실제 번호를
   * 알려주시기 전까지는 빈 문자열로 둔다. 빈 값이면 아래 COMPANY_ROWS가
   * 전화번호 행을 아예 만들지 않으므로 화면에 빈칸이 뜨지 않는다.
   *
   * 채우는 법 — 이 한 줄에 번호만 적으면 세 푸터(게이트웨이·무대올림·시우스)에
   * 동시에 나타난다. 예) phone: "010-0000-0000" as string,
   */
  phone: "" as string,
  /**
   * 통신판매업 신고번호 — **아직 비어 있다(2026-08-19).**
   *
   * 현재 사이트에는 소비자를 상대로 한 온라인 판매·결제가 없다(결제 모듈 미탑재,
   * 좌석 신청은 무료 접수). 그래서 지금은 신고 대상으로 보기 어렵다.
   * 다만 유료 구독을 열거나 소비자 대상 결제를 붙이는 순간 신고 의무가 생기므로,
   * 그때 신고번호를 여기에 적으면 세 푸터에 자동으로 붙는다.
   * 예) mailOrderSalesNumber: "2026-경기남양주-0000" as string,
   */
  mailOrderSalesNumber: "" as string,
  /** 통신판매업 신고기관 (신고 시 함께 표기) — 예: "남양주시청" */
  mailOrderSalesAuthority: "" as string,
  /**
   * 호스팅서비스 제공자 상호 — 전자상거래법 시행령 §10에 따른 표시 항목.
   * 실제 배포처 확인: vercel.json(crons) · .vercel/project.json(syus-web) 존재.
   */
  hostingProvider: "Vercel Inc.",
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
 *
 * 순서는 전자상거래법 §10①의 나열 순서를 따른다.
 *   상호 → 대표자 → 사업자등록번호 → (통신판매업 신고) → 주소 → 전화 → 이메일 → 호스팅
 *
 * 값이 아직 없는 항목(전화번호·통신판매업 신고번호)은 행 자체가 만들어지지 않는다.
 * 빈칸이나 "준비 중" 같은 임시 문구를 화면에 띄우지 않기 위해서다.
 */
export const COMPANY_ROWS: readonly { label: string; value: string }[] = [
  { label: "상호", value: COMPANY.name },
  { label: "대표", value: COMPANY.representative },
  { label: "사업자등록번호", value: COMPANY.bizNumber },
  ...(COMPANY.mailOrderSalesNumber
    ? [
        {
          label: "통신판매업 신고",
          value: COMPANY.mailOrderSalesAuthority
            ? `${COMPANY.mailOrderSalesNumber} (${COMPANY.mailOrderSalesAuthority})`
            : COMPANY.mailOrderSalesNumber,
        },
      ]
    : []),
  // §10①2호는 "소비자의 불만을 처리할 수 있는 곳의 주소를 포함한다"고 못박는다.
  // 사유유사는 영업소와 불만 접수처가 같은 곳이므로 괄호로 그 사실을 밝힌다.
  { label: "주소", value: `${COMPANY.address} (소비자 불만 접수 동일)` },
  ...(COMPANY.phone ? [{ label: "전화번호", value: COMPANY.phone }] : []),
  { label: "이메일", value: COMPANY.email },
  { label: "호스팅서비스", value: COMPANY.hostingProvider },
];

/** 한 줄 표기 — 좁은 자리(미디어킷 하단, 메일 푸터 등)용 */
export const COMPANY_ONELINE = `${COMPANY.name} · 대표 ${COMPANY.representative} · 사업자등록번호 ${COMPANY.bizNumber}`;
