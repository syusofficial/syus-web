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
    { name: "공연", path: "/muol/shows" },
    { name: "캘린더" },
  ]);

  return (
    <div
      className="pt-24 md:pt-36 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F0EEE9" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
            >
              Calendar
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
            >
              공연 캘린더
            </h1>
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
            >
              날짜별로 진행되는 공연을 확인해보세요.
            </p>
          </div>
          <Link
            href="/muol/shows"
            className="px-4 py-2 text-xs tracking-wide transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#0B5563",
              border: "1px solid #D4CFC1",
            }}
          >
            그리드로 보기
          </Link>
        </div>

        {/* 캘린더에는 필터가 없다 — list가 비면 곧 "사이트 전체에 승인된 공연 0건"이다.
            (특정 날짜만 비어 있는 경우는 ShowsCalendar 안에서 따로 안내한다.)
            달력 위젯은 그대로 두고, 그 위에 기다림을 알리는 안내만 얹는다. */}
        {list.length === 0 && (
          <div
            className="mb-10 py-10 px-6 text-center"
            style={{
              border: "1px solid #D4CFC1",
              backgroundColor: "rgba(255,255,255,0.5)",
            }}
          >
            <p
              className="text-lg md:text-xl mb-3"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563", wordBreak: "keep-all" }}
            >
              자리를 먼저 두었습니다
            </p>
            <p
              className="text-sm leading-relaxed mb-2 max-w-md mx-auto"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
            >
              달력의 칸은 미리 그려두었습니다.
              아직 그 위에 오른 무대가 없을 뿐입니다.
            </p>
            <p
              className="text-xs leading-relaxed mb-6 max-w-md mx-auto"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
            >
              첫 공연이 올라오면, 이 달력에 날짜가 하나씩 맺힙니다.
              학과나 공연팀과 닿을 길이 있다면 알려주십시오.
            </p>
            <Link
              href="/muol/contact"
              className="inline-block px-5 py-3 text-xs tracking-wide transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                border: "1px solid #0B5563",
              }}
            >
              문의하기 →
            </Link>
          </div>
        )}

        <ShowsCalendar shows={list} />
      </div>
    </div>
  );
}
