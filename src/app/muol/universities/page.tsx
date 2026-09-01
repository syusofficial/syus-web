/**
 * 학과 디렉토리 — 활성 학과만 노출 (2026-06-08 사장님 결정)
 *
 * 정책
 * - shows.status = 'approved' 인 공연이 1건 이상 있는 학과만 표시한다.
 *   (등록은 했지만 승인 안 된 학과, 아예 공연 0건인 학과는 노출하지 않는다)
 * - 운영팀 16지역 그룹별로 묶어 보여준다. (lib/constants.ts REGIONS_EXCLUDE_ALL)
 * - 학과명 옆에 누적 공연 수, 가장 최근 공연 제목·날짜를 함께 노출한다.
 * - 학과명을 클릭하면 /shows?school=… 로 이동해 그 학과 공연만 필터링된다.
 * - 학과 상세 페이지(개별)는 다음 분기 작업으로 보류. 이 페이지는 디렉토리 역할만.
 *
 * 데이터 흐름
 * - 서버 컴포넌트. 빌드 시점이 아닌 요청 시점 SSR.
 * - revalidate 600초 (10분) — 학과 풀은 자주 변하지 않으나, 신규 공연 승인 직후
 *   사장님이 새 학과를 확인할 수 있도록 적당한 신선도 확보.
 *
 * 표시 규칙
 * - 학과명 trim. 빈 문자열·"기타"는 제외.
 * - 같은 학과명 변형(공백·하이픈 차이)은 일단 그대로 둔다. 정규화는 운영팀이 손으로.
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { REGIONS_EXCLUDE_ALL } from "@/lib/constants";
import type { Metadata } from "next";
import { OG_MUOL } from "@/lib/ogCards";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "학과 디렉토리",
  description:
    "무대올림에 공연을 올린 적이 있는 한국 대학 무대예술 학과 목록입니다. 학과별 누적 공연과 가장 최근 무대를 한눈에 볼 수 있습니다.",
  alternates: { canonical: "https://syus.co.kr/universities" },
  openGraph: {
    title: "학과 디렉토리 · 무대올림",
    description:
      "무대올림에 공연을 올린 학과만 모아 둔 디렉토리. 지역별로 정리되어 있습니다.",
    url: "https://syus.co.kr/universities",
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

type DeptEntry = {
  name: string;
  region: string;
  count: number;
  latestTitle: string | null;
  latestStart: string | null;
};

function formatYmd(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function UniversitiesPage() {
  const supabase = await createClient();

  // 활성 공연만 — status='approved'
  const { data: rows } = await supabase
    .from("shows")
    .select("school_department, region, title, schedule_start")
    .eq("status", "approved")
    .not("school_department", "is", null)
    .order("schedule_start", { ascending: false });

  // 학과별 집계 (가장 최근 공연 1건 유지)
  const map = new Map<string, DeptEntry>();
  for (const row of (rows ?? []) as ShowRow[]) {
    const name = (row.school_department ?? "").trim();
    if (!name) continue;
    const region = (row.region ?? "").trim() || "기타";
    const key = `${region}::${name}`;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        name,
        region,
        count: 1,
        latestTitle: (row.title ?? "").trim() || null,
        latestStart: row.schedule_start,
      });
    }
  }

  // 지역별 그룹핑 — REGIONS_EXCLUDE_ALL 순서 유지
  const byRegion = new Map<string, DeptEntry[]>();
  for (const region of REGIONS_EXCLUDE_ALL) byRegion.set(region, []);
  byRegion.set("기타", []);

  for (const entry of map.values()) {
    const bucket = byRegion.get(entry.region) ?? byRegion.get("기타");
    bucket?.push(entry);
  }

  // 그룹 내 정렬: 공연 수 내림차순 → 학과명 가나다순
  for (const list of byRegion.values()) {
    list.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, "ko"));
  }

  const totalDepts = map.size;
  const activeRegions = [...byRegion.entries()].filter(([, list]) => list.length > 0);

  return (
    <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-12 sm:pb-16">
        {/* 헤더 */}
        <header className="mb-10 sm:mb-14">
          <p
            className="text-xs sm:text-sm tracking-widest mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#6B5C50", letterSpacing: "0.2em" }}
          >
            UNIVERSITIES
          </p>
          {/* 2026-08-03 디자인팀: 이 페이지 H1만 혼자 text-2xl(24px)·font-light 이라
              다른 페이지 H1(text-4xl md:text-5xl·bold·명조)과 위계 낙차가 컸다.
              공연 목록·상세·FAQ·문의와 동일 규격으로 통일. */}
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#2B211C" /* B안 --c-ink : 대제목은 먹빛 */,
              wordBreak: "keep-all",
            }}
          >
            학과 디렉토리
          </h1>
          <p
            className="text-sm sm:text-base leading-relaxed max-w-2xl"
            style={{ color: "#5F5145" /* B안 --c-text-muted */, fontWeight: 300, wordBreak: "keep-all" }}
          >
            무대올림에 공연을 올린 적이 있는 학과만 모아 두었습니다.
            현재 {totalDepts.toLocaleString("ko-KR")}개 학과가 자리하고 있고,
            지역별로 정리되어 있습니다. 학과명을 누르시면 그 학과의 공연 목록으로 이동합니다.
          </p>
        </header>

        {/* 학과 0건일 때 */}
        {totalDepts === 0 ? (
          <div
            className="py-16 text-center"
            style={{ color: "#5F5145" }}
          >
            <p className="text-sm font-light" style={{ wordBreak: "keep-all" }}>
              아직 표시할 학과가 없습니다. 첫 공연이 올라가면 이 자리에 학과가 새겨집니다.
            </p>
            <Link
              href="/muol/performer"
              className="inline-block mt-6 px-6 py-3 text-sm transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "#5C2A42" /* B안 --c-cta : 결심하는 것 = 자두 */,
                color: "#F0EEE9",
                letterSpacing: "0.05em",
              }}
            >
              공연자 신청
            </Link>
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-16">
            {activeRegions.map(([region, list]) => (
              <section key={region}>
                <div className="flex items-baseline justify-between mb-5 pb-3" style={{ borderBottom: "1px solid #D4CFC1" }}>
                  {/* B안: 지역명은 '읽는 것'이므로 청록 → 먹빛(--c-ink-2).
                      청록은 이 페이지에서 '누를 수 있는 것'(공연 수 배지·하단 링크)만 쓴다. */}
                  <h2
                    className="text-lg sm:text-xl font-semibold"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" }}
                  >
                    {region}
                  </h2>
                  <span
                    className="text-xs"
                    style={{ color: "#6B5C50" }}
                  >
                    {list.length}개 학과 · 공연 {list.reduce((sum, e) => sum + e.count, 0)}건
                  </span>
                </div>

                <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((entry) => {
                    const href = `/muol/shows?school=${encodeURIComponent(entry.name)}`;
                    const latestYmd = formatYmd(entry.latestStart);
                    return (
                      <li key={`${entry.region}-${entry.name}`}>
                        <Link
                          href={href}
                          className="block p-4 sm:p-5 h-full transition-colors"
                          style={{
                            backgroundColor: "#E6E1D6",
                            border: "1px solid #D4CFC1",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span
                              className="text-sm sm:text-base font-normal leading-snug"
                              style={{ color: "#4A3B33", wordBreak: "keep-all" }}
                            >
                              {entry.name}
                            </span>
                            {/* 공연 수 배지 — 이 카드가 '누르면 그 학과 공연으로 간다'는 유일한 색 신호 */}
                            <span
                              className="shrink-0 text-xs px-2 py-0.5"
                              style={{
                                backgroundColor: "#0B5563" /* B안 --c-link */,
                                color: "#F0EEE9",
                              }}
                            >
                              {entry.count}
                            </span>
                          </div>
                          {entry.latestTitle ? (
                            <p
                              className="text-xs leading-relaxed line-clamp-2"
                              style={{ color: "#6B5C50" }}
                            >
                              최근 ·{" "}
                              <span style={{ color: "#4A3B33" }}>
                                {entry.latestTitle}
                              </span>
                              {latestYmd ? (
                                <span style={{ marginLeft: 6 }}>· {latestYmd}</span>
                              ) : null}
                            </p>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* 푸터 안내 */}
        <div
          className="mt-16 pt-8 text-xs leading-relaxed"
          style={{
            borderTop: "1px solid #D4CFC1",
            color: "#6B5C50",
          }}
        >
          <p className="mb-2">
            이 디렉토리에는 무대올림에 공연이 한 번이라도 올라온 학과만 표시됩니다.
          </p>
          <p>
            아직 보이지 않는 학과의 학생·운영자께서는{" "}
            <Link
              href="/muol/performer"
              style={{
                color: "#0B5563" /* B안 --c-link */,
                textDecoration: "underline",
                textDecorationColor: "rgba(11,85,99,0.35)",
                textUnderlineOffset: "3px",
              }}
            >
              공연자 신청
            </Link>
            을 해주시면, 첫 공연 승인과 함께 자리가 새겨집니다.
          </p>
        </div>
      </div>
    </div>
  );
}
