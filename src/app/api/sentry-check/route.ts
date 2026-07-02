// Sentry 연결 확인용 임시 라우트.
// 브라우저에서  /api/sentry-check  에 접속 → Sentry Issues 에 이 에러가 뜨면 정상 연결.
// 확인이 끝나면 이 파일을 삭제하세요.
export const dynamic = "force-dynamic";

export function GET() {
  throw new Error("Sentry 연결 테스트 — 이 에러가 Sentry 대시보드에 보이면 정상입니다.");
}
