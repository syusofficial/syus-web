import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * 계정 탈퇴 API
 * 1. 사용자 인증 확인 (쿠키 세션)
 * 2. Storage에서 본인 업로드 파일 일괄 삭제 (posters + syus-media)
 * 3. auth.users 행 삭제 (CASCADE로 profiles, shows, likes 모두 삭제)
 *
 * 환경변수 SUPABASE_SERVICE_ROLE_KEY 필요 (Vercel Settings → Environment Variables)
 */

// service role 클라이언트의 storage 부분만 넘겨 쓴다 (아래 헬퍼용)
type AdminStorage = ReturnType<typeof createAdminClient>["storage"];

const LIST_PAGE = 1000; // Supabase storage list() 1회 최대 건수

/**
 * 버킷의 특정 경로를 끝까지 훑어 파일 이름을 모은다. (2026-08-03)
 * list()는 한 번에 최대 1000건만 돌려주므로 offset을 밀어가며 전부 읽는다.
 * (기존에는 첫 1000건만 봐서 버킷이 커지면 일부 파일이 지워지지 않고 남았다.)
 */
async function listAllNames(storage: AdminStorage, bucket: string, prefix: string): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: LIST_PAGE, offset });
    if (error) {
      console.error(`[account/delete] storage list 실패 (${bucket}/${prefix})`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    names.push(...data.map((f) => f.name));
    if (data.length < LIST_PAGE) break;
  }
  return names;
}

/**
 * 탈퇴자가 올린 파일 파기 (2026-08-03 추가 — 개인정보 파기 의무)
 * - posters   : 루트에 평면 저장, 파일명이 `{userId}-타임스탬프.확장자`
 * - syus-media: `{userId}/{uuid}.확장자` 폴더 저장 (시우스 책 표지·후기 이미지)
 *   → 예전엔 posters만 지워서 syus-media 파일이 공개 URL로 영구히 남았다.
 */
async function purgeUserFiles(storage: AdminStorage, userId: string) {
  // posters — 루트 목록에서 본인 접두사만 골라 삭제
  const posterNames = await listAllNames(storage, "posters", "");
  const myPosters = posterNames.filter((n) => n.startsWith(userId + "-"));
  if (myPosters.length > 0) {
    const { error } = await storage.from("posters").remove(myPosters);
    if (error) console.error("[account/delete] posters 삭제 실패", error.message);
  }

  // syus-media — 본인 폴더 안의 파일만 삭제 (경로에 폴더명을 다시 붙여야 한다)
  const mediaNames = await listAllNames(storage, "syus-media", userId);
  const myMedia = mediaNames.map((n) => `${userId}/${n}`);
  if (myMedia.length > 0) {
    const { error } = await storage.from("syus-media").remove(myMedia);
    if (error) console.error("[account/delete] syus-media 삭제 실패", error.message);
  }
}
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

  // Storage 업로드 파일 일괄 삭제 (posters + syus-media)
  await purgeUserFiles(admin.storage, user.id);

  // auth.users 삭제 → CASCADE로 profiles, shows, likes 자동 삭제
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    // 원인을 서버 로그에 남겨 향후 진단 가능하게 (응답엔 일반 메시지 유지)
    console.error("[account/delete] deleteUser 실패", {
      userId: user.id,
      code: (deleteError as { code?: string }).code,
      message: deleteError.message,
    });
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  // 로컬 세션 정리
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
