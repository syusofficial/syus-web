"use client";

import { useEffect, useState } from "react";

type Phase = 0 | 1 | 2 | 3;

function useLoadingPhase() {
  const [phase, setPhase] = useState<Phase>(0);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);   // 가로선 등장
    const t2 = setTimeout(() => setPhase(2), 850);   // 세로선 등장
    const t3 = setTimeout(() => setPhase(3), 1500);  // 구체 등장
    const t4 = setTimeout(() => setFading(true), 2200); // 페이드아웃 시작
    const t5 = setTimeout(() => setDone(true), 2800);   // DOM에서 제거
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  return { phase, fading, done };
}

/* 선 공통 스타일 — stroke-dashoffset 트랜지션으로 선이 그려짐 */
function lineProps(visible: boolean, delay = 0, duration = 550): React.SVGProps<SVGLineElement> {
  return {
    strokeDasharray: 1100,
    strokeDashoffset: visible ? 0 : 1100,
    style: {
      transition: visible
        ? `stroke-dashoffset ${duration}ms cubic-bezier(0.4,0,0.2,1) ${delay}ms`
        : "none",
    },
  };
}

/* 구체 공통 스타일 — scale + opacity로 등장 */
function circleStyle(visible: boolean, delay = 0): React.CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.2)",
    transition: visible
      ? `opacity 0.45s ease ${delay}ms, transform 0.45s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`
      : "none",
  };
}

export default function LoadingScreen() {
  const { phase, fading, done } = useLoadingPhase();

  if (done) return null;

  const C = "#6D3115"; // 브랜드 브라운

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#F4EDE3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.6s ease" : undefined,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* 로고 SVG — Nav.tsx SyusLogoSvg와 동일한 좌표 */}
      <svg width="260" height="104" viewBox="0 0 1000 400" fill="none">

        {/* ── Phase 1: 가로선 + 대시 ───────────────── */}
        <line x1="0" y1="120" x2="1000" y2="120" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 1, 0, 600)} />
        <line x1="0" y1="380" x2="1000" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 1, 80, 600)} />
        <line x1="305" y1="252" x2="358" y2="252" stroke={C} strokeWidth="2.5"
          {...lineProps(phase >= 1, 350, 300)} />
        <line x1="642" y1="252" x2="695" y2="252" stroke={C} strokeWidth="2.5"
          {...lineProps(phase >= 1, 350, 300)} />

        {/* ── Phase 2: 삼각형 + 세로 기둥 6개 ────────── */}
        {/* 좌 삼각형 */}
        <line x1="55"  y1="380" x2="165" y2="120" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 0, 500)} />
        <line x1="165" y1="120" x2="275" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 60, 500)} />
        {/* 좌 외부 기둥 */}
        <line x1="305" y1="120" x2="305" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 120, 400)} />
        {/* 좌 인물 기둥 */}
        <line x1="390" y1="120" x2="390" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 170, 400)} />
        {/* 좌 내부 기둥 */}
        <line x1="465" y1="120" x2="465" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 210, 400)} />
        {/* 우 내부 기둥 */}
        <line x1="535" y1="120" x2="535" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 210, 400)} />
        {/* 우 인물 기둥 */}
        <line x1="610" y1="120" x2="610" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 170, 400)} />
        {/* 우 외부 기둥 */}
        <line x1="695" y1="120" x2="695" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 120, 400)} />
        {/* 우 삼각형 */}
        <line x1="725" y1="380" x2="835" y2="120" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 60, 500)} />
        <line x1="835" y1="120" x2="945" y2="380" stroke={C} strokeWidth="4"
          {...lineProps(phase >= 2, 0, 500)} />

        {/* ── Phase 3: 구체 (x=390↔465 / x=535↔610 사이, 하단 y=120 접함) ── */}
        <circle cx="428" cy="72" r="48" stroke={C} strokeWidth="3.5" fill="none"
          style={{ ...circleStyle(phase >= 3, 0), transformOrigin: "428px 72px" }} />
        <circle cx="572" cy="72" r="48" stroke={C} strokeWidth="3.5" fill="none"
          style={{ ...circleStyle(phase >= 3, 100), transformOrigin: "572px 72px" }} />
      </svg>

      {/* 브랜드명 — 구체 등장 후 페이드인 */}
      <p
        style={{
          fontFamily: "var(--font-cormorant)",
          color: C,
          fontSize: "1rem",
          letterSpacing: "0.5em",
          opacity: phase >= 3 ? 1 : 0,
          transition: phase >= 3 ? "opacity 0.6s ease 0.3s" : "none",
        }}
      >
        SYUS
      </p>
    </div>
  );
}
