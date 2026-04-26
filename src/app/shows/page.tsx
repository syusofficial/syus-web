import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import ShowsSearchBar from "@/components/ShowsSearchBar";
import { createClient } from "@/lib/supabase/server";
import { REGIONS, GENRES } from "@/lib/constants";

export const revalidate = 60;

const PAGE_SIZE = 12;

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; genre?: string; q?: string; page?: string }>;
}) {
  const { region, genre, q, page } = await searchParams;
  const supabase = await createClient();

  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from("shows").select("*", { count: "exact" }).eq("status", "approved");

  if (region && region !== "전체") {
    query = query.eq("region", region);
  }
  if (genre) {
    query = query.eq("genre", genre);
  }
  if (q && q.trim()) {
    // 제목 / 장소 / 단체명에서 부분일치 검색
    const search = q.trim();
    query = query.or(`title.ilike.%${search}%,venue.ilike.%${search}%,performer_name.ilike.%${search}%`);
  }

  const { data: shows, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const list = shows ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const activeRegion = region ?? "전체";

  // 페이지네이션 URL 생성기
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (genre) params.set("genre", genre);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/shows${qs ? `?${qs}` : ""}`;
  };

  return (
    <div
      className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F4EDE3" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              Shows
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
            >
              {q ? `"${q}" 검색 결과` : (activeRegion === "전체" ? "전체 공연" : `${activeRegion} 공연`)}
            </h1>
            <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
              {totalCount}개의 공연
            </p>
          </div>
          <Link
            href="/shows/calendar"
            className="px-4 py-2 text-xs tracking-wide transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#6D3115",
              border: "1px solid #D4CFC9",
            }}
          >
            캘린더로 보기
          </Link>
        </div>

        {/* 검색창 */}
        <ShowsSearchBar />

        {/* 지역 필터 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const isActive = activeRegion === r;
            const params = new URLSearchParams();
            if (r !== "전체") params.set("region", r);
            if (genre) params.set("genre", genre);
            if (q) params.set("q", q);
            const href = `/shows${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={r}
                href={href}
                className="px-3 py-1.5 text-xs tracking-wide transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#6D3115" : "transparent",
                  color: isActive ? "#F4EDE3" : "#6D3115",
                  border: `1px solid ${isActive ? "#6D3115" : "#D4CFC9"}`,
                }}
              >
                {r}
              </Link>
            );
          })}
        </div>

        {/* 장르 필터 */}
        <div
          className="mb-10 pb-6 flex flex-wrap gap-2 items-center"
          style={{ borderBottom: "1px solid #D4CFC9" }}
        >
          <span
            className="text-xs tracking-wider uppercase mr-2"
            style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
          >
            장르
          </span>
          {[null, ...GENRES].map((g) => {
            const isActive = (g === null && !genre) || genre === g;
            const params = new URLSearchParams();
            if (region) params.set("region", region);
            if (g) params.set("genre", g);
            if (q) params.set("q", q);
            const href = `/shows${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={g ?? "all"}
                href={href}
                className="px-3 py-1 text-xs"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#6D3115" : "transparent",
                  color: isActive ? "#F4EDE3" : "#9B9693",
                  border: `1px solid ${isActive ? "#6D3115" : "#D4CFC9"}`,
                }}
              >
                {g ?? "전체"}
              </Link>
            );
          })}
        </div>

        {/* 공연 그리드 */}
        {list.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm mb-2" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
              조건에 맞는 공연이 없습니다.
            </p>
            <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
              {q ? "다른 검색어로 다시 시도해보세요." : "다른 지역이나 장르를 선택해보세요."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {list.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-2 flex-wrap">
                {currentPage > 1 ? (
                  <Link
                    href={buildPageUrl(currentPage - 1)}
                    className="px-3 py-2 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115", border: "1px solid #D4CFC9" }}
                  >
                    ← 이전
                  </Link>
                ) : (
                  <span className="px-3 py-2 text-xs" style={{ color: "#D4CFC9", border: "1px solid #D4CFC9" }}>← 이전</span>
                )}

                {/* 페이지 번호 */}
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-xs" style={{ color: "#9B9693" }}>···</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(p as number)}
                      className="px-3 py-2 text-xs"
                      style={{
                        fontFamily: "var(--font-inter)",
                        backgroundColor: p === currentPage ? "#6D3115" : "transparent",
                        color: p === currentPage ? "#F4EDE3" : "#6D3115",
                        border: `1px solid ${p === currentPage ? "#6D3115" : "#D4CFC9"}`,
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
                    className="px-3 py-2 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115", border: "1px solid #D4CFC9" }}
                  >
                    다음 →
                  </Link>
                ) : (
                  <span className="px-3 py-2 text-xs" style={{ color: "#D4CFC9", border: "1px solid #D4CFC9" }}>다음 →</span>
                )}
              </div>
            )}
          </>
        )}
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
