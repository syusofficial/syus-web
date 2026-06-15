"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { genreDotColor } from "@/lib/constants";

export type StreamItem = {
  id: string;
  title: string;
  poster_url: string | null;
  performer_name: string | null;
  schedule_start: string | null;
  venue: string | null;
  /** 장르(8장르) — 첫 카드 라벨·전체 카드 도트 컬러에 사용. */
  genre?: string | null;
};

/**
 * 무대올림 — 히어로 포스터 가로 흐름 + 카드별 둥둥 떠다니는 효과.
 * 사장님 요청: 포스터들이 물 위에 둥둥 떠다니듯이 유영하는 시각효과.
 * 가로 무한 흐름(track) + 각 카드별 floating(translateY + rotate 미세 회전, phase·duration 무작위).
 * 접근성: prefers-reduced-motion 시 두 애니메이션 모두 정지.
 */
export default function HeroPosterStream({ items }: { items: StreamItem[] }) {
  // 마운트 후에만 애니메이션 활성화 — SSR/CSR 시점차로 인한 시각 점프 방지
  const [mounted, setMounted] = useState(false);
  // 모바일 touch로 일시정지 (제작팀 진단 #5)
  const [touchPaused, setTouchPaused] = useState(false);
  useEffect(() => setMounted(true), []);

  if (items.length === 0) return null;

  // 무한 루프를 위해 두 세트 복제
  const duplicated = [...items, ...items];

  return (
    <div
      className={`hero-stream-wrapper${mounted ? " is-animated" : ""}${touchPaused ? " is-touch-paused" : ""}`}
      onTouchStart={() => setTouchPaused(true)}
      onTouchEnd={() => setTouchPaused(false)}
      onTouchCancel={() => setTouchPaused(false)}
    >
      <div className="hero-stream-track">
        {duplicated.map((item, idx) => {
          // 카드별 둥둥 위상 분산 — 진폭·지연·주기 무작위 느낌
          const phase = idx % 5;
          const bobDelay = `${-phase * 1.7}s`;
          const bobDuration = `${6.4 + (phase % 3) * 0.9}s`;
          // 카드별 미세한 초기 회전 — 정렬되지 않은 느낌
          const baseTilt = ((idx % 7) - 3) * 0.6;
          return (
            <Link
              key={`${item.id}-${idx}`}
              href={`/shows/${item.id}`}
              className="hero-stream-card group"
            >
              <div
                className="hero-card-bob"
                style={{
                  animationDelay: bobDelay,
                  animationDuration: bobDuration,
                  ["--base-tilt" as string]: `${baseTilt}deg`,
                }}
              >
                <div className="hero-stream-poster">
                  {item.poster_url ? (
                    <Image
                      src={item.poster_url}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 260px, 320px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      unoptimized
                    />
                  ) : (
                    <div className="hero-stream-placeholder">
                      <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "2.4rem" }}>
                        無
                      </span>
                    </div>
                  )}
                  {/* 첫 카드(원본 idx 0)만 큐레이션 라벨 — 직접 서열(1·2·3) 표기 없음. 2026-06-15 Phase 1. */}
                  {idx === 0 && (
                    <div className="hero-stream-lead-label">이번 주의 무대</div>
                  )}
                </div>
                <div className="hero-stream-caption">
                  <p className="hero-stream-title" title={item.title}>
                    {/* 8장르 도트 — 미네랄 채도 변형만 (lib/constants GENRE_TINT) */}
                    {item.genre && (
                      <span
                        className="hero-stream-dot"
                        style={{ backgroundColor: genreDotColor(item.genre) }}
                        aria-hidden
                      />
                    )}
                    {item.title}
                  </p>
                  <p className="hero-stream-meta">
                    {[
                      item.performer_name,
                      item.schedule_start?.replace(/-/g, ".").slice(2, 10),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`
        .hero-stream-wrapper {
          overflow: hidden;
          width: 100%;
          mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
          padding: 28px 0 36px;
        }
        .hero-stream-track {
          display: flex;
          gap: 36px;
          width: max-content;
        }
        .hero-stream-wrapper.is-animated .hero-stream-track {
          animation: hero-stream-flow 64s linear infinite;
        }
        .hero-stream-wrapper:hover .hero-stream-track,
        .hero-stream-wrapper.is-touch-paused .hero-stream-track {
          animation-play-state: paused;
        }
        .hero-stream-card {
          display: block;
          flex-shrink: 0;
          width: 260px;
          color: #FBF8F1;
        }
        @media (min-width: 768px) {
          .hero-stream-card { width: 320px; }
        }
        .hero-card-bob {
          transform: rotate(var(--base-tilt, 0deg));
          will-change: transform;
          transform-origin: center 60%;
        }
        .hero-stream-wrapper.is-animated .hero-card-bob {
          animation: hero-card-bob 7s ease-in-out infinite alternate;
        }
        .hero-stream-wrapper:hover .hero-card-bob,
        .hero-stream-wrapper.is-touch-paused .hero-card-bob {
          animation-play-state: paused;
        }
        .hero-stream-poster {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #202833;
          box-shadow:
            0 22px 40px rgba(0, 0, 0, 0.42),
            0 6px 14px rgba(27, 40, 66, 0.5);
          filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.28));
        }
        .hero-stream-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(248, 249, 252, 0.4);
          background: linear-gradient(135deg, #202833 0%, #3B5A6B 100%);
        }
        /* 2026-06-15 Phase 1: 첫 카드 큐레이션 라벨 — 노란 1·2·3 랭크 배지 폐기. */
        .hero-stream-lead-label {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 8px;
          background: rgba(27, 40, 66, 0.75);
          color: #FBF8F1;
          font-family: var(--font-inter);
          font-size: 0.62rem;
          letter-spacing: 0.2em;
          line-height: 1;
          backdrop-filter: blur(4px);
        }
        .hero-stream-caption {
          padding-top: 18px;
        }
        .hero-stream-title {
          font-family: var(--font-pretendard);
          font-size: 1rem;
          font-weight: 600;
          color: #FBF8F1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: -0.015em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        /* 8장르 도트 — 미네랄 채도 변형 (lib/constants GENRE_TINT) */
        .hero-stream-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .hero-stream-meta {
          font-family: var(--font-pretendard);
          font-size: 0.75rem;
          color: rgba(248, 249, 252, 0.6);
          margin-top: 8px;
          letter-spacing: 0.02em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @keyframes hero-stream-flow {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes hero-card-bob {
          0%   { transform: translateY(-7px) rotate(calc(var(--base-tilt, 0deg) - 1.1deg)); }
          50%  { transform: translateY(0)    rotate(var(--base-tilt, 0deg)); }
          100% { transform: translateY(7px)  rotate(calc(var(--base-tilt, 0deg) + 1.1deg)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-stream-track,
          .hero-card-bob { animation: none; }
        }
      `}</style>
    </div>
  );
}
