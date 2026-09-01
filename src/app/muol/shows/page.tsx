import type { Metadata } from "next";
import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import ShowsSearchBar from "@/components/ShowsSearchBar";
import MobilePartnerStrip from "@/components/MobilePartnerStrip";
import { createClient } from "@/lib/supabase/server";
import { REGIONS, GENRES, SHOW_CATEGORIES } from "@/lib/constants";
import { sanitizeSearchTerm, todayKey, isEnded } from "@/lib/showFilters";
import { buildBreadcrumbList } from "@/lib/structuredData";
import { buildRatingMap } from "@/lib/ratings";
import type { Show } from "@/types";
import { OG_MUOL } from "@/lib/ogCards";

export const revalidate = 60;

/**
 * /shows 메타데이터 — 검색 결과·SNS 공유에 노출되는 정보.
 * title은 root template("%s · 무대올림")을 통해 자동 합성됨.
 */
export const metadata: Metadata = {
  title: "공연 일정",
  description:
    "오늘 막이 오르는 대학 무대예술 공연을 한 곳에서. 연극·뮤지컬·무용·국악·음악·전통연희 등 17개 지역의 학생 공연을 만나보세요.",
  keywords: [
    "대학 공연 일정",
    "대학 연극",
    "대학 뮤지컬",
    "대학 무용",
    "학생 공연",
    "지역 공연",
    "무대올림 공연",
  ],
  // 구 경로 /shows 는 next.config.ts에서 /muol/shows 로 308 영구 리다이렉트된다.
  // 리다이렉트되는 URL을 canonical로 쓰면 구글이 그 canonical을 무효 처리하므로 현재 경로를 가리킨다. (2026-08-03)
  alternates: { canonical: "https://syus.co.kr/muol/shows" },
  openGraph: {
    title: "공연 일정 · 무대올림",
    // 2026-08-03 사실 정정: "8개 장르"는 무용을 순수/실용로 나눴던 잠깐의 구성(2026-07-28 오전)에서
    // 남은 숫자다. 그날 오후 호버 메뉴 방식으로 되돌리며 장르는 7개(기타 포함)가 됐다.
    // 숫자를 다시 박으면 또 어긋나므로 실제 장르를 나열한다.
    description:
      "오늘 막이 오르는 대학 무대예술 공연. 연극·뮤지컬·무용·국악·음악·전통연희를 17개 지역에서.",
    url: "https://syus.co.kr/muol/shows",
    type: "website",
    images: [OG_MUOL],
  },
  twitter: {
    card: "summary_large_image",
    title: "공연 일정 · 무대올림",
    description:
      "오늘 막이 오르는 대학 무대예술 공연. 연극·뮤지컬·무용·국악·음악·전통연희를 17개 지역에서.",
    images: [OG_MUOL.url],
  },
};

const PAGE_SIZE = 12;

