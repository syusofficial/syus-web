/**
 * URL 검증 유틸 — XSS 위험 스킴 차단, https/http만 허용
 * 빈 문자열은 valid로 취급 (선택 입력 필드 대응)
 */
export function isValidUrl(url: string, options?: {
  allowedHosts?: string[]; // 도메인 화이트리스트 (옵션, 부분일치)
}): boolean {
  if (!url || !url.trim()) return true;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }

  // 안전한 스킴만 허용
  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  // 도메인 화이트리스트 검증
  if (options?.allowedHosts && options.allowedHosts.length > 0) {
    const matched = options.allowedHosts.some((host) =>
      parsed.hostname === host || parsed.hostname.endsWith("." + host)
    );
    if (!matched) return false;
  }

  return true;
}

/**
 * 입력 텍스트에서 첫 번째 http(s) URL을 추출.
 * 모바일 공유 형식 대응 — 예) "[카카오맵] 낙산공원 https://kko.to/abc"
 * URL이 없으면 원본을 trim해서 반환.
 */
export function extractFirstUrl(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  // 닫는 괄호·따옴표·꺾쇠는 URL 종료자로 처리
  const match = trimmed.match(/https?:\/\/[^\s\])"'<>]+/i);
  return match ? match[0] : trimmed;
}

/**
 * URL 정규화 — 사용자 입력을 깨끗한 URL로 정리.
 * 1) 모바일 공유 형식("[카카오맵] 낙산공원 https://kko.to/...")에서 URL 추출
 * 2) 프로토콜 없으면 https:// 자동 prefix
 * - 빈 문자열은 그대로 빈 문자열 반환
 */
export function normalizeUrl(url: string): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  const extracted = extractFirstUrl(trimmed);
  if (/^https?:\/\//i.test(extracted)) return extracted;
  return `https://${extracted}`;
}

/**
 * 지도 도메인 화이트리스트.
 * 카카오: PC(map.kakao.com·place.map.kakao.com)·모바일 단축(kko.to) 모두 허용.
 * 네이버: PC(map.naver.com)·모바일 단축(naver.me) 모두 허용.
 */
export const KAKAO_MAP_HOSTS = ["kakao.com", "map.kakao.com", "place.map.kakao.com", "kko.to"];
export const NAVER_MAP_HOSTS = ["naver.com", "map.naver.com", "naver.me"];

/**
 * 생년월일(YYYY-MM-DD) 기준 만 14세 이상인지 확인.
 * 오늘 날짜에서 14년을 뺀 날짜와 비교 — 윤년·생일 미도래까지 자연스럽게 처리.
 * PIPA v2.1(2026-06-15 시행) 만 14세 이상 가입 게이트 — 이메일 가입(signup)과
 * 소셜 가입(onboarding)이 동일한 로직을 공유하기 위해 이곳에 둔다.
 */
export function isAtLeast14(birthDate: string): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());
  return birth.getTime() <= cutoff.getTime();
}
