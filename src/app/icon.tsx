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
          background: "#F0EEE9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 무대올림 마크 — 양옆 막(Damson) + 무대 바닥(Teal) + 스포트라이트 */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="iconStage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0B5563" />
              <stop offset="1" stopColor="#073f49" />
            </linearGradient>
            <linearGradient id="iconCurtainL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3d1a2c" />
              <stop offset="0.5" stopColor="#5C2A42" />
              <stop offset="1" stopColor="#7a3a55" />
            </linearGradient>
            <linearGradient id="iconCurtainR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7a3a55" />
              <stop offset="0.5" stopColor="#5C2A42" />
              <stop offset="1" stopColor="#3d1a2c" />
            </linearGradient>
            <radialGradient id="iconLight" cx="0.5" cy="0" r="0.6">
              <stop offset="0" stopColor="#FFF8E7" stopOpacity="0.65" />
              <stop offset="1" stopColor="#FFF8E7" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* 스포트라이트 콘 */}
          <path d="M 50 5 L 28 70 L 72 70 Z" fill="url(#iconLight)" />
          {/* 무대 바닥 (사다리꼴 — 원근감) */}
          <path d="M 22 70 L 78 70 L 88 88 L 12 88 Z" fill="url(#iconStage)" />
          <path d="M 22 70 L 78 70 L 76 72 L 24 72 Z" fill="#F0EEE9" opacity="0.25" />
          {/* 왼쪽 막 */}
          <path d="M 5 8 L 32 8 L 30 50 Q 28 62 22 68 L 5 68 Z" fill="url(#iconCurtainL)" />
          {/* 오른쪽 막 */}
          <path d="M 68 8 L 95 8 L 95 68 L 78 68 Q 72 62 70 50 Z" fill="url(#iconCurtainR)" />
          {/* 막 주름 (펄럭임 표현) */}
          <line x1="12" y1="10" x2="11" y2="62" stroke="#3d1a2c" strokeWidth="0.6" opacity="0.5" />
          <line x1="20" y1="10" x2="18" y2="60" stroke="#3d1a2c" strokeWidth="0.6" opacity="0.5" />
          <line x1="26" y1="10" x2="25" y2="55" stroke="#3d1a2c" strokeWidth="0.6" opacity="0.5" />
          <line x1="88" y1="10" x2="89" y2="62" stroke="#3d1a2c" strokeWidth="0.6" opacity="0.5" />
          <line x1="80" y1="10" x2="82" y2="60" stroke="#3d1a2c" strokeWidth="0.6" opacity="0.5" />
          <line x1="74" y1="10" x2="75" y2="55" stroke="#3d1a2c" strokeWidth="0.6" opacity="0.5" />
          {/* 중앙 빛 */}
          <circle cx="50" cy="56" r="2.2" fill="#F0EEE9" />
          <circle cx="50" cy="56" r="4" fill="#F0EEE9" opacity="0.3" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
