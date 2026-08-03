import Link from "next/link";
import Image from "next/image";
import { Show } from "@/types";
import { formatShowPeriod } from "@/lib/showDate";
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
              /* 포스터 미등록 — 빈 회색 사각형 대신 공연 제목을 그대로 조판해 '타이포 포스터'로 세운다.
                 승인 공연이 적은 초기에는 이 자리가 곧 홈의 첫인상이라, 빈 상태가 아니라
                 한 장의 판으로 읽혀야 한다. 직각·무그림자 규율(/muol 전체 rounded·shadow 0건)은 그대로. */
              <div
                className="w-full h-full flex flex-col justify-end p-5"
                style={{ background: "linear-gradient(160deg, #E6E1D6 0%, #D9D3C4 100%)" }}
              >
                <span
                  className="text-xs tracking-[0.25em] uppercase mb-2"
                  style={{ fontFamily: "var(--font-inter)", color: "#5F5145" }}
                >
                  {/* 장르가 비어 있으면(빈 문자열 포함) STAGE로 — ?? 대신 ||를 쓰는 이유 */}
                  {show.genre || "STAGE"}
                </span>
                <span
                  className="text-lg leading-snug line-clamp-4"
                  style={{
                    fontFamily: "var(--font-noto-serif-kr)",
                    color: "#4A3B33",
                    wordBreak: "keep-all",
                    fontWeight: 700,
                  }}
                >
                  {show.title}
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
              /* 2026-08-03 색 위계 B안 — 카드 제목은 본문 먹빛(#4A3B33, 9.22:1).
                 청록 제목은 포스터보다 튀어서 포스터가 주인공이 되지 못했다. */
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
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
            {/* 2026-08-03: 두 값을 그대로 이어붙이던 것을 공통 포맷으로. 종료일이 없으면
                " — " 만 덩그러니 남던 문제도 함께 해소된다(같은 날 공연이면 하루만 표기). */}
            {formatShowPeriod(show.schedule_start, show.schedule_end, { weekday: false })}
          </p>
        </div>
      </Link>
    </div>
  );
}
