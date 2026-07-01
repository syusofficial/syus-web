import { ImageResponse } from "next/og";

// 게이트웨이(루트 /) OG — 사유유사 SYUS의 두 문(무대올림 + 시우스).
export const alt = "사유유사 SYUS — 무대올림과 시우스, 두 개의 문";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        {/* 좌: 무대올림 (넓게·밝게) */}
        <div
          style={{
            width: "58%",
            height: "100%",
            background: "#F0EEE9",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "96px 64px",
          }}
        >
          <div style={{ fontSize: 22, color: "#0B5563", letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 600, marginBottom: 22, display: "flex" }}>
            STAGE · 무대올림
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, color: "#0B5563", lineHeight: 1.1, display: "flex" }}>
            넓게 둘러보다
          </div>
          <div style={{ fontSize: 24, color: "#4A3B33", marginTop: 22, display: "flex" }}>
            대학 무대예술의 오늘
          </div>
        </div>

        {/* 우: 시우스 (좁고·어둡게) */}
        <div
          style={{
            width: "42%",
            height: "100%",
            background: "#241C18",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "96px 56px",
          }}
        >
          <div style={{ fontSize: 22, color: "#6BB0C0", letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 600, marginBottom: 22, display: "flex" }}>
            SYUS · 시우스
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, color: "#F0EEE9", lineHeight: 1.1, display: "flex" }}>
            깊게 머물다
          </div>
          <div style={{ fontSize: 24, color: "rgba(240,238,233,0.72)", marginTop: 22, display: "flex" }}>
            연기를 오래 들여다보다
          </div>
        </div>

        {/* 중앙 상단: 사유유사(지붕) — 경계 위 가독성 위해 배지 */}
        <div style={{ position: "absolute", top: 40, width: "100%", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "#4A3B33",
              color: "#F0EEE9",
              padding: "10px 30px",
              borderRadius: 999,
              fontSize: 20,
              letterSpacing: "0.32em",
              fontWeight: 600,
              display: "flex",
            }}
          >
            사유유사 SYUS
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
