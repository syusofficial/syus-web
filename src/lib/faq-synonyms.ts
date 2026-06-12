/**
 * FAQ 검색 동의어 매핑
 * - 검색어에 그룹 내 단어 하나라도 포함되면, 같은 그룹 다른 단어들도 매칭 대상이 된다.
 * - 그룹 추가/수정 시 lower-case 기준으로 작성한다.
 * - 검색 함수는 `expandSearchTerms()`에서 그룹 확장을 수행한다.
 *
 * 메모리 syus_search_seo_patterns: 검색어는 sanitizeSearchTerm() 처리 후 본 모듈을 거친다.
 */

export const SYNONYM_GROUPS: string[][] = [
  // 수수료 / 비용
  ["수수료", "비용", "등록비", "게재료", "요금", "유료"],
  // 환불 / 취소 / 결제오류
  ["환불", "취소", "결제오류", "결제 오류", "결제실패", "결제 실패"],
  // 광고 / 제휴 / 협력 / 협업
  ["광고", "제휴", "협력", "협업", "파트너십", "협찬"],
  // 공연 등록
  ["공연등록", "공연 등록", "등록", "신청", "공연자신청", "공연자 신청"],
  // 후기 / 리뷰 / 별점
  ["후기", "리뷰", "별점", "평점", "감상평"],
  // 예매 / 티켓
  ["예매", "티켓", "예약", "예매처"],
  // 소개 / 사유유사 / 무대올림
  ["소개", "사유유사", "무대올림", "syus", "회사"],
  // 오류 / 버그 / 에러
  ["오류", "버그", "에러", "error", "안돼요", "안 돼요", "고장"],
  // 계정 / 회원가입 / 비밀번호 / 로그인
  [
    "계정",
    "회원가입",
    "비밀번호",
    "로그인",
    "가입",
    "패스워드",
    "비번",
    "아이디",
  ],
  // 구독 / 정기결제
  ["구독", "구독료", "결제", "정기결제", "정기 결제", "멤버십"],
];

/** 입력어를 동의어 그룹으로 확장. 원문 토큰을 포함하고, 같은 그룹의 다른 단어들도 함께 반환. */
export function expandSearchTerms(input: string): string[] {
  const q = input.toLowerCase().trim();
  if (!q) return [];

  // 원문 그대로의 토큰은 항상 포함
  const tokens = new Set<string>([q]);

  for (const group of SYNONYM_GROUPS) {
    const lowered = group.map((g) => g.toLowerCase());
    // 그룹 내 어떤 단어든 입력어에 포함되어 있으면 같은 그룹 전체를 토큰에 추가
    const hit = lowered.some((g) => q.includes(g) || g.includes(q));
    if (hit) {
      for (const term of lowered) tokens.add(term);
    }
  }

  return Array.from(tokens);
}
