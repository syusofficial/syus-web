// Sentry 엣지(Edge 런타임: 미들웨어 등) 초기화 — src/instrumentation.ts 에서 로드된다.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  debug: false,
});
