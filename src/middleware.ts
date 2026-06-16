import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase SSR 세션 자동 갱신용 미들웨어 (Next.js 표준).
 * 보호 페이지 리다이렉트는 각 페이지에서 클라이언트 측으로 처리합니다
 * (Vercel 환경에서 서버 측 쿠키 접근 불안정 이슈 회피).
 *
 * 2026-06-16 긴급 정정: 이전 `src/proxy.ts`는 Next.js가 인식하지 않는 비표준 이름.
 *   - 함수명 `proxy` → `middleware`
 *   - 파일명 `proxy.ts` → `middleware.ts`
 * 그동안 빌드 캐시 덕에 우연히 작동하던 것이, 캐시 무효화 시점부터 세션 갱신 실패.
 */
export async function middleware(request: NextRequest) {
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
