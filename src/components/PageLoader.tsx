"use client";

import { SyusLogoSvg } from "./Nav";

export default function PageLoader() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-5 py-24"
      style={{ minHeight: "60vh" }}
    >
      <div style={{ animation: "syus-breath 1.4s ease-in-out infinite" }}>
        <SyusLogoSvg width={180} height={72} />
      </div>
      <p
        style={{
          fontFamily: "var(--font-cormorant)",
          color: "#6D3115",
          fontSize: "0.75rem",
          letterSpacing: "0.4em",
          opacity: 0.6,
        }}
      >
        SYUS
      </p>
      <style>{`
        @keyframes syus-breath {
          0%, 100% { opacity: 0.4; transform: scale(0.98); }
          50%      { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
