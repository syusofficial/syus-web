/**
 * 로그인·가입 뒤 돌아갈 주소(?next=) 검사 — 사이트 안 경로만 허용 (2026-10-29 한 곳으로 모음)
 *
 * 이전엔 화면마다 `startsWith("/") && !startsWith("//") && !startsWith("/\\")`를 따로 적었는데,
 * 브라우저는 주소를 해석할 때 탭·줄바꿈을 지우고 \를 /로 읽는다. 그래서 `/%09/evil.com`
 * (/ + 탭 + /evil.com)이 검사를 통과한 뒤 `//evil.com`, 즉 외부 사이트로 바뀔 수 있었다.
 * 브라우저와 똑같이 먼저 정리한 다음 검사한다.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const cleaned = raw.replace(/[\t\n\r]/g, "").replace(/\\/g, "/");
  if (!cleaned.startsWith("/") || cleaned.startsWith("//")) return fallback;
  return cleaned;
}
