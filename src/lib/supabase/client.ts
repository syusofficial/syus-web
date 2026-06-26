import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저용 Supabase 클라이언트.
 *
 * 2026-06-26 제작팀 진단 메모:
 *  - 이 함수는 거의 모든 클라이언트 컴포넌트(NavMega·Footer·LikeButton 등)가 호출한다.
 *  - 이전엔 env에 non-null 어서션(!)만 있어서, 만약 NEXT_PUBLIC_* 가 비면
 *    createBrowserClient(undefined, undefined) → 내부 throw → 그 컴포넌트의
 *    useEffect/핸들러가 죽고, 사용자 눈엔 "클릭이 안 먹는" 것으로 보일 수 있었다.
 *  - 라이브(Vercel)엔 값이 정상 주입돼 있으므로 평소 동작은 그대로다.
 *    다만 누락 시 원인을 즉시 알 수 있도록 명확한 에러 메시지를 남긴다(fail-fast).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // 콘솔에 정확한 누락 원인을 남긴다 (값은 절대 출력하지 않음)
    console.error(
      "[supabase] 환경변수 누락 — NEXT_PUBLIC_SUPABASE_URL 또는 " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다. Vercel 환경변수를 확인하세요."
    );
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return createBrowserClient(url, anonKey);
}
