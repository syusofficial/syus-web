"use client";

import Link from "next/link";
import Image from "next/image";

export type StreamItem = {
  id: string;
  title: string;
  poster_url: string | null;
  performer_name: string | null;
  schedule_start: string | null;
  venue: string | null;
};

/**
 * 무대올림 — 히어로 포스터 가로 무한 흐름.
 * TOP 5 인기 공연을 좌→우 흐름으로 노출 (사장님 표현: "유사하듯이 흘러가는 효과").
 * 호버 시 정지, 클릭 시 공연 상세로 이동.
 */
export default function HeroPosterStream({ items }: { items: StreamItem[] }) {
  if (items.length === 0) return null;

  // 무한 루프를 위해 두 세트 복제 — animation translateX -50% 시 처음 위치로 복귀
  const duplicated = [...items, ...items];

  return (
    <div className="hero-stream-wrapper">
      <div className="hero-stream-track">
        {duplicated.map((item, idx) => (
          <Link
            key={`${item.id}-${idx}`}
            href={`/shows/${item.id}`}
            className="hero-stream-card group"
          >
            <div className="hero-stream-poster">
              {item.poster_url ? (
                <Image
                  src={item.poster_url}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 220px, 280px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  unoptimized
                />
              ) : (
                <div className="hero-stream-placeholder">
                  <span style={{ fontFamily: "var(--font-cormorant)", fontSize: "2rem" }}>
                    無
                  </span>
                </div>
              )}
              {/* 랭크 배지 (1~5, 복제분은 무시) */}
              {idx < items.length && (
                <div className="hero-stream-rank">
                  <span style={{ fontFamily: "var(--font-cormorant)" }}>
                    {idx + 1}
                  </span>
                </div>
              )}
            </div>
            <div className="hero-stream-caption">
              <p className="hero-stream-title" title={item.title}>
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
          </Link>
        ))}
      </div>

      <style>{`
        .hero-stream-wrapper {
          overflow: hidden;
          width: 100%;
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          padding: 12px 0;
        }
        .hero-stream-track {
          display: flex;
          gap: 28px;
          width: max-content;
          animation: hero-stream-flow 48s linear infinite;
        }
        .hero-stream-wrapper:hover .hero-stream-track {
          animation-play-state: paused;
        }
        .hero-stream-card {
          display: block;
          flex-shrink: 0;
          width: 220px;
          color: #F8F9FC;
        }
        @media (min-width: 768px) {
          .hero-stream-card { width: 260px; }
        }
        .hero-stream-poster {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #1B2842;
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
        }
        .hero-stream-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(248, 249, 252, 0.4);
          background: linear-gradient(135deg, #1B2842 0%, #274E9B 100%);
        }
        .hero-stream-rank {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F5C84F;
          color: #1B2842;
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1;
        }
        .hero-stream-caption {
          padding-top: 14px;
        }
        .hero-stream-title {
          font-family: var(--font-noto-serif-kr);
          font-size: 0.95rem;
          font-weight: 600;
          color: #F8F9FC;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }
        .hero-stream-meta {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.72rem;
          color: rgba(248, 249, 252, 0.55);
          margin-top: 6px;
          letter-spacing: 0.03em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @keyframes hero-stream-flow {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-stream-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
