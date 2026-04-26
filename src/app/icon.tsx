import { ImageResponse } from "next/og";

// Next.js가 자동으로 <link rel="icon">을 생성
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          background: "#F4EDE3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* SYUS 마크 — 두 구체 + 가로선 (favicon용 단순화 버전) */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 100 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 가로 기준선 (구 하단에 접함) */}
          <line x1="6" y1="55" x2="94" y2="55" stroke="#6D3115" strokeWidth="5" />
          {/* 좌측 구체 */}
          <circle
            cx="35"
            cy="32"
            r="14"
            stroke="#6D3115"
            strokeWidth="4.5"
            fill="none"
          />
          {/* 우측 구체 */}
          <circle
            cx="65"
            cy="32"
            r="14"
            stroke="#6D3115"
            strokeWidth="4.5"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
