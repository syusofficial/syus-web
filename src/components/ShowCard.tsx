import Link from "next/link";
import Image from "next/image";
import { Show } from "@/types";
import LikeButton from "./LikeButton";

export type RatingSummary = {
  avg: number;
  count: number;
};

export default function ShowCard({
  show,
  rating,
}: {
  show: Show;
  rating?: RatingSummary | null;
}) {
  return (
    <div className="group block">
      <div className="relative">
        <Link href={`/muol/shows/${show.id}`}>
          <div
            className="aspect-[3/4] overflow-hidden mb-4 relative"
            style={{ backgroundColor: "#E6E1D6" }}
          >
            {show.poster_url ? (
              <Image
                src={show.poster_url}
                alt={show.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#5A4A3E" }}>
                  포스터 없음
                </span>
              </div>
            )}
          </div>
        </Link>
        <div className="absolute top-2 right-2">
          <LikeButton showId={show.id} size={20} />
        </div>
        {/* 별점 평균 — 좌상단 작은 배지 (평가 1건 이상일 때만) */}
        {rating && rating.count > 0 && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1"
            style={{
              backgroundColor: "rgba(74, 59, 51, 0.85)", // Silhouette #4A3B33 — 구 팔레트(#1B2842 딥 네이비) 교체
              color: "var(--color-damson-light)",
              fontFamily: "var(--font-inter)",
              fontSize: "0.7rem",
              fontWeight: 600,
              backdropFilter: "blur(4px)",
            }}
          >
            <span style={{ lineHeight: 1 }}>★</span>
            <span style={{ color: "#F0EEE9", lineHeight: 1 }}>
              {rating.avg.toFixed(1)}
            </span>
            <span style={{ color: "rgba(248,249,252,0.6)", fontSize: "0.62rem", marginLeft: 1, lineHeight: 1 }}>
              ({rating.count})
            </span>
          </div>
        )}
      </div>

      <Link href={`/muol/shows/${show.id}`} className="block">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-base font-semibold leading-snug transition-colors group-hover:opacity-70 min-w-0 line-clamp-2"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563", wordBreak: "keep-all" }}
            >
              {show.title}
            </h3>
            {show.subtitle && (
              <span
                className="text-xs italic pt-0.5"
                style={{ fontFamily: "var(--font-cormorant)", color: "#5A4A3E" }}
              >
                {show.subtitle}
              </span>
            )}
          </div>
          <p className="text-xs tracking-wide" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
            {show.venue}
          </p>
          <p className="text-xs" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            {show.schedule_start} — {show.schedule_end}
          </p>
        </div>
      </Link>
    </div>
  );
}
