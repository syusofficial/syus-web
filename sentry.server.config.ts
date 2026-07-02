// Sentry 서버(Node.js 런타임) 초기화 — src/instrumentation.ts 의 register() 에서 로드된다.
// DSN 은 공개값이지만 환경변수(NEXT_PUBLIC_SENTRY_DSN)로 주입해 관리한다.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 성능 추적 표본 비율(1 = 100%). 트래픽이 늘면 0.1 등으로 낮춘다.
  tracesSampleRate: 1,
  // 프로덕션 콘솔에 Sentry 내부 디버그 로그를 남기지 않는다.
  debug: false,
});
