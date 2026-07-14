import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 *
 * 2026-07-14 싱글턴 전환 (제작팀 — 무대올림↔시우스 로그인 표시 불일치 진단):
 *  - 이전엔 호출할 때마다 createBrowserClient()로 매번 "새" GoTrueClient 인스턴스를 만들었다.
 *    사이트 전역에서 이 함수를 부르는 곳이 60곳 이상(NavMega·PageViewTracker·SessionManager +
 *    시우스 쪽 SyusAuthLink·SyusWriteCta·SyusComments·SyusLikeButton·SyusReportButton·
 *    각 write 페이지 등)이라, 특히 /muol → /syus로 넘어가는 순간에는 여러 컴포넌트가
 *    동시에 마운트되며 한꺼번에 여러 개의 GoTrueClient가 같은 쿠키 저장소를 두고 경합했다.
 *  - Supabase 공식 문서가 명시적으로 경고하는 상황("Multiple GoTrueClient instances detected…
 *    may lead to undefined behavior when used concurrently under the same storage key")이며,
 *    특히 토큰 자동 갱신이 겹치면 한 인스턴스가 방금 갱신된 세션 쿠키를 오래된 값으로 덮어써
 *    직후의 getUser() 호출이 "로그인 안 됨"으로 보이는 현상까지 이어질 수 있다.
 *  - 시우스 6섹션은 한 페이지에 헤더(SyusAuthLink) + 본문 컴포넌트(쓰기 CTA·댓글·좋아요·신고)가
 *    동시에 여러 개 떠 있어 이 경합이 가장 자주 발생하는 지점이었다 — "쓰기 기능 이용 시
 *    필수적으로 로그인 화면이 뜬다"는 보고와 정확히 들어맞는다.
 *  - 모듈 스코프에 인스턴스를 캐싱해 앱 전체가 브라우저에서 정확히 하나의 GoTrueClient만
 *    공유하도록 바꿨다. 호출부(60여 곳)는 모두 createClient() 그대로 써도 되므로 수정 불필요.
 */
let cachedBrowserClient: SupabaseClient | null = null;

export function createClient() {
  if (cachedBrowserClient) return cachedBrowserClient;

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

  cachedBrowserClient = createBrowserClient(url, anonKey);
  return cachedBrowserClient;
}
