// Sentry 브라우저(클라이언트) 초기화 — 사용자 화면에서 난 에러를 캡처한다.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  debug: false,
});

// App Router 클라이언트 라우팅 전환을 추적한다.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
