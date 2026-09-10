/**
 * 관리자 전용 server action 공통 가드 — 2026-09-10 신설.
 *
 * 왜 따로 뺐나
 *   `app/actions/performer.ts` 안에만 있던 assertAdmin을, 공연 승인·반려·대리 등록
 *   server action(`app/actions/shows.ts`)에서도 똑같이 써야 했다. 권한 검사는 복사해
 *   두면 한쪽만 고쳐지는 순간 조용히 뚫린다. 그래서 한 파일로 모았다.
 *
 * 원칙
 *   - 클라이언트가 보낸 값(예: "나는 관리자다")은 절대 믿지 않는다. 쿠키 세션으로
 *     사용자를 다시 확인하고, profiles.role을 서버에서 직접 읽어 판정한다.
 *   - 실패 사유는 화면에 그대로 띄울 한국어 문장으로 돌려준다(디버깅 문자열 금지).
 *   - 서버 전용. 클라이언트 컴포넌트에서 import 하지 않는다(next/headers 의존).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminGuardResult =
  | { supabase: SupabaseClient; userId: string; error: null }
  | { supabase: SupabaseClient; userId: null; error: string };

/**
 * 호출자가 관리자인지 서버에서 검증한다.
 *
 * 반환값의 `error`가 null이 아니면 그대로 사용자에게 보여 주고 중단하면 된다.
 * null이면 `userId`가 보장되므로(타입 수준에서도) 이어서 작업해도 된다.
 */
export async function assertAdmin(): Promise<AdminGuardResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, userId: null, error: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { supabase, userId: null, error: "관리자만 가능합니다." };
  }

  return { supabase, userId: user.id, error: null };
}
