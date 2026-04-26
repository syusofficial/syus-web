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
 * URL 정규화 — 사용자가 프로토콜 없이 입력한 경우 자동으로 https:// 추가
 * - 빈 문자열은 그대로 빈 문자열 반환
 * - 이미 http:// 또는 https://로 시작하면 그대로 (앞뒤 공백만 제거)
 * - 그 외에는 https:// 자동 prefix
 */
export function normalizeUrl(url: string): string {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const KAKAO_MAP_HOSTS = ["kakao.com", "map.kakao.com", "place.map.kakao.com"];
export const NAVER_MAP_HOSTS = ["naver.com", "map.naver.com", "naver.me"];
