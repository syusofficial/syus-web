import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * 관리자 역할 변경 API
 *
 * 배경 (2026-06-26 사가):
 * - profiles RLS UPDATE 정책이 강화되어 admin도 브라우저(anon key)로는 타인 row update 불가
 * - 기존 admin 페이지의 updateMemberRole이 anon key를 쓰던 탓에 역할 변경 차단
 * - 본 endpoint는 (1) 요청자 admin 검증 → (2) service role로 update하여 RLS 우회
 *
 * 절차
 * 1. 요청자 인증 (auth.users)
 * 2. 요청자 role = 'admin' 확인 (profiles)
 * 3. 페이로드 검증 (targetUserId, newRole ∈ {member, performer, admin})
 * 4. service role 클라이언트로 profiles.role update
 *
 * Body: { targetUserId: string, newRole: "member" | "performer" | "admin" }
 */

const ALLOWED_ROLES = ["member", "performer", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

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

  // 3) 페이로드 파싱·검증
  let targetUserId: string;
  let newRole: AllowedRole;
  try {
    const body = await req.json();
    targetUserId = body.targetUserId;
    newRole = body.newRole;
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "대상 사용자 ID가 누락되었습니다." }, { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(newRole)) {
      return NextResponse.json({ error: "허용되지 않은 역할 값입니다." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // 4) service role 클라이언트로 RLS 우회 update
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "서버 설정 오류 (SERVICE_KEY 미설정)" },
      { status: 500 }
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { error } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) {
    console.error("[admin/update-role] update 실패", {
      targetUserId,
      newRole,
      code: (error as { code?: string }).code,
      message: error.message,
    });
    return NextResponse.json({ error: "역할 변경 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
