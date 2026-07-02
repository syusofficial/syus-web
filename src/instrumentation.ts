// Next.js 계측 진입점.
// 런타임(node/edge)에 맞는 Sentry 설정을 로드하고, 서버에서 난 에러를 Sentry로 보낸다.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// App Router 서버 컴포넌트·라우트 핸들러에서 발생한 에러를 Sentry로 전송한다.
export const onRequestError = Sentry.captureRequestError;
