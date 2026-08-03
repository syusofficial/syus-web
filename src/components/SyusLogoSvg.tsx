"use client";

/**
 * 2026-08-03 — Nav.tsx에서 이 파일로 그대로 옮김.
 * Nav.tsx는 3층 구조 이전의 옛 경로(/shows, /about, /faq)가 남은 죽은 코드라 삭제했고,
 * 실제로 쓰이던 건 이 로고 컴포넌트뿐이었다. (사용처: NavMega.tsx, PageLoader.tsx)
 *
 * 로고 구조 (viewBox 0 0 1000 400)
 *
 * 상단선 y=120, 하단선 y=380
 * 좌삼각(峰 165) | 외기둥305 ~대시~ 인물기둥390 | 구체(cx428,cy72,r48) | 내기둥465 · 내기둥535 | 구체(cx572,cy72,r48) | 인물기둥610 ~대시~ 외기둥695 | 우삼각(峰 835)
 * 세로 직각선 6개: 305, 390, 465, 535, 610, 695
 * 구체 2개: cx=428/572, cy=72, r=48 (하단 y=120 상단선에 접함)
 */
export function SyusLogoSvg({
  width = 200,
  height = 80,
  color = "#6D3115",
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  const sw = 4;
  const swd = 2.5;
  const swc = 3.5;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1000 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="0" y1="120" x2="1000" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="0" y1="380" x2="1000" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="55"  y1="380" x2="165" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="165" y1="120" x2="275" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="305" y1="120" x2="305" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="305" y1="252" x2="358" y2="252" stroke={color} strokeWidth={swd} />
      <line x1="390" y1="120" x2="390" y2="380" stroke={color} strokeWidth={sw} />
      <circle cx="428" cy="72" r="48" stroke={color} strokeWidth={swc} fill="none" />
      <line x1="465" y1="120" x2="465" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="535" y1="120" x2="535" y2="380" stroke={color} strokeWidth={sw} />
      <circle cx="572" cy="72" r="48" stroke={color} strokeWidth={swc} fill="none" />
      <line x1="610" y1="120" x2="610" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="642" y1="252" x2="695" y2="252" stroke={color} strokeWidth={swd} />
      <line x1="695" y1="120" x2="695" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="725" y1="380" x2="835" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="835" y1="120" x2="945" y2="380" stroke={color} strokeWidth={sw} />
    </svg>
  );
}
