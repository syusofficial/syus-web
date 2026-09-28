/**
 * Supabase 공개 키 읽기 — 2026-09-28 새 키 이전 준비 (제작팀).
 *
 * 배경: Supabase가 레거시 anon / service_role 키(JWT 형식)를 2026년 말 폐기한다.
 * 대체 키는 두 가지다.
 *   - 공개 키  sb_publishable_...  (브라우저에 나가도 되는 키 — 기존 anon 자리)
 *   - 비밀 키  sb_secret_...       (서버 전용 — 기존 service_role 자리, src/lib/supabase/admin.ts)
 *
 * 규칙: "새 변수가 있으면 새 변수, 없으면 기존 변수". 지금 배포에는 새 변수가 없으므로
 * 동작은 예전과 완전히 같다. 사장님이 Vercel에 새 변수를 넣고 재배포하는 순간 새 키로 넘어간다.
 * (확인이 끝나면 옛 변수는 Vercel에서 지워도 된다.)
 *
 * ⚠ process.env.NEXT_PUBLIC_... 는 반드시 이렇게 "글자 그대로" 적어야 한다.
 *   Next.js가 빌드할 때 이 문자열을 찾아 값으로 바꿔 넣기 때문에,
 *   process.env[변수명] 같은 동적 접근으로 바꾸면 브라우저에서 값이 사라진다.
 * ⚠ 키 값은 절대 코드에 적지 않는다. .env.local / Vercel 환경변수에만 둔다.
 */

/** Supabase 프로젝트 주소 (https://xxxx.supabase.co) — 키 이전과 무관하게 그대로 */
export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/**
 * 공개 키 — 새 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY(sb_publishable_...) 우선,
 * 없으면 기존 NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function supabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
