import Link from "next/link";

/**
 * 게이트웨이 (루트 /) — 2026-06-30 3층 구조 재편.
 * 사유유사 SYUS의 두 문이 동시에 보이는 갈림길.
 *   - 왼쪽: 무대올림 (넓게·밝게 / Cloud Dancer·Teal) — 면적으로 압도, 자동적으로 흘러듦
 *   - 오른쪽: 시우스 (좁고 깊게·어둡게 / Silhouette + SYUS 붓터치색) — 강도로 끌어당김
 *   - 상단 중앙: 사유유사 로고(두 문을 덮는 지붕/우산) — 뼈대 단계는 텍스트 placeholder
 * 50:50 금지(비대칭 1.45:1). 모바일은 세로 스택(무대올림 위·크게, 시우스 아래·작게).
 *
 * 안전 설계(과거 버그 회피):
 *   - 서버 컴포넌트 + CSS group-hover만 사용(클라이언트 JS·전역 상태 0).
 *   - 로고 오버레이는 pointer-events-none(클릭이 패널로 통과 — 전역 클릭 마비 패턴 차단).
 *   - hover는 transform·opacity만(transition-all 금지), prefers-reduced-motion 존중.
 * metadata는 루트 layout.tsx(사유유사)가 제공하므로 이 파일엔 두지 않는다.
 */
