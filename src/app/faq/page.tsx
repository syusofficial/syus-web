"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { FAQS, FAQ_CATEGORIES, type FAQCategory } from "@/lib/faqs";

/** "[텍스트](URL)" 형식을 React 노드로 변환 */
function renderAnswer(answer: string): React.ReactNode {
  const lines = answer.split("\n");
  return lines.map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      const isExternal = match[2].startsWith("http") || match[2].startsWith("mailto");
      parts.push(
        <Link
          key={`${lineIdx}-${match.index}`}
          href={match[2]}
          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="hover:underline"
          style={{ color: "#3B5A6B", fontWeight: 500 }}
        >
          {match[1]}
        </Link>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }
    return (
      <span key={lineIdx}>
        {parts.length > 0 ? parts : line}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

/** 마크다운 링크 표기 [텍스트](URL) 와 줄바꿈을 제거해 검색엔진용 평문으로 정제 */
function plainAnswer(answer: string): string {
  return answer
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const FAQ_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: plainAnswer(f.answer),
    },
  })),
};

export default function FAQPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FAQCategory | "전체">("전체");
  const [openId, setOpenId] = useState<string | null>(null);

  const popularFaqs = useMemo(() => FAQS.filter((f) => f.popular), []);

  const filteredFaqs = useMemo(() => {
    let list = FAQS;
    if (activeCategory !== "전체") {
      list = list.filter((f) => f.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [query, activeCategory]);

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  /** 인기 질문 클릭 — 해당 FAQ를 펼치고 그 위치로 부드럽게 스크롤 */
  const expandAndScroll = (id: string) => {
    setOpenId(id); // 항상 펼침 (토글 아님)
    // DOM 업데이트 후 스크롤
    requestAnimationFrame(() => {
      const el = document.getElementById(`faq-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div
      className="pt-24 md:pt-32 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#FBF8F1" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_STRUCTURED_DATA) }}
      />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
          >
            FAQ
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
          >
            자주 묻는 질문
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
          >
            궁금한 내용을 검색하시거나 카테고리에서 찾아보세요. 답을 못 찾으셨다면 1:1 문의를 이용해주세요.
          </p>
        </div>

        {/* 검색창 */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="궁금한 내용을 검색해보세요"
              className="w-full px-5 py-4 pr-12 text-sm outline-none transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#F0EBE0",
                color: "#1A1A1A",
                border: "1px solid transparent",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3B5A6B")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "#7A746C" }}
                aria-label="검색어 지우기"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 인기 질문 (검색 / 카테고리 미선택 시만) */}
        {!query && activeCategory === "전체" && popularFaqs.length > 0 && (
          <div className="mb-10">
            <p
              className="text-xs tracking-[0.2em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
            >
              ★ 가장 많이 묻는 질문
            </p>
            <div className="space-y-2">
              {popularFaqs.map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => expandAndScroll(faq.id)}
                  className="w-full text-left px-5 py-3 transition-colors"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    backgroundColor: "#3B5A6B",
                    color: "#FBF8F1",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <span className="text-sm">{faq.question}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="mb-8 flex flex-wrap gap-2">
          {(["전체", ...FAQ_CATEGORIES] as const).map((c) => {
            const isActive = activeCategory === c;
            return (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(c);
                  setOpenId(null);
                }}
                className="px-3 py-1.5 text-xs tracking-wide transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: isActive ? "#3B5A6B" : "transparent",
                  color: isActive ? "#FBF8F1" : "#3B5A6B",
                  border: `1px solid ${isActive ? "#3B5A6B" : "#D8D3C9"}`,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* 결과 카운트 */}
        <p
          className="text-xs mb-4"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
        >
          {filteredFaqs.length}개의 질문
          {query && ` · "${query}" 검색`}
        </p>

        {/* FAQ 목록 (Accordion) */}
        {filteredFaqs.length === 0 ? (
          <div
            className="text-center py-16"
            style={{ backgroundColor: "#F0EBE0" }}
          >
            <p
              className="text-sm mb-2"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
            >
              검색 결과가 없습니다.
            </p>
            <p
              className="text-xs"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
            >
              다른 검색어를 시도하시거나 1:1 문의를 이용해주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  id={`faq-${faq.id}`}
                  style={{ border: "1px solid #D8D3C9", scrollMarginTop: "6rem" }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(faq.id)}
                    className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 transition-colors"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      backgroundColor: isOpen ? "#F0EBE0" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isOpen) e.currentTarget.style.backgroundColor = "#F0EBE0";
                    }}
                    onMouseLeave={(e) => {
                      if (!isOpen) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    aria-expanded={isOpen}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs mb-1"
                        style={{ fontFamily: "var(--font-inter)", color: "#7A746C", letterSpacing: "0.1em" }}
                      >
                        {faq.category}
                      </p>
                      <p
                        className="text-sm font-semibold leading-relaxed"
                        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}
                      >
                        Q. {faq.question}
                      </p>
                    </div>
                    <span
                      className="text-base shrink-0 mt-0.5 transition-transform"
                      style={{
                        color: "#3B5A6B",
                        transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                      }}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      className="px-5 py-5 border-t"
                      style={{ backgroundColor: "#FBF8F1", borderColor: "#D8D3C9" }}
                    >
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
                      >
                        {renderAnswer(faq.answer)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 1:1 문의 안내 */}
        <div
          className="mt-16 p-8 text-center"
          style={{ backgroundColor: "#3B5A6B", color: "#FBF8F1" }}
        >
          <p
            className="text-xs tracking-[0.3em] uppercase mb-2"
            style={{ fontFamily: "var(--font-inter)", opacity: 0.7 }}
          >
            Need More Help
          </p>
          <h2
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)" }}
          >
            답변을 찾지 못하셨나요?
          </h2>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ fontFamily: "var(--font-noto-sans-kr)", opacity: 0.85 }}
          >
            1:1 문의를 통해 직접 연락 주세요. 1~2일 이내에 답변드립니다.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3 text-sm tracking-wider transition-opacity"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: "#FBF8F1",
              color: "#3B5A6B",
            }}
          >
            1:1 문의하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
