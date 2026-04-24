import Link from "next/link";
import Image from "next/image";
import { Show } from "@/types";
import LikeButton from "./LikeButton";

export default function ShowCard({ show }: { show: Show }) {
  return (
    <div className="group block">
      <div className="relative">
        <Link href={`/shows/${show.id}`}>
          <div
            className="aspect-[3/4] overflow-hidden mb-4 relative"
            style={{ backgroundColor: "#E8DDD0" }}
          >
            {show.poster_url ? (
              <Image
                src={show.poster_url}
                alt={show.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#9B9693" }}>
                  포스터 없음
                </span>
              </div>
            )}
          </div>
        </Link>
        <div className="absolute top-2 right-2">
          <LikeButton showId={show.id} size={20} />
        </div>
      </div>

      <Link href={`/shows/${show.id}`} className="block">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-base font-semibold leading-snug transition-colors group-hover:opacity-70"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
            >
              {show.title}
            </h3>
            {show.subtitle && (
              <span
                className="text-xs italic shrink-0 pt-0.5"
                style={{ fontFamily: "var(--font-cormorant)", color: "#9B9693" }}
              >
                {show.subtitle}
              </span>
            )}
          </div>
          <p className="text-xs tracking-wide" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            {show.venue}
          </p>
          <p className="text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            {show.schedule_start} — {show.schedule_end}
          </p>
        </div>
      </Link>
    </div>
  );
}
