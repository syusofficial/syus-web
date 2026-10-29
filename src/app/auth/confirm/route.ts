import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabasePublishableKey } from "@/lib/supabase/keys";
import { safeNextPath } from "@/lib/safeNext";

/**
 * 메일 속 링크 확인 (2026-10-29 신설) — 비밀번호 재설정 메일이 여기로 온다.
 *
 * 왜 따로 두는가: 기본 링크({{ .ConfirmationURL }})는 PKCE 방식이라, 재설정을 "요청한 그 브라우저"에
 * 저장해 둔 비밀값이 있어야 열린다. PC에서 요청하고 폰 메일 앱(Gmail·네이버 앱 안 브라우저)으로
 * 열면 세션이 생기지 않아 새 비밀번호를 넣어도 실패했다.
 * 메일 양식을 아래처럼 바꾸면 링크에 담긴 token_hash를 서버에서 확인하므로 어느 브라우저에서 열어도 된다.
 *   https://syus.co.kr/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password
 * (Supabase 대시보드 → Authentication → Email Templates → Reset Password)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && type) {
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
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.warn("[auth/confirm] 링크 확인 실패", error.message);
  }

  // 만료·이미 사용·잘못된 링크 — 다시 요청하는 화면으로
  return NextResponse.redirect(`${origin}/auth/forgot-password?error=link_invalid`);
}
