"use client";

import { useState } from "react";
import Link from "next/link";
import { PARTNER_ADS } from "@/lib/partners";
import { PartnerCardBody } from "./PartnerSidebars";

/**
 * 모바일·태블릿 제휴 · 광고 지면 (가로 1280px 미만)
 *
 * ■ 왜 만들었나
 *   제휴·광고 지면이 PartnerAdSidebar 하나뿐이었고 그건 `hidden xl:block`,
 *   즉 1280px 이상에서만 떴다. 무대올림 방문자 대다수가 폰이므로
 *   사실상 모바일 광고 재고가 0이었다. 이 컴포넌트가 그 자리를 만든다.
 *
 * ■ PC 사이드바와 절대 겹치지 않는다
 *   최상단 xl:hidden ↔ PartnerAdSidebar의 hidden xl:block.
 *   한 화면에는 둘 중 하나만 뜬다. 같은 광고가 두 번 노출되면
 *   광고주에게 노출수를 이중으로 세게 되므로 이 짝은 깨지면 안 된다.
 *
 * ■ 형태 — 가로 스크롤이 아니라 세로 목록을 골랐다
 *   가로 스크롤 카드는 자리를 적게 먹지만, 손가락으로 밀지 않으면 첫 장 말고는
 *   아무도 보지 않는다. 광고주 입장에서 2번째 자리부터는 판 적 없는 재고가 된다.
 *   세로 목록은 스크롤만 내려도 전부 지나가므로 노출이 실제로 일어난다.
 *   자리 부담은 limit(처음 보여줄 개수)과 "더 보기"로 눌러둔다.
 *
 * ■ 광고 표시
 *   게재료를 받고 싣는 자리이므로 "광고" 표기 + rel="sponsored"를 항상 붙인다.
 *   (표시광고법 · 검색엔진 정책)
 *
 * ■ 쓰는 법
 *   <MobilePartnerStrip />                     기본 (2개 노출, 위 여백 mt-16)
 *   <MobilePartnerStrip limit={3} />           3개까지 펼친 채로 노출
 *   <MobilePartnerStrip className="mt-10" />   위 여백만 조절
 */
export default function MobilePartnerStrip({
  /** 처음에 보여줄 광고 개수. 나머지는 "더 보기"로 펼친다. */
  limit = 2,
  /** 바깥 여백 조절용. 페이지마다 위 간격이 달라서 열어둔다. */
  className = "mt-16",
}: {
  limit?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const ads = PARTNER_ADS;
  const visible = expanded ? ads : ads.slice(0, limit);
  const restCount = ads.length - visible.length;

  return (
    <section className={`xl:hidden ${className}`} aria-label="제휴 · 추천">
      <div className="pt-8" style={{ borderTop: "1px solid #D4CFC1" }}>
        {/* 제목 + 광고 표기 */}
        <div className="flex items-end justify-between gap-3 mb-2">
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
          {/* 표시광고법 — 대가성 게재임을 화면에서 알 수 있어야 한다. */}
          <span
            className="text-[10px] px-2 py-1 shrink-0"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#5A4A3E",
              border: "1px solid #D4CFC1",
            }}
          >
            광고
          </span>
        </div>

        <p
          className="text-[11px] leading-relaxed mb-5"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            color: "#5A4A3E",
            wordBreak: "keep-all",
          }}
        >
          공연팀이 아니라 광고주에게 게재료를 받고 싣는 자리입니다.
        </p>

        {ads.length === 0 ? (
          /* 광고주가 아직 없을 때 — 빈 채로 두지 않고, 이 자리가 무엇인지 보여준다.
             영업 자리에서 "여기가 그 지면입니다"라고 화면째 보여줄 수 있어야 한다. */
          <div className="p-5" style={{ border: "1px dashed #D4CFC1" }}>
            <p
              className="text-xs leading-relaxed mb-2.5"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#4A3B33",
                wordBreak: "keep-all",
              }}
            >
              이 자리에는 공연예술 관련 파트너 업체가 게재됩니다.
            </p>
            <p
              className="text-[11px] leading-relaxed mb-5"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                wordBreak: "keep-all",
              }}
            >
              팸플릿 제작 · 연기 아카데미 · 프로필 스튜디오 · 오디션 플랫폼 · 공연장 대관 ·
              의상 · 분장
            </p>
            <Link
              href="/muol/contact"
              className="flex items-center justify-center w-full px-4 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                border: "1px solid #D4CFC1",
                minHeight: 44, // 터치 타깃 최소 44px
              }}
            >
              제휴 · 광고 문의
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((ad, i) => (
                <li key={`${ad.name}-${i}`}>
                  {ad.url ? (
                    <a
                      href={ad.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="block p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                      style={{ backgroundColor: "#E6E1D6", minHeight: 44, color: "#0B5563" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#DDD0BD")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E6E1D6")}
                    >
                      <PartnerCardBody ad={ad} variant="mobile" />
                    </a>
                  ) : (
                    <div className="p-4" style={{ backgroundColor: "#E6E1D6", minHeight: 44 }}>
                      <PartnerCardBody ad={ad} variant="mobile" />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* 남은 광고가 있을 때만 펼침 버튼 — 본문 길이를 과하게 먹지 않기 위한 장치 */}
            {ads.length > limit && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="flex items-center justify-center w-full mt-3 px-4 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#0B5563",
                  border: "1px solid #D4CFC1",
                  backgroundColor: "transparent",
                  minHeight: 44,
                }}
              >
                {expanded ? "접기" : `${restCount}곳 더 보기`}
              </button>
            )}

            <div className="mt-5 pt-5" style={{ borderTop: "1px solid #D4CFC1" }}>
              <Link
                href="/muol/contact"
                className="flex items-center justify-center w-full px-4 text-xs transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#0B5563",
                  border: "1px solid #D4CFC1",
                  minHeight: 44,
                }}
              >
                제휴 · 광고 문의
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
