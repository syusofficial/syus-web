"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/**
 * 시우스 마인드맵 (/syus) — 2026-06-30 3층 구조 뼈대.
 * 중심 코어(SYUS → /syus/about) + 6무대 노드 방사형 = 7존.
 * 6무대 상세는 이번 범위 밖 → 클릭 시 '준비 중' 모달만.
 * 안전: 모달은 active일 때만 DOM 존재(조건부 렌더), backdrop/ESC/X로 닫힘,
 *       scroll lock은 cleanup으로 반드시 복원 → 닫은 뒤 클릭 잔존 0(과거 오버레이 버그 회피).
 */

type Stage = {
  key: string;
  name: string;
  section: string;
  line: string;
  prep: string;
  color: string;
  shape: string;
};

const STAGES: Stage[] = [
  { key: "proscenium", name: "프로시니엄 무대", section: "주인장 견해글", line: "정면으로 마주하는, 정제된 시선", prep: "운영자가 연기를 들여다본 글이 한 편씩 쌓이는 자리입니다.", color: "var(--color-syus-stage-proscenium)", shape: "proscenium" },
  { key: "thrust", name: "돌출 무대", section: "연기 고민 QnA", line: "객석으로 걸어 나오는, 가까운 대화", prep: "연기 고민을 묻고, 함께 답을 더듬는 자리입니다.", color: "var(--color-syus-stage-thrust)", shape: "thrust" },
  { key: "arena", name: "원형 무대", section: "자유 커뮤니티", line: "사방이 객석인, 둘러앉은 광장", prep: "연습·잡담·모집이 자유롭게 오가는 광장입니다.", color: "var(--color-syus-stage-arena)", shape: "arena" },
  { key: "blackbox", name: "블랙박스", section: "관람의 잔상", line: "무엇이든 될 수 있는 빈 검은 상자", prep: "공연·영화·드라마를 본 뒤 남은 잔상을 적는 자리입니다.", color: "var(--color-syus-stage-blackbox)", shape: "blackbox" },
  { key: "flex", name: "변형 무대", section: "창작 독백 아카이브", line: "형태가 바뀌는, 다목적 무대", prep: "원하는 결의 독백을 새로 지어 건네받는 자리입니다.", color: "var(--color-syus-stage-flex)", shape: "flex" },
  { key: "corridor", name: "사잇 무대", section: "책 서재", line: "관문이자 문지방, 사이의 통로", prep: "연기와 무대 곁에 둘 책을 천천히 모으는 자리입니다.", color: "var(--color-syus-stage-corridor)", shape: "corridor" },
];

