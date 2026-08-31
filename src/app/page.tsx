import Link from "next/link";
import Image from "next/image";
import LegalStrip from "@/components/LegalStrip";

/**
 * 게이트웨이 (루트 /) — 3층 구조. (2026-06-30 3차: 색 반전 + 워터마크 + 문구 정리)
 * 사장님 지시(2026-06-30):
 *   - 무대올림 = 청(Teal)+버건디(Damson) 톤, 뒷배경에 사유유사 심볼 워터마크
 *   - 시우스   = 밝은 화이트톤 + SYUS 붓터치색 유지, 뒷배경에 Afterimage 사진 워터마크
 *   - 지붕 배지 밑 흰색 슬로건이 안 보이던 문제 → 슬로건 제거(배지에 로고+이름만)
 *   - "관람료 없이" 등 관객 대상 단언 문구 제외(학과가 관람료를 받을 여지)
 * 워터마크: /wm-muol-v3.png(한글 로고타입 + 확정 배색), /wm-syus-v3.png(알파 누끼 — 배경 무관).
 *
 * 안전: 서버 컴포넌트 + CSS group-hover만(클라이언트 JS 0), 레이어 pointer-events:none. reduced-motion 존중.
 * metadata는 루트 layout.tsx(사유유사)가 제공.
 */
