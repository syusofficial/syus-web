import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * 관리자 강제 탈퇴 API
 * 1. 요청자가 관리자(admin)인지 검증
 * 2. 본인은 본인을 탈퇴시킬 수 없음 (실수 방지)
 * 3. 대상 사용자의 Storage 포스터 일괄 삭제
 * 4. auth.users 삭제 → CASCADE로 profiles, shows, likes 모두 삭제
 *
 * Body: { targetUserId: string }
 * 환경변수 SUPABASE_SERVICE_ROLE_KEY 필요
 */
export async function POST(req: Request) {
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

  // 1) 요청자 인증
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 관리자 권한 검증
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (requesterProfile?.role !== "admin") {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  // 3) 대상 사용자 ID 파싱
  let targetUserId: string;
  try {
    const body = await req.json();
    targetUserId = body.targetUserId;
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "대상 사용자 ID가 누락되었습니다." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // 4) 본인 자가 탈퇴 차단 (실수 방지)
  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "본인은 본인을 탈퇴시킬 수 없습니다. 본인 계정은 마이페이지에서 탈퇴해주세요." },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "서버 설정 오류 (SERVICE_KEY 미설정)" },
      { status: 500 }
    );
  }

  // 5) 관리자 권한 클라이언트
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  // 6) 대상 사용자의 Storage 포스터 일괄 삭제
  const { data: files } = await admin.storage.from("posters").list("", { limit: 1000 });
  const targetFiles = (files ?? [])
    .filter((f) => f.name.startsWith(targetUserId + "-"))
    .map((f) => f.name);
  if (targetFiles.length > 0) {
    await admin.storage.from("posters").remove(targetFiles);
  }

  // 7) auth.users 삭제 → CASCADE 적용
  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
