"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Show } from "@/types";

type ShowsCalendarProps = {
  shows: Show[];
};

const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026.05.10" 또는 "2026-05-10" 형식의 문자열을 Date로 파싱 */
function parseShowDate(s?: string): Date | null {
  if (!s) return null;
  const normalized = s.replace(/\./g, "-").trim();
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/** Date를 "YYYY-MM-DD" 키로 변환 (시간대 무시, 로컬 기준) */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ShowsCalendar({ shows }: ShowsCalendarProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(dateKey(today));

  // 공연 → 날짜별 그룹핑 (한 공연이 여러 날짜 걸치면 모든 날짜에 추가)
  const showsByDate = useMemo(() => {
    const map: Record<string, Show[]> = {};
    for (const show of shows) {
      const start = parseShowDate(show.schedule_start);
      const end = parseShowDate(show.schedule_end) ?? start;
      if (!start) continue;

      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const last = new Date(end ?? start);
      last.setHours(0, 0, 0, 0);

      // 비정상적으로 긴 기간(예: 잘못된 날짜) 방지 — 최대 90일
      let safety = 0;
      while (cursor <= last && safety < 90) {
        const key = dateKey(cursor);
        if (!map[key]) map[key] = [];
        map[key].push(show);
        cursor.setDate(cursor.getDate() + 1);
        safety++;
      }
    }
    return map;
  }, [shows]);

  // 현재 월의 캘린더 셀 계산
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startWeekday = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const cells: Array<{ date: Date | null; key: string }> = [];

    // 앞쪽 빈 셀
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, key: `empty-pre-${i}` });
    }

    // 실제 날짜 셀
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      cells.push({ date, key: dateKey(date) });
    }

    // 뒤쪽 빈 셀 (총 셀 개수를 7의 배수로 맞춤)
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, key: `empty-post-${cells.length}` });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(dateKey(today));
  };

  const todayKey = dateKey(today);
  const selectedShows = selectedDate ? (showsByDate[selectedDate] ?? []) : [];

  // 선택된 날짜를 보기 좋게 표시
  const selectedDateLabel = (() => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${y}년 ${m}월 ${d}일 (${WEEKDAYS_KR[date.getDay()]})`;
  })();

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrevMonth}
            className="w-9 h-9 flex items-center justify-center transition-colors"
            style={{ color: "#6D3115", border: "1px solid #D4CFC9" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#E8DDD0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            aria-label="이전 달"
          >
            ←
          </button>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115", minWidth: 140, textAlign: "center" }}
          >
            {viewYear}년 {viewMonth + 1}월
          </h2>
          <button
            type="button"
            onClick={goNextMonth}
            className="w-9 h-9 flex items-center justify-center transition-colors"
            style={{ color: "#6D3115", border: "1px solid #D4CFC9" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#E8DDD0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            aria-label="다음 달"
          >
            →
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="px-3 py-1.5 text-xs tracking-wide transition-colors"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            color: "#6D3115",
            border: "1px solid #D4CFC9",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#6D3115";
            e.currentTarget.style.color = "#F4EDE3";
            e.currentTarget.style.borderColor = "#6D3115";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#6D3115";
            e.currentTarget.style.borderColor = "#D4CFC9";
          }}
        >
          오늘로
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS_KR.map((w, i) => (
          <div
            key={w}
            className="text-center text-xs tracking-wider py-2"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: i === 0 ? "#A63D2F" : "#9B9693",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-1 mb-12">
        {calendarCells.map((cell) => {
          if (!cell.date) {
            return <div key={cell.key} className="aspect-square" />;
          }

          const key = cell.key;
          const dayShows = showsByDate[key] ?? [];
          const hasShows = dayShows.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const isSunday = cell.date.getDay() === 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className="aspect-square flex flex-col items-center justify-start pt-2 pb-1 px-1 transition-colors relative"
              style={{
                backgroundColor: isSelected
                  ? "#6D3115"
                  : isToday
                  ? "#E8DDD0"
                  : "transparent",
                color: isSelected
                  ? "#F4EDE3"
                  : isSunday
                  ? "#A63D2F"
                  : "#1A1A1A",
                border: `1px solid ${isSelected ? "#6D3115" : "#D4CFC9"}`,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isToday ? "#D4CFC9" : "#E8DDD0";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isToday ? "#E8DDD0" : "transparent";
                }
              }}
            >
              <span className="text-sm font-medium">{cell.date.getDate()}</span>
              {hasShows && (
                <span
                  className="mt-1 text-[10px] tracking-wide px-1.5 py-0.5"
                  style={{
                    backgroundColor: isSelected ? "#F4EDE3" : "#6D3115",
                    color: isSelected ? "#6D3115" : "#F4EDE3",
                    fontFamily: "var(--font-inter)",
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {dayShows.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 공연 목록 */}
      <div className="pt-8" style={{ borderTop: "1px solid #D4CFC9" }}>
        <p
          className="text-xs tracking-[0.3em] uppercase mb-3"
          style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
        >
          Selected
        </p>
        <h3
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
        >
          {selectedDateLabel}
        </h3>

        {selectedShows.length === 0 ? (
          <p
            className="text-sm py-12 text-center"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
          >
            이 날짜에 진행되는 공연이 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {selectedShows.map((show) => (
              <li key={show.id}>
                <Link
                  href={`/shows/${show.id}`}
                  className="block p-5 transition-colors"
                  style={{ backgroundColor: "#E8DDD0" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4CFC9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#E8DDD0"; }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-base font-semibold mb-1"
                        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
                      >
                        {show.title}
                      </h4>
                      <p
                        className="text-xs"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
                      >
                        {[
                          show.performer_name,
                          show.region,
                          show.venue,
                        ].filter(Boolean).join(" · ")}
                      </p>
                      {show.show_time && (
                        <p
                          className="text-xs mt-1"
                          style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
                        >
                          {show.show_time}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {show.genre && (
                        <span
                          className="px-2 py-0.5 text-xs"
                          style={{
                            fontFamily: "var(--font-noto-sans-kr)",
                            backgroundColor: "#6D3115",
                            color: "#F4EDE3",
                          }}
                        >
                          {show.genre === "기타" && show.genre_custom ? show.genre_custom : show.genre}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
