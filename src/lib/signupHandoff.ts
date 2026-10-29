/**
 * 가입 → 로그인 화면으로 이메일 넘겨주기 (2026-10-29)
 *
 * 가입을 마치면 로그인 화면(?signup=success)으로 보내는데, 방금 쓴 이메일을 다시 치게
 * 하지 않으려고 이메일 칸을 미리 채운다. 주소창(?email=)에 실으면 통계·화면 녹화 도구에
 * 이메일이 남으므로 sessionStorage(이 탭을 닫으면 지워지는 저장소)로 넘긴다.
 * 로그인 화면은 ?signup=success일 때만 읽는다.
 * 사생활 보호 모드 등에서 저장소가 막혀도 가입·로그인은 그대로 되도록 예외는 삼킨다.
 */
const SIGNUP_EMAIL_KEY = "syus-signup-email";

export function handOffSignupEmail(email: string) {
  try {
    sessionStorage.setItem(SIGNUP_EMAIL_KEY, email);
  } catch {}
}

export function readSignupEmail(): string | null {
  try {
    return sessionStorage.getItem(SIGNUP_EMAIL_KEY);
  } catch {
    return null;
  }
}
