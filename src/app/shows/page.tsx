import Link from "next/link";
import ShowCard from "@/components/ShowCard";
import { createClient } from "@/lib/supabase/server";
import { REGIONS, GENRES } from "@/lib/constants";

export const revalidate = 60;

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; genre?: string }>;
}) {
  const { region, genre } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("shows").select("*").eq("status", "approved");

  // 지역 필터: 정확히 일치하는 지역만 표시
  // ('전체' 메뉴는 파라미터 없이 /shows로 이동하여 모든 공연 노출)
  if (region && region !== "전체") {
    query = query.eq("region", region);
  }

  // 장르 필터
  if (genre) {
    query = query.eq("genre", genre);
  }

  const { data: shows } = await query.order("created_at", { ascending: false });
  const list = shows ?? [];

  const activeRegion = region ?? "전체";

  return (
    <div
      className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F4EDE3" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
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
            {activeRegion === "전체" ? "전체 공연" : `${activeRegion} 공연`}
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            {list.length}개의 공연
          </p>
        </div>

        {/* 지역 필터 */}
        <div className="mb-6 flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const isActive = activeRegion === r;
            const href =
              r === "전체"
                ? (genre ? `/shows?genre=${encodeURIComponent(genre)}` : "/shows")
                : `/shows?region=${encodeURIComponent(r)}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`;
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
          <Link
            href={region ? `/shows?region=${encodeURIComponent(region)}` : "/shows"}
            className="px-3 py-1 text-xs"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: !genre ? "#6D3115" : "transparent",
              color: !genre ? "#F4EDE3" : "#9B9693",
              border: `1px solid ${!genre ? "#6D3115" : "#D4CFC9"}`,
            }}
          >
            전체
          </Link>
          {GENRES.map((g) => {
            const isActive = genre === g;
            const base = region ? `region=${encodeURIComponent(region)}&` : "";
            return (
              <Link
                key={g}
                href={`/shows?${base}genre=${encodeURIComponent(g)}`}
                className="px-3 py-1 text-xs"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#6D3115" : "transparent",
                  color: isActive ? "#F4EDE3" : "#9B9693",
                  border: `1px solid ${isActive ? "#6D3115" : "#D4CFC9"}`,
                }}
              >
                {g}
              </Link>
            );
          })}
        </div>

        {/* 공연 그리드 */}
        {list.length === 0 ? (
          <div className="text-center py-24">
            <p
              className="text-sm mb-2"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              조건에 맞는 공연이 아직 없습니다.
            </p>
            <p
              className="text-xs"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              다른 지역이나 장르를 선택해보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {list.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
