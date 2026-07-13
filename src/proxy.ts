import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase SSR 세션 자동 갱신용 미들웨어 (Next.js 표준).
 * 보호 페이지 리다이렉트는 각 페이지에서 클라이언트 측으로 처리합니다
 * (Vercel 환경에서 서버 측 쿠키 접근 불안정 이슈 회피).
 *
 * 파일명·함수명 이력 (혼동 방지용 — 다시 뒤집지 말 것):
 * - ~2026-06-16 이전: `src/proxy.ts` + `export function proxy` 로 시작.
 *   그러나 당시 Next.js 버전은 "proxy" 파일 규칙을 인식하지 않아 비표준이었고,
 *   빌드 캐시 덕에 우연히 작동하다 캐시 무효화 시점에 세션 갱신이 실패했다.
 *   그래서 2026-06-16 긴급 정정으로 `src/middleware.ts` + `export function middleware`
 *   (당시 Next.js 표준)로 되돌렸다.
 * - 2026-07-13: Next.js 16.2.4에서 공식적으로 "middleware" 파일 규칙이 deprecated,
 *   "proxy"가 정식 표준이 됐다(빌드 로그: `The "middleware" file convention is
 *   deprecated. Please use "proxy" instead.` — nextjs.org/docs/messages/middleware-to-proxy).
 *   공식 코드모드(`npx @next/codemod middleware-to-proxy`)로 다시 `src/proxy.ts` +
 *   `export function proxy`로 전환. 이번엔 Next.js가 실제로 이 이름을 요구하는 것이
 *   node_modules/next 내부 상수(PROXY_FILENAME)로 확인됐으므로 되돌리지 않는다.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신만 담당
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  // 2026-07-13: /api/* 제외 — 각 API 라우트(account/delete, admin/*, syus/monologue/generate 등)는
  // 이미 자체적으로 createServerClient(cookies())로 supabase.auth.getUser()를 호출해 세션을
  // 검증·갱신한다(@supabase/ssr이 만료된 access token을 refresh token으로 자동 갱신하고
  // 쿠키에 다시 써준다). 그래서 미들웨어가 먼저 한 번 더 세션을 갱신할 필요가 없다.
  // hooks/on-signup·cron/show-reminders는 애초에 쿠키 세션을 쓰지 않는 웹훅/크론 라우트라
  // 미들웨어의 getUser() 호출이 완전히 낭비였다.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
