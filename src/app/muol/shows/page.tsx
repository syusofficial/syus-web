import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import ShowsSearchBar from "@/components/ShowsSearchBar";
import MobilePartnerStrip from "@/components/MobilePartnerStrip";
import { createClient } from "@/lib/supabase/server";
import { REGIONS, GENRES, SHOW_CATEGORIES } from "@/lib/constants";
import { sanitizeSearchTerm, todayKey, isEnded } from "@/lib/showFilters";
import { showDateKey } from "@/lib/showDate";
import { buildBreadcrumbList } from "@/lib/structuredData";
import { buildRatingMap } from "@/lib/ratings";
import { DEPARTMENT_COUNT } from "@/lib/universities";
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

/* ── 필터 칩 공통 규칙 (2026-09-10 모바일 점검) ──────────────────────────────
 * 네 줄(지역·장르·구분·학교)이 각자 조금씩 다른 스타일을 들고 있었다. 한 규칙으로 모은다.
 *
 * (1) 터치 타깃 — 칩 높이가 36px이라 손끝 권장치(44px)에 못 미쳤다. minHeight 44px.
 *     <a>는 기본이 inline이라 minHeight가 먹지 않으므로 inline-flex로 세운다.
 *     패딩·글자 크기·색은 건드리지 않는다.
 * (2) 경계 — 비활성 칩 테두리(#D4CFC1)가 배경(#F0EEE9) 대비 1.34:1로 사실상 보이지 않았다.
 *     칩이 몇 개인지, 어디까지가 한 칩인지 눈으로 셀 수 없는 상태. WCAG 1.4.11(3:1)에 맞춰
 *     globals.css의 --c-line-strong(#8C837C)로 올리고, 그 토큰 주석이 요구하는 대로
 *     면 채움(--c-surface #E6E1D6)과 함께 쓴다.
 * (3) 색 — 지역 줄만 청록(#0B5563), 나머지 세 줄은 먹빛(#5A4A3E)이었다. 성격이 같은 칩이
 *     화면 안에서 두 가지 색으로 갈려 있었다. 네 줄 모두 먹빛으로 통일한다.
 *     (청록은 이 사이트에서 '지금 켜진 것'과 링크 전담이라, 활성 칩에만 남는다.)
 * (4) 버튼 4상태 — hover(흐려짐) · active(눌림) · focus(링) · 비활성은 aria-current 대신
 *     활성 칩 자체가 상태를 나타낸다. 링 색을 currentColor로 두면 활성 칩(흰 글자)에서
 *     링이 페이지 배경과 같은 색이 되어 사라지므로 청록으로 고정한다.
 *
 * ※ 같은 규칙이 /muol/archive 에도 한 벌 있다. 두 화면의 칩이 어긋나면 안 되므로
 *   한쪽을 고치면 다른 쪽도 같이 고친다. (공용 컴포넌트로 뽑는 건 제작팀 몫)
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

/* 페이지네이션 버튼 — 칩과 같은 규칙(44px · 보이는 테두리 · 4상태)을 따르되
   글자색은 청록으로 남긴다. 조건을 켜고 끄는 칩이 아니라 '다른 장으로 가는 링크'이기 때문이다. */
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

