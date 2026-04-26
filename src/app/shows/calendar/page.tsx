import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShowsCalendar from "@/components/ShowsCalendar";
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

  return (
    <div
      className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F4EDE3" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-3"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              Calendar
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
            >
              공연 캘린더
            </h1>
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              날짜별로 진행되는 공연을 확인해보세요.
            </p>
          </div>
          <Link
            href="/shows"
            className="px-4 py-2 text-xs tracking-wide transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#6D3115",
              border: "1px solid #D4CFC9",
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