function StageGlyph({ shape }: { shape: string }) {
  const c = {
    width: 34,
    height: 34,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  switch (shape) {
    case "proscenium":
      return (<svg {...c}><path d="M3 19V5h18v14" /><path d="M3 19h18" strokeDasharray="2 2" opacity="0.5" /></svg>);
    case "thrust":
      return (<svg {...c}><path d="M3 5h18v9h-6v5H9v-5H3z" /></svg>);
    case "arena":
      return (<svg {...c}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></svg>);
    case "blackbox":
      return (<svg {...c}><rect x="4" y="4" width="16" height="16" strokeDasharray="3 2.5" /></svg>);
    case "flex":
      return (<svg {...c}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /></svg>);
    case "corridor":
      return (<svg {...c}><rect x="8" y="3" width="8" height="18" /><path d="M12 3v18" opacity="0.5" /></svg>);
    default:
      return null;
  }
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
      document.body.style.overflow = prev; // 닫힐 때 반드시 복원
    };
  }, [active, close]);

  return (
    <main className="syus-stage-wrap">
      <div className="syus-intro">
        <p className="syus-intro-label">여섯 개의 무대</p>
        <h1 className="syus-intro-title">연기가 머무는 자리들</h1>
        <p className="syus-intro-desc">
          무대의 형태마다 다른 결의 이야기가 열립니다. 가운데 SYUS는 시우스의 뜻으로 이어집니다.
        </p>
      </div>

      <div className="syus-map">
        <Link href="/syus/about" className="syus-core" aria-label="시우스란 — 정체성 보기">
          <span className="syus-core-mark">SYUS</span>
          <span className="syus-core-sub">시우스란</span>
        </Link>

        <div className="syus-nodes">
          {STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              className="syus-node"
              style={{ ["--node" as string]: s.color } as React.CSSProperties}
              onClick={() => setActive(s)}
              aria-label={`${s.name} — ${s.section} (준비 중)`}
            >
              <span className="syus-node-glyph" style={{ color: s.color }}>
                <StageGlyph shape={s.shape} />
              </span>
              <span className="syus-node-name">{s.name}</span>
              <span className="syus-node-section">{s.section}</span>
              <span className="syus-node-line">{s.line}</span>
              <span className="syus-node-soon">곧 열립니다</span>
            </button>
          ))}
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
          max-width: 36rem;
          margin: 0 auto clamp(36px, 6vh, 64px);
        }
        .syus-intro-label {
          font-family: var(--font-inter);
          font-size: 0.72rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          font-weight: 600;
          color: #6BB0C0;
          margin-bottom: 16px;
        }
        .syus-intro-title {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(1.9rem, 4.5vw, 2.8rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-syus-cream);
          margin-bottom: 14px;
          word-break: keep-all;
        }
        .syus-intro-desc {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.98rem;
          line-height: 1.7;
          font-weight: 300;
          color: var(--color-syus-cream-dim);
          word-break: keep-all;
        }

        /* ── 맵: 모바일 = 세로 스택 ── */
        .syus-map {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .syus-core {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 132px;
          height: 132px;
          border-radius: 50%;
          background: var(--color-syus-ink-soft);
          border: 1px solid var(--color-syus-line);
          text-decoration: none;
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .syus-core:hover, .syus-core:focus-visible {
          border-color: #6BB0C0;
          transform: scale(1.04);
        }
        .syus-core-mark {
          font-family: var(--font-inter);
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: var(--color-syus-cream);
        }
        .syus-core-sub {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          color: var(--color-syus-cream-dim);
        }

        .syus-nodes {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          max-width: 30rem;
        }
        .syus-node {
          appearance: none;
          text-align: left;
          cursor: pointer;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 20px 22px;
          background: var(--color-syus-ink-soft);
          border: 1px solid var(--color-syus-line);
          border-left: 3px solid var(--node);
          transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
        }
        .syus-node:hover, .syus-node:focus-visible {
          transform: translateY(-2px);
          border-color: var(--node);
          background: #342A24;
        }
        .syus-node-glyph { color: var(--node); margin-bottom: 6px; }
        .syus-node-name {
          font-family: var(--font-noto-serif-kr);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-syus-cream);
        }
        .syus-node-section {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--node);
          letter-spacing: 0.04em;
        }
        .syus-node-line {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.82rem;
          font-weight: 300;
          color: var(--color-syus-cream-dim);
          word-break: keep-all;
          margin-top: 2px;
        }
        .syus-node-soon {
          font-family: var(--font-inter);
          font-size: 0.62rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-syus-cream-dim);
          opacity: 0.7;
          margin-top: 8px;
        }

        /* ── 데스크탑 = 방사형 ── */
        @media (min-width: 1024px) {
          .syus-map {
            position: relative;
            display: block;
            min-height: 800px;
            max-width: 1000px;
            margin: 0 auto;
          }
          .syus-core {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150px;
            height: 150px;
          }
          .syus-core:hover, .syus-core:focus-visible {
            transform: translate(-50%, -50%) scale(1.04);
          }
          .syus-nodes {
            position: absolute;
            inset: 0;
            display: block;
            max-width: none;
          }
          .syus-node {
            position: absolute;
            width: 248px;
            transform: translate(-50%, -50%);
          }
          .syus-node:hover, .syus-node:focus-visible {
            transform: translate(-50%, -50%) translateY(-3px);
          }
          .syus-node:nth-child(1) { left: 50%; top: 7%; }
          .syus-node:nth-child(2) { left: 87%; top: 31%; }
          .syus-node:nth-child(3) { left: 87%; top: 73%; }
          .syus-node:nth-child(4) { left: 50%; top: 95%; }
          .syus-node:nth-child(5) { left: 13%; top: 73%; }
          .syus-node:nth-child(6) { left: 13%; top: 31%; }
        }

        /* ── 준비 중 모달 ── */
        .syus-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15, 11, 9, 0.74);
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
          background: var(--color-syus-ink-soft);
          border: 1px solid var(--color-syus-line);
          border-top: 3px solid var(--color-syus-cream);
          padding: 40px 32px 32px;
          text-align: center;
        }
        .syus-modal-x {
          position: absolute;
          top: 12px;
          right: 16px;
          appearance: none;
          background: none;
          border: 0;
          color: var(--color-syus-cream-dim);
          font-size: 1.6rem;
          line-height: 1;
          cursor: pointer;
        }
        .syus-modal-x:hover { color: var(--color-syus-cream); }
        .syus-modal-glyph { display: inline-block; margin-bottom: 16px; }
        .syus-modal-section {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: var(--color-syus-cream-dim);
          margin-bottom: 6px;
        }
        .syus-modal-name {
          font-family: var(--font-noto-serif-kr);
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--color-syus-cream);
          margin-bottom: 14px;
        }
        .syus-modal-soon {
          font-family: var(--font-inter);
          font-size: 0.68rem;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          font-weight: 600;
          color: #6BB0C0;
          margin-bottom: 14px;
        }
        .syus-modal-prep {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem;
          line-height: 1.7;
          font-weight: 300;
          color: var(--color-syus-cream-dim);
          word-break: keep-all;
          margin-bottom: 28px;
        }
        .syus-modal-close {
          appearance: none;
          cursor: pointer;
          padding: 12px 28px;
          background: transparent;
          border: 1px solid var(--color-syus-cream);
          color: var(--color-syus-cream);
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem;
          letter-spacing: 0.1em;
        }
        .syus-modal-close:hover { background: var(--color-syus-cream); color: var(--color-syus-ink); }

        @keyframes syusFade { from { opacity: 0; } to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .syus-core, .syus-node { transition: none; }
          .syus-modal-backdrop { animation: none; }
        }
      `}</style>
    </main>
  );
}