/* 못 누르는 상태(첫 장의 '이전', 마지막 장의 '다음') — 버튼 4상태 중 disabled.
   눌리는 버튼과 확실히 달라 보이도록 면 채움 없이 옅은 테두리만 두되,
   글자는 #D4CFC1(배경 대비 1.34:1 — 사실상 안 보였다)에서 #8C837C로 올려
   '있지만 지금은 못 누른다'가 읽히게 한다. */
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

  /* 진행 중·예정 공연만 필터 (종료된 건 /archive로)
   * 2026-09-10 점검 — 정렬이 등록 역순(created_at desc) 하나뿐이었다. 화면 제목은
   * "진행 중 · 예정 공연"인데, 맨 위에는 오늘 등록된 반년 뒤 공연이 오고 내일 막이 오르는 공연은
   * 뒷장으로 밀렸다. 관객이 이 목록에 오는 이유는 "지금 볼 수 있는 무대"를 찾기 위해서다.
   * 그래서 기본 정렬을 임박순으로 바꾼다 — 아직 시작 안 한 공연을 가까운 순으로 먼저,
   * 이미 막이 오른 공연은 최근 시작한 것부터 뒤에. 홈의 "곧 시작하는 공연"과 같은 규칙이다.
   * (정렬 선택 UI는 두지 않았다 — 이 화면은 이미 필터 칩이 첫 포스터를 밀어내고 있다.) */
  const today = todayKey();
  const activeShows = (showsRaw as Show[] ?? [])
    .filter((s) => !isEnded(s, today))
    .sort((a, b) => {
      const ka = showDateKey(a.schedule_start) ?? "9999-99-99";
      const kb = showDateKey(b.schedule_start) ?? "9999-99-99";
      const notYetA = ka >= today ? 0 : 1;
      const notYetB = kb >= today ? 0 : 1;
      if (notYetA !== notYetB) return notYetA - notYetB;
      return notYetA === 0 ? ka.localeCompare(kb) : kb.localeCompare(ka);
    });

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

  /* 걸어둔 조건 한 줄 — 폰에서 필터를 접어두면 "무엇으로 좁혀져 있는지"가 화면에서 사라진다.
     접힌 채로도 그 답이 보이도록 요약 줄을 만든다. 검색어(q)는 바로 위 검색창이 이미 보여주므로 뺀다. */
  const appliedFilterLabels = [
    region && region !== "전체" ? region : null,
    genre,
    detail,
    category,
    school,
  ].filter((v): v is string => Boolean(v));
  const filterSummary =
    appliedFilterLabels.length > 0
      ? appliedFilterLabels.join(" · ")
      : availableSchools.length > 0
      ? "지역 · 장르 · 구분 · 학교로 좁히기"
      : "지역 · 장르 · 구분으로 좁히기";

  /* 필터 네 줄 —
     아래 네 필터(지역·장르·구분·학교)와 페이지네이션의 링크는 모두 현재 경로인
     `/muol/shows`를 직접 가리킨다. 구 경로 `/shows`로 두면 누를 때마다
     next.config.ts의 308 리다이렉트를 왕복해 반응이 한 박자 늦는다 (2026-08-03).

     2026-09-10 — 같은 JSX를 폰(접힘)과 PC(펼침) 두 자리에서 함께 쓴다.
     칩 목록을 두 번 적으면 한쪽만 고쳐지는 날이 반드시 오므로 여기 한 벌만 둔다. */
  const filterRows = (
    <>
      {/* 지역 */}
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
              className={CHIP_CLASS}
              style={chipStyle(isActive)}
              aria-current={isActive ? "true" : undefined}
            >
              {c ?? "전체"}
            </Link>
          );
        })}
      </div>

      {/* 학교 — 등록된 학교가 있을 때만 노출 */}
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
                className={CHIP_CLASS}
                style={chipStyle(isActive)}
                aria-current={isActive ? "true" : undefined}
              >
                {sch ?? "전체"}
              </Link>
            );
          })}
        </div>
      )}
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

        {/* ── 필터 ──
            2026-09-10 모바일 점검 — 폰에서 이 네 줄(지역 17 + 장르 8 + 구분 + 학교)이
            화면 두 개 분량을 차지해, 공연 목록에 들어와도 첫 포스터가 보이지 않았다.
            무대를 보러 온 사람이 조건부터 고르게 만드는 구조였다.
            폰에서는 접어두고 걸린 조건만 한 줄로 알린다. PC는 가로가 남으므로 지금 그대로 펼쳐 둔다.
            (같은 filterRows를 두 자리에서 함께 쓴다 — 목록이 어긋날 일이 없다.) */}

        {/* 폰 — 접어둔다 */}
        <details className="md:hidden group mb-10 open:mb-0">
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
                  {/* 2026-09-11 — 출구가 '읽을 것' 둘뿐이었다. 지금 이 사이트에서 유일하게
                      꽉 차 있는 실물은 학과 명부이고, 확인하러 들어온 담당자가 자기 학과를
                      찾아볼 수 있는 자리도 거기다. 그래서 명부를 첫 문으로 올린다. */}
                  막이 오르기를 기다리는 동안, 둘러보실 자리가 있습니다.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    href="/muol/universities"
                    className="inline-block px-4 py-2.5 text-xs tracking-wide transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      color: "#0B5563",
                      border: "1px solid #D4CFC1",
                    }}
                  >
                    학과 명부 {DEPARTMENT_COUNT}곳 →
                  </Link>
                  <Link
                    // 2026-09-10 점검 — 여기가 "/syus/essays" 였는데 그 라우트에는 page.tsx가 없어
                    // 라이브에서 404였다(실측 확인). 즉 공연 0건 화면에서 관객에게 내준 출구 두 개 중
                    // 하나가 막힌 문이었다. 견해글 목록의 실제 주소는 /syus/proscenium(주인장 견해글 허브)이고
                    // 현재 28편이 발행돼 있다. 사이트 전체에서 "/syus/essays"를 링크하던 곳은 이 한 줄뿐이었다.
                    href="/syus/proscenium"
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
                  <Link href={buildPageUrl(currentPage - 1)} className={PAGE_BTN_CLASS} style={pageBtnStyle(false)}>
                    ← 이전
                  </Link>
                ) : (
                  <span className={PAGE_BTN_OFF_CLASS} style={PAGE_BTN_OFF_STYLE} aria-disabled="true">← 이전</span>
                )}

                {/* 페이지 번호 */}
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
