"use client";

import { useMemo, useState } from "react";
import type { Show, Profile } from "@/types";
import { extractSchoolName, isEnded, todayKey } from "@/lib/showFilters";
import LivePresenceCard from "@/components/admin/LivePresenceCard";

type PageViewRow = {
  path: string;
  referrer: string | null;
  session_id: string | null;
  is_admin: boolean;
  created_at: string;
};

type AdminStatsProps = {
  shows: Show[];
  members: Profile[];
  likes: { show_id: string }[]; // 모든 좋아요 row (관리자 RLS)
  pageViews?: PageViewRow[];    // 최근 90일 방문 로그 (관리자 RLS)
};

/**
 * 유입 출처 분류 — referrer 문자열에서 채널 라벨 추출
 * - 사이트 내부(syus.co.kr / *.vercel.app) referrer는 제외 (호출자에서 거름)
 * - 매칭 우선순위: 인스타 → 네이버 → 카카오 → 구글 → 다음 → 기타
 */
const REFERRER_RULES: { label: string; patterns: RegExp[] }[] = [
  { label: "인스타그램",  patterns: [/(^|\.)instagram\.com$/i, /(^|\.)l\.instagram\.com$/i] },
  { label: "네이버",      patterns: [/(^|\.)naver\.com$/i, /(^|\.)search\.naver\.com$/i] },
  { label: "카카오",      patterns: [/(^|\.)kakao\.com$/i, /(^|\.)pf\.kakao\.com$/i] },
  { label: "다음",        patterns: [/(^|\.)daum\.net$/i] },
  { label: "구글",        patterns: [/(^|\.)google\.com$/i, /(^|\.)google\.co\.kr$/i] },
];

function classifyReferrer(referrer: string | null): string {
  if (!referrer || referrer.trim() === "") return "직접 진입";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "기타";
  }
  // 자체 도메인은 호출자에서 미리 걸러내지만 방어적으로 한 번 더
  if (/(^|\.)syus\.co\.kr$/i.test(host)) return "직접 진입";
  for (const rule of REFERRER_RULES) {
    if (rule.patterns.some((p) => p.test(host))) return rule.label;
  }
  return "기타";
}

