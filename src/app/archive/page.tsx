import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import ShowsSearchBar from "@/components/ShowsSearchBar";
import { createClient } from "@/lib/supabase/server";
import { REGIONS, GENRES, SHOW_CATEGORIES } from "@/lib/constants";
import type { Show } from "@/types";

export const revalidate = 60;

const PAGE_SIZE = 16;

function todayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function showEndKey(show: Show): string | null {
  const raw = (show.schedule_end || show.schedule_start || "").trim();
  if (!raw) return null;
  return raw.replace(/\./g, "-");
}

function isEnded(show: Show, today: string): boolean {
  const key = showEndKey(show);
  if (!key) return false;
  return key < today;
}

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
    const search = q.trim();
    query = query.or(`title.ilike.%${search}%,venue.ilike.%${search}%,performer_name.ilike.%${search}%`);
  }

  // 정렬: schedule_end 내림차순 (최근 종료부터). null은 뒤로.
  const { data: showsRaw } = await query;

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
    return `/archive${qs ? `?${qs}` : ""}`;
  };

  return (
    <div
      className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F4EDE3" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              Archive
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
            >
              지난 공연
            </h1>
            <p
              className="text-sm leading-relaxed mb-1"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              지나갔지만 사라지지 않은 무대들.
            </p>
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              {totalCount}개의 기록
            </p>
          </div>
          <Link
            href="/shows"
            className="px-4 py-2 text-xs tracking-wide transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#6D3115",
              border: "1px solid #D4CFC9",
            }}
          >
            진행 중 공연으로
          </Link>
        </div>

        {/* 검색창 */}
        <ShowsSearchBar />

        {/* 연도 필터 */}
        {availableYears.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span
              className="text-xs tracking-wider uppercase mr-2"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
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
              const href = `/archive${params.toString() ? `?${params.toString()}` : ""}`;
              return (
                <Link
                  key={y ?? "all"}
                  href={href}
                  className="px-3 py-1 text-xs"
                  style={{
                    fontFamily: "var(--font-inter)",
                    backgroundColor: isActive ? "#6D3115" : "transparent",
                    color: isActive ? "#F4EDE3" : "#9B9693",
                    border: `1px solid ${isActive ? "#6D3115" : "#D4CFC9"}`,
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
            const href = `/archive${params.toString() ? `?${params.toString()}` : ""}`;
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
        <div className="mb-6 flex flex-wrap gap-2 items-center">
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
            if (category) params.set("category", category);
            if (q) params.set("q", q);
            if (year) params.set("year", year);
            const href = `/archive${params.toString() ? `?${params.toString()}` : ""}`;
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

        {/* 공연 구분 필터 */}
        <div
          className="mb-12 pb-6 flex flex-wrap gap-2 items-center"
          style={{ borderBottom: "1px solid #D4CFC9" }}
        >
          <span
            className="text-xs tracking-wider uppercase mr-2"
            style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
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
            const href = `/archive${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={c ?? "all-cat"}
                href={href}
                className="px-3 py-1 text-xs"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#6D3115" : "transparent",
                  color: isActive ? "#F4EDE3" : "#9B9693",
                  border: `1px solid ${isActive ? "#6D3115" : "#D4CFC9"}`,
                }}
              >
                {c ?? "전체"}
              </Link>
            );
          })}
        </div>

        {/* 기록 그리드 — 4열로 좀 더 빽빽하게 (갤러리 느낌) */}
        {list.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm mb-2" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
              조건에 맞는 기록이 없습니다.
            </p>
            <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
              필터를 바꾸어 다시 살펴보세요.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
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
