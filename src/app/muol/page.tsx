import Link from "next/link";
import ShowCard, { type RatingSummary } from "@/components/ShowCard";
// 2026-06-16 사장님 재설계: HeroUnveilScroll(둥둥 떠다니는 대각선 포스터) 폐기 — 로딩 렉/카피 묻힘 문제.
// → 새 히어로는 nav 밑에 HeroPosterStream(물결처럼 이어지는 가로 흐름)을 크게 띄우고, 그 아래 H1·부제·CTA.
// HeroUnveilScroll.tsx 파일 자체는 보존(미래 재사용/복원 여지). page.tsx에서만 호출 해제.
import HeroPosterStream, { type StreamItem } from "@/components/HeroPosterStream";
import { createClient } from "@/lib/supabase/server";
import { InstitutionSidebar, PartnerAdSidebar } from "@/components/PartnerSidebars";
import MobilePartnerStrip from "@/components/MobilePartnerStrip";
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

  // WebSite + Organization JSON-LD — 검색 결과 사이트링크 검색 박스 + 브랜드 카드 노출 보강
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "무대올림",
    alternateName: "사유유사 SYUS",
    url: "https://syus.co.kr",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://syus.co.kr/muol/shows?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "사유유사 SYUS",
    alternateName: "무대올림",
    url: "https://syus.co.kr",
    logo: "https://syus.co.kr/og-default.png",
    description:
      "한국 대학 무대예술의 진흥을 위해 — 대학 무대예술 공연을 올리고 지역 관객이 좌석을 예약하는 플랫폼. 공연팀에게 등록·게재 수수료를 받지 않습니다.",
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {/* ── Hero (2026-06-16 재설계) ──
        * 사장님 결정: 둥둥 떠다니는 대각선 포스터(HeroUnveilScroll) 폐기.
        *   - 이유 1: 옵션 2 최적화에도 로딩 렉 잔존 (5장 포스터 동시 로드 + sticky 160vh)
        *   - 이유 2: 거대한 그래픽이 H1·CTA를 묻어 첫 화면 정보 위계 약함
        * 새 구조 (위에서 아래):
        *   (A) nav 밑에 HeroPosterStream(물결처럼 가로로 흐르는 포스터) — 크게
        *   (B) 그 아래 H1 "오늘도 우리들의 막이 오릅니다" + 부제 + CTA 2개
        * 첫 viewport 안에 (A)+(B)가 자연스럽게 들어가도록 패딩 조절.
        * 빈 상태(공연 0개): (A)는 안내 카드 1줄로 대체, (B)는 그대로 노출.
        */}
      <section
        className="relative"
        style={{ backgroundColor: "#F0EEE9" /* Cloud Dancer */ }}
      >
        {/* (A) 포스터 흐름 — nav 밑에 크게 */}
        <div className="pt-24 md:pt-32 pb-8 md:pb-12">
          <div className="px-6 md:px-12 lg:px-20 mb-4">
            <p
              className="text-[0.7rem] tracking-[0.35em] uppercase"
              style={{
                fontFamily: "var(--font-inter)",
                // 2026-08-03 색 위계 B안: 청록은 '누르는 것' 전담으로 회수.
                // 이 라벨은 누를 수 없는 설명이므로 먹빛 보조 텍스트(#5F5145, 6.59:1)로 내린다.
                color: "#5F5145",
                fontWeight: 600,
              }}
            >
              Top 5 · 지금 가장 주목받는 무대
            </p>
          </div>
          {streamItems.length > 0 ? (
            <HeroPosterStream items={streamItems} />
          ) : (
            <div className="px-6 md:px-12 lg:px-20">
              {/* 승인된 공연 0건일 때 TOP 5 자리에 들어가는 안내.
                  좁은 슬롯이라 제목 1줄 + 본문 1줄로만 둔다(CTA는 바로 아래 히어로 버튼이 받는다). */}
              <div
                className="py-10 px-6 text-center"
                style={{
                  border: "1px solid #D4CFC1",
                  backgroundColor: "rgba(255,255,255,0.5)",
                }}
              >
                <p
                  className="text-base mb-2"
                  style={{
                    fontFamily: "var(--font-noto-serif-kr)",
                    color: "#3A2E27" /* 색 위계 B안 — 읽는 소제목은 먹빛 (11.32:1) */,
                    wordBreak: "keep-all",
                  }}
                >
                  아직 오르지 않은 막
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    color: "#5A4A3E",
                    wordBreak: "keep-all",
                  }}
                >
                  첫 무대가 오르면, 이 자리는 그 무대의 것이 됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* (B) 텍스트 + CTA */}
        <div className="px-6 md:px-12 lg:px-20 pt-6 md:pt-10 pb-20 md:pb-28">
          <div className="max-w-[1800px] mx-auto">
            {/* 미션 eyebrow — 2026-07-24 신설. "한국 대학 무대예술의 진흥" 확정 문구.
                (A)의 Top5 라벨(Teal)과 색을 구분해 다른 성격의 캡션임을 시각적으로 알림. */}
            <p
              className="text-[0.7rem] tracking-[0.35em] uppercase mb-4"
              style={{
                fontFamily: "var(--font-inter)",
                color: "#5C2A42" /* Divine Damson */,
                fontWeight: 600,
              }}
            >
              한국 대학 무대예술의 진흥
            </p>
            <h1
              className="font-bold mb-7"
              style={{
                fontFamily: "var(--font-noto-serif-kr)",
                fontSize: "clamp(2.6rem, 6vw, 5.2rem)",
                /* 2026-08-03 색 위계 B안 — 대제목은 먹빛(Ink #2B211C, 13.55:1).
                   청록은 '누를 수 있는 것'에만 남긴다. Silhouette 계열이라 잠금 4색은 유지. */
                color: "#2B211C",
                letterSpacing: "-0.04em",
                lineHeight: "1.08",
                wordBreak: "keep-all",
                textWrap: "balance",
              }}
            >
              오늘도 우리들의 막이 오릅니다
            </h1>
            <p
              className="leading-relaxed mb-9 max-w-2xl"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                fontSize: "clamp(1rem, 1.6vw, 1.25rem)",
                color: "#4A3B33" /* Silhouette */,
                wordBreak: "keep-all",
                fontWeight: 300,
              }}
            >
              대학 무대예술의 오늘을 한데 모아두고 기록하고 알립니다
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/muol/shows"
                className="inline-block px-7 py-4 text-sm tracking-wider transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: "#5C2A42" /* Divine Damson */,
                  color: "#F0EEE9",
                  fontWeight: 600,
                }}
              >
                공연 둘러보기 →
              </Link>
              <Link
                href="/auth/signup"
                className="inline-block px-7 py-4 text-sm tracking-wider transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  border: "1px solid #4A3B33",
                  color: "#4A3B33",
                  fontWeight: 500,
                }}
              >
                무대 올리기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 정체성 띠 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 xl:px-24 py-20 md:py-24"
        style={{ backgroundColor: "#0B5563", color: "#F0EEE9" }}
      >
        {/* 2026-06-15 2차 수정: 1280 → 1800px. 본문 가독성 위해 안쪽 그리드는 두 컬럼 비율로 자연 제한. */}
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-12 md:gap-20 items-start">
            <div>
              <p
                className="text-xs tracking-[0.4em] uppercase mb-6"
                /* 어두운 청록 위 자두 라벨 — 구 #C99FB1(3.64:1, AA 미달)에서 한 단계 밝게(5.19:1). */
                style={{ fontFamily: "var(--font-inter)", color: "#E2C3CF", fontWeight: 600 }}
              >
                About 무대올림
              </p>
              <p
                className="text-[1.5rem] sm:text-[1.85rem] md:text-[2.25rem] leading-snug font-light"
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  color: "#F0EEE9",
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
                  desc: "공연팀에게 등록·게재 수수료를 받지 않습니다. 간편한 클릭으로 좌석을 미리 확보해 자리를 비워두지 않습니다.",
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
                      // 어두운 청록 위 01/02/03 번호. 구 #C99FB1 + opacity 0.85 = 3.02:1로 가장 낮았다.
                      // 밝은 자두(#E2C3CF)로 올리고 opacity도 뺀다(투명도가 대비를 그대로 갉아먹는다).
                      color: "#E2C3CF",
                      lineHeight: 1,
                    }}
                  >
                    {item.num}
                  </span>
                  <div>
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F0EEE9" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        fontFamily: "var(--font-noto-sans-kr)",
                        color: "#F0EEE9",
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
        className="px-6 md:px-12 lg:px-16 xl:px-20 py-24 md:py-32"
        style={{ backgroundColor: "#F0EEE9" }}
      >
        {/* 2026-06-15 2차 수정: 1600 → 1800px. 사이드바 폭은 유지하고 중앙 콘텐츠가 넓어진다. */}
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr_240px] gap-8 xl:gap-10">
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
                <div className="text-center py-24 px-4">
                  {/* 메인에는 필터가 없다 — 이 자리는 언제나 "사이트 전체 0건" 상태다.
                      등록·문의 버튼은 아래 CTA 섹션이 이미 받고 있어 여기서는 설명만 둔다. */}
                  <p
                    className="text-lg md:text-xl mb-3"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* B안 — 읽는 소제목 */, wordBreak: "keep-all" }}
                  >
                    첫 무대를 기다립니다
                  </p>
                  <p
                    className="text-sm leading-relaxed max-w-md mx-auto"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                  >
                    어느 학과의 어떤 막이 이곳의 처음이 될지, 아직 알지 못합니다.
                    올려주시면 운영자가 한 번 더 다듬어 공연 페이지로 띄웁니다.
                  </p>
                </div>
              )}

              <div className="pt-8 text-center" style={{ borderTop: "1px solid #D4CFC1" }}>
                <Link
                  href="/muol/shows"
                  className="inline-block px-8 py-3 text-xs tracking-widest uppercase transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                  style={{
                    fontFamily: "var(--font-inter)",
                    color: "#0B5563",
                    border: "1px solid #0B5563",
                  }}
                >
                  전체 공연 보기 →
                </Link>
              </div>

              {/* 제휴 · 광고 (모바일·태블릿 전용) — PC(1280px↑)는 우측 PartnerAdSidebar가 담당.
                  className=""로 덮는 이유: 부모의 space-y-20이 이미 위 간격을 주므로
                  기본값 mt-16을 두면 여백이 이중으로 겹친다. */}
              <MobilePartnerStrip className="" />
            </div>

            <PartnerAdSidebar />
          </div>
        </div>
      </section>

      {/* ── CTA Section ──
          색 분리: Footer(Silhouette #4A3B33)와 묶이는 '갈색 밭' 방지.
          CTA는 Transformative Teal 베이스(#0B5563), 아래로 갈수록 짙어져(#06333D)
          Footer(Silhouette)와 자연스러운 색 경계가 생긴다.

          2026-08-03 그라데이션 방향 반전: 예전에는 위가 밝은 #2C7384였는데,
          그 위에 얹힌 본문 글자가 2.90:1까지 떨어져 거의 안 읽혔다(밝은 배경 + 반투명 흰 글자).
          어두운 쪽을 위로 올려 글자가 앉는 자리를 항상 짙게 유지한다. */}
      <section
        className="px-6 md:px-12 lg:px-20 xl:px-24 py-24"
        style={{ background: "linear-gradient(180deg, #0B5563 0%, #06333D 100%)" }}
      >
        {/* 본문(타이틀+카피)은 가독성 위해 좁게 유지(max-w-md), 컨테이너만 풀폭 */}
        <div className="max-w-[1800px] mx-auto text-center">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            /* 어두운 청록 위 자두 라벨 — 구 #C99FB1(3.64:1) → #E2C3CF(5.19:1) */
            style={{ fontFamily: "var(--font-inter)", color: "#E2C3CF", fontWeight: 600 }}
          >
            Join 무대올림
          </p>
          <h2
            className="text-[2rem] md:text-[3rem] font-light mb-5"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F0EEE9", wordBreak: "keep-all", textWrap: "balance" }}
          >
            당신의 무대를, 누군가의 주말로.
          </h2>
          <p
            className="text-sm mb-10 max-w-md mx-auto leading-relaxed"
            /* 어두운 면 위 본문 — 0.6 알파(2.90:1)에서 0.86으로. 색도 Cloud Dancer 기준으로 통일. */
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "rgba(240,238,233,0.86)", wordBreak: "keep-all" }}
          >
            대학 무대예술 공연자라면 회원가입 후 무대를 올릴 수 있습니다.
            <br />
            운영자가 한 번 더 정성스레 다듬어 공연 페이지로 띄웁니다.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-3 text-sm tracking-wider transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#5C2A42",
                color: "#F0EEE9",
                fontWeight: 600,
              }}
            >
              회원가입
            </Link>
            <Link
              href="/muol/contact"
              className="px-8 py-3 text-sm tracking-wider transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid rgba(248,249,252,0.45)", color: "#F0EEE9" }}
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
      <div className="flex items-end justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #D4CFC1" }}>
        <div>
          <p
            className="text-xs tracking-[0.3em] uppercase mb-2"
            style={{
              fontFamily: "var(--font-inter)",
              // accent 배지(Editor's Pick)는 '누르는 것'이 아니라 편집 강조라 청록에서 뺀다.
              // B안의 강조 역할 = Divine Damson(#5C2A42, 9.71:1). 일반 배지는 기존 먹빛 유지.
              color: accent ? "#5C2A42" : "#5A4A3E",
              fontWeight: accent ? 600 : 400,
            }}
          >
            {badge}
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold"
            /* B안 — 섹션 제목은 먹빛 소제목(#3A2E27, 11.32:1) */
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" }}
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
