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

/**
 * 지금 보는 곳으로 돌아오는 로그인 주소 (2026-10-29)
 * 로그인 링크·이동이 맨 `/auth/login`이면 로그인 뒤 첫 화면에 떨어져, 보던 공연·마이페이지로 다시 찾아가야 했다.
 * 시우스 화면이면 시우스 로그인으로 보낸다. 첫 화면·로그인 화면 자체에선 next를 붙이지 않는다.
 */
export function loginHref(current?: string | null): string {
  const base = current?.startsWith("/syus") ? "/syus/login" : "/auth/login";
  if (!current || current === "/" || current.startsWith("/auth/") || current.startsWith("/syus/login")) return base;
  return `${base}?next=${encodeURIComponent(current)}`;
}

/** 로그인해야만 쓸 수 있는 화면 — 자동 로그아웃 때 이 화면들에서만 로그인 화면으로 보낸다 */
export function requiresLogin(path: string): boolean {
  return /^\/(mypage|admin)(\/|$)|^\/syus\/(mypage|admin)(\/|$)|^\/syus\/[^/]+\/(new|write|request|ask)(\/|$)/.test(path);
}
