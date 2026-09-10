import type { CSSProperties } from "react";
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

/* ── 필터 칩 공통 규칙 (2026-09-10 모바일 점검) ──────────────────────────────
 * /muol/shows 와 같은 규칙이다. 두 화면의 칩이 어긋나면 안 되므로
 * 한쪽을 고치면 다른 쪽도 같이 고친다. (공용 컴포넌트로 뽑는 건 제작팀 몫)
 *
 * (1) 터치 타깃 44px — <a>는 기본이 inline이라 minHeight가 먹지 않으므로 inline-flex로 세운다.
 * (2) 비활성 칩 테두리 #D4CFC1(1.34:1)을 --c-line-strong(#8C837C)로 올리고,
 *     그 토큰 주석대로 면 채움(--c-surface #E6E1D6)과 함께 쓴다. (WCAG 1.4.11)
 * (3) 지역 줄만 청록이던 것을 네 줄 모두 먹빛으로 통일. 청록은 활성 칩·링크 전담.
 * (4) hover · active · focus. 포커스 링을 currentColor로 두면 활성 칩(흰 글자)에서
 *     링이 페이지 배경과 같은 색이 되어 사라지므로 청록으로 고정한다.
 */
const CHIP_CLASS =
  "inline-flex items-center px-3 py-2.5 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]";

function chipStyle(
  isActive: boolean,
  fontFamily = "var(--font-noto-sans-kr)"
): CSSProperties {
  return {
    fontFamily,
    minHeight: 44,
    backgroundColor: isActive ? "#0B5563" : "#E6E1D6",
    color: isActive ? "#F0EEE9" : "#5A4A3E",
    border: `1px solid ${isActive ? "#0B5563" : "#8C837C"}`,
  };
}

/* 페이지네이션 버튼 — 칩과 같은 규칙을 따르되 글자색은 청록으로 남긴다(이동 링크). */
const PAGE_BTN_CLASS = `${CHIP_CLASS} justify-center`;

function pageBtnStyle(
  isCurrent: boolean,
  fontFamily = "var(--font-noto-sans-kr)"
): CSSProperties {
  return {
    fontFamily,
    minHeight: 44,
    minWidth: 44,
    backgroundColor: isCurrent ? "#0B5563" : "#E6E1D6",
    color: isCurrent ? "#F0EEE9" : "#0B5563",
    border: `1px solid ${isCurrent ? "#0B5563" : "#8C837C"}`,
    textAlign: "center",
  };
}

/* 못 누르는 상태 — 버튼 4상태 중 disabled. 면 채움 없이 옅은 테두리만 두어
   눌리는 버튼과 구분하고, 글자는 #D4CFC1(1.34:1)에서 #8C837C로 올려 읽히게 한다. */
const PAGE_BTN_OFF_CLASS =
  "inline-flex items-center justify-center px-3 py-2.5 text-xs cursor-not-allowed";