export default function GatewayPage() {
  return (
    <>
    <div className="syus-gateway">
      {/* 지붕 — 사유유사 (두 문을 덮는 배지).
          컨테이너(.gw-roof)는 pointer-events:none으로 두 문 클릭을 통과시키고,
          배지에만 auto를 줘서 여기만 눌린다. 범위를 넓히면 두 문이 안 눌리니 건드리지 말 것.
          2026-08-19: 배지가 /company(사유유사 소개·CI)로 들어가는 제3의 문이 됐다. */}
      <div className="gw-roof">
        <Link href="/company" className="gw-roof-badge" aria-label="사유유사 SYUS 소개">
          <Image
            src="/sayuyusa-logo.png"
            alt="사유유사 SYUS"
            width={104}
            height={42}
            className="gw-roof-logo"
            priority
          />
          <span className="gw-roof-name">사유유사 SYUS</span>
        </Link>
      </div>

      {/* ── 왼쪽: 무대올림 (5, 청+버건디) ── */}
      <Link href="/muol" className="gw-door gw-door--muol group" aria-label="무대올림으로 들어가기">
        <span className="gw-layer gw-muol-watermark" aria-hidden="true" />
        <span className="gw-layer gw-muol-l3" aria-hidden="true" />
        <span className="gw-overlay gw-overlay--muol" aria-hidden="true" />
        <div className="gw-door-inner">
          <p className="gw-label gw-label--muol">STAGE · 무대올림</p>
          <h2 className="gw-headline gw-headline--muol">
            넓게 <span className="gw-dash">—</span> 둘러보다
          </h2>
          <p className="gw-desc gw-desc--muol">
            한국 대학 무대예술의 진흥을 향해.
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
          pointer-events: auto;      /* 지붕 컨테이너는 none, 배지만 눌린다 */
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
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
        .gw-roof-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 9px 26px rgba(36, 28, 24, 0.22);
        }
        .gw-roof-badge:focus-visible {
          outline: 2px solid #0B5563;
          outline-offset: 3px;
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
          /* 2026-08-21: 7vh → 23vh. 워터마크(로고)를 중앙에 두고 설명글을 그 아래로
             내린다. 좌우 두 문에 같은 값이 적용되므로 텍스트 높이 정렬은 그대로 유지된다.
             모바일은 문이 각 50svh(합 100svh)로 여유가 0이라 아래 미디어쿼리에서
             7vh로 되돌리고, 대신 워터마크를 작게 줄여 문 위쪽에 올린다. */
          margin-top: 36vh;
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
          /* 2026-08-21: 대각 그라디언트(청→보라) + 세로 줄무늬 조합이 오른쪽 시우스의
             따뜻한 크림과 싸운다는 지적에 따라 사진 배경으로 교체. 빈 극장의 무대 뒤
             윙 — FLUX 생성 후 브랜드 4색 듀오톤(#061317→#2E767C)으로 재도색하고,
             글자가 앉는 하단 절반에 행별 휘도 상한을 걸어 흰 글자 대비를 확보했다.
             배경색은 이미지 로딩 전·실패 시의 바탕. */
          background: #0B1518 url('/muol-bg-backstage.jpg') no-repeat center center;
          background-size: cover;
          min-height: 50svh;
        }
        .gw-muol-watermark {
          /* 2026-08-21 사장님 지시: 로고는 중앙, 설명글이 그 아래.
             28%는 라벨("STAGE · 무대올림")과 완전히 떼어놓기 위해 42%에서 올린 값이다.
             로고 PNG는 위 40%가 빈 천장(잉크 2.8%)이고 네 글자는 아래 60%에 몰려
             있어, 이미지 위치와 글자가 보이는 위치가 다르다는 점에 주의.
             60svh는 화면이 낮을 때만 작동하는 안전장치(1080p·1440p에선 760px 유지). */
          background: url('/wm-muol-v3.png') no-repeat center 28%;
          background-size: min(88%, 760px, 60svh) auto;
          opacity: 0.55; /* 2026-08-23 사장님: "너무 옅다" → 0.30에서 상향.
             워터마크는 문 위쪽(28%)에, 글자는 아래에 있어 서로 겹치지 않는다.
             실측 결과 0.30/0.42/0.55 어느 값에서도 글자 자리 대비가 동일했다
             (무대올림 라벨 10.57 / 헤드라인 17.70). 즉 여기서는 선명도와 가독성이
             상충하지 않으므로 눈에 보이는 쪽으로 올렸다. */
          /* 2026-08-21: 순백 단색(brightness(0) invert(1)) → 확정 배색으로 되돌림.
             filter가 두 겹(글자/단면 지시선)을 한 색으로 납작하게 만들고 있었다.
             v3는 어두운 배경용 배색을 파일 자체에 구워넣은 판이다:
             글자·바닥선 = Cloud Dancer #F0EEE9 / 단면 지시선 2개 = 밝은 Teal #7FB5C0.
             filter가 빠졌으므로 투명도를 올려야 같은 존재감이 난다(순백 0.17 ≒ 이 판 0.30). */
          transition: opacity 0.5s ease;
        }
        .gw-muol-l3 { background: linear-gradient(180deg, transparent 58%, rgba(0,0,0,0.18) 100%); }
        .gw-overlay--muol { background: radial-gradient(ellipse at 32% 42%, rgba(255,255,255,0.10), transparent 66%); }
        .gw-door--muol:hover .gw-overlay--muol,
        .gw-door--muol:focus-visible .gw-overlay--muol { opacity: 1; }
        .gw-door--muol:hover .gw-muol-watermark,
        .gw-door--muol:focus-visible .gw-muol-watermark { opacity: 0.66; }

        /* ── 시우스 — 화이트톤 + SYUS색, 워터마크 ── */
        .gw-door--syus {
          /* 2026-08-23: 단색 크림 → 고스트라이트 사진. 빈 극장에 홀로 켜두는 등 하나와
             나머지 전부 여백. cover + center로 두면 등이 두 문의 경계선 바로 옆에 서서
             왼쪽 어둠과 오른쪽 빛 사이에 놓인다. 등이 거의 검정이라 밝기 하한을 전면에
             걸면 지워지므로, 그레이딩 단계에서 등이 선 좌측 띠를 마스크로 제외했다
             (output/brand/갈림길_배경/ghostlight/grade_ghostlight.py).
             background-position은 center 고정 — 20%로 당기면 등이 글자 쪽으로 들어와
             라벨 대비가 4.47로 기준(4.5) 아래로 떨어진다. */
          background: #F4F2ED url('/syus-bg-ghostlight.jpg') no-repeat center center;
          background-size: cover;
          min-height: 50svh;
          border-top: 1px solid #E0DBD0;
        }
        .gw-syus-watermark {
          /* transform-origin: hover scale(1.03)의 확대분이 문 밖으로 밀려 잘리지 않게.
             v3: 알파 누끼. v2는 흰 배경을 문 배경색(#F4F2ED)으로 곱해 사각형을 감춘
             판이었는데, 그건 배경이 그 단색일 때만 통한다 — 문 배경을 사진으로 바꾸면
             사각형이 다시 드러난다. v3는 흰 배경 위 합성을 역산해(A = 1 - min(R,G,B)/255,
             F = (C - (1-A)*255) / A) 알파 채널을 복원한 판이라 어떤 배경 위에서도
             글자만 얹힌다. 화면의 64.8%가 완전 투명. 붓결이 수채라 대부분 반투명이고
             완전 불투명은 0.3%뿐이라, 배경 질감이 글자 안쪽까지 비쳐 보인다. */
          background: url('/wm-syus-v3.png') no-repeat center 28%;
          background-size: min(96%, 860px, 62svh) auto;
          opacity: 0.46; /* 0.12는 색이 날아갔고 0.22도 옅다는 지적(2026-08-23).
             글자와 세로로 분리돼 있어 올려도 대비가 안 떨어진다(라벨 5.12 유지). */
          transform-origin: center center;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .gw-syus-glow { background: radial-gradient(ellipse at 64% 42%, rgba(59,130,196,0.10), transparent 62%); }
        .gw-overlay--syus { background: radial-gradient(ellipse at 64% 50%, rgba(90,168,107,0.10), transparent 66%); }
        .gw-door--syus:hover .gw-overlay--syus,
        .gw-door--syus:focus-visible .gw-overlay--syus { opacity: 1; }
        .gw-door--syus:hover .gw-syus-watermark,
        .gw-door--syus:focus-visible .gw-syus-watermark { opacity: 0.56; transform: scale(1.03); }

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
          /* 문이 각각 50svh(합 100svh)라 세로 여유가 0이다. 데스크톱의 23vh를 그대로
             쓰면 문이 자라 시우스 "들어가기"가 첫 화면 밖으로 나간다. 텍스트는
             7vh로 되돌리고, 대신 워터마크를 줄여 문 위쪽에 올려 겹침을 피한다.
             투명도는 데스크톱과 같은 값(0.55 / 0.46) — 터치엔 hover가 없어 기본값이
             곧 최종 인상이다. */
          .gw-door-inner { margin-top: 16vh; }
          .gw-muol-watermark {
            /* 12%는 상단 중앙 사유유사 배지(y 30~88) 뒤로 로고가 들어가 가려졌다.
               배지 아래로 내리고 크기를 줄여 설명글과도 안 겹치게 한다. */
            background-position: center 27%;
            background-size: min(32%, 20svh) auto;
            opacity: 0.55;
          }
          .gw-syus-watermark {
            background-position: center 14%;
            background-size: min(62%, 30svh) auto;
            opacity: 0.46;
          }
          /* 모바일 기본값 — 등을 화면 밖으로 보낸다. 폭이 좁은 폰(360px 미만)에서는
             헤드라인이 화면을 거의 다 쓰기 때문에 등이 설 자리가 물리적으로 없다.
             빛의 그라데이션과 바닥선은 남아 빈 화면이 되지 않는다. */
          .gw-door--syus {
            background-size: auto 160%;
            background-position: 72% center;
          }
        }

        /* 폭 360px 이상의 폰에서는 고스트라이트를 되살린다.
           등은 사진 왼쪽 9.7~17.4%에 있는데 배경이 화면보다 크므로 offset은 음수뿐이다
           — 어느 쪽으로 밀어도 등은 글자와 같은 왼쪽에 남는다. 그래서 폰 전용으로 좌우를
           뒤집은 판을 따로 둔다. 뒤집으면 등이 82.6~90.3%로 가고, 93%에서 헤드라인
           오른쪽 빈 자리에 정확히 선다(85%는 등 기둥이 4색 스트로크를 관통, 100%는
           헤드라인 쪽으로 붙는다).

           경계를 360px로 잡은 근거 — 폭을 훑어 글자 사각형의 최악 픽셀로 잰 대비.
           헤드라인은 34px(AA Large 3.0), 나머지는 본문(AA 4.5) 기준.
             320px  라벨 4.56 / 헤드라인 1.51 / 설명 3.51  ← 등이 헤드라인을 관통
             344px  라벨 4.56 / 헤드라인 4.95 / 설명 4.02  ← 설명 미달
             360px  라벨 4.62 / 헤드라인 5.67 / 설명 4.94  ← 전 항목 통과
             390px  라벨 4.87 / 헤드라인 7.49 / 설명 5.97
             428px  라벨 4.96 / 헤드라인 9.42 / 설명 6.76 */
        @media (max-width: 1023px) and (min-width: 360px) {
          .gw-door--syus {
            background-image: url('/syus-bg-ghostlight-mobile.jpg');
            background-position: 93% center;
          }
        }

        /* 세로가 짧은 폰(iPhone SE급, 높이 ~780px). 상단 배지 + 워터마크 + 설명글
           세 덩어리가 50svh 문 안에 물리적으로 다 못 들어간다. 셋을 다 넣으려고
           margin-top을 키우면 문이 자라 두 번째 문(시우스)의 "들어가기"가 화면 밖으로
           밀린다(360x740에서 24px 잘림 실측). 갈림길의 핵심은 두 문의 진입 링크이므로
           장식인 워터마크를 포기한다. 무대올림은 배경 사진이, 시우스는 4색 스트로크가
           남아 허전하지 않다. */
        @media (max-width: 1023px) and (max-height: 780px) {
          .gw-door-inner { margin-top: 8vh; }
          .gw-muol-watermark, .gw-syus-watermark { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gw-overlay, .gw-arrow, .gw-strokes > span, .gw-syus-watermark, .gw-muol-watermark { transition: none; }
        }
      `}</style>
    </div>

      {/* 전자상거래법 §10 사업자 정보 — 게이트웨이에는 푸터가 없어 여기서 표시한다.
          두 문(100svh)의 구도는 건드리지 않고 그 아래에 얇은 띠로만 덧붙였다. */}
      <LegalStrip />
    </>
  );
}
