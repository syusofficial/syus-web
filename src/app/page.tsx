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
 * 워터마크: /wm-muol-v4.png(한글 로고타입 + 확정 배색, 2026-10-28 획 10→17), /wm-syus-v3.png(알파 누끼 — 배경 무관).
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
        {/* 2026-10-06: 배지 안에 정의 한 문장을 넣는다. 이 화면에는 사유유사가 무엇을 하는 곳인지
            말하는 문장이 없었다(착지 세션의 절반이 여기서 끝남). 6/30에 배지 "밑"의 흰 슬로건이
            배경에 묻혀 안 보여 뺐으므로, 이번에는 배지의 흰 바탕 "안"에 둔다 — 어느 문 위에서도 읽힌다. */}
        <Link href="/company" className="gw-roof-badge" aria-label="사유유사 SYUS 소개">
          <span className="gw-roof-id">
            <Image
              src="/sayuyusa-logo.png"
              alt="사유유사 SYUS"
              width={104}
              height={42}
              className="gw-roof-logo"
              priority
            />
            <span className="gw-roof-name">사유유사 SYUS</span>
          </span>
          <span className="gw-roof-def">한국 대학 무대예술을 기록하고, 잇고, 알립니다</span>
        </Link>
      </div>

      {/* ── 왼쪽: 무대올림 (5, 청+버건디) ──
          2026-10-06: 「넓게 — 둘러보다 / 깊게 — 머물다」는 분위기만 있고 무엇을 하는 문인지 말하지 않았다.
          인스타에서 연기 글을 찾아온 사람이 글의 문을 못 찾고 빈 공연 쪽으로 들어갔다(8~10월 실측).
          대구(對句)의 결은 살리고 동사를 하는 일로 바꾼다 — 찾고·올리다 / 읽고·머물다.
          모바일은 문 두 개가 화면을 꽉 채워 세로 여유가 0이므로 헤드라인·설명 길이를 예전과 맞췄다. */}
      <Link href="/muol" className="gw-door gw-door--muol group" aria-label="무대올림으로 들어가기 — 대학 공연을 찾고 올리는 곳">
        <span className="gw-layer gw-muol-watermark" aria-hidden="true" />
        <span className="gw-layer gw-muol-l3" aria-hidden="true" />
        <span className="gw-overlay gw-overlay--muol" aria-hidden="true" />
        <div className="gw-door-inner">
          <p className="gw-label gw-label--muol">STAGE · 무대올림</p>
          <h2 className="gw-headline gw-headline--muol">
            찾고 <span className="gw-dash">—</span> 올리다
          </h2>
          <p className="gw-desc gw-desc--muol">
            대학 공연을 찾고, 무대를 올립니다.
            <br />
            {/* 2026-10-06 사장님: 「게재료 없음」은 돈에 연연하는 인상 → 올리기를 권하는 말로 */}
            당신의 첫 무대를 기다립니다.
          </p>
          <span className="gw-cta gw-cta--muol">
            무대올림 들어가기
            <span className="gw-arrow">→</span>
          </span>
        </div>
      </Link>

      {/* ── 오른쪽: 시우스 (5, 화이트톤) ── */}
      <Link href="/syus" className="gw-door gw-door--syus group" aria-label="시우스로 들어가기 — 연기에 관한 글을 읽는 곳">
        <span className="gw-layer gw-syus-watermark" aria-hidden="true" />
        <span className="gw-layer gw-syus-glow" aria-hidden="true" />
        <span className="gw-strokes" aria-hidden="true">
          <span style={{ background: "var(--color-syus-brand-blue)" }} />
          <span style={{ background: "var(--color-syus-brand-green)" }} />
          <span style={{ background: "var(--color-syus-brand-red)" }} />
          <span style={{ background: "var(--color-syus-brand-yellow)" }} />
        </span>
        <span className="gw-overlay gw-overlay--syus" aria-hidden="true" />
        <div className="gw-door-inner">
          <p className="gw-label gw-label--syus">SYUS · 시우스</p>
          <h2 className="gw-headline gw-headline--syus">
            읽고 <span className="gw-dash">—</span> 머물다
          </h2>
          <p className="gw-desc gw-desc--syus">
            배우와 연기에 관한 글을 읽고,
            <br />
            독백과 고민을 나눕니다.
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
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 9px 24px 11px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(74, 59, 51, 0.12);
          border-radius: 22px; /* 두 줄이 되어 100px(알약형)에서 낮춤 */
          box-shadow: 0 6px 22px rgba(36, 28, 24, 0.16);
          backdrop-filter: blur(3px);
        }
        .gw-roof-id { display: flex; align-items: center; gap: 12px; }
        .gw-roof-def {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.74rem;
          font-weight: 500;
          letter-spacing: 0.03em;
          color: #4A3B33; /* 흰 배지 위 9.6:1 */
          white-space: nowrap;
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
             배경색은 이미지 로딩 전·실패 시의 바탕.
             2026-10-28 사장님 선택: 빈 무대 → 「밤 공연」(무대 위 두 배우 + 객석). 닫힌 빈 무대는
             「공연이 열리는 곳」을 말하지 못했다.
             2026-10-29 사장님: PC는 원래 구도(무대 한가운데 두 배우), 폰·태블릿은 배우를 가장자리로
             잘라 낸 판(아래 max-width 1023px 규칙의 -mobile). 두 판 모두 로고 「림」 옆에 떠 있던
             빛 한 점은 지웠다. PC에서 배우가 헤드라인 줄표 뒤에 서지만 대비 5.2:1(큰 글자 기준 3)로 읽힌다. */
          background: #0B1518 url('/muol-bg-night.jpg') no-repeat center center;
          background-size: cover;
          min-height: 50svh;
        }
        .gw-muol-watermark {
          /* 2026-08-21 사장님 지시: 로고는 중앙, 설명글이 그 아래.
             28%는 라벨("STAGE · 무대올림")과 완전히 떼어놓기 위해 42%에서 올린 값이다.
             로고 PNG는 위 40%가 빈 천장(잉크 2.8%)이고 네 글자는 아래 60%에 몰려
             있어, 이미지 위치와 글자가 보이는 위치가 다르다는 점에 주의.
             60svh는 화면이 낮을 때만 작동하는 안전장치(1080p·1440p에선 760px 유지). */
          /* 2026-10-28 사장님: 로고 획을 키워 첫 시야에 먼저 들어오게.
             v4 = v3과 같은 SVG 원본에 같은 색 외곽선을 덧입혀 획만 10 → 17px(1400폭 기준) 굵힌 판.
             20부터는 「대」의 두 기둥·「올」의 ㄹ 안쪽 틈이 좁아져 17에서 멈췄다.
             원본: Content_Report/output/design/갈림길_무대올림_최종후보_2026-10-28/시공재료/wm-muol-t17.svg */
          background: url('/wm-muol-v4.png') no-repeat center 28%;
          background-size: min(88%, 760px, 60svh) auto;
          opacity: 0.8; /* 2026-10-28: 0.55 → 0.8 (획 상향과 함께 사장님 지시). 아래는 0.55 때의 기록.
             2026-08-23 사장님: "너무 옅다" → 0.30에서 상향.
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
        .gw-door--muol:focus-visible .gw-muol-watermark { opacity: 0.92; }

        /* ── 시우스 — 화이트톤 + SYUS색, 워터마크 ── */
        .gw-door--syus {
          /* 2026-08-23: 단색 크림 → 고스트라이트 사진. 빈 극장에 홀로 켜두는 등 하나와
             나머지 전부 여백. cover + center로 두면 등이 두 문의 경계선 바로 옆에 서서
             왼쪽 어둠과 오른쪽 빛 사이에 놓인다. 등이 거의 검정이라 밝기 하한을 전면에
             걸면 지워지므로, 그레이딩 단계에서 등이 선 좌측 띠를 마스크로 제외했다
             (output/brand/갈림길_배경/ghostlight/grade_ghostlight.py).
             background-position은 center 고정 — 20%로 당기면 등이 글자 쪽으로 들어와
             라벨 대비가 4.47로 기준(4.5) 아래로 떨어진다.
             2026-10-29 사장님 확정: 고스트라이트 → 「연습실에 둘러앉아 읽기」(남2·여3, 대본을 함께 읽는 다섯 명).
             흰 방의 등은 「읽고 — 머물다」를 말하지 못했고, 혼자 읽는 사진보다 시우스의 글·독백과
             커뮤니티(나누다)를 한 장에 담는다. 원본(남1·여4)을 편집해 성비만 바꾸고 구도·자리·각도는 맞췄다.
             다섯 명이 글자 뒤에 앉지만 아이보리 보정(글자 자리 밝기 하한)으로 대비 4.5:1 이상을 지킨다. */
          background: #F4F2ED url('/syus-bg-circle.jpg') no-repeat center center;
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
        .gw-syus-glow { background: radial-gradient(ellipse at 64% 42%, color-mix(in srgb, var(--color-syus-brand-blue) 10%, transparent), transparent 62%); }
        .gw-overlay--syus { background: radial-gradient(ellipse at 64% 50%, color-mix(in srgb, var(--color-syus-brand-green) 10%, transparent), transparent 66%); }
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

        /* ── 라벨/헤드라인/설명/CTA ──
           2026-10-28 글자 미세 조정(사장님 지시 — 서비스 로고 외 안내 글자의 가독성):
           라벨 자간 0.34→0.24em(한글이 「무 대 올 림」 낱자로 흩어졌다)·크기 0.72→0.78rem,
           설명 300→400(가는 획은 사진 위에서 흐려진다)·행간 1.85→1.75, 들어가기 0.9→0.95rem.
           사진 위 글자는 뒤에만 은은한 그림자/빛으로 받친다 — 배경 전체를 어둡게 하지 않는다. */
        .gw-door--muol .gw-door-inner { text-shadow: 0 1px 14px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,0.35); }
        .gw-door--syus .gw-door-inner { text-shadow: 0 0 16px rgba(244,242,237,0.9), 0 0 3px rgba(244,242,237,0.7); }
        .gw-label {
          font-family: var(--font-inter);
          font-size: 0.78rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .gw-label--muol { color: #9AD3DE; }   /* 밝은 teal (진한 배경 위) */
        .gw-label--syus { color: #0B5563; }   /* SYUS 블루 (화이트 위) */

        .gw-headline {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(2.1rem, 4.6vw, 3.4rem);
          line-height: 1.2; /* 2026-10-06 1.12→1.2: 「빽빽하다」는 사장님 지적 */
          font-weight: 700;
          letter-spacing: -0.01em;
          word-break: keep-all;
          margin-bottom: 18px;
        }
        .gw-headline--muol { color: #F0EEE9; }
        .gw-headline--syus { color: #241C18; }
        .gw-dash { opacity: 0.5; font-weight: 400; }

        .gw-desc {
          font-family: var(--font-noto-sans-kr);
          font-size: clamp(1rem, 1.45vw, 1.15rem);
          line-height: 1.75;
          font-weight: 400;
          word-break: keep-all;
          margin-bottom: 30px;
        }
        .gw-desc--muol { color: rgba(240,238,233,0.92); }
        .gw-desc--syus { color: #4A3B33; }

        .gw-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding-bottom: 6px;
          border-bottom: 1px solid currentColor;
        }
        .gw-cta--muol { color: #F0EEE9; }
        /* 2026-10-28: 자두(#5C2A42) → 청록. 색 위계 B안에서 자두는 「결심하는 것」(주 버튼),
           문을 여는 이동 링크는 「누르는 것」= 청록이다. 같은 문의 라벨과도 색이 맞는다. */
        .gw-cta--syus { color: var(--c-link); }
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
             투명도는 데스크톱과 같은 값(0.8 / 0.46) — 터치엔 hover가 없어 기본값이
             곧 최종 인상이다. */
          .gw-door-inner { margin-top: 16vh; }
          .gw-door--muol .gw-door-inner { margin-top: 19vh; }
          .gw-muol-watermark {
            /* 12%는 상단 중앙 사유유사 배지(y 30~88) 뒤로 로고가 들어가 가려졌다.
               배지 아래로 내리고 크기를 줄여 설명글과도 안 겹치게 한다. */
            /* 2026-10-06: 배지가 두 줄(y 30~107)이 되어 27%에선 로고 윗선이 배지 밑에 닿았다 → 29%,
               무대올림 글자도 아래(.gw-door--muol margin 18vh)로 조금 내려 로고와 라벨 사이를 띄운다. */
            background-position: center 29%;
            background-size: min(32%, 20svh) auto;
            opacity: 0.8;
          }
          .gw-syus-watermark {
            background-position: center 14%;
            background-size: min(62%, 30svh) auto;
            opacity: 0.46;
          }
          /* 2026-10-28: 폰·태블릿은 글자가 왼쪽 정렬이라, 무대올림은 배우를 오른쪽 가장자리로
             보낸 판(좌우 반전)을 쓴다. 시우스 둘러앉은 다섯 명은 화면 전체에 퍼져 있어
             뒤집어도 차이가 없으므로 같은 사진 그대로. cover + center라 어떤 화면 비율에서도
             문을 꽉 채운다(전 고스트라이트의 「auto 160%」가 눕힌 태블릿에서 빈 띠를 남기던 문제도 사라진다). */
          .gw-door--muol { background-image: url('/muol-bg-night-mobile.jpg'); }
          .gw-door--syus {
            background-size: cover;
            background-position: center;
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
          /* 2026-10-06: 배지가 두 줄이 되어 아래로 ~20px 자랐다. 배지가 얹힌 무대올림 문만
             글자를 그만큼 내린다(시우스 "들어가기"는 360x740에서 화면 안 유지 — 실측). */
          .gw-door--muol .gw-door-inner { margin-top: 15vh; } /* 문 안 세로 가운데 정렬이라 늘린 값의 절반만 내려간다 */
          .gw-muol-watermark, .gw-syus-watermark { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .gw-overlay, .gw-arrow, .gw-strokes > span, .gw-syus-watermark, .gw-muol-watermark { transition: none; }
        }
      `}</style>
    </div>

      {/* 2026-10-06: 공연팀의 문. 두 문은 모두 관객의 동사라 학과·공연팀이 들어갈 곳이 없었다.
          두 문(100svh) 구도는 건드리지 않고 그 아래 얇은 띠로 둔다. */}
      <Link href="/muol/performer" className="gw-performer-strip">
        <span>학과·공연팀이신가요</span>
        <span className="gw-performer-strip-cta">공연 올리는 법 →</span>
      </Link>
      <style>{`
        .gw-performer-strip {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: baseline;
          gap: 6px 14px;
          padding: 18px 16px;
          background: #F0EEE9;
          border-top: 1px solid #E0DBD0;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.92rem;
          color: #4A3B33;
          text-decoration: none;
          word-break: keep-all;
        }
        .gw-performer-strip-cta {
          color: #0B5563; /* 누르는 것 = 청록 (색 위계 B안) */
          font-weight: 600;
          border-bottom: 1px solid currentColor;
        }
        .gw-performer-strip:hover .gw-performer-strip-cta { opacity: 0.8; }
        .gw-performer-strip:focus-visible { outline: 2px solid #0B5563; outline-offset: -4px; }
      `}</style>

      {/* 전자상거래법 §10 사업자 정보 — 게이트웨이에는 푸터가 없어 여기서 표시한다.
          두 문(100svh)의 구도는 건드리지 않고 그 아래에 얇은 띠로만 덧붙였다. */}
      <LegalStrip />
    </>
  );
}
