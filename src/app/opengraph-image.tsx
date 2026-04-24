import { ImageResponse } from "next/og";

export const alt = "사유유사 · SYUS";
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
          backgroundColor: "#F4EDE3",
          position: "relative",
        }}
      >
        {/* 상단 가로선 */}
        <div style={{ position: "absolute", top: 230, left: 0, width: "100%", height: 3, backgroundColor: "#6D3115" }} />
        {/* 하단 가로선 */}
        <div style={{ position: "absolute", bottom: 220, left: 0, width: "100%", height: 3, backgroundColor: "#6D3115" }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
          <div
            style={{
              fontSize: 180,
              fontWeight: 900,
              color: "#6D3115",
              letterSpacing: "0.08em",
              lineHeight: 1,
            }}
          >
            SYUS
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#6D3115",
              marginTop: 36,
              letterSpacing: "0.35em",
              opacity: 0.75,
            }}
          >
            SYSTEM OF YOUNG UNBOUND SOCIETY
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#9B9693",
              marginTop: 20,
              letterSpacing: "0.15em",
              fontStyle: "italic",
            }}
          >
            Think deeply. Speak lightly.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
