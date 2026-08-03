import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import ShowsSearchBar from "@/components/ShowsSearchBar";
import { createClient } from "@/lib/supabase/server";
import { REGIONS, GENRES, SHOW_CATEGORIES } from "@/lib/constants";
import { sanitizeSearchTerm, todayKey, showEndKey, isEnded } from "@/lib/showFilters";
import { buildBreadcrumbList } from "@/lib/structuredData";
import { buildRatingMap } from "@/lib/ratings";
import type { Show } from "@/types";

export const revalidate = 60;

const PAGE_SIZE = 16;

// 2026-08-03: todayKey·showEndKey·isEnded 로컬 사본 3벌 삭제 → @/lib/showFilters 공용본 사용.
// 사본이 남아 있으면 공용본만 고쳤을 때 이 페이지가 다르게 판정한다.
// (실제로 공용 isEnded는 실제 날짜 비교로 고쳤는데 여기 사본은 글자 비교로 남아 있어,
//  "2026.5.10"처럼 0을 안 채운 값에서 목록과 아카이브가 서로 반대 결론을 낼 수 있었다.)

function extractYear(show: Show): number | null {
  const key = showEndKey(show);
  if (!key) return null;
  const y = parseInt(key.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; genre?: string; category?: string; q?: string; year?: string; page?: string }>;
}) {
  const { region, genre, category, q, year, page } = await searchParams;
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
  if (category) {
    query = query.eq("show_category", category);
  }
  if (q && q.trim()) {
    const search = sanitizeSearchTerm(q);
    if (search) {
      query = query.or(`title.ilike.%${search}%,venue.ilike.%${search}%,performer_name.ilike.%${search}%`);
    }
  }

  // 정렬: schedule_end 내림차순 (최근 종료부터). null은 뒤로.
  const [{ data: showsRaw }, { data: ratingsRaw }] = await Promise.all([
    query,
    supabase.from("ratings").select("show_id, score"),
  ]);
  const ratingMap = buildRatingMap(ratingsRaw as { show_id: string; score: number }[] | null);

  const today = todayKey();
  const allEnded = (showsRaw as Show[] ?? []).filter((s) => isEnded(s, today));

  // 연도 필터
  let filtered = allEnded;
  const selectedYear = year ? parseInt(year, 10) : null;
  if (selectedYear) {
    filtered = filtered.filter((s) => extractYear(s) === selectedYear);
  }

  // 종료일 내림차순 정렬
  filtered.sort((a, b) => {
    const ka = showEndKey(a) ?? "";
    const kb = showEndKey(b) ?? "";
    return kb.localeCompare(ka);
  });

  // 사용 가능한 연도 목록 (필터 옵션 생성용)
  const yearsSet = new Set<number>();
  for (const s of allEnded) {
    const y = extractYear(s);
    if (y) yearsSet.add(y);
  }
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const list = filtered.slice(from, to);
  const activeRegion = region ?? "전체";

  // 조건이 하나라도 걸려 있으면 0건 화면에서 되돌아갈 길을 준다.
  const hasFilters = Boolean(
    (region && region !== "전체") || genre || category || (q && q.trim()) || selectedYear
  );

  // 0건에는 성격이 다른 두 가지가 있다.
  //  (a) 사이트에 승인된 공연 자체가 하나도 없음 → "아직 오르지 않은 막" (안내)
  //  (b) 필터·검색 결과가 0건 / 진행 중 공연만 있고 종료된 공연이 없음 → 기존 문구 유지
  // showsRaw는 필터가 걸리면 그 필터 결과라서, (a) 판정은 필터가 없을 때만 유효하다.
  const noShowsAtAll = !hasFilters && (showsRaw as Show[] ?? []).length === 0;

  // 페이지네이션 URL 생성기
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (genre) params.set("genre", genre);
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (year) params.set("year", year);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    // 2026-08-03: 구 경로 `/archive`는 next.config.ts에서 /muol/archive로 308 리다이렉트된다.
    // 그대로 두면 필터·페이지를 누를 때마다 서버를 한 번 더 왕복한다.
    return `/muol/archive${qs ? `?${qs}` : ""}`;
  };

  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "아카이브" },
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
        <div className="mb-12 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
            >
              Archive
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              /* 2026-08-03 색 위계 B안 — 대제목은 먹빛(#2B211C, 13.55:1). 청록은 '누르는 것' 전담. */
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2B211C" }}
            >
              지난 공연
            </h1>
            <p
              className="text-sm leading-relaxed mb-1"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
            >
              지나갔지만 사라지지 않은 무대들.
            </p>
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
            >
              {totalCount}개의 기록
            </p>
          </div>
          <Link
            href="/muol/shows"
            className="px-4 py-2 text-xs tracking-wide transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#0B5563",
              border: "1px solid #D4CFC1",
            }}
          >
            진행 중 공연으로
          </Link>
        </div>

        {/* 검색창 */}
        <ShowsSearchBar />

        {/* 연도 필터 —
            아래 세 필터(연도·지역·장르·구분)와 페이지네이션 링크는 현재 경로 `/muol/archive`를
            직접 가리킨다. 구 경로 `/archive`는 308 리다이렉트를 왕복한다 (2026-08-03). */}
        {availableYears.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span
              className="text-xs tracking-wider uppercase mr-2"
              style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
            >
              연도
            </span>
            {[null, ...availableYears].map((y) => {
              const isActive = (y === null && !selectedYear) || y === selectedYear;
              const params = new URLSearchParams();
              if (region) params.set("region", region);
              if (genre) params.set("genre", genre);
              if (category) params.set("category", category);
              if (q) params.set("q", q);
              if (y) params.set("year", String(y));
              const href = `/muol/archive${params.toString() ? `?${params.toString()}` : ""}`;
              return (
                <Link
                  key={y ?? "all"}
                  href={href}
                  className="px-3 py-2.5 text-xs"
                  style={{
                    fontFamily: "var(--font-inter)",
                    backgroundColor: isActive ? "#0B5563" : "transparent",
                    color: isActive ? "#F0EEE9" : "#5A4A3E",
                    border: `1px solid ${isActive ? "#0B5563" : "#D4CFC1"}`,
                  }}
                >
                  {y ?? "전체"}
                </Link>
              );
            })}
          </div>
        )}

        {/* 지역 필터 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const isActive = activeRegion === r;
            const params = new URLSearchParams();
            if (r !== "전체") params.set("region", r);
            if (genre) params.set("genre", genre);
            if (category) params.set("category", category);
            if (q) params.set("q", q);
            if (year) params.set("year", year);
            const href = `/muol/archive${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={r}
                href={href}
                className="px-3 py-2.5 text-xs tracking-wide transition-colors"
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
        <div className="mb-6 flex flex-wrap gap-2 items-center">
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
            if (category) params.set("category", category);
            if (q) params.set("q", q);
            if (year) params.set("year", year);
            const href = `/muol/archive${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={g ?? "all"}
                href={href}
                className="px-3 py-2.5 text-xs"
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
        <div
          className="mb-12 pb-6 flex flex-wrap gap-2 items-center"
          style={{ borderBottom: "1px solid #D4CFC1" }}
        >
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
            if (c) params.set("category", c);
            if (q) params.set("q", q);
            if (year) params.set("year", year);
            const href = `/muol/archive${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={c ?? "all-cat"}
                href={href}
                className="px-3 py-2.5 text-xs"
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

        {/* 기록 그리드 — 4열로 좀 더 빽빽하게 (갤러리 느낌) */}
        {list.length === 0 ? (
          noShowsAtAll ? (
            /* (a) 사이트 전체에 승인된 공연이 아직 0건 — 기록이 시작되기 전의 자리 */
            <div className="text-center py-24 px-4">
              <p
                className="text-xl md:text-2xl mb-4"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* B안 — 읽는 소제목 */, wordBreak: "keep-all" }}
              >
                아직 오르지 않은 막
              </p>
              <p
                className="text-sm leading-relaxed mb-2 max-w-md mx-auto"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
              >
                기록은 막이 내린 다음에 남습니다.
                아직 첫 막이 오르지 않아, 이곳도 비어 있습니다.
              </p>
              <p
                className="text-xs leading-relaxed mb-6 max-w-md mx-auto"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
              >
                비어 있는 자리를 감추지 않고 그대로 두었습니다.
                무대가 지나가는 날, 이곳이 그 무대의 자리가 됩니다.
              </p>
              <Link
                href="/muol/performer"
                className="inline-block px-5 py-3 text-xs tracking-wide transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#0B5563",
                  border: "1px solid #0B5563",
                }}
              >
                무대 올리러 가기 →
              </Link>
            </div>
          ) : (
          <div className="text-center py-24">
            <p className="text-sm mb-2" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
              조건에 맞는 기록이 없습니다.
            </p>
            <p className="text-xs mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
              {hasFilters
                ? "걸어둔 조건을 풀면 다른 기록이 보일 수 있습니다."
                : "지금 막이 오르는 무대는 공연 목록에서 만나보실 수 있습니다."}
            </p>
            <Link
              href={hasFilters ? "/muol/archive" : "/muol/shows"}
              className="inline-block px-4 py-2.5 text-xs tracking-wide transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                border: "1px solid #D4CFC1",
              }}
            >
              {hasFilters ? "필터 모두 지우기" : "진행 중 공연으로 →"}
            </Link>
          </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
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
                    className="px-3 py-2.5 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", border: "1px solid #D4CFC1" }}
                  >
                    ← 이전
                  </Link>
                ) : (
                  <span className="px-3 py-2.5 text-xs" style={{ color: "#D4CFC1", border: "1px solid #D4CFC1" }}>← 이전</span>
                )}

                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-xs" style={{ color: "#5A4A3E" }}>···</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(p as number)}
                      className="px-3 py-2.5 text-xs"
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
                    className="px-3 py-2.5 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", border: "1px solid #D4CFC1" }}
                  >
                    다음 →
                  </Link>
                ) : (
                  <span className="px-3 py-2.5 text-xs" style={{ color: "#D4CFC1", border: "1px solid #D4CFC1" }}>다음 →</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
