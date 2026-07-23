import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShowViewTracker from "@/components/ShowViewTracker";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import RatingInput from "@/components/RatingInput";
import ReviewInput from "@/components/ReviewInput";
import ReviewList from "@/components/ReviewList";
import ShowCard from "@/components/ShowCard";
import SeatReservationForm from "@/components/SeatReservationForm";
import { isEnded, extractSchoolName, todayKey } from "@/lib/showFilters";
import { buildBreadcrumbList } from "@/lib/structuredData";
import { buildRatingMap } from "@/lib/ratings";
import { toReviewView, type ReviewView } from "@/lib/reviews";
import type { Show, Review, SessionReservationSummary } from "@/types";

// 좌석 신청 확정 합계·정원·마감여부 요약 (get_show_reservation_summary RPC 반환 shape)
//
// 2026-07-13 버그 메모: 아래 ShowDetailPage 안에서 예전엔 `let reservationSummary: {...} | null = null`
// 로 인라인 선언하고 `summaryData as typeof reservationSummary` 로 캐스팅했다.
// 이 "typeof 자기참조" 패턴이 TypeScript 컴파일러 버그(제어 흐름 분석이 그 대입식 자체를
// 평가하는 시점에 typeof를 순환 참조로 풀면서 타입을 `never`로 좁혀버림)를 유발해
// `reservationSummary?.capacity` 등 이후 모든 프로퍼티 접근이 "does not exist on type 'never'"
// 로 타입에러가 났다(→ `next build`/Vercel 배포가 7/7부터 전부 실패).
// 이름 있는 타입으로 캐스팅하면(= typeof 자기참조를 없애면) 문제가 사라진다.
type ReservationSummary = {
  confirmed_total: number;
  capacity: number | null;
  reservation_closed: boolean;
  /** 회차별 잔여석 — 예약 시스템 B1(2026-07-24). 마이그레이션 전이면 undefined. */
  sessions?: SessionReservationSummary[];
};

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

  // 현재 사용자 — 권한 체크 + 별점 본인 점수 양쪽에서 사용
  const { data: { user } } = await supabase.auth.getUser();

  // 비승인 공연은 본인(organizer)이거나 관리자만 볼 수 있음
  if (show.status !== "approved") {
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

  // 좌석 신청 확정 합계·정원·마감여부 — 매진 표시 판단용 (개별 신청자 정보는 노출 안 함)
  let reservationSummary: ReservationSummary | null = null;
  if (show.status === "approved" && show.use_inhouse_reservation !== false) {
    const { data: summaryData } = await supabase.rpc("get_show_reservation_summary", { p_show_id: id });
    reservationSummary = summaryData as ReservationSummary | null;
  }

  // 별점 데이터 — 평균·개수·본인 점수
  const { data: ratingsData } = await supabase
    .from("ratings")
    .select("score, user_id")
    .eq("show_id", id);
  const ratings = (ratingsData as { score: number; user_id: string }[] | null) ?? [];
  const ratingCount = ratings.length;
  const ratingAvg = ratingCount > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratingCount
    : null;
  const myScore = user
    ? ratings.find((r) => r.user_id === user.id)?.score ?? null
    : null;

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

  // 후기 데이터 — 공개 + 본인 hidden/pending (수정 가능하도록)
  let reviewViews: ReviewView[] = [];
  let myReviewBody: string | null = null;
  if (show.status === "approved") {
    const { data: publicReviews } = await supabase
      .from("reviews")
      .select("id, show_id, user_id, body, status, report_count, created_at, profiles!inner(name)")
      .eq("show_id", id)
      .eq("status", "public")
      .order("created_at", { ascending: false })
      .limit(50);

    // 본인 후기 (status 무관) — 수정·삭제 가능하도록
    let myReviewRow: Review | null = null;
    if (user) {
      const { data: mine } = await supabase
        .from("reviews")
        .select("id, show_id, user_id, body, status, report_count, created_at")
        .eq("show_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      myReviewRow = (mine as Review | null) ?? null;
      myReviewBody = myReviewRow?.body ?? null;
    }

    // 본인 신고 review_id 목록 — reportedByMe 판정
    const reportedSet = new Set<string>();
    if (user) {
      const { data: reportedRows } = await supabase
        .from("review_reports")
        .select("review_id")
        .eq("reporter_id", user.id);
      ((reportedRows as { review_id: string }[] | null) ?? []).forEach((r) =>
        reportedSet.add(r.review_id)
      );
    }

    type PublicRow = Review & { profiles: { name: string | null } | null };
    const publicViews = ((publicReviews as PublicRow[] | null) ?? []).map((r) =>
      toReviewView(r, user?.id ?? null, reportedSet)
    );

    // 본인 후기가 hidden/pending 상태면 본인용으로 추가 (public이면 이미 위 목록에 포함됨)
    if (myReviewRow && myReviewRow.status !== "public") {
      const myView = toReviewView(myReviewRow, user!.id, reportedSet);
      reviewViews = [myView, ...publicViews.filter((v) => v.id !== myView.id)];
    } else {
      reviewViews = publicViews;
    }
  }

  // 추천 공연들의 별점 요약 (있을 때만 쿼리)
  let recRatingMap = new Map<string, { avg: number; count: number }>();
  if (recommendations.length > 0) {
    const recIds = recommendations.map((r) => r.id);
    const { data: recRatings } = await supabase
      .from("ratings")
      .select("show_id, score")
      .in("show_id", recIds);
    recRatingMap = buildRatingMap(recRatings as { show_id: string; score: number }[] | null);
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
    offers: (show.reservation_url || show.ticket_url) ? {
      "@type": "Offer",
      url: show.reservation_url ?? show.ticket_url,
      availability: "https://schema.org/InStock",
      // 관람료는 학교/공연팀 방침에 따라 달라질 수 있어 가격을 단정하지 않는다(법적 리스크 방지).
      // 예약 링크가 있다는 것만 명시하고, 실제 무료 여부는 공연 상세 안내를 따른다.
    } : undefined,
    inLanguage: "ko",
  } : null;

  const breadcrumbData = show.status === "approved"
    ? buildBreadcrumbList([
        { name: "홈", path: "/" },
        { name: "공연", path: "/muol/shows" },
        { name: show.title },
      ])
    : null;

  return (
    <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
      {eventStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData) }}
        />
      )}
      {breadcrumbData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        />
      )}
      <ShowViewTracker showId={show.id} />

      {/* 비공개 상태 알림 (소유자/관리자에게만 노출됨) */}
      {show.status !== "approved" && (
        <div
          className="px-6 md:px-12 lg:px-20 py-3"
          style={{
            backgroundColor: show.status === "pending" ? "#E6E1D6" : "#EDD4D4",
            color: show.status === "pending" ? "#0B5563" : "#A63D2F",
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
          href={show.status === "approved" ? "/muol/shows" : "/muol/performer"}
          className="text-xs tracking-[0.2em] uppercase transition-colors"
          style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
        >
          ← {show.status === "approved" ? "공연 목록으로" : "공연 관리로"}
        </Link>
      </div>

      <div className="px-6 md:px-12 lg:px-20 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Poster */}
          <div className="relative w-full max-w-sm mx-auto md:max-w-none">
            <div className="aspect-[3/4] relative" style={{ backgroundColor: "#E6E1D6" }}>
              {show.poster_url ? (
                <Image src={show.poster_url} alt={show.title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#5A4A3E" }}>
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
                <p className="text-sm italic mb-2" style={{ fontFamily: "var(--font-cormorant)", color: "#5A4A3E" }}>
                  {show.subtitle}
                </p>
              )}
              <h1
                className="text-4xl md:text-5xl font-bold leading-tight mb-2"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
              >
                {show.title}
              </h1>
              {show.performer_name && (
                <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                  by{" "}
                  {show.organizer_id ? (
                    <Link
                      href={`/muol/performer/${show.organizer_id}`}
                      className="hover:underline transition-colors"
                      style={{ color: "#0B5563" }}
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
            {(show.genre || show.region || show.show_category) && (
              <div className="flex flex-wrap gap-2">
                {show.genre && (
                  <span className="px-3 py-1 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}>
                    {show.genre === "기타" && show.genre_custom ? show.genre_custom : show.genre}
                  </span>
                )}
                {show.show_category && (
                  <span className="px-3 py-1 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E6E1D6", color: "#0B5563" }}>
                    {show.show_category}
                  </span>
                )}
                {show.region && (
                  <span className="px-3 py-1 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", border: "1px solid #0B5563" }}>
                    {show.region}
                  </span>
                )}
              </div>
            )}

            {/* Meta box */}
            <div className="p-6 space-y-4" style={{ backgroundColor: "#E6E1D6" }}>
              {/* 소속 — 학교명만 추출하여 필터 링크로 (학과명은 함께 표기) */}
              {show.school_department && (
                <div className="grid grid-cols-[88px_1fr] gap-2">
                  <span
                    className="text-xs tracking-wider uppercase pt-0.5"
                    style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
                  >
                    소속
                  </span>
                  <span
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
                  >
                    {(() => {
                      const raw = show.school_department.trim();
                      const schoolName = raw.split(/[\s,·/]/)[0].trim();
                      const rest = raw.slice(schoolName.length).trim();
                      return (
                        <>
                          <Link
                            href={`/muol/shows?school=${encodeURIComponent(schoolName)}`}
                            className="hover:underline"
                            style={{ color: "#0B5563" }}
                          >
                            {schoolName}
                          </Link>
                          {rest && <span style={{ color: "#5A4A3E", marginLeft: 4 }}>{rest}</span>}
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
                      style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
                    >
                      {item!.label}
                    </span>
                    <span
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
                    >
                      {item!.value}
                    </span>
                  </div>
                ))}
            </div>

            {/* Description */}
            <div>
              <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                작품 소개
              </p>
              <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
                {show.description}
              </p>
            </div>

            {/* Directions */}
            {(show.directions || show.map_kakao_url || show.map_naver_url) && (
              <div>
                <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                  오시는 길
                </p>
                {show.directions && (
                  <p className="text-sm leading-relaxed mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
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
                      style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#FEE500", color: "#4A3B33" }}
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
                      style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#03C75A", color: "#F0EEE9" }}
                    >
                      네이버지도에서 보기 →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Rating — 관람 후 별점 (1인 1평) */}
            {show.status === "approved" && (
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC1" }}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                  <p
                    className="text-sm tracking-wide"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563", fontWeight: 600 }}
                  >
                    관람하셨나요? 별점을 남겨주세요.
                  </p>
                  {ratingAvg !== null && (
                    <p
                      className="text-xs"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
                    >
                      <span style={{ color: "#5C2A42", fontSize: "0.95rem", marginRight: 4 }}>★</span>
                      <span style={{ color: "#4A3B33", fontWeight: 600 }}>{ratingAvg.toFixed(1)}</span>
                      <span style={{ marginLeft: 4 }}>· {ratingCount}명 평가</span>
                    </p>
                  )}
                </div>
                <p
                  className="text-[0.7rem] mb-4 leading-relaxed"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                >
                  한 공연당 한 명이 한 번 평가합니다. 다시 누르시면 점수가 갱신되고, 본인 점수는
                  언제든 삭제하실 수 있습니다.
                </p>
                <RatingInput
                  showId={show.id}
                  isLoggedIn={!!user}
                  initialMyScore={myScore}
                />
              </div>
            )}

            {/* Reviews — 공연 후기 (자동 검열 A 사전 + C OpenAI Moderation 2단) */}
            {show.status === "approved" && (
              <div
                className="mt-6 pt-6"
                style={{ borderTop: "1px solid #D4CFC1" }}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <p
                    className="text-sm tracking-wide"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563", fontWeight: 600 }}
                  >
                    공연 후기
                  </p>
                  <p
                    className="text-[0.7rem]"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
                  >
                    {reviewViews.filter((r) => r.status === "public").length}개
                  </p>
                </div>
                <p
                  className="text-[0.7rem] mb-4 leading-relaxed"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                >
                  비방·욕설·차별 표현은 자동 차단되며, 누락된 부적절 후기는 신고하시면 운영자가 24시간 내 확인합니다.
                  본인이 작성한 후기는 언제든 삭제할 수 있습니다.
                </p>

                <div className="mb-6">
                  <ReviewInput
                    showId={show.id}
                    isLoggedIn={!!user}
                    initialBody={myReviewBody}
                  />
                </div>

                <ReviewList showId={show.id} reviews={reviewViews} />
              </div>
            )}

            {/* Share */}
            {show.status === "approved" && (
              <ShareButton url={`https://syus.co.kr/shows/${show.id}`} />
            )}

            {/* CTA */}
            {show.status === "approved" && show.use_inhouse_reservation !== false && (
              <div className="pt-2 flex flex-col sm:flex-row gap-3 items-start">
                <SeatReservationForm
                  showId={show.id}
                  defaultName={user?.user_metadata?.name as string | undefined}
                  initialCapacity={reservationSummary?.capacity ?? show.capacity ?? null}
                  initialConfirmedTotal={reservationSummary?.confirmed_total ?? 0}
                  initialReservationClosed={reservationSummary?.reservation_closed ?? show.reservation_closed ?? false}
                  initialSessions={reservationSummary?.sessions ?? []}
                />
                <Link
                  href="/muol/contact"
                  className="px-8 py-4 text-sm tracking-wider text-center transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid #D4CFC1", color: "#4A3B33" }}
                >
                  문의하기
                </Link>
              </div>
            )}
            {show.status === "approved" && show.use_inhouse_reservation !== false && (
              <p
                className="text-xs leading-relaxed pt-2"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
              >
                ⓘ 신청은 좌석을 희망하신다는 접수이며, 실제 입장이 100% 보장되는 것은 아닙니다.
                입력하신 이름·연락처는 이 공연의 좌석 신청 확인 목적으로만 쓰입니다.
              </p>
            )}

            {/* 자체 예약 미사용 공연 — 기존 외부 링크 방식 (전환기 호환) */}
            {show.status === "approved" && show.use_inhouse_reservation === false && (
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {show.reservation_url ? (
                  <a
                    href={show.reservation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 text-sm tracking-wider text-center transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      backgroundColor: "#5C2A42",
                      color: "#F0EEE9",
                      fontWeight: 600,
                    }}
                  >
                    좌석 예약하기 →
                  </a>
                ) : show.ticket_url ? (
                  <a
                    href={show.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 text-sm tracking-wider text-center transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
                  >
                    티켓 예매하기 →
                  </a>
                ) : (
                  <span
                    className="px-8 py-4 text-sm tracking-wider text-center cursor-not-allowed"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#D4CFC1", color: "#5A4A3E" }}
                    aria-disabled="true"
                  >
                    예약 링크 없음
                  </span>
                )}
                <Link
                  href="/muol/contact"
                  className="px-8 py-4 text-sm tracking-wider text-center transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid #D4CFC1", color: "#4A3B33" }}
                >
                  문의하기
                </Link>
              </div>
            )}

            {/* 외부 예약 폼 PII 고지 (법무·CS 권고) */}
            {show.status === "approved" && show.use_inhouse_reservation === false && show.reservation_url && (
              <p
                className="text-xs leading-relaxed pt-2"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
              >
                ⓘ 외부 예약 폼(구글폼·네이버폼 등)으로 이동합니다. 입력하신 개인정보는 무대올림이
                보관하지 않으며, 해당 폼을 운영하는 공연자(주최 측)가 직접 관리합니다.
              </p>
            )}
          </div>
        </div>

        {/* 추천 공연 — 매칭 결과 있을 때만 노출 */}
        {recommendations.length > 0 && (
          <section
            className="mt-24 pt-12"
            style={{ borderTop: "1px solid #D4CFC1" }}
          >
            <div className="mb-10">
              <p
                className="text-xs tracking-[0.3em] uppercase mb-3"
                style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
              >
                Related
              </p>
              <h2
                className="text-2xl md:text-3xl font-bold"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
              >
                이런 공연도 어떠세요
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
              {recommendations.map((s) => (
                <ShowCard key={s.id} show={s} rating={recRatingMap.get(s.id) ?? null} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
