"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ShowsSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

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
    return `/shows${qs ? `?${qs}` : ""}`;
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
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="공연명, 장소, 단체명으로 검색"
          className="w-full px-4 py-3 pr-10 text-sm outline-none transition-colors"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            backgroundColor: "#E8DDD0",
            color: "#1A1A1A",
            border: "1px solid transparent",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "#9B9693" }}
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-5 py-3 text-sm tracking-wider transition-colors"
        style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
      >
        검색
      </button>
    </form>
  );
}
