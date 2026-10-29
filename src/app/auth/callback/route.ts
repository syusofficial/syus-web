import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabasePublishableKey } from "@/lib/supabase/keys";
import { safeNextPath } from "@/lib/safeNext";

/**
 * OAuth 인증 콜백 핸들러
 * Google/Kakao 로그인 완료 후 Supabase가 ?code=... 와 함께 이곳으로 리다이렉트합니다.
 * 코드를 세션으로 교환하고 사용자를 적절한 페이지로 보냅니다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 오픈 리다이렉트 방지: 내부 경로만 허용(// · \ · @evil.com 등 외부 이동 차단).
  const next = safeNextPath(searchParams.get("next"));
  // 시우스에서 시작한 로그인이 실패하면 시우스 로그인 화면으로 돌려보낸다(무대올림 화면으로 튕기지 않게)
  const loginPath = next.startsWith("/syus") ? "/syus/login" : "/auth/login";

  if (!code) {
    return NextResponse.redirect(`${origin}${loginPath}?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublishableKey()!,
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
    return NextResponse.redirect(`${origin}${loginPath}?error=oauth_failed`);
  }

  // 약관 미동의 시 onboarding으로 강제 이동 (OAuth 신규 가입자)
  const meta = data.user.user_metadata ?? {};
  if (!meta.terms_agreed_at || !meta.privacy_agreed_at) {
    // 동의를 마친 뒤 원래 가려던 곳으로 돌아가도록 next를 넘긴다(2026-10-29)
    const onboardingNext = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
    return NextResponse.redirect(`${origin}/auth/onboarding${onboardingNext}`);
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
