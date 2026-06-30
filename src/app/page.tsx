import Link from "next/link";
import Image from "next/image";

/**
 * 게이트웨이 (루트 /) — 2026-06-30 3층 구조. (2026-06-30 2차: 5:5 비율 + 레이어 층 + 로고 적용)
 * 사유유사 SYUS의 두 문이 동시에 보이는 갈림길.
 *   - 왼쪽: 무대올림 (밝게 / Cloud Dancer·Teal) — 무대 막·조명 레이어
 *   - 오른쪽: 시우스 (어둡게 / Silhouette + SYUS) — SYUS 워드마크 잔상 레이어
 *   - 상단 중앙: 사유유사 로고 배지(두 문을 덮는 지붕)
 * 사장님 지시(2026-06-30): 비율 5:5 대칭, 양측에 레이어 층을 쌓아 깊이.
 *
 * 안전 설계(과거 버그 회피): 서버 컴포넌트 + CSS group-hover만(클라이언트 JS 0).
 *   모든 레이어 pointer-events:none → 클릭은 패널(Link)로 통과. transform·opacity만, reduced-motion 존중.
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
        <span className="gw-roof-tagline">思惟流沙 · 깊이 머물고, 가볍게 흘려보냅니다</span>
      </div>

      {/* ── 왼쪽: 무대올림 (5, 밝게) ── */}
      <Link href="/muol" className="gw-door gw-door--muol group" aria-label="무대올림으로 들어가기">
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
            관람료 없이 좌석을 잇습니다.
          </p>
          <span className="gw-cta gw-cta--muol">
            무대올림 들어가기
            <span className="gw-arrow">→</span>
          </span>
        </div>
      </Link>

      {/* ── 오른쪽: 시우스 (5, 어둡게) ── */}
      <Link href="/syus" className="gw-door gw-door--syus group" aria-label="시우스로 들어가기">
        <span className="gw-layer gw-syus-mark" aria-hidden="true" />
        <span className="gw-layer gw-syus-glow" aria-hidden="true" />
        <span className="gw-strokes" aria-hidden="true">
          <span style={{ background: "#4A98AA" }} />
          <span style={{ background: "#7BA86F" }} />
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
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding-top: clamp(18px, 3.5vh, 40px);
          pointer-events: none;
          text-align: center;
        }
        .gw-roof-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 22px;
          background: rgba(240, 238, 233, 0.92);
          border-radius: 100px;
          box-shadow: 0 6px 20px rgba(36, 28, 24, 0.14);
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
        .gw-roof-tagline {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          color: rgba(240, 238, 233, 0.92);
          text-shadow: 0 1px 6px rgba(36, 28, 24, 0.55);
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

        /* 무대올림 — 밝게, 레이어(조명·막주름·바닥) */
        .gw-door--muol {
          background-color: #F0EEE9;
          min-height: 50svh;
        }
        .gw-muol-l1 { background: linear-gradient(135deg, rgba(11,85,99,0.10) 0%, transparent 46%, rgba(44,115,132,0.07) 100%); }
        .gw-muol-l2 { background: repeating-linear-gradient(90deg, transparent 0 38px, rgba(74,59,51,0.035) 38px 40px); }
        .gw-muol-l3 { background: linear-gradient(180deg, transparent 58%, rgba(74,59,51,0.12) 100%); }
        .gw-overlay--muol { background: radial-gradient(ellipse at 32% 42%, rgba(11,85,99,0.12), transparent 68%); }
        .gw-door--muol:hover .gw-overlay--muol,
        .gw-door--muol:focus-visible .gw-overlay--muol { opacity: 1; }

        /* 시우스 — 어둡게, 레이어(SYUS 잔상·빛·붓터치) */
        .gw-door--syus {
          background-color: #241C18;
          min-height: 50svh;
          border-top: 1px solid #3C2F28;
        }
        .gw-syus-mark {
          background: url('/syus-wordmark.png') no-repeat center 42%;
          background-size: 132% auto;
          opacity: 0.10;
          filter: blur(1.5px);
          transition: opacity 0.5s ease, transform 0.5s ease;
          transform: scale(1);
        }
        .gw-syus-glow { background: radial-gradient(ellipse at 64% 44%, rgba(74,152,170,0.18), transparent 62%); }
        .gw-overlay--syus { background: radial-gradient(ellipse at 64% 50%, rgba(123,168,111,0.12), transparent 66%); }
        .gw-door--syus:hover .gw-overlay--syus,
        .gw-door--syus:focus-visible .gw-overlay--syus { opacity: 1; }
        .gw-door--syus:hover .gw-syus-mark,
        .gw-door--syus:focus-visible .gw-syus-mark { opacity: 0.17; transform: scale(1.03); }

        @media (min-width: 1024px) {
          .syus-gateway { flex-direction: row; }
          .gw-door { min-height: 100svh; }
          .gw-door--muol { flex: 1; }              /* 5 : 5 대칭 */
          .gw-door--syus { flex: 1; border-top: 0; border-left: 1px solid #3C2F28; }
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
        .gw-label--muol { color: #0B5563; }
        .gw-label--syus { color: #6BB0C0; }

        .gw-headline {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(2.1rem, 4.6vw, 3.4rem);
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
        .gw-arrow { display: inline-block; transition: transform 0.25s ease; }
        .gw-door:hover .gw-arrow,
        .gw-door:focus-visible .gw-arrow { transform: translateX(5px); }

        /* SYUS 붓터치 4색 결 */
        .gw-strokes {
          position: absolute;
          right: clamp(24px, 5vw, 72px);
          top: 0; bottom: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
          opacity: 0.5;
          pointer-events: none;
        }
        .gw-strokes > span {
          display: block;
          width: 3px;
          height: clamp(40px, 9vw, 88px);
          border-radius: 2px;
          transition: opacity 0.4s ease;
        }
        .gw-door--syus:hover .gw-strokes { opacity: 0.85; }
        @media (max-width: 1023px) {
          .gw-strokes { right: 20px; gap: 9px; }
          .gw-strokes > span { height: 34px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gw-overlay, .gw-arrow, .gw-strokes > span, .gw-syus-mark { transition: none; }
        }
      `}</style>
    </div>
  );
}
