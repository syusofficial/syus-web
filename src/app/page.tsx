import Link from "next/link";
import Image from "next/image";

/**
 * 게이트웨이 (루트 /) — 3층 구조. (2026-06-30 3차: 색 반전 + 워터마크 + 문구 정리)
 * 사장님 지시(2026-06-30):
 *   - 무대올림 = 청(Teal)+버건디(Damson) 톤, 뒷배경에 사유유사 심볼 워터마크
 *   - 시우스   = 밝은 화이트톤 + SYUS 붓터치색 유지, 뒷배경에 Afterimage 사진 워터마크
 *   - 지붕 배지 밑 흰색 슬로건이 안 보이던 문제 → 슬로건 제거(배지에 로고+이름만)
 *   - "관람료 없이" 등 관객 대상 단언 문구 제외(학과가 관람료를 받을 여지)
 * 워터마크: /wm-muol.png, /wm-syus.png (사장님이 public에 넣으면 자동 노출, 없으면 조용히 미표시).
 *
 * 안전: 서버 컴포넌트 + CSS group-hover만(클라이언트 JS 0), 레이어 pointer-events:none. reduced-motion 존중.
 * metadata는 루트 layout.tsx(사유유사)가 제공.
 */
export default function GatewayPage() {
  return (
    <div className="syus-gateway">
      {/* 지붕 — 사유유사 (두 문을 덮는 배지). pointer-events-none로 클릭 통과 */}
      <div className="gw-roof">
        <div className="gw-roof-badge">
          <Image
            src="/sayuyusa-logo.png"
            alt="사유유사 SYUS"
            width={104}
            height={42}
            className="gw-roof-logo"
            priority
          />
          <span className="gw-roof-name">사유유사 SYUS</span>
        </div>
      </div>

      {/* ── 왼쪽: 무대올림 (5, 청+버건디) ── */}
      <Link href="/muol" className="gw-door gw-door--muol group" aria-label="무대올림으로 들어가기">
        <span className="gw-layer gw-muol-watermark" aria-hidden="true" />
        <span className="gw-layer gw-muol-l1" aria-hidden="true" />
        <span className="gw-layer gw-muol-l2" aria-hidden="true" />
        <span className="gw-layer gw-muol-l3" aria-hidden="true" />
        <span className="gw-overlay gw-overlay--muol" aria-hidden="true" />
        <div className="gw-door-inner">
          <p className="gw-label gw-label--muol">STAGE · 무대올림</p>
          <h2 className="gw-headline gw-headline--muol">
            넓게 <span className="gw-dash">—</span> 둘러보다
          </h2>
          <p className="gw-desc gw-desc--muol">
            대학 무대예술의 오늘을 한데 모아,
            <br />
            가까운 무대와 관객을 잇습니다.
          </p>
          <span className="gw-cta gw-cta--muol">
            무대올림 들어가기
            <span className="gw-arrow">→</span>
          </span>
        </div>
      </Link>

      {/* ── 오른쪽: 시우스 (5, 화이트톤) ── */}
      <Link href="/syus" className="gw-door gw-door--syus group" aria-label="시우스로 들어가기">
        <span className="gw-layer gw-syus-watermark" aria-hidden="true" />
        <span className="gw-layer gw-syus-glow" aria-hidden="true" />
        <span className="gw-strokes" aria-hidden="true">
          <span style={{ background: "#3B82C4" }} />
          <span style={{ background: "#5AA86B" }} />
          <span style={{ background: "#D54545" }} />
          <span style={{ background: "#E0A93B" }} />
        </span>
        <span className="gw-overlay gw-overlay--syus" aria-hidden="true" />
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
          display: flex;
          flex-direction: column;
        }

        /* ── 지붕(사유유사) ── */
        .gw-roof {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 20;
          display: flex;
          justify-content: center;
          padding-top: clamp(18px, 3.5vh, 40px);
          pointer-events: none;
        }
        .gw-roof-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 22px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(74, 59, 51, 0.12);
          border-radius: 100px;
          box-shadow: 0 6px 22px rgba(36, 28, 24, 0.16);
          backdrop-filter: blur(3px);
        }
        .gw-roof-logo { height: 38px; width: auto; display: block; }
        .gw-roof-name {
          font-family: var(--font-noto-serif-kr);
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #4A3B33;
          white-space: nowrap;
        }

        /* ── 문(패널) 공통 ── */
        .gw-door {
          position: relative;
          display: flex;
          align-items: center;
          overflow: hidden;
          text-decoration: none;
          padding: clamp(36px, 6vw, 88px);
          isolation: isolate;
        }
        .gw-door-inner {
          position: relative;
          z-index: 5;
          max-width: 30rem;
          margin-top: 7vh;
        }
        .gw-layer, .gw-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .gw-layer { z-index: 1; }
        .gw-overlay { z-index: 4; opacity: 0; transition: opacity 0.4s ease; }

        /* ── 무대올림 — 청+버건디, 워터마크 ── */
        .gw-door--muol {
          background: linear-gradient(150deg, #0B5563 0%, #34324C 52%, #5C2A42 100%);
          min-height: 50svh;
        }
        .gw-muol-watermark {
          background: url('/wm-muol.png') no-repeat center 46%;
          background-size: min(62%, 420px) auto;
          opacity: 0.09;
          filter: brightness(0) invert(1); /* 심볼을 밝은 선으로 반전 → 진한 배경 위 은은 */
          transition: opacity 0.5s ease;
        }
        .gw-muol-l1 { background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 46%, rgba(255,255,255,0.04) 100%); }
        .gw-muol-l2 { background: repeating-linear-gradient(90deg, transparent 0 38px, rgba(0,0,0,0.06) 38px 40px); }
        .gw-muol-l3 { background: linear-gradient(180deg, transparent 58%, rgba(0,0,0,0.18) 100%); }
        .gw-overlay--muol { background: radial-gradient(ellipse at 32% 42%, rgba(255,255,255,0.10), transparent 66%); }
        .gw-door--muol:hover .gw-overlay--muol,
        .gw-door--muol:focus-visible .gw-overlay--muol { opacity: 1; }
        .gw-door--muol:hover .gw-muol-watermark,
        .gw-door--muol:focus-visible .gw-muol-watermark { opacity: 0.14; }

        /* ── 시우스 — 화이트톤 + SYUS색, 워터마크 ── */
        .gw-door--syus {
          background-color: #F4F2ED;
          min-height: 50svh;
          border-top: 1px solid #E0DBD0;
        }
        .gw-syus-watermark {
          background: url('/wm-syus.png') no-repeat center center;
          background-size: cover;
          opacity: 0.12;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .gw-syus-glow { background: radial-gradient(ellipse at 64% 42%, rgba(59,130,196,0.10), transparent 62%); }
        .gw-overlay--syus { background: radial-gradient(ellipse at 64% 50%, rgba(90,168,107,0.10), transparent 66%); }
        .gw-door--syus:hover .gw-overlay--syus,
        .gw-door--syus:focus-visible .gw-overlay--syus { opacity: 1; }
        .gw-door--syus:hover .gw-syus-watermark,
        .gw-door--syus:focus-visible .gw-syus-watermark { opacity: 0.18; transform: scale(1.03); }

        @media (min-width: 1024px) {
          .syus-gateway { flex-direction: row; }
          .gw-door { min-height: 100svh; }
          .gw-door--muol { flex: 1; }              /* 5 : 5 대칭 */
          .gw-door--syus { flex: 1; border-top: 0; border-left: 1px solid #E0DBD0; }
          .gw-door-inner { margin-left: auto; margin-right: auto; }
        }

        /* ── 라벨/헤드라인/설명/CTA ── */
        .gw-label {
          font-family: var(--font-inter);
          font-size: 0.72rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 18px;
        }
        .gw-label--muol { color: #9AD3DE; }   /* 밝은 teal (진한 배경 위) */
        .gw-label--syus { color: #0B5563; }   /* SYUS 블루 (화이트 위) */

        .gw-headline {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(2.1rem, 4.6vw, 3.4rem);
          line-height: 1.12;
          font-weight: 700;
          letter-spacing: -0.02em;
          word-break: keep-all;
          margin-bottom: 22px;
        }
        .gw-headline--muol { color: #F0EEE9; }
        .gw-headline--syus { color: #241C18; }
        .gw-dash { opacity: 0.5; font-weight: 400; }

        .gw-desc {
          font-family: var(--font-noto-sans-kr);
          font-size: clamp(0.95rem, 1.4vw, 1.1rem);
          line-height: 1.7;
          font-weight: 300;
          word-break: keep-all;
          margin-bottom: 34px;
        }
        .gw-desc--muol { color: rgba(240,238,233,0.82); }
        .gw-desc--syus { color: #4A3B33; }

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
        .gw-cta--muol { color: #F0EEE9; }
        .gw-cta--syus { color: #5C2A42; }
        .gw-arrow { display: inline-block; transition: transform 0.25s ease; }
        .gw-door:hover .gw-arrow,
        .gw-door:focus-visible .gw-arrow { transform: translateX(5px); }

        /* SYUS 붓터치 4색 결 (화이트 위) */
        .gw-strokes {
          position: absolute;
          right: clamp(24px, 5vw, 72px);
          top: 0; bottom: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
          opacity: 0.7;
          pointer-events: none;
        }
        .gw-strokes > span {
          display: block;
          width: 3px;
          height: clamp(40px, 9vw, 88px);
          border-radius: 2px;
          transition: opacity 0.4s ease;
        }
        .gw-door--syus:hover .gw-strokes { opacity: 1; }
        @media (max-width: 1023px) {
          .gw-strokes { right: 20px; gap: 9px; }
          .gw-strokes > span { height: 34px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gw-overlay, .gw-arrow, .gw-strokes > span, .gw-syus-watermark, .gw-muol-watermark { transition: none; }
        }
      `}</style>
    </div>
  );
}
