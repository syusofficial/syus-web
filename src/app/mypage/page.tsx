"use client";

import Link from "next/link";
import { useState } from "react";

export default function MyPage() {
  const [tab, setTab] = useState<"likes" | "performer">("likes");

  // TODO: Supabase auth.getUser() + fetch liked shows + performer_status

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            My Page
          </p>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            마이페이지
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            Supabase 연동 후 실제 데이터가 표시됩니다.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-10" style={{ borderBottom: "1px solid #D4CFC9" }}>
          {[
            { key: "likes", label: "찜한 공연" },
            { key: "performer", label: "공연자 신청" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as "likes" | "performer")}
              className="px-6 py-3 text-sm tracking-wide transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: tab === t.key ? "#6D3115" : "#9B9693",
                borderBottom: tab === t.key ? "2px solid #6D3115" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Likes */}
        {tab === "likes" && (
          <div className="text-center py-20">
            <p className="text-sm mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
              로그인 후 공연을 찜하면 여기에 표시됩니다.
            </p>
            <Link
              href="/"
              className="text-sm tracking-wider"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}
            >
              공연 보러 가기 →
            </Link>
          </div>
        )}

        {/* Tab: Performer */}
        {tab === "performer" && (
          <div>
            <div className="p-8 mb-6" style={{ backgroundColor: "#E8DDD0" }}>
              <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                공연자 신청이란?
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                공연자 신청을 하시면 관리자 검토 후 승인됩니다.
                <br />
                승인 이후 공연을 직접 등록·수정·삭제할 수 있습니다.
              </p>
              <div className="space-y-2">
                {[
                  "신청 → 관리자 검토 (1-3 영업일) → 승인",
                  "승인 후 공연자 페이지에서 공연 등록 가능",
                  "등록된 공연은 관리자 최종 승인 후 게시",
                ].map((text, i) => (
                  <p key={i} className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                    {i + 1}. {text}
                  </p>
                ))}
              </div>
            </div>

            <button
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
              onClick={() => alert("Supabase 연동 후 신청이 가능합니다.")}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B4A2A")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6D3115")}
            >
              공연자 신청하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
