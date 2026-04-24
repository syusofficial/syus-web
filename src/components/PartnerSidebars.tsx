"use client";

import Link from "next/link";
import { INSTITUTIONS, PARTNER_ADS } from "@/lib/partners";

/** 좌측 — 연관 기관 목록 */
export function InstitutionSidebar() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28">
        <div className="mb-5">
          <p
            className="text-[10px] tracking-[0.3em] uppercase mb-1.5"
            style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
          >
            Related Institutions
          </p>
          <h3
            className="text-sm font-bold"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
          >
            연관 기관
          </h3>
        </div>

        <ul className="space-y-0.5">
          {INSTITUTIONS.map((inst) => (
            <li key={inst.name}>
              <a
                href={inst.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 px-3 transition-all"
                style={{
                  borderLeft: "2px solid transparent",
                  fontFamily: "var(--font-noto-sans-kr)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderLeftColor = "#6D3115";
                  e.currentTarget.style.backgroundColor = "#E8DDD0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderLeftColor = "transparent";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <p className="text-xs leading-tight mb-0.5" style={{ color: "#1A1A1A" }}>
                  {inst.name}
                </p>
                <p className="text-[10px]" style={{ color: "#9B9693", fontFamily: "var(--font-inter)" }}>
                  {inst.desc}
                </p>
              </a>
            </li>
          ))}
        </ul>

        <p
          className="mt-5 text-[10px] leading-relaxed"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
        >
          외부 사이트로 이동합니다.
        </p>
      </div>
    </aside>
  );
}

/** 우측 — 스크롤 가능한 제휴/광고 영역 */
export function PartnerAdSidebar() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p
              className="text-[10px] tracking-[0.3em] uppercase mb-1.5"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              Recommended
            </p>
            <h3
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
            >
              제휴 · 추천
            </h3>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div
          className="overflow-y-auto pr-1"
          style={{ maxHeight: "calc(100vh - 220px)", scrollbarWidth: "thin" }}
        >
          {PARTNER_ADS.length === 0 ? (
            <div
              className="p-4 text-center"
              style={{ border: "1px dashed #D4CFC9" }}
            >
              <p
                className="text-[11px] leading-relaxed mb-3"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
              >
                이 자리에는 공연예술 관련
                <br />
                파트너 업체가 게재됩니다.
              </p>
              <p
                className="text-[10px] leading-relaxed"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}
              >
                팸플릿 제작 · 연기 아카데미
                <br />
                프로필 스튜디오 · 오디션 플랫폼
                <br />
                공연장 대관 · 의상·분장
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {PARTNER_ADS.map((ad, i) => (
                <li key={i}>
                  {ad.url ? (
                    <a
                      href={ad.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="block p-4 transition-all"
                      style={{ backgroundColor: "#E8DDD0" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#DDD0BD")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E8DDD0")}
                    >
                      <PartnerCardBody ad={ad} />
                    </a>
                  ) : (
                    <div className="p-4" style={{ backgroundColor: "#E8DDD0" }}>
                      <PartnerCardBody ad={ad} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 광고 문의 CTA */}
        <div
          className="mt-5 pt-5"
          style={{ borderTop: "1px solid #D4CFC9" }}
        >
          <Link
            href="/contact"
            className="block text-center py-2.5 text-xs transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#6D3115",
              border: "1px solid #D4CFC9",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#6D3115";
              e.currentTarget.style.color = "#F4EDE3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#6D3115";
            }}
          >
            제휴 · 광고 문의
          </Link>
        </div>
      </div>
    </aside>
  );
}

function PartnerCardBody({ ad }: { ad: { name: string; category: string; desc: string; tag?: string } }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[9px] tracking-[0.2em] uppercase"
          style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
        >
          {ad.category}
        </span>
        {ad.tag && (
          <span
            className="text-[9px] px-1.5 py-0.5"
            style={{ backgroundColor: "#6D3115", color: "#F4EDE3", fontFamily: "var(--font-inter)" }}
          >
            {ad.tag}
          </span>
        )}
      </div>
      <p
        className="text-xs font-semibold leading-tight mb-1.5"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}
      >
        {ad.name}
      </p>
      <p
        className="text-[10px] leading-relaxed"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
      >
        {ad.desc}
      </p>
    </div>
  );
}
