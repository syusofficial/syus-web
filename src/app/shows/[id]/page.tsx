import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: show } = await supabase
    .from("shows")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!show) notFound();

  return (
    <div className="pt-24 min-h-screen" style={{ backgroundColor: "#F4EDE3" }}>
      {/* Back */}
      <div className="px-6 md:px-12 lg:px-20 py-8 max-w-7xl mx-auto">
        <Link
          href="/"
          className="text-xs tracking-[0.2em] uppercase transition-colors"
          style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
        >
          ← 공연 목록으로
        </Link>
      </div>

      <div className="px-6 md:px-12 lg:px-20 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Poster */}
          <div className="aspect-[3/4] relative w-full max-w-sm mx-auto md:max-w-none" style={{ backgroundColor: "#E8DDD0" }}>
            {show.poster_url ? (
              <Image src={show.poster_url} alt={show.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-sm" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#9B9693" }}>
                  포스터 없음
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-8">
            <div>
              {show.subtitle && (
                <p className="text-sm italic mb-2" style={{ fontFamily: "var(--font-cormorant)", color: "#9B9693" }}>
                  {show.subtitle}
                </p>
              )}
              <h1
                className="text-4xl md:text-5xl font-bold leading-tight mb-2"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
              >
                {show.title}
              </h1>
              {show.performer_name && (
                <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  by {show.performer_name}
                </p>
              )}
            </div>

            {/* Meta box */}
            <div className="p-6 space-y-4" style={{ backgroundColor: "#E8DDD0" }}>
              {[
                show.schedule_start && show.schedule_end
                  ? { label: "일정", value: `${show.schedule_start} — ${show.schedule_end}` }
                  : null,
                { label: "장소", value: show.venue },
                show.venue_address ? { label: "주소", value: show.venue_address } : null,
                show.cast_members?.length
                  ? { label: "출연진", value: show.cast_members.join(", ") }
                  : null,
              ]
                .filter(Boolean)
                .map((item) => (
                  <div key={item!.label} className="grid grid-cols-[72px_1fr] gap-2">
                    <span
                      className="text-xs tracking-wider uppercase pt-0.5"
                      style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
                    >
                      {item!.label}
                    </span>
                    <span
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
                    >
                      {item!.value}
                    </span>
                  </div>
                ))}
            </div>

            {/* Description */}
            <div>
              <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                작품 소개
              </p>
              <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                {show.description}
              </p>
            </div>

            {/* Directions */}
            {show.directions && (
              <div>
                <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                  오시는 길
                </p>
                <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                  {show.directions}
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {show.ticket_url ? (
                <a
                  href={show.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 text-sm tracking-wider text-center transition-colors"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
                >
                  티켓 예매하기
                </a>
              ) : (
                <span
                  className="px-8 py-4 text-sm tracking-wider text-center"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#D4CFC9", color: "#9B9693" }}
                >
                  예매 링크 없음
                </span>
              )}
              <Link
                href="/contact"
                className="px-8 py-4 text-sm tracking-wider text-center transition-colors"
                style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid #D4CFC9", color: "#1A1A1A" }}
              >
                문의하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
