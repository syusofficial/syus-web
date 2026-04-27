"use client";

import { useMemo } from "react";
import type { Show, Profile } from "@/types";
import { extractSchoolName, isEnded, todayKey } from "@/lib/showFilters";

type AdminStatsProps = {
  shows: Show[];
  members: Profile[];
  likes: { show_id: string }[]; // 모든 좋아요 row (관리자 RLS)
};

export default function AdminStats({ shows, members, likes }: AdminStatsProps) {
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
          <RoleCard label="일반 회원" value={stats.roleCount.member} total={stats.totalMembers} bg="#E8DDD0" color="#6D3115" />
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
                style={{ backgroundColor: "#E8DDD0" }}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span
                    className="text-lg font-bold w-6 text-center shrink-0"
                    style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
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
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
                    >
                      {[x.show.performer_name, x.show.region, x.show.venue].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <span
                  className="px-3 py-1 text-xs shrink-0 ml-3"
                  style={{
                    fontFamily: "var(--font-inter)",
                    backgroundColor: "#6D3115",
                    color: "#F4EDE3",
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
          color: "#9B9693",
          borderTop: "1px solid #D4CFC9",
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
      style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
    >
      {children}
    </p>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-sm py-8 text-center"
      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693", backgroundColor: "#E8DDD0" }}
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
        backgroundColor: accent ? "#6D3115" : "#E8DDD0",
        color: accent ? "#F4EDE3" : "#1A1A1A",
      }}
    >
      <p
        className="text-3xl font-bold mb-1"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {value}
        {suffix && <span className="text-base ml-1" style={{ opacity: 0.7 }}>{suffix}</span>}
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
            <div className="flex-1 h-7 relative" style={{ backgroundColor: "#E8DDD0" }}>
              <div
                className="h-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: "#6D3115" }}
              />
              <span
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ fontFamily: "var(--font-inter)", color: percent > 50 ? "#F4EDE3" : "#1A1A1A" }}
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
    <div className="p-6" style={{ backgroundColor: "#E8DDD0" }}>
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
                    backgroundColor: "#6D3115",
                    minHeight: m.signups > 0 ? "4px" : "0",
                  }}
                  title={`신규 가입: ${m.signups}`}
                >
                  {m.signups > 0 && (
                    <span
                      className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs"
                      style={{ fontFamily: "var(--font-inter)", color: "#6D3115" }}
                    >
                      {m.signups}
                    </span>
                  )}
                </div>
                <div
                  className="flex-1 transition-all relative group"
                  style={{
                    height: `${showHeight}%`,
                    backgroundColor: "#9B9693",
                    minHeight: m.shows > 0 ? "4px" : "0",
                  }}
                  title={`공연 등록: ${m.shows}`}
                >
                  {m.shows > 0 && (
                    <span
                      className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs"
                      style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
                    >
                      {m.shows}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="text-xs"
                style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ backgroundColor: "#6D3115" }} />
          <span style={{ color: "#1A1A1A" }}>신규 가입</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 inline-block" style={{ backgroundColor: "#9B9693" }} />
          <span style={{ color: "#1A1A1A" }}>공연 등록</span>
        </span>
      </div>
    </div>
  );
}
