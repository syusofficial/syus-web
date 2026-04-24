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
        }}
      >
        <div
          style={{
            fontSize: 200,
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
            fontSize: 26,
            color: "#6D3115",
            marginTop: 48,
            letterSpacing: "0.4em",
            opacity: 0.7,
          }}
        >
          SYSTEM OF YOUNG UNBOUND SOCIETY
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#9B9693",
            marginTop: 22,
            letterSpacing: "0.15em",
            fontStyle: "italic",
          }}
        >
          Think deeply. Speak lightly.
        </div>
      </div>
    ),
    { ...size }
  );
}