export default function AdminStats({ shows, members, likes, pageViews = [] }: AdminStatsProps) {
  // 운영자 본인 트래픽 포함/제외 토글 — 기본 제외 (영업 보고용 숫자)
  const [includeAdminTraffic, setIncludeAdminTraffic] = useState(false);
  const visibleViews = useMemo(
    () => (includeAdminTraffic ? pageViews : pageViews.filter((v) => !v.is_admin)),
    [pageViews, includeAdminTraffic],
  );

  const traffic = useMemo(() => {
    // 한국시간(KST) 기준 자정 — 서버 timestamptz를 그대로 다루면 UTC 자정이 됨
    // → "오늘"의 한국 운영자 직관을 맞추기 위해 KST 자정 기준으로 잘라낸다
    const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowKstMs = Date.now() + KST_OFFSET_MS;
    const todayKstStart = Math.floor(nowKstMs / 86400000) * 86400000 - KST_OFFSET_MS;
    const yesterdayKstStart = todayKstStart - 86400000;
    const sevenDaysAgo = todayKstStart - 6 * 86400000; // 오늘 포함 7일
    const thirtyDaysAgo = todayKstStart - 29 * 86400000; // 오늘 포함 30일

    let todayCount = 0;
    let yesterdayCount = 0;
    let last7Count = 0;
    const todaySessions = new Set<string>();
    const last7Sessions = new Set<string>();
    const allSessions = new Set<string>();
    const pathCount: Record<string, number> = {};

    // 일별 시리즈 (최근 30일)
    const dailyMap: Record<number, number> = {};

    // 유입 출처 집계 — 오늘 / 7일 / 30일 (방문 row 기준, 세션 중복 허용)
    // PageViewTracker가 자체 origin referrer는 이미 null로 정규화해 보냄 (내부 이동 제외)
    const referrerToday: Record<string, number> = {};
    const referrer7: Record<string, number> = {};
    const referrer30: Record<string, number> = {};

    for (const v of visibleViews) {
      const ts = new Date(v.created_at).getTime();

      if (ts >= todayKstStart) {
        todayCount += 1;
        if (v.session_id) todaySessions.add(v.session_id);
      } else if (ts >= yesterdayKstStart && ts < todayKstStart) {
        yesterdayCount += 1;
      }
      if (ts >= sevenDaysAgo) {
        last7Count += 1;
        if (v.session_id) last7Sessions.add(v.session_id);
      }
      if (ts >= thirtyDaysAgo) {
        // 일자 키 (KST 자정 ms)
        const dayStart = Math.floor((ts + KST_OFFSET_MS) / 86400000) * 86400000 - KST_OFFSET_MS;
        dailyMap[dayStart] = (dailyMap[dayStart] ?? 0) + 1;
      }

      // 유입 출처 분류 — 자체 도메인은 classify 내부에서 "직접 진입"으로 흘림
      const refLabel = classifyReferrer(v.referrer);
      if (ts >= todayKstStart) {
        referrerToday[refLabel] = (referrerToday[refLabel] ?? 0) + 1;
      }
      if (ts >= sevenDaysAgo) {
        referrer7[refLabel] = (referrer7[refLabel] ?? 0) + 1;
      }
      if (ts >= thirtyDaysAgo) {
        referrer30[refLabel] = (referrer30[refLabel] ?? 0) + 1;
      }

      if (v.session_id) allSessions.add(v.session_id);
      pathCount[v.path] = (pathCount[v.path] ?? 0) + 1;
    }

    // 최근 14일 막대 시리즈 (오늘 포함, 왼→오)
    const daily: { dayStart: number; label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = todayKstStart - i * 86400000;
      const d = new Date(dayStart);
      daily.push({
        dayStart,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        count: dailyMap[dayStart] ?? 0,
      });
    }

    const topPaths = Object.entries(pathCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 유입 출처 — 30일 기준 TOP 5 (직접 진입 포함)
    // 0건은 표시하지 않음 (가짜 숫자 금지)
    const referrerTop = Object.entries(referrer30)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const referrerByPeriod = {
      today: Object.entries(referrerToday).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]),
      week: Object.entries(referrer7).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]),
      month: Object.entries(referrer30).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]),
    };

    return {
      todayCount,
      yesterdayCount,
      last7Count,
      last7Avg: Math.round(last7Count / 7),
      totalCount: visibleViews.length,
      todayUU: todaySessions.size,
      last7UU: last7Sessions.size,
      totalUU: allSessions.size,
      daily,
      topPaths,
      referrerTop,
      referrerByPeriod,
    };
  }, [visibleViews]);

  const adminTrafficCount = useMemo(
    () => pageViews.filter((v) => v.is_admin).length,
    [pageViews],
  );


  const stats = useMemo(() => {
    const today = todayKey();

    // ── 요약 카드 ─────────────────────────
    const totalMembers = members.length;
    const totalShows = shows.length;
    const approvedShows = shows.filter((s) => s.status === "approved");
    const activeShows = approvedShows.filter((s) => !isEnded(s, today)).length;

    // 최근 30일 신규 가입자
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = members.filter((m) => new Date(m.created_at) >= thirtyDaysAgo).length;

    // ── 회원 역할 분포 ────────────────────
    const roleCount: Record<string, number> = { member: 0, performer: 0, admin: 0 };
    for (const m of members) {
      roleCount[m.role] = (roleCount[m.role] ?? 0) + 1;
    }

    // ── 학교 분포 TOP 10 (approved 공연 기준) ────
    const schoolCount: Record<string, number> = {};
    for (const s of approvedShows) {
      const school = extractSchoolName(s.school_department);
      if (school) schoolCount[school] = (schoolCount[school] ?? 0) + 1;
    }
    const schoolDist = Object.entries(schoolCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // ── 지역 분포 ────────────────────────
    const regionCount: Record<string, number> = {};
    for (const s of approvedShows) {
      if (s.region) regionCount[s.region] = (regionCount[s.region] ?? 0) + 1;
    }
    const regionDist = Object.entries(regionCount).sort((a, b) => b[1] - a[1]);

    // ── 장르 분포 ────────────────────────
    const genreCount: Record<string, number> = {};
    for (const s of approvedShows) {
      const g = s.genre === "기타" && s.genre_custom ? s.genre_custom : s.genre;
      if (g) genreCount[g] = (genreCount[g] ?? 0) + 1;
    }
    const genreDist = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);

    // ── 월별 추이 (최근 6개월) ─────────────
    const months: { key: string; label: string; signups: number; shows: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: `${d.getMonth() + 1}월`,
        signups: 0,
        shows: 0,
      });
    }
    for (const m of members) {
      const k = m.created_at.slice(0, 7); // "2026-04"
      const target = months.find((x) => x.key === k);
      if (target) target.signups += 1;
    }
    for (const s of shows) {
      const k = s.created_at.slice(0, 7);
      const target = months.find((x) => x.key === k);
      if (target) target.shows += 1;
    }

    // ── 인기 공연 TOP 5 (좋아요 기준, approved만) ────
    const likeCount: Record<string, number> = {};
    for (const l of likes) {
      likeCount[l.show_id] = (likeCount[l.show_id] ?? 0) + 1;
    }
    const topLiked = approvedShows
      .map((s) => ({ show: s, likes: likeCount[s.id] ?? 0 }))
      .filter((x) => x.likes > 0)
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);

    return {
      totalMembers,
      totalShows,
      activeShows,
      recentSignups,
      roleCount,
      schoolDist,
      regionDist,
      genreDist,
      months,
      topLiked,
      totalLikes: likes.length,
    };
  }, [shows, members, likes]);

  return (
    <div className="space-y-12">
      {/* ── 실시간 동시접속 ─────────────── */}
      <LivePresenceCard />

      {/* ── 방문자 (사장님 한눈에 보기) ─────────────── */}
      <section>
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
          <SectionLabel>홈페이지 방문자</SectionLabel>
          <div className="flex items-center gap-2">
            <label
              className="flex items-center gap-2 text-xs cursor-pointer select-none"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F584F" }}
            >
              <input
                type="checkbox"
                checked={includeAdminTraffic}
                onChange={(e) => setIncludeAdminTraffic(e.target.checked)}
                style={{ accentColor: "#3B5A6B" }}
              />
              운영자 본인 포함 ({adminTrafficCount}회)
            </label>
          </div>
        </div>

        {pageViews.length === 0 ? (
          <EmptyText>
            아직 방문 데이터가 없습니다. Supabase SQL Editor에 db/migrations/2026-06-06_page_views.sql 을 실행하셨는지 확인해주세요.
          </EmptyText>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <SummaryCard label="오늘 방문" value={traffic.todayCount} suffix={`회 · ${traffic.todayUU}명`} accent />
              <SummaryCard label="어제 방문" value={traffic.yesterdayCount} suffix="회" />
              <SummaryCard label="7일 평균" value={traffic.last7Avg} suffix="회/일" />
              <SummaryCard label="누적 (90일)" value={traffic.totalCount} suffix={`회 · ${traffic.totalUU}명`} />
            </div>

            {/* 최근 14일 추이 */}
            <DailyTrafficChart daily={traffic.daily} />

            {/* 인기 페이지 TOP 5 */}
            {traffic.topPaths.length > 0 && (
              <div className="mt-6">
                <p
                  className="text-xs tracking-[0.3em] uppercase mb-3"
                  style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
                >
                  인기 페이지 TOP 5 (90일)
                </p>
                <BarList items={traffic.topPaths} />
              </div>
            )}

            {/* 유입 출처 (오늘 / 7일 / 30일) */}
            {traffic.referrerTop.length > 0 && (
              <div className="mt-8">
                <ReferrerBreakdown byPeriod={traffic.referrerByPeriod} top={traffic.referrerTop} />
              </div>
            )}

            <p
              className="text-xs mt-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F584F" }}
            >
              ※ 자체 로그 기반. 봇 트래픽은 user-agent로 거른 추정치(정확도 80% 수준)입니다.
              세션은 30분 단위 새 세션으로 카운트합니다. 정밀 분석은 Google Analytics 확인.
            </p>
          </>
        )}
      </section>

      {/* ── 요약 카드 ───────────────────────────────── */}
      <section>
        <SectionLabel>요약</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="전체 회원" value={stats.totalMembers} accent />
          <SummaryCard label="진행 중·예정 공연" value={stats.activeShows} accent />
          <SummaryCard label="누적 공연" value={stats.totalShows} />
          <SummaryCard label="최근 30일 신규" value={stats.recentSignups} suffix="명" />
        </div>
      </section>

      {/* ── 회원 역할 분포 ───────────────────────── */}
      <section>
        <SectionLabel>회원 분포</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RoleCard label="일반 회원" value={stats.roleCount.member} total={stats.totalMembers} bg="#F0EBE0" color="#3B5A6B" />
          <RoleCard label="공연자" value={stats.roleCount.performer} total={stats.totalMembers} bg="#D4E4ED" color="#2A5E7A" />
          <RoleCard label="관리자" value={stats.roleCount.admin} total={stats.totalMembers} bg="#EDD4E4" color="#7A2A5E" />
        </div>
      </section>

      {/* ── 학교 분포 TOP 10 ───────────────────── */}
      <section>
        <SectionLabel>학교 분포 (TOP 10, 게시된 공연 기준)</SectionLabel>
        {stats.schoolDist.length === 0 ? (
          <EmptyText>등록된 학교 정보가 없습니다.</EmptyText>
        ) : (
          <BarList items={stats.schoolDist} />
        )}
      </section>

      {/* ── 지역 분포 ─────────────────────────── */}
      <section>
        <SectionLabel>지역 분포</SectionLabel>
        {stats.regionDist.length === 0 ? (
          <EmptyText>등록된 지역 정보가 없습니다.</EmptyText>
        ) : (
          <BarList items={stats.regionDist} />
        )}
      </section>

      {/* ── 장르 분포 ─────────────────────────── */}
      <section>
        <SectionLabel>장르 분포</SectionLabel>
        {stats.genreDist.length === 0 ? (
          <EmptyText>등록된 장르 정보가 없습니다.</EmptyText>
        ) : (
          <BarList items={stats.genreDist} />
        )}
      </section>

      {/* ── 월별 추이 (최근 6개월) ─────────────── */}
      <section>
        <SectionLabel>최근 6개월 추이</SectionLabel>
        <MonthlyChart months={stats.months} />
      </section>

      {/* ── 인기 공연 TOP 5 ─────────────────── */}
      <section>
        <SectionLabel>인기 공연 (좋아요 기준 TOP 5)</SectionLabel>
        {stats.topLiked.length === 0 ? (
          <EmptyText>아직 좋아요가 누적된 공연이 없습니다.</EmptyText>
        ) : (
          <ul className="space-y-2">
            {stats.topLiked.map((x, i) => (
              <li
                key={x.show.id}
                className="flex items-center justify-between p-4"
                style={{ backgroundColor: "#F0EBE0" }}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span
                    className="text-lg font-bold w-6 text-center shrink-0"
                    style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold truncate"
                      style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}
                    >
                      {x.show.title}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F584F" }}
                    >
                      {[x.show.performer_name, x.show.region, x.show.venue].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <span
                  className="px-3 py-1 text-xs shrink-0 ml-3"
                  style={{
                    fontFamily: "var(--font-inter)",
                    backgroundColor: "#3B5A6B",
                    color: "#FBF8F1",
                  }}
                >
                  ♥ {x.likes}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 푸터 안내 ───────────────────────── */}
      <p
        className="text-xs pt-6"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          color: "#5F584F",
          borderTop: "1px solid #D8D3C9",
        }}
      >
        ※ 페이지뷰 / 세션 / 트래픽 데이터는 Google Analytics에서 별도 확인. 통계는 60초 단위로 캐시됩니다.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 서브 컴포넌트
// ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs tracking-[0.3em] uppercase mb-4"
      style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
    >
      {children}
    </p>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-sm py-8 text-center"
      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F584F", backgroundColor: "#F0EBE0" }}
    >
      {children}
    </p>
  );
}

function SummaryCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="p-6 text-center"
      style={{
        backgroundColor: accent ? "#3B5A6B" : "#F0EBE0",
        color: accent ? "#FBF8F1" : "#1A1A1A",
      }}
    >
      <p
        className="text-3xl font-bold mb-1"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {value.toLocaleString("ko-KR")}
        {suffix && (
          <span className="text-xs ml-1.5 block sm:inline" style={{ opacity: 0.75, fontWeight: 400 }}>
            {suffix}
          </span>
        )}
      </p>
      <p
        className="text-xs tracking-wide"
        style={{ fontFamily: "var(--font-noto-sans-kr)", opacity: accent ? 0.9 : 0.6 }}
      >
        {label}
      </p>
    </div>
  );
}

/**
 * 일별 방문 추이 (최근 14일) — 단순 바 차트
 * Mineral Stage 팔레트 준수 (메인 바 #3B5A6B, 배경 #F0EBE0)
 */
function DailyTrafficChart({
  daily,
}: {
  daily: { dayStart: number; label: string; count: number }[];
}) {
  const max = Math.max(...daily.map((d) => d.count), 1);
  return (
    <div className="p-5" style={{ backgroundColor: "#F0EBE0" }}>
      <p
        className="text-xs tracking-[0.3em] uppercase mb-3"
        style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
      >
        최근 14일 일별 방문
      </p>
      <div className="flex items-end gap-1.5 h-32">
        {daily.map((d) => {
          const height = (d.count / max) * 100;
          const isToday = d.dayStart === daily[daily.length - 1].dayStart;
          return (
            <div key={d.dayStart} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full relative"
                  style={{
                    height: `${height}%`,
                    backgroundColor: isToday ? "#3B5A6B" : "#5F584F",
                    minHeight: d.count > 0 ? "3px" : "0",
                    opacity: isToday ? 1 : 0.55,
                  }}
                  title={`${d.label}: ${d.count}회`}
                >
                  {d.count > 0 && (
                    <span
                      className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px]"
                      style={{ fontFamily: "var(--font-inter)", color: "#1A1A1A" }}
                    >
                      {d.count}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-[10px]"
                style={{
                  fontFamily: "var(--font-inter)",
                  color: isToday ? "#3B5A6B" : "#5F584F",
                  fontWeight: isToday ? 600 : 300,
                }}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleCard({
  label,
  value,
  total,
  bg,
  color,
}: {
  label: string;
  value: number;
  total: number;
  bg: string;
  color: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="p-5" style={{ backgroundColor: bg }}>
      <div className="flex items-baseline justify-between mb-2">
        <p
          className="text-sm font-semibold"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color }}
        >
          {label}
        </p>
        <p
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-inter)", color }}
        >
          {value}
          <span className="text-xs ml-1.5" style={{ opacity: 0.6 }}>{percent}%</span>
        </p>
      </div>
      <div className="h-1" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
        <div
          className="h-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function BarList({ items }: { items: [string, number][] }) {
  const max = Math.max(...items.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {items.map(([label, value]) => {
        const percent = (value / max) * 100;
        return (
          <div key={label} className="flex items-center gap-3">
            <div
              className="w-32 text-sm shrink-0 truncate"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
              title={label}
            >
              {label}
            </div>
            <div className="flex-1 h-7 relative" style={{ backgroundColor: "#F0EBE0" }}>
              <div
                className="h-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: "#3B5A6B" }}
              />
              <span
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ fontFamily: "var(--font-inter)", color: percent > 50 ? "#FBF8F1" : "#1A1A1A" }}
              >
                {value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyChart({
  months,
}: {
  months: { key: string; label: string; signups: number; shows: number }[];
}) {
  const max = Math.max(
    ...months.flatMap((m) => [m.signups, m.shows]),
    1
  );

  return (
    <div className="p-6" style={{ backgroundColor: "#F0EBE0" }}>
      <div className="flex items-end gap-3 h-40 mb-3">
        {months.map((m) => {
          const signupHeight = (m.signups / max) * 100;
          const showHeight = (m.shows / max) * 100;
          return (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-1 flex-1">
                <div
                  className="flex-1 transition-all relative group"
                  style={{
                    height: `${signupHeight}%`,
                    backgroundColor: "#3B5A6B",
                    minHeight: m.signups > 0 ? "4px" : "0",
                  }}
                  title={`신규 가입: ${m.signups}`}
                >
                  {m.signups > 0 && (
                    <span
                      className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs"
                      style={{ fontFamily: "var(--font-inter)", color: "#3B5A6B" }}
                    >
                      {m.signups}
                    </span>
                  )}
                </div>
                <div
                  className="flex-1 transition-all relative group"
                  style={{
                    height: `${showHeight}%`,
                    backgroundColor: "#5F584F",
                    minHeight: m.shows > 0 ? "4px" : "0",
                  }}
                  title={`공연 등록: ${m.shows}`}
                >
                  {m.shows > 0 && (
                    <span
                      className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs"
                      style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
                    >
                      {m.shows}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-xs"
                style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ backgroundColor: "#3B5A6B" }} />
          <span style={{ color: "#1A1A1A" }}>신규 가입</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ backgroundColor: "#5F584F" }} />
          <span style={{ color: "#1A1A1A" }}>공연 등록</span>
        </span>
      </div>
    </div>
  );
}

/**
 * 유입 출처 — 기간 토글(오늘 / 7일 / 30일) + TOP 5 백분율 바
 * 정렬은 count 내림차순 (BarList 내부에서 이미 정렬 가정)
 */
function ReferrerBreakdown({
  byPeriod,
  top,
}: {
  byPeriod: { today: [string, number][]; week: [string, number][]; month: [string, number][] };
  top: [string, number][];
}) {
  const [range, setRange] = useState<"today" | "week" | "month">("month");
  const items = byPeriod[range];
  const total = items.reduce((sum, [, v]) => sum + v, 0);

  // 채널별 컬러 — Mineral Stage 톤 + 약한 변주
  const COLOR: Record<string, string> = {
    "인스타그램": "#3B5A6B",
    "네이버":     "#2A7A6A",
    "카카오":     "#7A6A2A",
    "구글":       "#5A4A7A",
    "다음":       "#7A4A2A",
    "직접 진입":  "#5F584F",
    "기타":       "#A0978A",
  };

  return (
    <div className="p-5" style={{ backgroundColor: "#F0EBE0" }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <p
          className="text-xs tracking-[0.3em] uppercase"
          style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
        >
          유입 출처 TOP 5
        </p>
        <div className="flex gap-1">
          {([
            { key: "today", label: "오늘" },
            { key: "week",  label: "7일" },
            { key: "month", label: "30일" },
          ] as const).map((opt) => {
            const active = range === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className="px-3 py-1 text-xs transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: active ? "#3B5A6B" : "transparent",
                  color: active ? "#FBF8F1" : "#5F584F",
                  border: `1px solid ${active ? "#3B5A6B" : "#D8D3C9"}`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <p
          className="text-xs py-6 text-center"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F584F" }}
        >
          이 기간에는 유입 데이터가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map(([label, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            const color = COLOR[label] ?? "#A0978A";
            return (
              <li key={label} className="flex items-center gap-3">
                <div
                  className="w-20 text-xs shrink-0"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
                >
                  {label}
                </div>
                <div
                  className="flex-1 h-6 relative"
                  style={{ backgroundColor: "#E5DFD0" }}
                >
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                    style={{
                      fontFamily: "var(--font-inter)",
                      color: pct > 55 ? "#FBF8F1" : "#1A1A1A",
                    }}
                  >
                    {pct.toFixed(0)}% · {count}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p
        className="text-[10px] mt-3"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F584F" }}
      >
        ※ 직접 진입 = 즐겨찾기·URL 직접 입력·인스타 앱 외 referrer 미제공. 사이트 내부 이동은 제외 처리.
        {top.length > 0 && ` 최근 30일 누적 1위: ${top[0][0]}.`}
      </p>
    </div>
  );
}
