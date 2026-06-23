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
        {/* 무대올림 마크 — 닫힌 막 + 위에서 떨어지는 빛 + 무대 바닥 빛 반사 */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 무대 바닥 */}
            <linearGradient id="ic2Stage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0B5563" />
              <stop offset="1" stopColor="#073f49" />
            </linearGradient>

            {/* 막 가로 그라데이션 (입체) */}
            <linearGradient id="ic2CurtainL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2a0e1c" />
              <stop offset="0.4" stopColor="#5C2A42" />
              <stop offset="0.8" stopColor="#8a4a65" />
              <stop offset="1" stopColor="#5C2A42" />
            </linearGradient>
            <linearGradient id="ic2CurtainR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#5C2A42" />
              <stop offset="0.2" stopColor="#8a4a65" />
              <stop offset="0.6" stopColor="#5C2A42" />
              <stop offset="1" stopColor="#2a0e1c" />
            </linearGradient>

            {/* 막 세로 라이팅 (위 빛 → 아래 어둠) */}
            <linearGradient id="ic2VLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF8E7" stopOpacity="0.55" />
              <stop offset="0.25" stopColor="#FFF8E7" stopOpacity="0.18" />
              <stop offset="0.55" stopColor="#FFF8E7" stopOpacity="0" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
            </linearGradient>

            {/* 가운데 슬릿 빛 */}
            <linearGradient id="ic2Slit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="0.3" stopColor="#FFF8E7" stopOpacity="0.75" />
              <stop offset="0.7" stopColor="#FFF8E7" stopOpacity="0.35" />
              <stop offset="1" stopColor="#FFF8E7" stopOpacity="0.05" />
            </linearGradient>

            {/* 위에서 떨어지는 스포트라이트 콘 */}
            <radialGradient id="ic2Cone" cx="0.5" cy="0" r="0.8">
              <stop offset="0" stopColor="#FFF8E7" stopOpacity="0.65" />
              <stop offset="0.4" stopColor="#FFF8E7" stopOpacity="0.28" />
              <stop offset="1" stopColor="#FFF8E7" stopOpacity="0" />
            </radialGradient>

            {/* 커튼 봉 아래 그림자 */}
            <linearGradient id="ic2RailShadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#000000" stopOpacity="0.45" />
              <stop offset="1" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            {/* 커튼 봉 */}
            <linearGradient id="ic2Rail" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a2235" />
              <stop offset="0.4" stopColor="#2a0e1c" />
              <stop offset="1" stopColor="#1a0612" />
            </linearGradient>
          </defs>

          {/* 위에서 떨어지는 스포트라이트 콘 */}
          <path d="M 50 0 L 25 35 L 75 35 Z" fill="url(#ic2Cone)" />

          {/* 무대 바닥 */}
          <path d="M 6 85 L 94 85 L 96 92 L 4 92 Z" fill="url(#ic2Stage)" />
          <path d="M 6 85 L 94 85 L 93 86 L 7 86 Z" fill="#F0EEE9" opacity="0.3" />
          {/* 무대 바닥 빛 반사 */}
          <ellipse cx="50" cy="88" rx="12" ry="1.5" fill="#FFF8E7" opacity="0.25" />

          {/* 왼쪽 막 */}
          <path d="M 4 11 L 49.2 11 L 49.5 80 Q 47 82 41 84 L 4 84 Z" fill="url(#ic2CurtainL)" />
          <path d="M 4 11 L 49.2 11 L 49.5 80 Q 47 82 41 84 L 4 84 Z" fill="url(#ic2VLight)" />

          {/* 오른쪽 막 */}
          <path d="M 50.8 11 L 96 11 L 96 84 L 59 84 Q 53 82 50.5 80 Z" fill="url(#ic2CurtainR)" />
          <path d="M 50.8 11 L 96 11 L 96 84 L 59 84 Q 53 82 50.5 80 Z" fill="url(#ic2VLight)" />

          {/* 막 주름 — 음영 */}
          <path d="M 11 13 Q 9 45 13 82" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 19 13 Q 17 45 20 80" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 27 13 Q 25 45 28 78" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 35 13 Q 34 45 37 77" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 43 13 Q 43 45 46 77" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 56 13 Q 56 45 53 77" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 64 13 Q 66 45 63 77" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 72 13 Q 74 45 71 78" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 80 13 Q 82 45 79 80" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />
          <path d="M 88 13 Q 90 45 86 82" stroke="#1a0612" strokeWidth="0.75" fill="none" opacity="0.7" />

          {/* 막 주름 — 하이라이트 */}
          <path d="M 15 13 Q 13 45 16 81" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />
          <path d="M 23 13 Q 21 45 24 79" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />
          <path d="M 31 13 Q 29 45 32 77" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />
          <path d="M 39 13 Q 38 45 41 76" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />
          <path d="M 60 13 Q 60 45 57 76" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />
          <path d="M 68 13 Q 70 45 67 77" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />
          <path d="M 76 13 Q 78 45 75 79" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />
          <path d="M 84 13 Q 86 45 82 81" stroke="#c98aa3" strokeWidth="0.4" fill="none" opacity="0.55" />

          {/* 가운데 막 사이 새어나오는 빛 */}
          <rect x="48.8" y="11" width="2.4" height="71" fill="url(#ic2Slit)" />
          <ellipse cx="50" cy="14" rx="3" ry="3.5" fill="#FFFFFF" opacity="0.65" />
          <ellipse cx="50" cy="14" rx="6" ry="6" fill="#FFF8E7" opacity="0.25" />

          {/* 커튼 봉 */}
          <rect x="3" y="8" width="94" height="3.5" fill="url(#ic2Rail)" />
          <rect x="3" y="8" width="94" height="0.6" fill="#7a3a55" opacity="0.7" />
          <rect x="4" y="11.5" width="92" height="3.5" fill="url(#ic2RailShadow)" />

          {/* 막 아래 끝 어둠 */}
          <path d="M 4 75 L 49.2 75 L 49.5 80 Q 47 82 41 84 L 4 84 Z" fill="#000000" opacity="0.18" />
          <path d="M 50.8 75 L 96 75 L 96 84 L 59 84 Q 53 82 50.5 80 Z" fill="#000000" opacity="0.18" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
