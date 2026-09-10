/**
 * 학과 디렉토리 — 명부 전체를 싣고, 공연이 올라온 학과를 그 위에 겹쳐 보여준다.
 *
 * 【2026-09-10 개편 — 무엇이 뒤집혔나】
 * 그전까지 이 페이지는 "shows.status='approved'인 공연이 1건 이상 있는 학과만" 표시했다.
 * 그래서 승인 공연이 0건인 동안 이 페이지는 통째로 빈 화면이었고,
 * "현재 0개 학과가 자리하고 있고"라는 문장만 출력했다.
 *
 * 문제는 이것이 혼자 빈 게 아니라는 점이었다. 공연 목록·아카이브·학과 디렉토리 세 페이지가
 * 전부 shows 테이블 하나에 매달려 있어, 공연 0건이 무대올림의 세 화면을 동시에 비웠다.
 * 실측(2026-06-12~09-10)에서 공연 목록에 도착한 478세션 중 439세션(92%)이 그 자리에서 이탈했다.
 * 유입이 없어서가 아니다(구글 338·인스타 184). 도착한 곳에 볼 것이 없었다.
 *
 * 그런데 이 페이지만은 공연 없이도 채울 수 있는 유일한 화면이다 — 명부가 이미 있기 때문이다.
 * 그래서 "공연이 있는 학과만 보여주기"를 "전체를 보여주고 공연이 있는 곳을 강조하기"로 뒤집었다.
 *
 * 【함께 해결되는 것】
 * 등록 폼의 학과 칸이 자유 텍스트였던 탓에 "동덕여대 …"와 "동덕여자대학교 …"가 별개로 쌓였고,
 * 그 정규화는 코드 주석이 사람 손에 넘기고 있었다. 명부(lib/universities.ts)가 생기면서
 * 등록 폼을 명부 기반 자동완성으로 바꿀 수 있게 됐고, 표기 흔들림이 원천에서 사라진다.
 *
 * 【명부 밖 학과를 버리지 않는다】
 * 기존 공연의 school_department가 명부와 정확히 일치하지 않을 수 있다(과거 자유 입력분).
 * 그런 학과는 지역별 섹션 아래 "명부에 아직 없는 학과"로 따로 세운다. 데이터를 잃지 않기 위해서다.
 *
 * 【링크 정책】 2026-09-10 사장님 결정
 * 원본에서 `[운영자 확인 필요]` 마커가 붙은 주소는 링크로 걸지 않는다(lib/universities.ts 주석 참조).
 * 죽은 링크는 방문자·검색엔진 양쪽에 손해이고, 그 학과 담당자가 봤을 때 가장 나쁜 인상을 준다.
 *
 * 【개별 학과 페이지는 만들지 않는다】
 * /muol/universities/[학과] 113개를 지금 열면 각 페이지에 담을 것이 학과명·지역·링크뿐이라
 * 구글이 내용 얇은 페이지로 보고 사이트 전체 평가를 깎는다. 공연이 실제로 쌓인 학과부터 나중에 연다.
 *
 * 데이터 흐름: 서버 컴포넌트. revalidate 600초(10분) — 명부는 정적이고 공연 승인만 반영하면 된다.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { OG_MUOL } from "@/lib/ogCards";
import {
  DEPARTMENTS,
  REGION_ORDER,
  DEPARTMENT_COUNT,
  SCHOOL_COUNT,
  fullName,
  type Department,
} from "@/lib/universities";

export const revalidate = 600;

const SITE_URL = "https://syus.co.kr";

export const metadata: Metadata = {
  title: "학과 디렉토리",
  description: `한국 대학 무대예술 ${DEPARTMENT_COUNT}개 학과 · ${SCHOOL_COUNT}개 대학을 지역별로 정리한 명부입니다. 연극·뮤지컬·무용·국악·음악·영화·문예창작 학과를 한자리에서 찾아보실 수 있습니다.`,
  alternates: { canonical: `${SITE_URL}/muol/universities` },
  openGraph: {
    title: "학과 디렉토리 · 무대올림",
    description: `한국 대학 무대예술 ${DEPARTMENT_COUNT}개 학과 · ${SCHOOL_COUNT}개 대학. 지역별로 정리되어 있습니다.`,
    url: `${SITE_URL}/muol/universities`,
    // openGraph를 선언하면 muol/layout.tsx의 images까지 통째로 갈린다.
    // 2026-09-01 이전에는 이 줄이 없어 이 페이지만 공유 카드가 비어 있었다.
    images: [OG_MUOL],
  },
};

type ShowRow = {
  school_department: string | null;
  region: string | null;
  title: string | null;
  schedule_start: string | null;
};

/** 학과 하나에 겹쳐지는 공연 실적 */
type Activity = { count: number; latestTitle: string | null; latestStart: string | null };

