import { ImageResponse } from "next/og";

export const alt = "무대올림 · 운영: 사유유사 SYUS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at top left, #2C7384 0%, #0B5563 35%, #4A3B33 100%)",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: "#C99FB1",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 36,
          }}
        >
          무대올림
        </div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: "#F0EEE9",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>오늘, 어느 대학의</span>
          <span>
            <span style={{ color: "#C99FB1" }}>막</span>이 오른다.
          </span>
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#F0EEE9",
            opacity: 0.75,
            marginTop: 56,
            letterSpacing: "0.05em",
            display: "flex",
          }}
        >
          대학 무대예술 공연 · 관람료 없는 좌석 예약
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#F0EEE9",
            opacity: 0.5,
            marginTop: 18,
            letterSpacing: "0.25em",
            display: "flex",
          }}
        >
          운영 · 사유유사 SYUS
        </div>
      </div>
    ),
    { ...size }
  );
}
