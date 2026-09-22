import { ImageResponse } from "next/og";

// Next.js가 자동으로 <link rel="icon">을 생성
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/* 무대올림 파비콘 — A안 「무」 (2026-09-22 사장님 선택)
 *
 * 한글 「무」를 무대 단면으로 읽는다.
 *   ㅁ        = 무대 뒤 대도구 (Silhouette)
 *   ㅜ 가로획 = 무대 단차      (Teal)
 *   ㅜ 세로획 = 무대 앞면      (Silhouette)
 *
 * ── 왜 이전 「막」 커튼 마크를 버렸나 ──
 * 그라데이션 7개·주름 선 18개로 그려서 128px에서는 근사했지만
 * 실제 탭 크기(16·32px)에서는 세로줄 몇 개로 뭉개져 커튼인지 알 수 없었다.
 * 게다가 Divine Damson 계열이 아이콘을 가득 채워, 3%만 쓰기로 한
 * 컬러 비율 규칙(config/brand-config.md §4)과도 어긋났다.
 *
 * 파비콘은 작게 보이는 것이 기본값이다. 도형은 3개를 넘기지 않는다.
 */
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
        <svg
          width="64"
          height="64"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ㅁ — 무대 뒤 대도구 */}
          <rect
            x="30"
            y="15"
            width="40"
            height="35"
            fill="none"
            stroke="#4A3B33"
            strokeWidth="11"
          />
          {/* ㅜ 가로획 — 무대 단차 */}
          <line
            x1="18"
            y1="67"
            x2="82"
            y2="67"
            stroke="#2C7384"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* ㅜ 세로획 — 무대 앞면 */}
          <line
            x1="50"
            y1="67"
            x2="50"
            y2="87"
            stroke="#4A3B33"
            strokeWidth="11"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
