import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * 계정 탈퇴 API
 * 1. 사용자 인증 확인 (쿠키 세션)
 * 2. Storage에서 본인 포스터 일괄 삭제
 * 3. auth.users 행 삭제 (CASCADE로 profiles, shows, likes 모두 삭제)
 *
 * 환경변수 SUPABASE_SERVICE_ROLE_KEY 필요 (Vercel Settings → Environment Variables)
 */
export async function POST() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "서버 설정 오류 — 관리자에게 문의해주세요. (SERVICE_KEY 미설정)" },
      { status: 500 }
    );
  }

  // 관리자 권한 클라이언트 (RLS 우회)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  // Storage 포스터 일괄 삭제
  const { data: files } = await admin.storage.from("posters").list("", { limit: 1000 });
  const myFiles = (files ?? [])
    .filter((f) => f.name.startsWith(user.id + "-"))
    .map((f) => f.name);
  if (myFiles.length > 0) {
    await admin.storage.from("posters").remove(myFiles);
  }

  // auth.users 삭제 → CASCADE로 profiles, shows, likes 자동 삭제
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  // 로컬 세션 정리
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
