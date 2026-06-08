/**
 * Supabase Admin 클라이언트 (service role).
 *
 * - 서버 사이드 전용 — 절대 클라이언트 번들에 포함되면 안 된다.
 *   route handler·server action 안에서만 import 한다.
 * - 쿠키 세션 없이 DB에 직접 접근할 수 있는 권한. 보안상 사용처를 최소화한다.
 *   현재 용도: 회원가입 webhook에서 profiles 조회·환영 메일 발송 멱등성 기록.
 *
 * 키 미설정 시 빌드는 통과시키되 호출 시점에 명확히 throw 한다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[supabase/admin] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
