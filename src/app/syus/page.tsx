"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/**
 * 시우스 마인드맵 (/syus) — 3층 구조. (2026-07-01 4차: 히어로 재구성 — 큰 기하 도형 + 브러시 SYUS 중앙)
 * 사장님 지시(희망도안 반영):
 *   - 중앙 = 브러시 SYUS 워드마크(클릭 → /syus/about 소개글) + "시우스란 →"
 *   - 6무대를 '삐뚤빼뚤'이 아닌 대칭·직각의 깔끔한 외곽선 도형으로 크게(레퍼런스 도안 그대로)
 *   - 중앙 ↔ 6도형 실선 연결(SVG), 선행오픈 3섹션은 소개 페이지 이동 / 나머지 3은 준비중 모달
 *   - 도형은 시우스 브랜드색으로, 라벨(섹션명·상태)은 사용성 위해 작게 유지
 * 안전: 모달은 active일 때만 DOM(조건부), backdrop/ESC/X 닫힘, scroll lock cleanup으로 복원.
 */

type Stage = {
  key: string;
  slug: string;
  name: string;
  section: string;
  line: string;
  prep: string;
  color: string;
  shape: string;
  open: boolean;
};

// 순서 = 방사형 노드 위치(위→우상→우하→아래→좌하→좌상). 선행오픈(open) = 견해글·QnA·책 서재.
const STAGES: Stage[] = [
  { key: "proscenium", slug: "proscenium", name: "프로시니엄 무대", section: "주인장 견해글", line: "정면으로 마주하는, 정제된 시선", prep: "운영자가 연기를 들여다본 글이 한 편씩 쌓이는 자리입니다.", color: "var(--color-syus-stage-proscenium)", shape: "proscenium", open: true },
  { key: "thrust", slug: "thrust", name: "돌출 무대", section: "연기 고민 QnA", line: "객석으로 걸어 나오는, 가까운 대화", prep: "연기 고민을 묻고, 함께 답을 더듬는 자리입니다.", color: "var(--color-syus-stage-thrust)", shape: "thrust", open: true },
  { key: "arena", slug: "arena", name: "원형 무대", section: "자유 커뮤니티", line: "사방이 객석인, 둘러앉은 광장", prep: "연습·잡담·모집이 자유롭게 오가는 광장입니다.", color: "var(--color-syus-stage-arena)", shape: "arena", open: false },
  { key: "blackbox", slug: "blackbox", name: "블랙박스", section: "관람의 잔상", line: "무엇이든 될 수 있는 빈 검은 상자", prep: "공연·영화·드라마를 본 뒤 남은 잔상을 적는 자리입니다.", color: "var(--color-syus-stage-blackbox)", shape: "blackbox", open: false },
  { key: "flex", slug: "flex", name: "변형 무대", section: "창작 독백 아카이브", line: "형태가 바뀌는, 다목적 무대", prep: "원하는 결의 독백을 새로 지어 건네받는 자리입니다.", color: "var(--color-syus-stage-flex)", shape: "flex", open: false },
  { key: "corridor", slug: "corridor", name: "사잇 무대", section: "책 서재", line: "관문이자 문지방, 사이의 통로", prep: "연기와 무대 곁에 둘 책을 천천히 모으는 자리입니다.", color: "var(--color-syus-stage-corridor)", shape: "corridor", open: true },
];

