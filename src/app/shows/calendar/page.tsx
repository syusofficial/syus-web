import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShowsCalendar from "@/components/ShowsCalendar";
import { buildBreadcrumbList } from "@/lib/structuredData";
import type { Show } from "@/types";

export const revalidate = 60;

export default async function ShowsCalendarPage() {
  const supabase = await createClient();

  const { data: shows } = await supabase
    .from("shows")
    .select("*")
    .eq("status", "approved")
    .order("schedule_start", { ascending: true });

  const list = (shows as Show[]) ?? [];

  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "공연", path: "/shows" },
    { name: "캘린더" },
  ]);

  return (
    <div
      className="pt-24 md:pt-36 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#FBF8F1" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            {/* 2026-06-15 Phase 1(권고 5): 자간 0.2em 통일, 첫 글자만 대문자, 한글 부제. */}
            <p
              className="text-xs mb-3"
              style={{
                fontFamily: "var(--font-inter)",
                color: "#5F584F",
                letterSpacing: "0.2em",
                textTransform: "none",
              }}
            >
              Calendar · 월별 무대
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
            >
              공연 캘린더
            </h1>
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F584F" }}
            >
              날짜별로 진행되는 공연을 확인해보세요.
            </p>
          </div>
          <Link
            href="/shows"
            className="px-4 py-2 text-xs tracking-wide transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#3B5A6B",
              border: "1px solid #D8D3C9",
            }}
          >
            그리드로 보기
          </Link>
        </div>

        <ShowsCalendar shows={list} />
      </div>
    </div>
  );
}