// 2026-08-03: todayKey·showEndKey·isEnded 로컬 사본 3벌 삭제 → @/lib/showFilters 공용본 사용.
// 같은 판정 로직이 목록·아카이브·홈에 각각 복제돼 있어, 공용본만 고치면 화면끼리
// 결론이 어긋나는 상태였다(한 화면에선 진행 중, 다른 화면에선 종료).

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; genre?: string; detail?: string; category?: string; q?: string; school?: string; page?: string }>;
}) {
  const { region, genre, detail, category, q, school, page } = await searchParams;
  const supabase = await createClient();

  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;

  let query = supabase.from("shows").select("*").eq("status", "approved");

  if (region && region !== "전체") {
    query = query.eq("region", region);
  }
  if (genre) {
    query = query.eq("genre", genre);
  }
  // NavMega 호버 드롭다운(무용 → 발레 등)에서 넘어오는 세부 분류 필터.
  // genre_detail 컬럼과 매칭 — genre가 없어도 detail만 단독으로 들어오는 경우는 없다고
  // 가정하되(링크는 항상 genre+detail을 함께 보냄), 방어적으로 genre 필터와 별개로 적용한다.
  if (detail) {
    query = query.eq("genre_detail", detail);
  }
  if (category) {
    query = query.eq("show_category", category);
  }
  if (school) {
    // 2026-06-17 sanitize 적용 — q와 동일 패턴. 사용자 입력 ilike injection 방지.
    const safeSchool = sanitizeSearchTerm(school);
    if (safeSchool) {
      // 부분 일치로 검색 — "한양대학교 연극영화학과"처럼 학과까지 적힌 기존 데이터도 매칭
      query = query.ilike("school_department", `%${safeSchool}%`);
    }
  }
  if (q && q.trim()) {
    const search = sanitizeSearchTerm(q);
    if (search) {
      query = query.or(`title.ilike.%${search}%,venue.ilike.%${search}%,performer_name.ilike.%${search}%`);
    }
  }

  const [{ data: showsRaw }, { data: ratingsRaw }] = await Promise.all([
    query.order("created_at", { ascending: false }),
    supabase.from("ratings").select("show_id, score"),
  ]);

  const ratingMap = buildRatingMap(ratingsRaw as { show_id: string; score: number }[] | null);

  // 진행 중·예정 공연만 필터 (종료된 건 /archive로)
  const today = todayKey();
  const activeShows = (showsRaw as Show[] ?? []).filter((s) => !isEnded(s, today));

  const totalCount = activeShows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const list = activeShows.slice(from, to);
  const activeRegion = region ?? "전체";

  // 제목에 그대로 얹으면 긴 검색어가 가로 스크롤을 만든다 — 표시용으로만 줄인다(필터는 원본 q 사용).
  const qDisplay = q && q.length > 30 ? `${q.slice(0, 30)}…` : q;
  // 조건이 하나라도 걸려 있으면 0건 화면에서 되돌아갈 길을 준다.
  const hasFilters = Boolean(
    (region && region !== "전체") || genre || detail || category || school || (q && q.trim())
  );

  // 0건에는 성격이 다른 두 가지가 있다.
  //  (a) 사이트에 승인된 공연이 아직 하나도 없음 → "첫 무대를 기다립니다" (안내)
  //  (b) 사용자가 건 필터·검색의 결과가 0건    → "조건에 맞는 무대…" + 필터 지우기 (기존 문구 유지)
  //  (c) 승인 공연은 있으나 전부 종료됨        → "지난 공연으로" (기존 문구 유지)
  // showsRaw는 필터가 걸리면 그 필터 결과라서, (a) 판정은 필터가 없을 때만 유효하다.
  const noShowsAtAll = !hasFilters && (showsRaw as Show[] ?? []).length === 0;

  // 등록된 학교 목록 자동 추출 (학과 텍스트가 같이 있어도 첫 단어로 그룹핑)
  // 예: "한양대학교 연극영화학과" → "한양대학교"
  const { data: allActiveForSchools } = await supabase
    .from("shows")
    .select("school_department")
    .eq("status", "approved")
    .not("school_department", "is", null);

  const schoolsSet = new Set<string>();
  for (const row of (allActiveForSchools as { school_department: string | null }[] ?? [])) {
    const raw = (row.school_department ?? "").trim();
    if (!raw) continue;
    // 첫 어절(공백 또는 콤마 전까지)만 학교명으로 인식
    const schoolName = raw.split(/[\s,·/]/)[0].trim();
    if (schoolName) schoolsSet.add(schoolName);
  }
  const availableSchools = Array.from(schoolsSet).sort((a, b) => a.localeCompare(b, "ko"));

  // 페이지네이션 URL 생성기
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (genre) params.set("genre", genre);
    if (detail) params.set("detail", detail);
    if (category) params.set("category", category);
    if (school) params.set("school", school);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    // 2026-08-03: 구 경로 `/shows`를 쓰면 next.config.ts의 308 리다이렉트를 매번 왕복한다
    // (요청 → 308 → /muol/shows 재요청). 페이지를 넘길 때마다 한 박자 느려지던 원인.
    return `/muol/shows${qs ? `?${qs}` : ""}`;
  };

  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "공연" },
  ]);

  return (
    <div
      className="pt-24 md:pt-36 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F0EEE9" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
            >
              Shows
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{
                fontFamily: "var(--font-noto-serif-kr)",
                /* 2026-08-03 색 위계 B안 — 대제목은 먹빛(#2B211C, 13.55:1).
                   청록은 링크·버튼·활성 필터칩 같은 '누르는 것' 전담으로 남긴다. */
                color: "#2B211C",
                wordBreak: "keep-all",
                overflowWrap: "anywhere",
              }}
            >
              {q
                ? `"${qDisplay}" 검색 결과`
                : school
                ? `${school} 공연`
                : (activeRegion === "전체" ? "진행 중 · 예정 공연" : `${activeRegion} 공연`)}
            </h1>
            <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
              {totalCount}개의 공연
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/muol/shows/calendar"
              className="px-4 py-2 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                border: "1px solid #D4CFC1",
              }}
            >
              캘린더로 보기
            </Link>
            <Link
              href="/muol/archive"
              className="px-4 py-2 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                border: "1px solid #D4CFC1",
              }}
            >
              지난 공연 →
            </Link>
          </div>
        </div>

        {/* 검색창 */}
        <ShowsSearchBar />

        {/* 지역 필터 —
            아래 네 필터(지역·장르·구분·학교)와 페이지네이션의 링크는 모두 현재 경로인
            `/muol/shows`를 직접 가리킨다. 구 경로 `/shows`로 두면 누를 때마다
            next.config.ts의 308 리다이렉트를 왕복해 반응이 한 박자 늦는다 (2026-08-03). */}
        <div className="mb-6 flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const isActive = activeRegion === r;
            const params = new URLSearchParams();
            if (r !== "전체") params.set("region", r);
            if (genre) params.set("genre", genre);
            if (detail) params.set("detail", detail);
            if (category) params.set("category", category);
            if (school) params.set("school", school);
            if (q) params.set("q", q);
            const href = `/muol/shows${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={r}
                href={href}
                className="px-3 py-2.5 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#0B5563" : "transparent",
                  color: isActive ? "#F0EEE9" : "#0B5563",
                  border: `1px solid ${isActive ? "#0B5563" : "#D4CFC1"}`,
                }}
              >
                {r}
              </Link>
            );
          })}
        </div>

        {/* 장르 필터 */}
        <div
          className={`${availableSchools.length > 0 ? "mb-6" : "mb-10 pb-6"} flex flex-wrap gap-2 items-center`}
          style={availableSchools.length > 0 ? undefined : { borderBottom: "1px solid #D4CFC1" }}
        >
          <span
            className="text-xs tracking-wider uppercase mr-2"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            장르
          </span>
          {[null, ...GENRES].map((g) => {
            const isActive = (g === null && !genre) || genre === g;
            const params = new URLSearchParams();
            if (region) params.set("region", region);
            if (g) params.set("genre", g);
            // 여기서는 detail을 의도적으로 실어보내지 않는다 — 장르 칩을 다시 누르면
            // "그 장르 전체 보기"로 되돌아가야 하고, detail은 이전 장르에 속했던 값이라
            // 새 장르와 맞지 않을 수 있다(NavMega 호버 하위 항목 클릭 시에만 detail이 실린다).
            if (category) params.set("category", category);
            if (school) params.set("school", school);
            if (q) params.set("q", q);
            const href = `/muol/shows${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={g ?? "all"}
                href={href}
                className="px-3 py-2.5 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#0B5563" : "transparent",
                  color: isActive ? "#F0EEE9" : "#5A4A3E",
                  border: `1px solid ${isActive ? "#0B5563" : "#D4CFC1"}`,
                }}
              >
                {g ?? "전체"}
              </Link>
            );
          })}
        </div>

        {/* 공연 구분 필터 */}
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <span
            className="text-xs tracking-wider uppercase mr-2"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            구분
          </span>
          {[null, ...SHOW_CATEGORIES].map((c) => {
            const isActive = (c === null && !category) || c === category;
            const params = new URLSearchParams();
            if (region) params.set("region", region);
            if (genre) params.set("genre", genre);
            if (detail) params.set("detail", detail);
            if (c) params.set("category", c);
            if (school) params.set("school", school);
            if (q) params.set("q", q);
            const href = `/muol/shows${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={c ?? "all-cat"}
                href={href}
                className="px-3 py-2.5 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#0B5563" : "transparent",
                  color: isActive ? "#F0EEE9" : "#5A4A3E",
                  border: `1px solid ${isActive ? "#0B5563" : "#D4CFC1"}`,
                }}
              >
                {c ?? "전체"}
              </Link>
            );
          })}
        </div>

        {/* 학교 필터 — 등록된 학교가 있을 때만 노출 */}
        {availableSchools.length > 0 && (
          <div
            className="mb-10 pb-6 flex flex-wrap gap-2 items-center"
            style={{ borderBottom: "1px solid #D4CFC1" }}
          >
            <span
              className="text-xs tracking-wider uppercase mr-2"
              style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
            >
              학교
            </span>
            {[null, ...availableSchools].map((sch) => {
              const isActive = (sch === null && !school) || sch === school;
              const params = new URLSearchParams();
              if (region) params.set("region", region);
              if (genre) params.set("genre", genre);
              if (detail) params.set("detail", detail);
              if (category) params.set("category", category);
              if (sch) params.set("school", sch);
              if (q) params.set("q", q);
              const href = `/muol/shows${params.toString() ? `?${params.toString()}` : ""}`;
              return (
                <Link
                  key={sch ?? "all-schools"}
                  href={href}
                  className="px-3 py-2.5 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    backgroundColor: isActive ? "#0B5563" : "transparent",
                    color: isActive ? "#F0EEE9" : "#5A4A3E",
                    border: `1px solid ${isActive ? "#0B5563" : "#D4CFC1"}`,
                  }}
                >
                  {sch ?? "전체"}
                </Link>
              );
            })}
          </div>
        )}

        {/* 공연 그리드 */}
        {list.length === 0 ? (
          noShowsAtAll ? (
            /* (a) 사이트 전체에 승인된 공연이 아직 0건 — 첫 무대를 기다리는 자리 */
            <div className="text-center py-24 px-4">
              <p
                className="text-xl md:text-2xl mb-4"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* B안 — 읽는 소제목 */, wordBreak: "keep-all" }}
              >
                첫 무대를 기다립니다
              </p>
              <p
                className="text-sm leading-relaxed mb-2 max-w-md mx-auto"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
              >
                어느 학과의 어떤 막이 이곳의 처음이 될지, 아직 알지 못합니다.
                올려주시면 운영자가 한 번 더 다듬어 공연 페이지로 띄웁니다.
              </p>
              <p
                className="text-xs leading-relaxed mb-6 max-w-md mx-auto"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
              >
                무대를 올리는 쪽에 게재료를 받지 않습니다.
              </p>
              <Link
                href="/muol/performer"
                className="inline-block px-5 py-3 text-xs tracking-wide transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: "#5C2A42",
                  color: "#F0EEE9",
                  fontWeight: 600,
                }}
              >
                무대 올리러 가기 →
              </Link>

              {/* 관객으로 오신 분께도 돌아갈 자리를 둔다.
                  이 화면은 공연이 0건일 때 가장 많이 열리는 문이라,
                  올릴 무대가 없는 사람에게 출구가 하나도 없으면 그대로 빈손으로 나간다. */}
              <div className="mt-10 pt-8" style={{ borderTop: "1px solid #E2DDD2" }}>
                <p
                  className="text-xs leading-relaxed mb-4 max-w-md mx-auto"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                >
                  막이 오르기를 기다리는 동안, 읽어두실 글이 있습니다.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    href="/syus/essays"
                    className="inline-block px-4 py-2.5 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      color: "#0B5563",
                      border: "1px solid #D4CFC1",
                    }}
                  >
                    연기에 관한 글 →
                  </Link>
                  <Link
                    href="/muol/archive"
                    className="inline-block px-4 py-2.5 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      color: "#0B5563",
                      border: "1px solid #D4CFC1",
                    }}
                  >
                    지난 공연 →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
          <div className="text-center py-24">
            <p className="text-base mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* B안 — 읽는 소제목 */ }}>
              {hasFilters ? "조건에 맞는 무대를 아직 찾지 못했습니다." : "곧 첫 무대가 오릅니다."}
            </p>
            <p className="text-xs mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
              {hasFilters ? "걸어둔 조건을 풀면 다른 무대가 보일 수 있습니다." : "지나간 공연은 ‘지난 공연’에서 만나보실 수 있습니다."}
            </p>
            <Link
              href={hasFilters ? "/muol/shows" : "/muol/archive"}
              className="inline-block px-4 py-2.5 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                border: "1px solid #D4CFC1",
              }}
            >
              {hasFilters ? "필터 모두 지우기" : "지난 공연으로 →"}
            </Link>
          </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {list.map((show) => (
                <ShowCard key={show.id} show={show} rating={ratingMap.get(show.id) ?? null} />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-2 flex-wrap">
                {currentPage > 1 ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className="px-3 py-2.5 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", border: "1px solid #D4CFC1" }}
                  >
                    ← 이전
                  </Link>
                ) : (
                  <span className="px-3 py-2.5 text-xs cursor-not-allowed" style={{ color: "#D4CFC1", border: "1px solid #D4CFC1" }} aria-disabled="true">← 이전</span>
                )}

                {/* 페이지 번호 */}
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-xs" style={{ color: "#5A4A3E" }}>···</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(p as number)}
                      className="px-3 py-2.5 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                      style={{
                        fontFamily: "var(--font-inter)",
                        backgroundColor: p === currentPage ? "#0B5563" : "transparent",
                        color: p === currentPage ? "#F0EEE9" : "#0B5563",
                        border: `1px solid ${p === currentPage ? "#0B5563" : "#D4CFC1"}`,
                        minWidth: "36px",
                        textAlign: "center",
                      }}
                    >
                      {p}
                    </Link>
                  )
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={buildPageUrl(currentPage + 1)}
                    className="px-3 py-2.5 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", border: "1px solid #D4CFC1" }}
                  >
                    다음 →
                  </Link>
                ) : (
                  <span className="px-3 py-2.5 text-xs cursor-not-allowed" style={{ color: "#D4CFC1", border: "1px solid #D4CFC1" }} aria-disabled="true">다음 →</span>
                )}
              </div>
            )}
          </>
        )}

        {/* 제휴 · 광고 (모바일·태블릿 전용) — 목록·페이지네이션 아래.
            위 삼항 바깥에 두는 이유: 검색 결과가 0건일 때도 지면이 살아있어야 한다. */}
        <MobilePartnerStrip />
      </div>
    </div>
  );
}

/** 페이지 번호 표시 로직: 1, 2, 3, ..., N */
function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