const PAGE_BTN_OFF_STYLE: CSSProperties = {
  fontFamily: "var(--font-noto-sans-kr)",
  minHeight: 44,
  minWidth: 44,
  color: "#8C837C",
  border: "1px solid #D4CFC1",
};

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

  /* 걸어둔 조건 한 줄 — 폰에서 필터를 접어두면 "무엇으로 좁혀져 있는지"가 화면에서 사라진다.
     접힌 채로도 그 답이 보이도록 요약 줄을 만든다. 검색어(q)는 바로 위 검색창이 이미 보여준다. */
  const appliedFilterLabels = [
    selectedYear ? `${selectedYear}년` : null,
    region && region !== "전체" ? region : null,
    genre,
    category,
  ].filter((v): v is string => Boolean(v));
  const filterSummary =
    appliedFilterLabels.length > 0
      ? appliedFilterLabels.join(" · ")
      : availableYears.length > 0
      ? "연도 · 지역 · 장르 · 구분으로 좁히기"
      : "지역 · 장르 · 구분으로 좁히기";

  /* 필터 네 줄 —
     아래 필터(연도·지역·장르·구분)와 페이지네이션 링크는 현재 경로 `/muol/archive`를
     직접 가리킨다. 구 경로 `/archive`는 308 리다이렉트를 왕복한다 (2026-08-03).

     2026-09-10 — 같은 JSX를 폰(접힘)과 PC(펼침) 두 자리에서 함께 쓴다. */
  const filterRows = (
    <>
      {/* 연도 */}
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
                className={CHIP_CLASS}
                style={chipStyle(isActive, "var(--font-inter)")}
                aria-current={isActive ? "true" : undefined}
              >
                {y ?? "전체"}
              </Link>
            );
          })}
        </div>
      )}

      {/* 지역 */}
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
              className={CHIP_CLASS}
              style={chipStyle(isActive)}
              aria-current={isActive ? "true" : undefined}
            >
              {r}
            </Link>
          );
        })}
      </div>

      {/* 장르 */}
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
              className={CHIP_CLASS}
              style={chipStyle(isActive)}
              aria-current={isActive ? "true" : undefined}
            >
              {g ?? "전체"}
            </Link>
          );
        })}
      </div>

      {/* 공연 구분 */}
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
              className={CHIP_CLASS}
              style={chipStyle(isActive)}
              aria-current={isActive ? "true" : undefined}
            >
              {c ?? "전체"}
            </Link>
          );
        })}
      </div>
    </>
  );

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
          {/* 2026-09-10 — 이 화면의 링크들은 transition-colors만 걸려 있고
              hover·active·focus 어느 것도 반응이 없었다(색이 바뀌는 규칙 자체가 없어
              transition이 걸 대상도 없는 상태). /muol/shows가 쓰는 4상태 규칙으로 맞춘다. */}
          <Link
            href="/muol/shows"
            className="inline-flex items-center px-4 py-2 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#0B5563",
              border: "1px solid #D4CFC1",
              minHeight: 44,
            }}
          >
            진행 중 공연으로
          </Link>
        </div>

        {/* 검색창 */}
        <ShowsSearchBar />

        {/* ── 필터 ──
            2026-09-10 모바일 점검 — 폰에서 네 줄(연도·지역 17·장르 8·구분)이 화면을 가득 채워
            지난 공연 기록을 보러 와도 첫 기록이 보이지 않았다.
            폰에서는 접어두고 걸린 조건만 한 줄로 알린다. PC는 지금 그대로 펼쳐 둔다. */}

        {/* 폰 — 접어둔다 */}
        <details className="md:hidden group mb-12 open:mb-0">
          <summary
            className="flex items-center gap-3 px-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden transition-transform duration-150 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]"
            style={{
              minHeight: 44,
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: "#E6E1D6",
              border: "1px solid #8C837C",
            }}
          >
            <span className="text-xs tracking-wider shrink-0" style={{ color: "#5F5145" }}>
              필터
            </span>
            <span
              className="text-xs min-w-0 flex-1 truncate text-right"
              style={{ color: "#4A3B33" }}
            >
              {filterSummary}
            </span>
            <span
              aria-hidden="true"
              className="text-[10px] shrink-0 transition-transform duration-150 group-open:rotate-180"
              style={{ color: "#5F5145" }}
            >
              ▼
            </span>
          </summary>
          <div className="pt-5">{filterRows}</div>
        </details>

        {/* PC — 펼친 채로 */}
        <div className="hidden md:block">{filterRows}</div>

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
                className="inline-flex items-center px-5 py-3 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#0B5563",
                  border: "1px solid #0B5563",
                  minHeight: 44,
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
              className="inline-flex items-center px-4 py-2.5 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                border: "1px solid #D4CFC1",
                minHeight: 44,
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
                  <Link href={buildPageUrl(currentPage - 1)} className={PAGE_BTN_CLASS} style={pageBtnStyle(false)}>
                    ← 이전
                  </Link>
                ) : (
                  <span className={PAGE_BTN_OFF_CLASS} style={PAGE_BTN_OFF_STYLE} aria-disabled="true">← 이전</span>
                )}

                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-2 text-xs" style={{ color: "#5A4A3E" }}>···</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(p as number)}
                      className={PAGE_BTN_CLASS}
                      style={pageBtnStyle(p === currentPage, "var(--font-inter)")}
                      aria-current={p === currentPage ? "page" : undefined}
                    >
                      {p}
                    </Link>
                  )
                )}

                {currentPage < totalPages ? (
                  <Link href={buildPageUrl(currentPage + 1)} className={PAGE_BTN_CLASS} style={pageBtnStyle(false)}>
                    다음 →
                  </Link>
                ) : (
                  <span className={PAGE_BTN_OFF_CLASS} style={PAGE_BTN_OFF_STYLE} aria-disabled="true">다음 →</span>
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
