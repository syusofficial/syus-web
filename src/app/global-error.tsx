"use client";

// 전역 최후 폴백 — root layout(html/body)까지 깨졌을 때만 발동.
// global-error는 자체 <html><body>를 렌더해야 한다(레이아웃을 대체하므로).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          backgroundColor: "#F0EEE9",
          color: "#4A3B33",
          fontFamily: "sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <p
            style={{
              fontSize: "0.8rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#0B5563",
              marginBottom: 16,
            }}
          >
            무대올림
          </p>
          <h1 style={{ fontSize: "1.3rem", marginBottom: 12 }}>
            잠시 화면을 불러오지 못했습니다
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.7,
              marginBottom: 24,
              opacity: 0.8,
            }}
          >
            새로고침하면 대개 해결됩니다. 계속될 경우 문의로 알려주세요.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 22px",
              backgroundColor: "#0B5563",
              color: "#F0EEE9",
              border: 0,
              cursor: "pointer",
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
