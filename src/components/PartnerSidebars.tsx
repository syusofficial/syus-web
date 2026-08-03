"use client";

import Link from "next/link";
import { INSTITUTIONS, PARTNER_ADS, type PartnerAd } from "@/lib/partners";

/** 좌측 — 연관 기관 목록 */
export function InstitutionSidebar() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28">
        <div className="mb-5">
          <p
            className="text-[10px] tracking-[0.3em] uppercase mb-1.5"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            Related Institutions
          </p>
          <h3
            className="text-sm font-bold"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
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
                className="block py-2 px-3 transition-colors"
                style={{
                  borderLeft: "2px solid transparent",
                  fontFamily: "var(--font-noto-sans-kr)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderLeftColor = "#0B5563";
                  e.currentTarget.style.backgroundColor = "#E6E1D6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderLeftColor = "transparent";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <p className="text-xs leading-tight mb-0.5" style={{ color: "#4A3B33" }}>
                  {inst.name}
                </p>
                <p className="text-[10px]" style={{ color: "#5A4A3E", fontFamily: "var(--font-inter)" }}>
                  {inst.desc}
                </p>
              </a>
            </li>
          ))}
        </ul>

        <p
          className="mt-5 text-[10px] leading-relaxed"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
        >
          외부 사이트로 이동합니다.
        </p>
      </div>
    </aside>
  );
}

/**
 * 우측 — 스크롤 가능한 제휴/광고 영역 (PC 전용, 가로 1280px 이상)
 *
 * 1280px 미만에서는 이 사이드바가 숨고, 대신 MobilePartnerStrip이 본문 아래에 뜬다.
 * 두 지면이 절대 동시에 보이면 안 된다 — 같은 광고가 두 번 노출되면
 * 광고주에게 노출수를 이중으로 세게 된다. (여기 hidden xl:block ↔ 저기 xl:hidden)
 *
 * 카드 본문은 아래 PartnerCardBody를 모바일 지면과 함께 쓴다.
 */
export function PartnerAdSidebar() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p
              className="text-[10px] tracking-[0.3em] uppercase mb-1.5"
              style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
            >
              Recommended
            </p>
            <h3
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
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
              style={{ border: "1px dashed #D4CFC1" }}
            >
              <p
                className="text-[11px] leading-relaxed mb-3"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
              >
                이 자리에는 공연예술 관련
                <br />
                파트너 업체가 게재됩니다.
              </p>
              <p
                className="text-[10px] leading-relaxed"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
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
                      className="block p-4 transition-colors"
                      style={{ backgroundColor: "#E6E1D6" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#DDD0BD")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E6E1D6")}
                    >
                      <PartnerCardBody ad={ad} />
                    </a>
                  ) : (
                    <div className="p-4" style={{ backgroundColor: "#E6E1D6" }}>
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
          style={{ borderTop: "1px solid #D4CFC1" }}
        >
          <Link
            href="/muol/contact"
            className="block text-center py-2.5 text-xs transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#0B5563",
              border: "1px solid #D4CFC1",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0B5563";
              e.currentTarget.style.color = "#F0EEE9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#0B5563";
            }}
          >
            제휴 · 광고 문의
          </Link>
        </div>
      </div>
    </aside>
  );
}

/**
 * 광고 카드 본문 — PC 사이드바(PartnerAdSidebar)와 모바일 지면(MobilePartnerStrip)이 공유한다.
 *
 * 광고 문구를 이 한 곳만 고치면 PC·모바일이 함께 바뀐다.
 * 두 지면은 폭이 크게 달라 글자 크기만 variant로 나눈다.
 *   - "sidebar" : 폭 240px 사이드바용 (작게)
 *   - "mobile"  : 본문 전체 폭용 (한 단계 크게, short 카피 우선)
 */
export function PartnerCardBody({
  ad,
  variant = "sidebar",
}: {
  ad: PartnerAd;
  variant?: "sidebar" | "mobile";
}) {
  const isMobile = variant === "mobile";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span
          className={isMobile ? "text-[10px] tracking-[0.2em] uppercase" : "text-[9px] tracking-[0.2em] uppercase"}
          style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
        >
          {ad.category}
        </span>
        {ad.tag && (
          <span
            className={isMobile ? "text-[10px] px-2 py-0.5 shrink-0" : "text-[9px] px-1.5 py-0.5 shrink-0"}
            style={{ backgroundColor: "#0B5563", color: "#F0EEE9", fontFamily: "var(--font-inter)" }}
          >
            {ad.tag}
          </span>
        )}
      </div>
      <p
        className={isMobile ? "text-sm font-semibold leading-tight mb-1.5" : "text-xs font-semibold leading-tight mb-1.5"}
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
      >
        {ad.name}
      </p>
      <p
        className={isMobile ? "text-xs leading-relaxed" : "text-[10px] leading-relaxed"}
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
      >
        {/* 모바일은 가로가 넓어 긴 설명이 늘어져 보이므로 short를 먼저 쓴다(없으면 desc). */}
        {isMobile ? ad.short ?? ad.desc : ad.desc}
      </p>
    </div>
  );
}