function formatYmd(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* 버튼·링크 4상태 공통 문자열 — 이 저장소가 이미 쓰는 것을 그대로 가져온다(새 규칙 만들지 않음). */
const FOCUS_STATES =
  "transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";

export default async function UniversitiesPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("shows")
    .select("school_department, region, title, schedule_start")
    .eq("status", "approved")
    .not("school_department", "is", null)
    .order("schedule_start", { ascending: false });

  /* 공연 실적을 학과명 문자열로 집계한다.
   * 명부의 "학교 학과" 표기와 정확히 일치하는 것만 해당 학과에 겹치고,
   * 나머지는 아래에서 "명부에 아직 없는 학과"로 따로 세운다. */
  const activity = new Map<string, Activity>();
  const strayRegion = new Map<string, string>();
  for (const row of (rows ?? []) as ShowRow[]) {
    const name = (row.school_department ?? "").trim();
    if (!name) continue;
    const prev = activity.get(name);
    if (prev) {
      prev.count += 1;
    } else {
      activity.set(name, {
        count: 1,
        latestTitle: (row.title ?? "").trim() || null,
        latestStart: row.schedule_start,
      });
      strayRegion.set(name, (row.region ?? "").trim() || "기타");
    }
  }

  const known = new Set(DEPARTMENTS.map(fullName));
  const strays = [...activity.entries()].filter(([name]) => !known.has(name));

  // 지역별로 명부를 묶는다 (명부 자체가 이미 지역→학교→학과 순으로 정렬되어 있다)
  const byRegion = new Map<string, Department[]>();
  for (const region of REGION_ORDER) byRegion.set(region, []);
  for (const d of DEPARTMENTS) byRegion.get(d.region)?.push(d);

  const activeDeptCount = DEPARTMENTS.filter((d) => activity.has(fullName(d))).length;
  const totalShows = [...activity.values()].reduce((sum, a) => sum + a.count, 0);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "무대올림", item: `${SITE_URL}/muol` },
      { "@type": "ListItem", position: 2, name: "학과 디렉토리", item: `${SITE_URL}/muol/universities` },
    ],
  };

  return (
    <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-12 sm:pb-16">
        {/* 헤더 */}
        <header className="mb-8 sm:mb-12">
          <p
            className="text-xs sm:text-sm tracking-widest mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#6B5C50", letterSpacing: "0.2em" }}
          >
            UNIVERSITIES
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2B211C", wordBreak: "keep-all" }}
          >
            학과 디렉토리
          </h1>
          <p
            className="text-sm sm:text-base leading-relaxed max-w-2xl"
            style={{ color: "#5F5145", fontWeight: 300, wordBreak: "keep-all" }}
          >
            한국 대학 무대예술 <strong style={{ color: "#4A3B33", fontWeight: 600 }}>{DEPARTMENT_COUNT}개 학과</strong> ·{" "}
            <strong style={{ color: "#4A3B33", fontWeight: 600 }}>{SCHOOL_COUNT}개 대학</strong>을 지역별로 모아 두었습니다.
            {activeDeptCount > 0 ? (
              <>
                {" "}그중 {activeDeptCount}개 학과의 무대 {totalShows}건이 지금 무대올림에 올라와 있습니다.
                공연이 있는 학과를 누르시면 그 학과의 무대로 이동합니다.
              </>
            ) : (
              <> 아직 올라온 무대는 없습니다. 첫 막이 오르면 그 학과부터 이 명부 위에 표시됩니다.</>
            )}
          </p>
        </header>

        {/* 지역 바로가기 — 명부가 길어 첫 화면에서 원하는 지역으로 건너뛸 수 있게 둔다. */}
        <nav aria-label="지역 바로가기" className="flex flex-wrap gap-2 mb-12 pb-8" style={{ borderBottom: "1px solid #D4CFC1" }}>
          {REGION_ORDER.map((region) => {
            const list = byRegion.get(region) ?? [];
            if (list.length === 0) return null;
            return (
              <a
                key={region}
                href={`#region-${encodeURIComponent(region)}`}
                className={`inline-flex items-center px-3 text-xs ${FOCUS_STATES}`}
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  minHeight: 44,
                  backgroundColor: "#E6E1D6",
                  border: "1px solid #8C837C",
                  color: "#4A3B33",
                }}
              >
                {region}
                <span style={{ color: "#6B5C50", marginLeft: 6 }}>{list.length}</span>
              </a>
            );
          })}
        </nav>

        <div className="space-y-12 sm:space-y-16">
          {REGION_ORDER.map((region) => {
            const list = byRegion.get(region) ?? [];
            if (list.length === 0) return null;
            const regionShows = list.reduce((sum, d) => sum + (activity.get(fullName(d))?.count ?? 0), 0);

            return (
              <section key={region} id={`region-${encodeURIComponent(region)}`} style={{ scrollMarginTop: "6rem" }}>
                <div className="flex items-baseline justify-between mb-5 pb-3" style={{ borderBottom: "1px solid #D4CFC1" }}>
                  {/* 지역명은 '읽는 것'이므로 먹빛. 청록은 누를 수 있는 것에만 쓴다. */}
                  <h2
                    className="text-lg sm:text-xl font-semibold"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" }}
                  >
                    {region}
                  </h2>
                  <span className="text-xs" style={{ color: "#6B5C50" }}>
                    {list.length}개 학과{regionShows > 0 ? ` · 공연 ${regionShows}건` : ""}
                  </span>
                </div>

                <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((d) => {
                    const name = fullName(d);
                    const act = activity.get(name);
                    const latestYmd = formatYmd(act?.latestStart ?? null);

                    /* 공연이 있는 학과 — 카드 전체가 그 학과의 무대로 가는 문이 된다. */
                    if (act) {
                      return (
                        <li key={name}>
                          <Link
                            href={`/muol/shows?school=${encodeURIComponent(name)}`}
                            className={`block p-4 sm:p-5 h-full ${FOCUS_STATES}`}
                            style={{ backgroundColor: "#E6E1D6", border: "1px solid #8C837C" }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span
                                className="text-sm sm:text-base leading-snug"
                                style={{ color: "#2B211C", fontWeight: 600, wordBreak: "keep-all" }}
                              >
                                {d.school} {d.dept}
                              </span>
                              <span
                                className="shrink-0 text-xs px-2 py-0.5"
                                style={{ backgroundColor: "#0B5563", color: "#F0EEE9" }}
                              >
                                {act.count}
                              </span>
                            </div>
                            {act.latestTitle ? (
                              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#6B5C50" }}>
                                최근 · <span style={{ color: "#4A3B33" }}>{act.latestTitle}</span>
                                {latestYmd ? <span style={{ marginLeft: 6 }}>· {latestYmd}</span> : null}
                              </p>
                            ) : null}
                          </Link>
                        </li>
                      );
                    }

                    /* 아직 무대가 올라오지 않은 학과 — 명부로서 자리는 지키되 눌러도 갈 곳이 없으므로
                       카드 전체를 링크로 만들지 않는다. 확인된 홈페이지가 있을 때만 그 한 줄을 링크로 준다. */
                    return (
                      <li
                        key={name}
                        className="p-4 sm:p-5 h-full"
                        style={{ backgroundColor: "rgba(230,225,214,0.45)", border: "1px solid #D4CFC1" }}
                      >
                        <p
                          className="text-sm sm:text-base leading-snug mb-1"
                          style={{ color: "#4A3B33", wordBreak: "keep-all" }}
                        >
                          {d.school} {d.dept}
                        </p>
                        <div className="flex items-baseline justify-between gap-2">
                          {d.genre ? (
                            <span className="text-xs" style={{ color: "#6B5C50" }}>
                              {d.genre}
                            </span>
                          ) : (
                            <span />
                          )}
                          {d.url ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs shrink-0 ${FOCUS_STATES}`}
                              style={{
                                color: "#0B5563",
                                textDecoration: "underline",
                                textDecorationColor: "rgba(11,85,99,0.35)",
                                textUnderlineOffset: "3px",
                              }}
                            >
                              학과 홈페이지 ↗
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {/* 명부에 아직 없는 학과 — 과거 자유 입력으로 등록된 공연을 잃지 않기 위한 자리 */}
          {strays.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-5 pb-3" style={{ borderBottom: "1px solid #D4CFC1" }}>
                <h2
                  className="text-lg sm:text-xl font-semibold"
                  style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" }}
                >
                  명부에 아직 없는 학과
                </h2>
                <span className="text-xs" style={{ color: "#6B5C50" }}>
                  {strays.length}곳
                </span>
              </div>
              <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {strays.map(([name, act]) => (
                  <li key={name}>
                    <Link
                      href={`/muol/shows?school=${encodeURIComponent(name)}`}
                      className={`block p-4 sm:p-5 h-full ${FOCUS_STATES}`}
                      style={{ backgroundColor: "#E6E1D6", border: "1px solid #8C837C" }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span
                          className="text-sm sm:text-base leading-snug"
                          style={{ color: "#2B211C", fontWeight: 600, wordBreak: "keep-all" }}
                        >
                          {name}
                        </span>
                        <span
                          className="shrink-0 text-xs px-2 py-0.5"
                          style={{ backgroundColor: "#0B5563", color: "#F0EEE9" }}
                        >
                          {act.count}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "#6B5C50" }}>
                        {strayRegion.get(name) ?? "기타"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* 푸터 안내 */}
        <div
          className="mt-16 pt-8 text-xs leading-relaxed"
          style={{ borderTop: "1px solid #D4CFC1", color: "#6B5C50" }}
        >
          <p className="mb-3" style={{ wordBreak: "keep-all" }}>
            이 명부에는 각 대학이 공개한 학과명·소재지·홈페이지 주소만 싣습니다. 담당자 성함이나 연락처는 싣지 않습니다.
            내용이 실제와 다르거나 표시를 원하지 않으시면{" "}
            <Link
              href="/muol/contact"
              className={FOCUS_STATES}
              style={{
                color: "#0B5563",
                textDecoration: "underline",
                textDecorationColor: "rgba(11,85,99,0.35)",
                textUnderlineOffset: "3px",
              }}
            >
              문의
            </Link>
            로 알려주시면 곧바로 고치거나 내리겠습니다.
          </p>
          <p style={{ wordBreak: "keep-all" }}>
            아직 무대가 올라오지 않은 학과의 학생·운영자께서는{" "}
            <Link
              href="/muol/performer"
              className={FOCUS_STATES}
              style={{
                color: "#0B5563",
                textDecoration: "underline",
                textDecorationColor: "rgba(11,85,99,0.35)",
                textUnderlineOffset: "3px",
              }}
            >
              무대 올리기
            </Link>
            에서 시작하실 수 있습니다. 올리시는 데에도, 사이트에 걸리는 데에도 비용을 받지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