export default function GatewayPage() {
  return (
    <div className="syus-gateway relative flex flex-col lg:flex-row">
      {/* 상단 중앙 — 사유유사(지붕/우산). pointer-events-none로 클릭은 아래 패널로 통과 */}
      <div className="gw-roof">
        <span className="gw-roof-mark">思惟流沙</span>
        <span className="gw-roof-name">사유유사 SYUS</span>
        <span className="gw-roof-tagline">깊이 머물고, 가볍게 흘려보냅니다</span>
      </div>

      {/* ── 왼쪽: 무대올림 (넓게·밝게) ── */}
      <Link href="/muol" className="gw-door gw-door--muol group" aria-label="무대올림으로 들어가기">
        <span className="gw-overlay gw-overlay--muol" aria-hidden="true" />
        <div className="gw-door-inner">
          <p className="gw-label gw-label--muol">STAGE · 무대올림</p>
          <h2 className="gw-headline gw-headline--muol">
            넓게 <span className="gw-dash">—</span> 둘러보다
          </h2>
          <p className="gw-desc gw-desc--muol">
            대학 무대예술의 오늘을 한데 모아,
            <br />
            관람료 없이 좌석을 잇습니다.
          </p>
          <span className="gw-cta gw-cta--muol">
            무대올림 들어가기
            <span className="gw-arrow">→</span>
          </span>
        </div>
      </Link>

      {/* ── 오른쪽: 시우스 (좁고 깊게·어둡게) ── */}
      <Link href="/syus" className="gw-door gw-door--syus group" aria-label="시우스로 들어가기">
        <span className="gw-overlay gw-overlay--syus" aria-hidden="true" />
        {/* SYUS 붓터치 4색 — 어둠 속 미세한 결 */}
        <span className="gw-strokes" aria-hidden="true">
          <span style={{ background: "#4A98AA" }} />
          <span style={{ background: "#7BA86F" }} />
          <span style={{ background: "#D54545" }} />
          <span style={{ background: "#E0A93B" }} />
        </span>
        <div className="gw-door-inner">
          <p className="gw-label gw-label--syus">SYUS · 시우스</p>
          <h2 className="gw-headline gw-headline--syus">
            깊게 <span className="gw-dash">—</span> 머물다
          </h2>
          <p className="gw-desc gw-desc--syus">
            연기를 기록하고, 고민을 나누고,
            <br />
            무대를 오래 들여다봅니다.
          </p>
          <span className="gw-cta gw-cta--syus">
            시우스 들어가기
            <span className="gw-arrow">→</span>
          </span>
        </div>
      </Link>

      <style>{`
        .syus-gateway {
          min-height: 100svh;
          width: 100%;
        }
        /* ── 지붕(사유유사) ── */
        .gw-roof {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding-top: clamp(20px, 4vh, 44px);
          pointer-events: none; /* 클릭이 아래 패널로 통과 — 전역 클릭 마비 방지 */
          text-align: center;
          mix-blend-mode: difference; /* 밝은쪽/어두운쪽 경계 위에서 모두 읽히도록 */
          color: #F0EEE9;
        }
        .gw-roof-mark {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(1.1rem, 2.4vw, 1.6rem);
          letter-spacing: 0.3em;
          font-weight: 500;
        }
        .gw-roof-name {
          font-family: var(--font-inter);
          font-size: 0.7rem;
          letter-spacing: 0.42em;
          font-weight: 600;
          text-transform: uppercase;
        }
        .gw-roof-tagline {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          opacity: 0.85;
        }

        /* ── 문(패널) 공통 ── */
        .gw-door {
          position: relative;
          display: flex;
          align-items: center;
          overflow: hidden;
          text-decoration: none;
          padding: clamp(40px, 7vw, 96px);
          isolation: isolate;
        }
        .gw-door-inner {
          position: relative;
          z-index: 2;
          max-width: 30rem;
          margin-top: 6vh; /* 지붕과 겹치지 않게 */
        }
        .gw-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        /* 무대올림 — 밝게, 넓게(1.45) */
        .gw-door--muol {
          background-color: #F0EEE9;
          min-height: 56svh;
        }
        .gw-overlay--muol { background: radial-gradient(ellipse at 30% 40%, rgba(11,85,99,0.10), transparent 70%); }
        .gw-door--muol:hover .gw-overlay--muol,
        .gw-door--muol:focus-visible .gw-overlay--muol { opacity: 1; }

        /* 시우스 — 어둡게, 좁게(1) */
        .gw-door--syus {
          background-color: #241C18;
          min-height: 44svh;
          border-top: 1px solid #3C2F28;
        }
        .gw-overlay--syus { background: radial-gradient(ellipse at 70% 50%, rgba(74,152,170,0.16), transparent 70%); }
        .gw-door--syus:hover .gw-overlay--syus,
        .gw-door--syus:focus-visible .gw-overlay--syus { opacity: 1; }

        @media (min-width: 1024px) {
          .gw-door { min-height: 100svh; }
          .gw-door--muol { flex: 1.45; }
          .gw-door--syus { flex: 1; border-top: 0; border-left: 1px solid #3C2F28; }
          .gw-door-inner { margin-left: auto; margin-right: auto; }
        }

        /* ── 라벨 / 헤드라인 / 설명 / CTA ── */
        .gw-label {
          font-family: var(--font-inter);
          font-size: 0.72rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 18px;
        }
        .gw-label--muol { color: #0B5563; }
        .gw-label--syus { color: #6BB0C0; }

        .gw-headline {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(2.2rem, 5vw, 3.6rem);
          line-height: 1.12;
          font-weight: 700;
          letter-spacing: -0.02em;
          word-break: keep-all;
          margin-bottom: 22px;
        }
        .gw-headline--muol { color: #0B5563; }
        .gw-headline--syus { color: #F0EEE9; }
        .gw-dash { opacity: 0.5; font-weight: 400; }

        .gw-desc {
          font-family: var(--font-noto-sans-kr);
          font-size: clamp(0.95rem, 1.4vw, 1.1rem);
          line-height: 1.7;
          font-weight: 300;
          word-break: keep-all;
          margin-bottom: 34px;
        }
        .gw-desc--muol { color: #4A3B33; }
        .gw-desc--syus { color: rgba(240,238,233,0.72); }

        .gw-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding-bottom: 4px;
          border-bottom: 1px solid currentColor;
        }
        .gw-cta--muol { color: #5C2A42; }
        .gw-cta--syus { color: #F0EEE9; }
        .gw-arrow {
          display: inline-block;
          transition: transform 0.25s ease;
        }
        .gw-door:hover .gw-arrow,
        .gw-door:focus-visible .gw-arrow { transform: translateX(5px); }

        /* SYUS 붓터치 4색 결 */
        .gw-strokes {
          position: absolute;
          right: clamp(24px, 5vw, 72px);
          top: 0; bottom: 0;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
          opacity: 0.55;
          pointer-events: none;
        }
        .gw-strokes > span {
          display: block;
          width: 3px;
          height: clamp(40px, 9vw, 88px);
          border-radius: 2px;
          transition: opacity 0.4s ease;
        }
        .gw-door--syus:hover .gw-strokes { opacity: 0.9; }
        @media (max-width: 1023px) {
          .gw-strokes { right: 20px; gap: 9px; }
          .gw-strokes > span { height: 34px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gw-overlay, .gw-arrow, .gw-strokes > span { transition: none; }
        }
      `}</style>
    </div>
  );
}
