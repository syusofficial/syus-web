import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import { createClient } from "@/lib/supabase/server";
import { InstitutionSidebar, PartnerAdSidebar } from "@/components/PartnerSidebars";
import { isEnded, todayKey, showEndKey } from "@/lib/showFilters";
import type { Show } from "@/types";

export const revalidate = 60; // 60초마다 재검증

export default async function HomePage() {
  const supabase = await createClient();
  const { data: approvedRaw } = await supabase
    .from("shows")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const today = todayKey();
  const allApproved = (approvedRaw as Show[] ?? []);
  const active = allApproved.filter((s) => !isEnded(s, today));

  // ① 운영자 픽 — featured = true, 최대 6개 (진행 중·예정만)
  const featured = active.filter((s) => s.featured).slice(0, 6);

  // ② 곧 시작하는 공연 — schedule_start 가까운 미래순, featured 제외, 최대 6개
  const featuredIds = new Set(featured.map((s) => s.id));
  const upcoming = active
    .filter((s) => !featuredIds.has(s.id))
    .sort((a, b) => {
      const ka = showEndKey(a) ?? "9999";
      const kb = showEndKey(b) ?? "9999";
      return ka.localeCompare(kb);
    })
    .slice(0, 6);

  // ③ 최근 등록 — featured·upcoming 제외, 최근 등록순, 최대 6개
  const featuredOrUpcomingIds = new Set([...featuredIds, ...upcoming.map((s) => s.id)]);
  const recent = active.filter((s) => !featuredOrUpcomingIds.has(s.id)).slice(0, 6);

  return (
    <div>
      {/* ── Hero ── */}
      <section
        className="pt-24 min-h-screen flex flex-col justify-between px-6 md:px-12 lg:px-20 relative"
        style={{
          backgroundImage: `
            linear-gradient(180deg, rgba(26, 26, 26, 0.5) 0%, rgba(26, 26, 26, 0.7) 55%, rgba(26, 26, 26, 0.88) 100%),
            url('https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&q=80&w=2400')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center py-20 relative z-10">
          <p
            className="text-xs tracking-[0.35em] uppercase mb-8"
            style={{ fontFamily: "var(--font-inter)", color: "#F4EDE3", opacity: 0.75 }}
          >
            思惟流沙 · System of Young Unbound Society
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
            <h1
              className="text-[5rem] md:text-[7rem] lg:text-[9rem] font-black leading-none tracking-tighter"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F4EDE3" }}
            >
              사유
              <br />
              유사
            </h1>

            <div className="pb-2 space-y-6">
              <p
                className="text-lg md:text-xl leading-relaxed"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F4EDE3" }}
              >
                젊은 예술가들의 무대를
                <br />
                기록하고, 연결하고,
                <br />
                알리는 공간입니다.
              </p>
              <p
                className="text-sm tracking-wider"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F4EDE3", opacity: 0.55 }}
              >
                젊은 예술가들의 큐레이션 플랫폼
              </p>
              <Link
                href="/auth/signup"
                className="inline-block px-7 py-3 text-sm tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: "#F4EDE3",
                  color: "#1A1A1A",
                }}
              >
                지금 시작하기
              </Link>
            </div>
          </div>
        </div>

        <div
          className="max-w-7xl mx-auto w-full flex items-center justify-between py-5 relative z-10"
          style={{ borderTop: "1px solid rgba(244, 237, 227, 0.2)" }}
        >
          <span
            className="text-xs tracking-[0.2em] uppercase"
            style={{ fontFamily: "var(--font-inter)", color: "#F4EDE3", opacity: 0.6 }}
          >
            연극 · 뮤지컬 · 연기예술
          </span>
          <span
            className="text-xs tracking-[0.2em] uppercase"
            style={{ fontFamily: "var(--font-inter)", color: "#F4EDE3", opacity: 0.6 }}
          >
            ↓ 공연 보기
          </span>
        </div>
      </section>

      {/* ── Brand Section ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-32"
        style={{ backgroundColor: "#6D3115", color: "#F4EDE3" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <p
                className="text-[1.75rem] md:text-[2.25rem] leading-snug font-light mb-10"
                style={{ fontFamily: "var(--font-cormorant)", color: "#F4EDE3" }}
              >
                &ldquo;깊게 생각하고 오래 머물러,
                <br />
                자연스럽게 흘러
                <br />
                젊은 무대 위에 쌓이는 공간.&rdquo;
              </p>
              <div style={{ width: 48, height: 1, backgroundColor: "#F4EDE3", opacity: 0.3 }} />
            </div>

            <div className="space-y-10">
              <p
                className="text-sm tracking-[0.3em] uppercase pb-2"
                style={{ fontFamily: "var(--font-inter)", color: "#F4EDE3", opacity: 0.55, borderBottom: "1px solid rgba(244, 237, 227, 0.18)" }}
              >
                사유유사는
              </p>
              {[
                { num: "01", title: "기록합니다", desc: "공연 포스터, 일정, 출연진 정보를 체계적으로 기록합니다." },
                { num: "02", title: "연결합니다", desc: "예술가와 관객이 자연스럽게 만날 수 있는 공간을 만듭니다." },
                { num: "03", title: "알립니다", desc: "젊은 무대의 이야기를 더 많은 사람에게 전달합니다." },
              ].map((item) => (
                <div key={item.num} className="flex gap-6 items-start">
                  <span
                    className="text-xs tracking-widest pt-1 shrink-0"
                    style={{ fontFamily: "var(--font-inter)", color: "#F4EDE3", opacity: 0.35 }}
                  >
                    {item.num}
                  </span>
                  <div>
                    <h3
                      className="text-lg font-semibold mb-1.5"
                      style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F4EDE3" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F4EDE3", opacity: 0.65 }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Shows Section ── */}
      <section
        className="px-6 md:px-12 lg:px-16 xl:px-8 py-24 md:py-32"
        style={{ backgroundColor: "#F4EDE3" }}
      >
        <div className="max-w-[1600px] mx-auto">
          {/* 3열 레이아웃: 좌 기관 · 중앙 공연 · 우 광고 */}
          <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_220px] gap-8 xl:gap-8">
            <InstitutionSidebar />

            {/* 중앙 — 다중 큐레이션 섹션 */}
            <div className="space-y-20">
              {/* ① 운영자 픽 (featured 있을 때만) */}
              {featured.length > 0 && (
                <SectionGroup
                  badge="Editor's Pick"
                  title="이번 달 주목할 만한 공연"
                  shows={featured}
                  accent
                />
              )}

              {/* ② 곧 시작하는 공연 */}
              {upcoming.length > 0 && (
                <SectionGroup
                  badge="Upcoming"
                  title="곧 시작하는 공연"
                  shows={upcoming}
                />
              )}

              {/* ③ 최근 등록 */}
              {recent.length > 0 && (
                <SectionGroup
                  badge="Recent"
                  title="최근 등록"
                  shows={recent}
                />
              )}

              {/* 모든 섹션이 비었을 때 */}
              {featured.length === 0 && upcoming.length === 0 && recent.length === 0 && (
                <div className="text-center py-24">
                  <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                    등록된 공연이 없습니다.
                  </p>
                </div>
              )}

              {/* 전체 보기 링크 */}
              <div className="pt-8 text-center" style={{ borderTop: "1px solid #D4CFC9" }}>
                <Link
                  href="/shows"
                  className="inline-block px-8 py-3 text-xs tracking-widest uppercase transition-colors"
                  style={{
                    fontFamily: "var(--font-inter)",
                    color: "#6D3115",
                    border: "1px solid #6D3115",
                  }}
                >
                  전체 공연 보기 →
                </Link>
              </div>
            </div>

            <PartnerAdSidebar />
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24" style={{ backgroundColor: "#1A1A1A" }}>
        <div className="max-w-7xl mx-auto text-center">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
          >
            Join SYUS
          </p>
          <h2
            className="text-[2rem] md:text-[3rem] font-light mb-4"
            style={{ fontFamily: "var(--font-cormorant)", color: "#F4EDE3" }}
          >
            함께 무대를 만들어가실 분을 찾습니다.
          </h2>
          <p
            className="text-sm mb-10 max-w-md mx-auto leading-relaxed"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
          >
            회원가입 후 공연자 신청을 통해 공연을 등록할 수 있습니다.
            <br />
            관리자 검토 후 게시됩니다.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#F4EDE3", color: "#1A1A1A" }}
            >
              회원가입
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 text-sm tracking-wider"
              style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid #9B9693", color: "#F4EDE3" }}
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 메인 페이지 큐레이션 섹션 그룹
// ──────────────────────────────────────────────────
function SectionGroup({
  badge,
  title,
  shows,
  accent,
}: {
  badge: string;
  title: string;
  shows: Show[];
  accent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #D4CFC9" }}>
        <div>
          <p
            className="text-xs tracking-[0.3em] uppercase mb-2"
            style={{
              fontFamily: "var(--font-inter)",
              color: accent ? "#6D3115" : "#9B9693",
              fontWeight: accent ? 600 : 400,
            }}
          >
            {badge}
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
          >
            {title}
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-x-6 gap-y-12">
        {shows.map((show) => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
}
