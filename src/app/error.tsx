"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#F0EEE9", color: "#4A3B33" }}
    >
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <p
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "0.75rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#0B5563",
            marginBottom: 16,
          }}
        >
          Something went wrong
        </p>
        <h1
          style={{
            fontFamily: "var(--font-noto-serif-kr)",
            fontSize: "1.5rem",
            marginBottom: 14,
          }}
        >
          이 페이지를 여는 중 문제가 생겼습니다
        </h1>
        <p
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            fontSize: "0.92rem",
            lineHeight: 1.75,
            opacity: 0.82,
            marginBottom: 28,
          }}
        >
          잠시 후 다시 시도해 주세요. 같은 문제가 반복되면 문의로 알려주시면
          빠르게 살펴보겠습니다.
        </p>
        <div
          style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}
        >
          <button
            onClick={() => reset()}
            style={{
              padding: "13px 22px",
              backgroundColor: "#0B5563",
              color: "#F0EEE9",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-noto-sans-kr)",
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
            }}
          >
            다시 시도
          </button>
          <Link
            href="/"
            style={{
              padding: "13px 22px",
              border: "1px solid #D4CFC1",
              color: "#4A3B33",
              textDecoration: "none",
              fontFamily: "var(--font-noto-sans-kr)",
              fontSize: "0.85rem",
              letterSpacing: "0.1em",
            }}
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
