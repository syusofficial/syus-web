import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShowViewTracker from "@/components/ShowViewTracker";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import ShowCard from "@/components/ShowCard";
import { isEnded, extractSchoolName, todayKey } from "@/lib/showFilters";
import type { Show } from "@/types";

export default async function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 공연 조회 (status 무관)
  const { data: show } = await supabase
    .from("shows")
    .select("*")
    .eq("id", id)
    .single();

  if (!show) notFound();

  // 비승인 공연은 본인(organizer)이거나 관리자만 볼 수 있음
  if (show.status !== "approved") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = show.organizer_id === user.id;
    const isAdmin = profile?.role === "admin";
    if (!isOwner && !isAdmin) notFound();
  }

  // 추천 공연 — 같은 학교(+3) / 같은 공연자(+3) / 같은 장르(+2) / 같은 지역(+1)
  // 진행 중·예정 + approved + 자기 자신 제외, 점수 내림차순 상위 6개
  let recommendations: Show[] = [];
  if (show.status === "approved") {
    const { data: candidatesRaw } = await supabase
      .from("shows")
      .select("*")
      .eq("status", "approved")
      .neq("id", show.id);

    const today = todayKey();
    const currentSchool = extractSchoolName(show.school_department);

    const scored = ((candidatesRaw as Show[]) ?? [])
      .filter((s) => !isEnded(s, today))
      .map((s) => {
        let score = 0;
        if (currentSchool) {
          const sSchool = extractSchoolName(s.school_department);
          if (sSchool && sSchool === currentSchool) score += 3;
        }
        if (show.organizer_id && s.organizer_id === show.organizer_id) score += 3;
        if (show.genre && s.genre === show.genre) score += 2;
        if (show.region && s.region === show.region) score += 1;
        return { show: s, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    recommendations = scored.map((x) => x.show);
  }

  // JSON-LD 구조화 데이터 — Schema.org TheaterEvent (Google 검색 Rich Result)
  const normalizeDate = (d?: string) => d?.replace(/\./g, "-") ?? undefined;
  const eventStructuredData = show.status === "approved" ? {
    "@context": "https://schema.org",
    "@type": "TheaterEvent",
    name: show.title,
    description: show.description,
    image: show.poster_url ?? undefined,
    startDate: normalizeDate(show.schedule_start),
    endDate: normalizeDate(show.schedule_end ?? show.schedule_start),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: show.venue,
      address: show.venue_address ?? show.venue,
    },
    performer: show.performer_name ? {
      "@type": "PerformingGroup",
      name: show.performer_name,
    } : undefined,
    organizer: {
      "@type": "Organization",
      name: "사유유사 SYUS",
      url: "https://syus.co.kr",
    },
    offers: show.ticket_url ? {
      "@type": "Offer",
      url: show.ticket_url,
      availability: "https://schema.org/InStock",
    } : undefined,
    inLanguage: "ko",
  } : null;

  return (
    <div className="pt-24 min-h-screen" style={{ backgroundColor: "#F4EDE3" }}>
      {eventStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData) }}
        />
      )}
      <ShowViewTracker showId={show.id} />

      {/* 비공개 상태 알림 (소유자/관리자에게만 노출됨) */}
      {show.status !== "approved" && (
        <div
          className="px-6 md:px-12 lg:px-20 py-3"
          style={{
            backgroundColor: show.status === "pending" ? "#E8DDD0" : "#EDD4D4",
            color: show.status === "pending" ? "#6D3115" : "#A63D2F",
          }}
        >
          <div className="max-w-7xl mx-auto text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
            <strong>
              {show.status === "pending" ? "🔒 비공개 미리보기 — " : "🚫 반려된 공연 — "}
            </strong>
            {show.status === "pending"
              ? "관리자 승인 대기 중인 공연입니다. 일반 사용자에게는 보이지 않습니다."
              : "관리자가 반려한 공연입니다. 일반 사용자에게는 보이지 않습니다."}
          </div>
        </div>
      )}

      {/* Back */}
      <div className="px-6 md:px-12 lg:px-20 py-8 max-w-7xl mx-auto">
        <Link
          href={show.status === "approved" ? "/shows" : "/performer"}
          className="text-xs tracking-[0.2em] uppercase transition-colors"
          style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
        >
          ← {show.status === "approved" ? "공연 목록으로" : "공연 관리로"}
        </Link>
      </div>

      <div className="px-6 md:px-12 lg:px-20 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Poster */}
          <div className="relative w-full max-w-sm mx-auto md:max-w-none">
            <div className="aspect-[3/4] relative" style={{ backgroundColor: "#E8DDD0" }}>
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
            {show.status === "approved" && (
              <div className="absolute top-3 right-3">
                <LikeButton showId={show.id} size={24} />
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
                  by{" "}
                  {show.organizer_id ? (
                    <Link
                      href={`/performer/${show.organizer_id}`}
                      className="hover:underline transition-colors"
                      style={{ color: "#6D3115" }}
                    >
                      {show.performer_name}
                    </Link>
                  ) : (
                    show.performer_name
                  )}
                </p>
              )}
            </div>

            {/* 카테고리 태그 */}
            {(show.genre || show.region) && (
              <div className="flex flex-wrap gap-2">
                {show.genre && (
                  <span className="px-3 py-1 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}>
                    {show.genre === "기타" && show.genre_custom ? show.genre_custom : show.genre}
                  </span>
                )}
                {show.region && (
                  <span className="px-3 py-1 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115", border: "1px solid #6D3115" }}>
                    {show.region}
                  </span>
                )}
              </div>
            )}

            {/* Meta box */}
            <div className="p-6 space-y-4" style={{ backgroundColor: "#E8DDD0" }}>
              {/* 소속 — 학교명만 추출하여 필터 링크로 (학과명은 함께 표기) */}
              {show.school_department && (
                <div className="grid grid-cols-[88px_1fr] gap-2">
                  <span
                    className="text-xs tracking-wider uppercase pt-0.5"
                    style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
                  >
                    소속
                  </span>
                  <span
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
                  >
                    {(() => {
                      const raw = show.school_department.trim();
                      const schoolName = raw.split(/[\s,·/]/)[0].trim();
                      const rest = raw.slice(schoolName.length).trim();
                      return (
                        <>
                          <Link
                            href={`/shows?school=${encodeURIComponent(schoolName)}`}
                            className="hover:underline"
                            style={{ color: "#6D3115" }}
                          >
                            {schoolName}
                          </Link>
                          {rest && <span style={{ color: "#9B9693", marginLeft: 4 }}>{rest}</span>}
                        </>
                      );
                    })()}
                  </span>
                </div>
              )}

              {[
                show.schedule_start && show.schedule_end
                  ? { label: "공연 기간", value: `${show.schedule_start} — ${show.schedule_end}` }
                  : null,
                show.show_time ? { label: "공연 시간", value: show.show_time } : null,
                show.running_time ? { label: "러닝 타임", value: show.running_time } : null,
                show.age_rating ? { label: "관람 연령", value: show.age_rating } : null,
                { label: "장소", value: show.venue },
                show.venue_address ? { label: "주소", value: show.venue_address } : null,
                show.cast_members?.length
                  ? { label: "출연진", value: show.cast_members.join(", ") }
                  : null,
              ]
                .filter(Boolean)
                .map((item) => (
                  <div key={item!.label} className="grid grid-cols-[88px_1fr] gap-2">
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
            {(show.directions || show.map_kakao_url || show.map_naver_url) && (
              <div>
                <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                  오시는 길
                </p>
                {show.directions && (
                  <p className="text-sm leading-relaxed mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                    {show.directions}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {show.map_kakao_url && (
                    <a
                      href={show.map_kakao_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#FEE500", color: "#1A1A1A" }}
                    >
                      카카오맵에서 보기 →
                    </a>
                  )}
                  {show.map_naver_url && (
                    <a
                      href={show.map_naver_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#03C75A", color: "#F4EDE3" }}
                    >
                      네이버지도에서 보기 →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Share */}
            {show.status === "approved" && (
              <ShareButton url={`https://syus.co.kr/shows/${show.id}`} />
            )}

            {/* CTA */}
            {show.status === "approved" && (
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
            )}
          </div>
        </div>

        {/* 추천 공연 — 매칭 결과 있을 때만 노출 */}
        {recommendations.length > 0 && (
          <section
            className="mt-24 pt-12"
            style={{ borderTop: "1px solid #D4CFC9" }}
          >
            <div className="mb-10">
              <p
                className="text-xs tracking-[0.3em] uppercase mb-3"
                style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
              >
                Related
              </p>
              <h2
                className="text-2xl md:text-3xl font-bold"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
              >
                이런 공연도 어떠세요
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
              {recommendations.map((s) => (
                <ShowCard key={s.id} show={s} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
