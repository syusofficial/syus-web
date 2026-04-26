import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShowCard from "@/components/ShowCard";
import type { Show } from "@/types";

export const revalidate = 60;

export default async function PerformerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // UUID 형식 검증 (잘못된 ID로 들어오면 404)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) notFound();

  // 프로필 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, created_at")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  // 공연자/관리자 권한이 있는 사람만 프로필 페이지 노출
  if (profile.role !== "performer" && profile.role !== "admin") notFound();

  // 본인/관리자 시점 판별
  const { data: { user } } = await supabase.auth.getUser();
  let isSelf = false;
  let viewerIsAdmin = false;
  if (user) {
    isSelf = user.id === id;
    if (!isSelf) {
      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      viewerIsAdmin = viewerProfile?.role === "admin";
    }
  }
  const canSeePrivate = isSelf || viewerIsAdmin;

  // 공연 조회
  let query = supabase
    .from("shows")
    .select("*")
    .eq("organizer_id", id)
    .order("created_at", { ascending: false });

  if (!canSeePrivate) {
    query = query.eq("status", "approved");
  }

  const { data: showsRaw } = await query;
  const shows = (showsRaw as Show[]) ?? [];

  // 진행 중·예정 / 지나간 / 비공개 분류
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (s?: string): Date | null => {
    if (!s) return null;
    // "2026.05.10" 또는 "2026-05-10" 모두 허용
    const normalized = s.replace(/\./g, "-");
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  };

  const approved = shows.filter((s) => s.status === "approved");
  const upcoming = approved.filter((s) => {
    const end = parseDate(s.schedule_end) ?? parseDate(s.schedule_start);
    return end ? end >= today : true; // 날짜 없으면 진행 중으로 분류
  });
  const past = approved.filter((s) => {
    const end = parseDate(s.schedule_end) ?? parseDate(s.schedule_start);
    return end ? end < today : false;
  });
  const privateShows = canSeePrivate
    ? shows.filter((s) => s.status !== "approved")
    : [];

  // 자주 사용한 단체명 (가장 빈도 높은 performer_name)
  const namesCount: Record<string, number> = {};
  for (const s of approved) {
    const n = (s.performer_name ?? "").trim();
    if (n) namesCount[n] = (namesCount[n] ?? 0) + 1;
  }
  const usedNames = Object.entries(namesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n);

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-16" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-7xl mx-auto">
        {/* 뒤로가기 */}
        <Link
          href="/shows"
          className="inline-block mb-8 text-xs tracking-[0.2em] uppercase transition-colors"
          style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
        >
          ← 공연 목록으로
        </Link>

        {/* 헤더 */}
        <div className="mb-14 pb-10" style={{ borderBottom: "1px solid #D4CFC9" }}>
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
          >
            Performer
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
          >
            {profile.name ?? "이름 미등록"}
          </h1>
          {usedNames.length > 0 && (
            <p
              className="text-sm mb-4 leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              <span style={{ fontFamily: "var(--font-inter)", letterSpacing: "0.1em" }}>as</span>{" "}
              {usedNames.join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
            <p>
              <span style={{ color: "#9B9693", marginRight: 8 }}>가입</span>
              <span style={{ fontFamily: "var(--font-inter)" }}>{profile.created_at.slice(0, 10)}</span>
            </p>
            <p>
              <span style={{ color: "#9B9693", marginRight: 8 }}>전체 공연</span>
              <span style={{ fontFamily: "var(--font-inter)" }}>{approved.length}</span>
            </p>
            {upcoming.length > 0 && (
              <p>
                <span style={{ color: "#9B9693", marginRight: 8 }}>진행 중·예정</span>
                <span style={{ fontFamily: "var(--font-inter)", color: "#6D3115", fontWeight: 600 }}>{upcoming.length}</span>
              </p>
            )}
          </div>
        </div>

        {/* 진행 중·예정 공연 */}
        {upcoming.length > 0 && (
          <section className="mb-16">
            <div className="flex items-baseline justify-between mb-8">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
              >
                진행 중 · 예정 공연
              </h2>
              <span
                className="text-xs tracking-wider uppercase"
                style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
              >
                {upcoming.length} works
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {upcoming.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </section>
        )}

        {/* 지나간 공연 — "머묾의 기록" */}
        {past.length > 0 && (
          <section className="mb-16">
            <div className="flex items-baseline justify-between mb-8">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
              >
                머묾의 기록
              </h2>
              <span
                className="text-xs tracking-wider uppercase"
                style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
              >
                {past.length} archived
              </span>
            </div>
            <p
              className="text-xs mb-8 leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              지나갔지만 사라지지 않은 무대들.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {past.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </section>
        )}

        {/* 비공개 공연 — 본인/관리자만 */}
        {canSeePrivate && privateShows.length > 0 && (
          <section className="mb-16 pt-10" style={{ borderTop: "1px dashed #D4CFC9" }}>
            <div className="flex items-baseline justify-between mb-8">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
              >
                비공개 공연
                <span className="ml-2 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  ({isSelf ? "본인" : "관리자"} 시점)
                </span>
              </h2>
              <span
                className="text-xs tracking-wider uppercase"
                style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
              >
                {privateShows.length} private
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
              {privateShows.map((show) => (
                <div key={show.id} style={{ opacity: 0.7 }}>
                  <ShowCard show={show} />
                  <p
                    className="text-xs mt-2 px-2 py-1 inline-block"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      backgroundColor: show.status === "pending" ? "#E8DDD0" : "#EDD4D4",
                      color: show.status === "pending" ? "#6D3115" : "#A63D2F",
                    }}
                  >
                    {show.status === "pending" ? "승인 대기" : "반려됨"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 등록 공연 없음 */}
        {approved.length === 0 && (!canSeePrivate || privateShows.length === 0) && (
          <div className="text-center py-24">
            <p
              className="text-sm mb-2"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              아직 등록된 공연이 없습니다.
            </p>
            <p
              className="text-xs"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              곧 새로운 무대를 만나보실 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