// 대칭·직각의 깔끔한 외곽선 도형(희망도안). viewBox 24 기준, 선 굵기는 CSS.
function StageGlyph({ shape }: { shape: string }) {
  const c = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  switch (shape) {
    case "proscenium": // 프로시니엄 — 세로 사각(위·양옆 실선, 아래는 열린 점선)
      return (<svg {...c}><path d="M6 20V4h12v16" /><path d="M6 20h12" strokeDasharray="2.4 2.2" opacity="0.6" /></svg>);
    case "thrust": // 돌출 무대 — 넓은 상단 + 가운데 아래로 돌출(⊤)
      return (<svg {...c}><path d="M3 6h18v8h-6v5H9v-5H3z" /></svg>);
    case "arena": // 원형 무대 — 이중 동심원
      return (<svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>);
    case "blackbox": // 블랙박스 — 점선 정사각
      return (<svg {...c}><rect x="4.5" y="4.5" width="15" height="15" strokeDasharray="3 2.6" /></svg>);
    case "flex": // 변형 무대 — 정육각(뾰족한 위·아래)
      return (<svg {...c}><path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" /></svg>);
    case "corridor": // 사잇 무대 — 세로 사각 + 가운데 세로 칸막이
      return (<svg {...c}><rect x="7" y="3.5" width="10" height="17" /><path d="M12 3.5v17" /></svg>);
    default:
      return null;
  }
}

// 노드 안쪽(도형 + 라벨) — 열림/준비 공통
function NodeBody({ s }: { s: Stage }) {
  return (
    <>
      <span className="syus-node-glyph" style={{ color: s.color }} aria-hidden="true">
        <StageGlyph shape={s.shape} />
      </span>
      <span className="syus-node-label">
        <span className="syus-node-section" style={{ color: s.color }}>{s.section}</span>
        <span className="syus-node-name">{s.name}</span>
        <span className={`syus-node-state ${s.open ? "is-open" : ""}`}>
          {s.open ? "열림 · 둘러보기" : "곧 열립니다"}
        </span>
      </span>
    </>
  );
}

export default function SyusMindmapPage() {
  const [active, setActive] = useState<Stage | null>(null);
  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active, close]);

  return (
    <main className="syus-stage-wrap">
      <div className="syus-intro">
        <p className="syus-intro-label">여섯 개의 무대</p>
        <h1 className="syus-intro-title">연기가 머무는 자리들</h1>
        <p className="syus-intro-desc">무대의 형태마다 다양한 결의 연기를 담아내었습니다.</p>
      </div>

      <div className="syus-map">
        {/* 핵 ↔ 노드 실선 (데스크탑) */}
        <svg className="syus-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[
            [50, 8], [86, 31], [86, 73], [50, 92], [14, 73], [14, 31],
          ].map(([x, y], i) => (
            <line key={i} x1="50" y1="50" x2={x} y2={y} />
          ))}
        </svg>

        <Link href="/syus/about" className="syus-core" aria-label="시우스란 — SYUS 소개 보기">
          <span className="syus-core-mark" aria-hidden="true" />
          <span className="syus-core-alt">SYUS</span>
          <span className="syus-core-sub">시우스란 →</span>
        </Link>

        <div className="syus-nodes">
          {STAGES.map((s) =>
            s.open ? (
              <Link
                key={s.key}
                href={`/syus/${s.slug}`}
                className="syus-node is-open"
                style={{ ["--node" as string]: s.color } as React.CSSProperties}
                aria-label={`${s.name} — ${s.section} (열림)`}
              >
                <NodeBody s={s} />
              </Link>
            ) : (
              <button
                key={s.key}
                type="button"
                className="syus-node"
                style={{ ["--node" as string]: s.color } as React.CSSProperties}
                onClick={() => setActive(s)}
                aria-label={`${s.name} — ${s.section} (준비 중)`}
              >
                <NodeBody s={s} />
              </button>
            )
          )}
        </div>
      </div>

      {active && (
        <div className="syus-modal-backdrop" onClick={close}>
          <div
            className="syus-modal"
            role="dialog"
            aria-modal="true"
            aria-label={active.name}
            onClick={(e) => e.stopPropagation()}
            style={{ borderTopColor: active.color }}
          >
            <button type="button" className="syus-modal-x" onClick={close} aria-label="닫기">
              ×
            </button>
            <span className="syus-modal-glyph" style={{ color: active.color }}>
              <StageGlyph shape={active.shape} />
            </span>
            <p className="syus-modal-section">{active.section}</p>
            <h2 className="syus-modal-name">{active.name}</h2>
            <p className="syus-modal-soon">곧 열립니다</p>
            <p className="syus-modal-prep">{active.prep}</p>
            <button type="button" className="syus-modal-close" onClick={close}>
              닫기
            </button>
          </div>
        </div>
      )}

      <style>{`
        .syus-stage-wrap {
          padding: clamp(40px, 8vh, 80px) clamp(20px, 5vw, 56px) 100px;
        }
        .syus-intro {
          text-align: center;
          max-width: 40rem;
          margin: 0 auto clamp(36px, 6vh, 64px);
        }
        .syus-intro-label {
          font-family: var(--font-inter);
          font-size: 0.72rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          font-weight: 600;
          color: #0B5563;
          margin-bottom: 16px;
        }
        .syus-intro-title {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(1.9rem, 4.5vw, 2.8rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #241C18;
          margin-bottom: 14px;
          word-break: keep-all;
        }
        .syus-intro-desc {
          font-family: var(--font-noto-sans-kr);
          font-size: 1rem;
          line-height: 1.7;
          font-weight: 300;
          color: #6B5C50;
          word-break: keep-all;
        }

        /* ── 맵: 모바일 = 세로 스택(도형 + 라벨) ── */
        .syus-map {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .syus-lines { display: none; }

        /* 중앙 코어 — 브러시 SYUS + 시우스란(클릭 → 소개글) */
        .syus-core {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px 18px;
          background: transparent;
          text-decoration: none;
          transition: transform 0.25s ease;
        }
        .syus-core:hover, .syus-core:focus-visible { transform: scale(1.04); }
        .syus-core-mark {
          display: block;
          width: clamp(150px, 44vw, 200px);
          height: clamp(62px, 18vw, 82px);
          background: url('/wm-syus.jpg') no-repeat center center;
          background-size: contain;
          mix-blend-mode: multiply; /* 흰 배경 → 크림 위에서 사라지고 붓터치만 남음 */
        }
        .syus-core-alt { /* 이미지 로드 실패 대비 텍스트(시각적으론 mark가 덮음) */
          position: absolute;
          width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0);
        }
        .syus-core-sub {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          font-weight: 600;
          color: #0B5563;
        }

        .syus-nodes {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 28rem;
        }
        .syus-node {
          appearance: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 16px 20px;
          background: #FFFFFF;
          border: 1px solid #E4DFD4;
          border-left: 3px solid var(--node);
          box-shadow: 0 2px 10px rgba(36,28,24,0.04);
          text-decoration: none;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .syus-node:hover, .syus-node:focus-visible {
          transform: translateY(-2px);
          border-color: var(--node);
          box-shadow: 0 8px 20px rgba(36,28,24,0.10);
        }
        .syus-node:not(.is-open) { opacity: 0.85; }

        .syus-node-glyph {
          flex: 0 0 auto;
          color: var(--node);
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .syus-node-glyph svg { width: 100%; height: 100%; }
        .syus-node-label { display: flex; flex-direction: column; gap: 3px; }
        .syus-node-section {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .syus-node-name {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          font-weight: 300;
          color: #6B5C50;
        }
        .syus-node-state {
          font-family: var(--font-inter);
          font-size: 0.6rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #A79E90;
          margin-top: 3px;
        }
        .syus-node-state.is-open { color: #0B5563; font-weight: 600; }

        /* ── 데스크탑 = 방사형 + 실선 + 큰 도형 ── */
        @media (min-width: 1024px) {
          .syus-map {
            display: block;
            min-height: 860px;
            max-width: 1080px;
            margin: 0 auto;
          }
          .syus-lines {
            display: block;
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
          }
          .syus-lines line {
            stroke: #4A3B33;
            stroke-width: 1;
            opacity: 0.22;
            vector-effect: non-scaling-stroke;
          }
          .syus-core {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2;
          }
          .syus-core:hover, .syus-core:focus-visible {
            transform: translate(-50%, -50%) scale(1.04);
          }
          .syus-nodes {
            position: absolute;
            inset: 0;
            display: block;
            max-width: none;
            z-index: 2;
          }
          .syus-node {
            position: absolute;
            width: 210px;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 14px;
            padding: 22px 20px;
            transform: translate(-50%, -50%);
            background: transparent;   /* 히어로 = 도형 중심, 카드 제거 */
            border: 0;
            box-shadow: none;
          }
          .syus-node:hover, .syus-node:focus-visible {
            transform: translate(-50%, -50%) translateY(-4px);
            box-shadow: none;
          }
          .syus-node-glyph { width: 84px; height: 84px; }
          .syus-node-label { align-items: center; text-align: center; gap: 4px; }
          .syus-node-state { margin-top: 5px; }
          .syus-node:nth-child(1) { left: 50%; top: 8%; }
          .syus-node:nth-child(2) { left: 86%; top: 31%; }
          .syus-node:nth-child(3) { left: 86%; top: 73%; }
          .syus-node:nth-child(4) { left: 50%; top: 92%; }
          .syus-node:nth-child(5) { left: 14%; top: 73%; }
          .syus-node:nth-child(6) { left: 14%; top: 31%; }
        }

        /* ── 준비 중 모달 ── */
        .syus-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(36, 28, 24, 0.42);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: syusFade 0.18s ease;
        }
        .syus-modal {
          position: relative;
          width: 100%;
          max-width: 27rem;
          background: #FFFFFF;
          border: 1px solid #E4DFD4;
          border-top: 3px solid #241C18;
          box-shadow: 0 20px 48px rgba(36,28,24,0.22);
          padding: 40px 32px 32px;
          text-align: center;
        }
        .syus-modal-x {
          position: absolute;
          top: 12px; right: 16px;
          appearance: none; background: none; border: 0;
          color: #A79E90; font-size: 1.6rem; line-height: 1; cursor: pointer;
        }
        .syus-modal-x:hover { color: #241C18; }
        .syus-modal-glyph { display: inline-flex; width: 56px; height: 56px; margin-bottom: 16px; }
        .syus-modal-glyph svg { width: 100%; height: 100%; }
        .syus-modal-section {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem; font-weight: 600; letter-spacing: 0.06em;
          color: #6B5C50; margin-bottom: 6px;
        }
        .syus-modal-name {
          font-family: var(--font-noto-serif-kr);
          font-size: 1.6rem; font-weight: 700; color: #241C18; margin-bottom: 14px;
        }
        .syus-modal-soon {
          font-family: var(--font-inter);
          font-size: 0.68rem; letter-spacing: 0.28em; text-transform: uppercase;
          font-weight: 600; color: #0B5563; margin-bottom: 14px;
        }
        .syus-modal-prep {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem; line-height: 1.7; font-weight: 300;
          color: #6B5C50; word-break: keep-all; margin-bottom: 28px;
        }
        .syus-modal-close {
          appearance: none; cursor: pointer; padding: 12px 28px;
          background: transparent; border: 1px solid #241C18; color: #241C18;
          font-family: var(--font-noto-sans-kr); font-size: 0.85rem; letter-spacing: 0.1em;
        }
        .syus-modal-close:hover { background: #241C18; color: #F4F2ED; }

        @keyframes syusFade { from { opacity: 0; } to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .syus-core, .syus-node { transition: none; }
          .syus-modal-backdrop { animation: none; }
        }
      `}</style>
    </main>
  );
}
