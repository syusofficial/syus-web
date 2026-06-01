import Link from "next/link";
import ShowCard, { type RatingSummary } from "@/components/ShowCard";
import HeroPosterStream, { type StreamItem } from "@/components/HeroPosterStream";
import { createClient } from "@/lib/supabase/server";
import { InstitutionSidebar, PartnerAdSidebar } from "@/components/PartnerSidebars";
import { isEnded, todayKey, showEndKey } from "@/lib/showFilters";
import { buildRatingMap } from "@/lib/ratings";
import type { Show } from "@/types";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  // 공연 + 좋아요 + 별점 집계 동시 로드
  const [showsRes, likesRes, ratingsRes] = await Promise.all([
    supabase.from("shows").select("*").eq("status", "approved").order("created_at", { ascending: false }),
    supabase.from("likes").select("show_id"),
    supabase.from("ratings").select("show_id, score"),
  ]);

  const today = todayKey();
  const allApproved = (showsRes.data as Show[] ?? []);
  const active = allApproved.filter((s) => !isEnded(s, today));

  // 좋아요 집계 — show_id 별 count
  const likeMap = new Map<string, number>();
  for (const row of (likesRes.data as { show_id: string }[] ?? [])) {
    likeMap.set(row.show_id, (likeMap.get(row.show_id) ?? 0) + 1);
  }

  // 별점 집계 — show_id 별 { avg, count } 요약
  const ratingMap = buildRatingMap(
    ratingsRes.data as { show_id: string; score: number }[] | null
  );

  // 인기 점수 = 조회×1 + 좋아요×3 + (평균×개수)×4
  // (예매 카운트는 자체 예매 도입 후 가중치 ×5로 추가 예정)
  const scoreOf = (s: Show) => {
    const r = ratingMap.get(s.id);
    return (
      (s.view_count ?? 0) +
      (likeMap.get(s.id) ?? 0) * 3 +
      (r ? r.avg * r.count * 4 : 0)
    );
  };

  // TOP 5 — 인기 점수 순 상위 5개 (히어로 포스터 흐름)
  const top5 = [...active]
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .slice(0, 5);

  const streamItems: StreamItem[] = top5.map((s) => ({
    id: s.id,
    title: s.title,
    poster_url: s.poster_url ?? null,
    performer_name: s.performer_name ?? null,
    schedule_start: s.schedule_start ?? null,
    venue: s.venue ?? null,
  }));

  // 운영자 픽
  const featured = active.filter((s) => s.featured).slice(0, 6);
  const featuredIds = new Set(featured.map((s) => s.id));

  // 곧 시작하는 공연
  const upcoming = active
    .filter((s) => !featuredIds.has(s.id))
    .sort((a, b) => {
      const ka = showEndKey(a) ?? "9999";
      const kb = showEndKey(b) ?? "9999";
      return ka.localeCompare(kb);
    })
    .slice(0, 6);

  const featuredOrUpcomingIds = new Set([...featuredIds, ...upcoming.map((s) => s.id)]);
  const recent = active.filter((s) => !featuredOrUpcomingIds.has(s.id)).slice(0, 6);

  return (
    <div>
      {/* ── Hero ── 무대올림 정체성 + 포스터 둥둥 격상 + Pretendard */}
      <section
        className="pt-24 md:pt-36 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top left, #5C7C8E 0%, #3B5A6B 35%, #202833 100%)",
          color: "#FBF8F1",
        }}
      >
        {/* 상단: 라벨 + 슬로건 (한 줄, 미니멀 Pretendard) */}
        <div className="px-6 md:px-12 lg:px-20 pt-10 md:pt-14 pb-6">
          <div className="max-w-[1600px] mx-auto">
            <p
              className="text-[0.7rem] tracking-[0.4em] uppercase mb-5"
              style={{ fontFamily: "var(--font-pretendard)", fontWeight: 500, opacity: 0.65 }}
            >
              무대올림 · 운영 사유유사 SYUS
            </p>

            <h1
              className="text-[2.25rem] sm:text-[3rem] md:text-[3.75rem] lg:text-[4.5rem] leading-[1.12] mb-7"
              style={{
                fontFamily: "var(--font-pretendard)",
                fontWeight: 700,
                color: "#FBF8F1",
                letterSpacing: "-0.035em",
                wordBreak: "keep-all",
                textWrap: "balance",
              }}
            >
              오늘, 어느 대학의 <span style={{ color: "#C8D96F", fontWeight: 800 }}>막</span>이 오른다.
            </h1>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p
                  className="text-base md:text-lg leading-relaxed mb-2"
                  style={{
                    fontFamily: "var(--font-pretendard)",
                    fontWeight: 400,
                    color: "#FBF8F1",
                    wordBreak: "keep-all",
                  }}
                >
                  대학 무대예술 공연을 올리고, 지역 관객이 무료 좌석을 예약하는 곳.
                </p>
                <p
                  className="text-xs tracking-wider"
                  style={{
                    fontFamily: "var(--font-pretendard)",
                    fontWeight: 400,
                    color: "#FBF8F1",
                    opacity: 0.55,
                  }}
                >
                  연극 · 뮤지컬 · 무용 · 발레 · 국악 · 음악 · 전통연희
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/shows"
                  className="inline-block px-6 py-3 text-sm tracking-wider transition-colors"
                  style={{
                    fontFamily: "var(--font-pretendard)",
                    fontWeight: 600,
                    backgroundColor: "#C8D96F",
                    color: "#202833",
                  }}
                >
                  공연 둘러보기 →
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-block px-6 py-3 text-sm tracking-wider transition-colors"
                  style={{
                    fontFamily: "var(--font-pretendard)",
                    fontWeight: 500,
                    border: "1px solid rgba(248, 249, 252, 0.4)",
                    color: "#FBF8F1",
                  }}
                >
                  무대 올리기
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 시각 자산: 포스터 둥둥 격상 영역 (히어로 중앙·하단의 큰 영역) */}
        {streamItems.length > 0 && (
          <div className="pt-4 pb-10">
            <div className="px-6 md:px-12 lg:px-20 mb-3">
              <div className="max-w-[1600px] mx-auto flex items-baseline justify-between gap-4 flex-wrap">
                <p
                  className="text-[0.7rem] tracking-[0.35em] uppercase"
                  style={{ fontFamily: "var(--font-pretendard)", color: "#C8D96F", fontWeight: 600 }}
                >
                  Top 5 · 지금 가장 주목받는 무대
                </p>
                <p
                  className="text-[0.68rem] tracking-wider"
                  style={{ fontFamily: "var(--font-pretendard)", fontWeight: 400, color: "rgba(248,249,252,0.45)" }}
                >
                  조회 · 좋아요 · 별점 종합
                </p>
              </div>
            </div>
            <HeroPosterStream items={streamItems} />
          </div>
        )}

        {/* 히어로 푸터 라인 */}
        <div className="px-6 md:px-12 lg:px-20 pb-5">
          <div
            className="max-w-[1600px] mx-auto flex items-center justify-between py-4"
            style={{ borderTop: "1px solid rgba(248, 249, 252, 0.18)" }}
          >
            <span
              className="text-[0.7rem] tracking-[0.25em] uppercase"
              style={{ fontFamily: "var(--font-pretendard)", fontWeight: 500, opacity: 0.55 }}
            >
              지역 × 시기 × 장르
            </span>
            <span
              className="text-[0.7rem] tracking-[0.25em] uppercase"
              style={{ fontFamily: "var(--font-pretendard)", fontWeight: 500, opacity: 0.55 }}
            >
              ↓ 공연 발견
            </span>
          </div>
        </div>
      </section>

      {/* ── 정체성 띠 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-20 md:py-24"
        style={{ backgroundColor: "#3B5A6B", color: "#FBF8F1" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-12 md:gap-20 items-start">
            <div>
              <p
                className="text-xs tracking-[0.4em] uppercase mb-6"
                style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
              >
                About 무대올림
              </p>
              <p
                className="text-[1.5rem] sm:text-[1.85rem] md:text-[2.25rem] leading-snug font-light"
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  color: "#FBF8F1",
                  wordBreak: "keep-all",
                  textWrap: "balance",
                }}
              >
                대학의 막은
                <br />
                매주 어딘가에서 오릅니다.
                <br />
                <span style={{ opacity: 0.65 }}>그 무대를 당신의 동네로.</span>
              </p>
            </div>

            <div className="space-y-7">
              {[
                {
                  num: "01",
                  title: "올린다",
                  desc: "학생 공연자가 무대를 올리고, 운영자가 한 번 더 정성스레 다듬어 공연 페이지로 띄웁니다.",
                },
                {
                  num: "02",
                  title: "발견한다",
                  desc: "지역 · 시기 · 장르 세 축으로 좁혀, 이번 주말 우리 동네 대학 무대를 찾아냅니다.",
                },
                {
                  num: "03",
                  title: "예약한다",
                  desc: "관객도 학생 공연자도 끝까지 무료. 무료 좌석을 미리 확보해 자리를 비워두지 않습니다.",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="grid grid-cols-[48px_1fr] gap-5 items-start pt-6"
                  style={{ borderTop: "1px solid rgba(248, 249, 252, 0.18)" }}
                >
                  <span
                    className="text-2xl"
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      color: "#C8D96F",
                      opacity: 0.85,
                      lineHeight: 1,
                    }}
                  >
                    {item.num}
                  </span>
                  <div>
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        fontFamily: "var(--font-noto-sans-kr)",
                        color: "#FBF8F1",
                        opacity: 0.72,
                        wordBreak: "keep-all",
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Shows Section ── */}
      <section
        className="px-6 md:px-12 lg:px-16 xl:px-8 py-24 md:py-32"
        style={{ backgroundColor: "#FBF8F1" }}
      >
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_220px] gap-8 xl:gap-8">
            <InstitutionSidebar />

            <div className="space-y-20">
              {featured.length > 0 && (
                <SectionGroup
                  badge="Editor's Pick"
                  title="이번 달 주목할 만한 공연"
                  shows={featured}
                  ratingMap={ratingMap}
                  accent
                />
              )}

              {upcoming.length > 0 && (
                <SectionGroup
                  badge="Upcoming"
                  title="곧 시작하는 공연"
                  shows={upcoming}
                  ratingMap={ratingMap}
                />
              )}

              {recent.length > 0 && (
                <SectionGroup
                  badge="Recent"
                  title="최근 등록"
                  shows={recent}
                  ratingMap={ratingMap}
                />
              )}

              {featured.length === 0 && upcoming.length === 0 && recent.length === 0 && (
                <div className="text-center py-24">
                  <p className="text-base mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}>
                    곧 첫 무대가 오릅니다.
                  </p>
                  <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}>
                    공연자분들의 무대를 가장 먼저 만나보실 수 있도록 준비 중입니다.
                  </p>
                </div>
              )}

              <div className="pt-8 text-center" style={{ borderTop: "1px solid #D8D3C9" }}>
                <Link
                  href="/shows"
                  className="inline-block px-8 py-3 text-xs tracking-widest uppercase transition-colors"
                  style={{
                    fontFamily: "var(--font-inter)",
                    color: "#3B5A6B",
                    border: "1px solid #3B5A6B",
                  }}
                >
                  전체 공연 보기 →
                </Link>
              </div>
            </div>

            <PartnerAdSidebar />
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24" style={{ backgroundColor: "#202833" }}>
        <div className="max-w-7xl mx-auto text-center">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
          >
            Join 무대올림
          </p>
          <h2
            className="text-[2rem] md:text-[3rem] font-light mb-5"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1", wordBreak: "keep-all", textWrap: "balance" }}
          >
            당신의 무대를, 누군가의 주말로.
          </h2>
          <p
            className="text-sm mb-10 max-w-md mx-auto leading-relaxed"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "rgba(248,249,252,0.6)", wordBreak: "keep-all" }}
          >
            대학 무대예술 공연자라면 회원가입 후 무대를 올릴 수 있습니다.
            <br />
            운영자가 한 번 더 정성스레 다듬어 공연 페이지로 띄웁니다.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#C8D96F",
                color: "#202833",
                fontWeight: 600,
              }}
            >
              회원가입
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 text-sm tracking-wider"
              style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid rgba(248,249,252,0.45)", color: "#FBF8F1" }}
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 메인 페이지 큐레이션 섹션 그룹
// ──────────────────────────────────────────────────
function SectionGroup({
  badge,
  title,
  shows,
  accent,
  ratingMap,
}: {
  badge: string;
  title: string;
  shows: Show[];
  accent?: boolean;
  ratingMap: Map<string, RatingSummary>;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #D8D3C9" }}>
        <div>
          <p
            className="text-xs tracking-[0.3em] uppercase mb-2"
            style={{
              fontFamily: "var(--font-inter)",
              color: accent ? "#3B5A6B" : "#7A746C",
              fontWeight: accent ? 600 : 400,
            }}
          >
            {badge}
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
          >
            {title}
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-x-6 gap-y-12">
        {shows.map((show) => (
          <ShowCard key={show.id} show={show} rating={ratingMap.get(show.id) ?? null} />
        ))}
      </div>
    </div>
  );
}
