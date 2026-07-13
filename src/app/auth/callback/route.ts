import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * OAuth 인증 콜백 핸들러
 * Google/Kakao 로그인 완료 후 Supabase가 ?code=... 와 함께 이곳으로 리다이렉트합니다.
 * 코드를 세션으로 교환하고 사용자를 적절한 페이지로 보냅니다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 오픈 리다이렉트 방지: 내부 경로만 허용(// · \ · @evil.com 등 외부 이동 차단).
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
  }

  // 약관 미동의 시 onboarding으로 강제 이동 (OAuth 신규 가입자)
  const meta = data.user.user_metadata ?? {};
  if (!meta.terms_agreed_at || !meta.privacy_agreed_at) {
    return NextResponse.redirect(`${origin}/auth/onboarding`);
  }

  // 관리자 여부 확인 후 라우팅
  // maybeSingle() 사용 — handle_new_user 트리거가 아직 profiles row를 못 만들었을 수 있어
  // (트리거는 비동기가 아니지만 레이스 가능성 배제 불가) .single()이면 행이 없을 때 에러가 나서
  // profile이 undefined가 되고, 그 뒤 profile?.role 체크 자체는 안전하지만 에러를 그냥 삼키던 문제를 없앤다.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    return NextResponse.redirect(`${origin}/admin`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
