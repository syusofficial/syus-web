"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ShowsSearchBar({ basePath }: { basePath?: string } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  // basePath 명시 안 하면 현재 경로 사용 (canlendar 등에서 검색하면 그 경로로 머무르되,
  // 일반적으로 /shows 또는 /archive에서만 사용됨)
  const targetPath = basePath ?? (pathname.startsWith("/muol/archive") ? "/muol/archive" : "/muol/shows");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const buildUrl = (newQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery.trim()) {
      params.set("q", newQuery.trim());
    } else {
      params.delete("q");
    }
    params.delete("page"); // 검색하면 첫 페이지로
    const qs = params.toString();
    return `${targetPath}${qs ? `?${qs}` : ""}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl(query));
  };

  const handleClear = () => {
    setQuery("");
    router.push(buildUrl(""));
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
      <div className="relative flex-1">
        {/* 2026-09-10 점검 — 포커스 표시를 onFocus/onBlur로 직접 칠하고 있었다.
            자바스크립트가 아직 안 붙은 순간이나 스타일이 다른 코드에 덮이면 표시가 사라지고,
            테두리가 transparent라 평소에는 입력칸의 경계 자체가 보이지 않았다(WCAG 1.4.11).
            이제 테두리를 상시 노출(--c-line-strong #8C837C, 면 채움과 함께)하고
            포커스는 CSS focus-visible이 맡는다. */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="공연명, 장소, 대학명으로 검색"
          className="w-full px-4 py-3 pr-12 text-base transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            backgroundColor: "#E6E1D6",
            color: "#4A3B33",
            border: "1px solid #8C837C",
            minHeight: 44,
          }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            /* 지우기(✕)는 글자 하나짜리라 손끝으로 겨우 닿았다 — 보이는 크기는 그대로 두고
               누를 수 있는 면적만 44×44로 넓힌다. */
            className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 text-sm transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]"
            style={{ color: "#5A4A3E" }}
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-5 py-3 text-sm tracking-wider transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]"
        /* 링 색을 currentColor로 두면 이 버튼에서는 흰빛(#F0EEE9)이 나와
           같은 색 페이지 배경 위에서 보이지 않는다. 청록으로 고정한다. */
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          backgroundColor: "#0B5563",
          color: "#F0EEE9",
          minHeight: 44,
        }}
      >
        검색
      </button>
    </form>
  );
}
