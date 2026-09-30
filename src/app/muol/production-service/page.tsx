import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildBreadcrumbList } from "@/lib/structuredData";
import { COMPANY, COMPANY_ONELINE } from "@/lib/company";
import { OG_MUOL } from "@/lib/ogCards";
import { GENRES } from "@/lib/constants";
import {
  PRODUCTION_TIERS,
  PRODUCTION_AI_NOTICE,
  PRODUCTION_CONTACT_HREF,
  PRICE_DISPLAY_MODE,
  tierPriceView,
} from "@/lib/productionService";

/**
 * /muol/production-service — 공연 홍보물 제작대행 안내 (2026-09-30 신설)
 *
 * 자리 — 사유유사 1순위 수입원(제작대행)을 사이트에서 처음 설명하는 페이지.
 *   광고 게재 안내(/muol/for-business)와는 계약 주체·상품이 달라서 섞지 않고 서로 링크만 건다.
 *
 * 가격 — 이 파일에 금액을 적지 않는다. src/lib/productionService.ts 의
 *   PRICE_DISPLAY_MODE("full" | "partial" | "hidden") 한 줄이 공개 범위를 정한다.
 *
 * 견본 이미지 — Content_Report/output/sales/_제작소스/ A티어 7장르의 표지(01-cover.png)를
 *   720×900 webp로 줄여 public/muol/production/ 에 둔다.
 *   표시 원칙: 7장 모두 「예시」 배지. 배경 이미지 출처는 장마다 다르다 —
 *   뮤지컬 한 장만 AI 생성 이미지이고 나머지 여섯 장은 실사(Unsplash · 국립중앙박물관 공공누리)다.
 *   실사에 「AI 생성 이미지」를 붙이면 그것도 거짓 표시가 되므로(법무팀 2026-09-22 판단),
 *   장마다 실제 출처를 적는다. AI 생성 표시는 뮤지컬에만 붙는다.
 *
 * 색 — globals.css 의 --c-* 정본 값만 쓴다(아래 C). 이 저장소 관행대로 hex로 적되 이름을 붙였다.
 *   다크 모드는 2026-08-03에 폐기됐다 — 되살리지 않는다.
 */

// globals.css @theme 의 --c-* 토큰 값 (정본은 globals.css — 값이 바뀌면 거기 기준으로 맞춘다)
const C = {
  bg: "#F0EEE9", // --c-bg
  surface: "#E6E1D6", // --c-surface
  line: "#D4CFC1", // --c-line
  lineStrong: "#8C837C", // --c-line-strong
  ink: "#2B211C", // --c-ink
  ink2: "#3A2E27", // --c-ink-2
  text: "#4A3B33", // --c-text
  muted: "#5F5145", // --c-text-muted
  link: "#0B5563", // --c-link
  linkHover: "#06333D", // --c-link-hover
  tealTint: "#DCE7E8", // --c-teal-tint
  tealTintInk: "#084653", // --c-teal-tint-ink
  cta: "#5C2A42", // --c-cta
  onDark: "#F0EEE9", // --c-onDark
  onDarkBody: "rgba(240,238,233,0.86)", // --c-onDark-body
  onDarkMeta: "rgba(240,238,233,0.68)", // --c-onDark-meta
  onDarkLine: "rgba(240,238,233,0.30)", // --c-onDark-line
  onDarkLabel: "#E2C3CF", // --c-onDark-label
} as const;

const PAGE_TITLE = "공연 홍보물 제작대행 · 사유유사 SYUS";
const PAGE_DESC =
  "대학 무대예술 공연의 카드뉴스·캡션을 사유유사가 대신 만듭니다. 한 무대·한 시즌·한 해의 기록 세 가지 구성과 7개 장르 견본, 진행 순서를 안내합니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: "/muol/production-service" },
  openGraph: {
    title: PAGE_TITLE,
    description: "공연을 알리는 글과 그림, 사유유사가 거들겠습니다. 구성·견본·진행 순서 안내.",
    // openGraph를 선언하면 상위 layout의 images가 통째로 갈린다 — 반드시 다시 적는다(ogCards.ts 참고)
    images: [OG_MUOL],
  },
};

/**
 * 7장르 견본 — 장르 순서는 GENRES(사이트 장르 정본)와 같다.
 * credit: 표지 배경 이미지의 실제 출처. ai=true 인 장만 「AI 생성 이미지」로 표시한다.
 */
const SAMPLES: {
  genre: (typeof GENRES)[number];
  title: string;
  src: string;
  credit: string;
  ai: boolean;
}[] = [
  { genre: "연극", title: "빈 의자", src: "/muol/production/sample-play.webp", credit: "사진 Marco ten Hoff / Unsplash", ai: false },
  { genre: "뮤지컬", title: "별을 삼킨 도시", src: "/muol/production/sample-musical.webp", credit: "AI 생성 이미지", ai: true },
  { genre: "무용", title: "흐르는 몸", src: "/muol/production/sample-dance.webp", credit: "사진 Forest S / Unsplash", ai: false },
  { genre: "국악", title: "달의 노래", src: "/muol/production/sample-gugak.webp", credit: "사진 국립중앙박물관 · 공공누리 제1유형", ai: false },
  { genre: "음악", title: "사계, 그 다음", src: "/muol/production/sample-music.webp", credit: "사진 Logic Digital / Unsplash", ai: false },
  { genre: "전통연희", title: "탈, 춤추다", src: "/muol/production/sample-traditional.webp", credit: "사진 Aasing Gwok / Unsplash", ai: false },
  { genre: "기타", title: "소리 없는 말", src: "/muol/production/sample-etc.webp", credit: "사진 Vitalii Khodzinskyi / Unsplash", ai: false },
];

const STEPS: { t: string; d: string }[] = [
  {
    t: "문의",
    d: "공연 이름·일정·장소와 원하시는 구성을 알려주세요. 예산을 말씀해 주실 때는 부가세 포함 금액인지도 함께 여쭙습니다.",
  },
  {
    t: "견적 · 계약",
    d: "공급가액·부가세·합계를 나눠 적은 견적서를 보내드립니다(유효 30일). 결재가 끝나면 계약서를 한 부씩 나눠 갖습니다.",
  },
  {
    t: "제작",
    d: "보내주신 공연 정보로 카드뉴스와 캡션을 만듭니다. 수정은 세트당 2회까지 구성에 들어 있습니다.",
  },
  {
    t: "납품",
    d: "원본 파일 일체를 메일로 전달합니다. 한 무대 구성은 10영업일 안에 납품합니다.",
  },
  {
    t: "세금계산서 · 입금",
    d: "전자세금계산서를 발행하고, 사업용 계좌로 대금을 받습니다. 결제 시점은 구성마다 다릅니다(위 구성 표 참고).",
  },
];

// 버튼 공통 — hover / focus-visible / active / (링크라 disabled 없음)
// 애니메이션은 transform만 쓴다(transition-all 금지 가드레일).
const BTN_BASE =
  "inline-flex items-center justify-center px-6 py-3.5 text-sm tracking-wide transition-transform duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function ProductionServicePage() {
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "무대올림", path: "/muol" },
    { name: "제작대행 안내" },
  ]);

  return (
    <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: C.bg }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />

      {/* ── Hero ── */}
      <section className="px-4 sm:px-6 md:px-12 lg:px-20 pt-10 md:pt-16 pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] mb-8"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.link, fontWeight: 600 }}
          >
            사유유사 SYUS · 제작대행
          </p>
          <h1
            className="text-[2.1rem] sm:text-[2.8rem] md:text-[3.6rem] leading-[1.2] font-bold tracking-tight mb-8"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: C.ink, wordBreak: "keep-all", textWrap: "balance" }}
          >
            무대를 알리는 일,
            <br />
            저희가 거들겠습니다.
          </h1>
          <p
            className="text-base md:text-lg leading-[1.9] max-w-2xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.text, wordBreak: "keep-all" }}
          >
            공연을 올리는 것만으로도 한 학기가 빠듯합니다. 공연을 알리는 카드뉴스와 캡션은
            사유유사가 대신 만들어 드립니다. 저희는 작은 통로라서, 크게 외치기보다 닿아야 할 사람에게
            정확히 닿는 글과 그림을 만듭니다.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href={PRODUCTION_CONTACT_HREF}
              className={`${BTN_BASE} bg-[#5C2A42] hover:bg-[#4A2135] active:bg-[#6E3450] focus-visible:outline-[#5C2A42]`}
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.onDark, fontWeight: 600 }}
            >
              제작대행 문의하기 →
            </Link>
            <a
              href="#samples"
              className={`${BTN_BASE} hover:bg-[#DCE7E8] active:bg-[#D4CFC1] focus-visible:outline-[#0B5563]`}
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.link, border: `1px solid ${C.link}` }}
            >
              7개 장르 견본 먼저 보기
            </a>
          </div>
        </div>
      </section>

      {/* ── 01 무엇을 해 드리나요 ── */}
      <section className="px-4 sm:px-6 md:px-12 lg:px-20 py-16 md:py-24" style={{ backgroundColor: C.surface }}>
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="01" label="무엇을 만드나요" />
          <h2 className="text-2xl md:text-4xl font-bold mb-6 leading-snug" style={h2Style}>
            공연 한 편을 알리는 데 필요한 것을
            <br className="hidden md:block" /> 한 세트로 만듭니다.
          </h2>
          <p className="text-base leading-[1.9] mb-10 max-w-3xl" style={bodyStyle}>
            인스타그램 피드에 그대로 올릴 수 있는 카드뉴스 8장이 한 세트입니다. 여덟 장 중 세 장은
            일정·출연·예약 같은 공연 정보만 담는 자리로 둡니다. 보기 좋은 그림만이 아니라, 관객이
            실제로 찾아올 수 있게 하는 것이 이 일의 목적이라서입니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WhatCard
              t="카드뉴스 한 세트"
              d="4:5 피드 규격 8장. 표지 → 작품의 결 → 공연 정보 3장 → 마무리 순서로 엮습니다."
            />
            <WhatCard
              t="캡션과 해시태그"
              d="게시물 아래에 붙일 글과 해시태그를 함께 드립니다. 학과 계정에 그대로 올리셔도 됩니다."
            />
            <WhatCard
              t="원본 파일 일체"
              d="완성 이미지와 문구 원본을 함께 넘겨드립니다. 학과 채널에 올리실 때 따로 손볼 것이 없도록 정리해 드립니다."
            />
          </div>
        </div>
      </section>

      {/* ── 02 견본 ── */}
      <section id="samples" className="px-4 sm:px-6 md:px-12 lg:px-20 py-16 md:py-24 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="02" label="견본" />
          <h2 className="text-2xl md:text-4xl font-bold mb-6 leading-snug" style={h2Style}>
            무대예술 {GENRES.length}개 장르, 표지 견본.
          </h2>
          <p className="text-base leading-[1.9] mb-3 max-w-3xl" style={bodyStyle}>
            장르마다 표지부터 공연 정보 장까지 한 세트를 실제로 만들어 두었습니다. 아래는 그 표지입니다.
            전체 여덟 장은 문의 주시면 보내드립니다.
          </p>
          <p className="text-sm leading-relaxed mb-10 max-w-3xl" style={{ ...bodyStyle, color: C.muted }}>
            모두 가상 공연 예시입니다. 실존 단체·작품·인물과 무관합니다. 예시의 글과 구성은 생성형 AI의 도움을
            받아 만들었고, 배경 이미지의 출처는 장마다 적어 두었습니다.
          </p>

          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 md:gap-x-5">
            {SAMPLES.map((s) => (
              <li key={s.genre}>
                <figure>
                  {/* 견본 카드는 링크가 아니다 — 누를 곳이 없어야 실제 공연으로 오인되지 않는다(ShowSamplePreview와 같은 원칙) */}
                  <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: C.surface }}>
                    <Image
                      src={s.src}
                      alt={`${s.genre} 견본 카드뉴스 표지 — 가상 공연 〈${s.title}〉`}
                      fill
                      sizes="(max-width: 768px) 46vw, (max-width: 1024px) 30vw, 230px"
                      className="object-cover"
                    />
                    <span
                      className="absolute top-2 left-2 px-2 py-1"
                      style={{
                        fontFamily: "var(--font-noto-sans-kr)",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                        backgroundColor: "rgba(74, 59, 51, 0.9)", // --c-text(Silhouette) 90%
                        color: C.onDark,
                      }}
                    >
                      예시
                    </span>
                  </div>
                  <figcaption className="pt-3 space-y-1">
                    <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: C.ink2 }}>
                      <span style={{ color: C.link }}>{s.genre}</span>
                      <span aria-hidden="true" style={{ color: C.lineStrong }}> · </span>
                      {s.title}
                    </p>
                    <p
                      className="text-xs leading-snug"
                      style={{
                        fontFamily: "var(--font-noto-sans-kr)",
                        color: s.ai ? C.cta : C.muted,
                        fontWeight: s.ai ? 600 : 400,
                        wordBreak: "keep-all",
                      }}
                    >
                      {s.credit}
                    </p>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 03 구성과 가격 ── */}
      <section id="price" className="px-4 sm:px-6 md:px-12 lg:px-20 py-16 md:py-24 scroll-mt-24" style={{ backgroundColor: C.surface }}>
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="03" label="구성" />
          <h2 className="text-2xl md:text-4xl font-bold mb-6 leading-snug" style={h2Style}>
            한 무대부터 한 해까지, 세 가지 구성.
          </h2>
          <p className="text-base leading-[1.9] mb-10 max-w-3xl" style={bodyStyle}>
            {PRICE_DISPLAY_MODE === "hidden"
              ? "공연의 규모와 기간에 맞춰 견적서로 금액을 알려드립니다."
              : "표시한 금액은 공급가액이며, 부가세 10%가 별도로 붙습니다. 견적서에는 공급가액·부가세·합계를 세 줄로 나눠 적어 드립니다."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRODUCTION_TIERS.map((tier) => {
              const price = tierPriceView(tier);
              return (
                <article
                  key={tier.code}
                  className="flex flex-col p-6"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.line}` }}
                >
                  <div className="flex items-baseline gap-3 mb-2">
                    <span
                      className="w-8 h-8 inline-flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ fontFamily: "var(--font-inter)", backgroundColor: C.link, color: C.onDark }}
                    >
                      {tier.code}
                    </span>
                    <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: C.ink2 }}>
                      {tier.name}
                    </h3>
                  </div>
                  <p className="text-sm mb-5" style={{ ...bodyStyle, color: C.muted }}>
                    {tier.audience}
                  </p>

                  {/* 가격 — 모드 분기는 productionService.ts의 tierPriceView 한 곳에서만 */}
                  <div className="pb-5 mb-5" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <p
                      className="text-2xl font-bold"
                      style={{ fontFamily: "var(--font-noto-serif-kr)", color: price.kind === "hidden" ? C.link : C.ink }}
                    >
                      {price.main}
                    </p>
                    <p className="text-xs mt-1" style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.muted }}>
                      {price.mainNote}
                    </p>
                    {price.kind === "full" &&
                      price.lines.map((l) => (
                        <p key={l} className="text-xs mt-1" style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.text }}>
                          {l}
                        </p>
                      ))}
                  </div>

                  <dl className="space-y-3 text-sm flex-1" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
                    <Row k="기간" v={tier.period} />
                    <div>
                      <dt className="text-xs mb-1" style={{ color: C.muted }}>
                        드리는 것
                      </dt>
                      <dd>
                        <ul className="space-y-1">
                          {tier.includes.map((i) => (
                            <li key={i} className="flex gap-2" style={{ color: C.text, wordBreak: "keep-all" }}>
                              <span aria-hidden="true" style={{ color: C.link }}>
                                ·
                              </span>
                              <span>{i}</span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                    <Row k="수정" v={tier.revisions} />
                    <Row k="결제" v={tier.payment} />
                  </dl>
                </article>
              );
            })}
          </div>

          {/* 인공지능 기본법 §31① 사전 고지 — 금액 바로 아래. 법무팀 문안 그대로(productionService.ts) */}
          <div className="mt-8 p-5" style={{ backgroundColor: C.bg, borderLeft: `3px solid ${C.cta}` }}>
            <p className="text-xs tracking-wider mb-2" style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.cta, fontWeight: 600 }}>
              생성형 AI 사용 안내
            </p>
            <p className="text-sm leading-relaxed" style={{ ...bodyStyle }}>
              {PRODUCTION_AI_NOTICE}
            </p>
          </div>

          <ul className="mt-6 space-y-2 text-sm" style={{ ...bodyStyle, color: C.muted }}>
            <li>· 사유유사 인스타그램에 게재하는 게시물에는 「광고」 표시가 붙습니다.</li>
            <li>· 제작을 맡기셨는지 여부는 무대올림의 게재 순서·노출·별점·TOP 5에 어떤 영향도 주지 않습니다.</li>
            <li>
              · 제작대행은 「무대올림 게재」가 아니라 「사유유사가 만드는 홍보물」이며, 계약의 주체가 다릅니다.
              무대올림 공연 등록은 언제나 게재료 없이 따로 하실 수 있습니다.
            </li>
          </ul>
        </div>
      </section>

      {/* ── 04 진행 순서 ── */}
      <section className="px-4 sm:px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="04" label="진행 순서" />
          <h2 className="text-2xl md:text-4xl font-bold mb-10 leading-snug" style={h2Style}>
            문의에서 입금까지 다섯 걸음.
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="p-5" style={{ border: `1px solid ${C.line}` }}>
                <p className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-inter)", color: C.cta }}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: C.ink2 }}>
                  {s.t}
                </p>
                <p className="text-sm leading-relaxed" style={bodyStyle}>
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 05 문의 ── */}
      <section
        className="px-4 sm:px-6 md:px-12 lg:px-20 py-20 md:py-28 text-center"
        style={{ backgroundColor: C.link, color: C.onDark }}
      >
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl md:text-4xl font-bold mb-5 leading-snug"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: C.onDark, wordBreak: "keep-all" }}
          >
            먼저, 공연 이야기를 들려주세요.
          </h2>
          <p
            className="text-base leading-[1.9] mb-10 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.onDarkBody, wordBreak: "keep-all" }}
          >
            구성을 아직 못 정하셨어도 괜찮습니다. 공연 이름과 일정만 적어 주시면,
            운영자가 직접 읽고 맞는 구성을 함께 찾아보겠습니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={PRODUCTION_CONTACT_HREF}
              className={`${BTN_BASE} w-full sm:w-auto bg-[#5C2A42] hover:bg-[#4A2135] active:bg-[#6E3450] focus-visible:outline-[#F0EEE9]`}
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.onDark, fontWeight: 600 }}
            >
              제작대행 문의하기 →
            </Link>
            <Link
              href="/muol/for-business"
              className={`${BTN_BASE} w-full sm:w-auto hover:bg-[#06333D] active:bg-[#084653] focus-visible:outline-[#F0EEE9]`}
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.onDark, border: `1px solid ${C.onDarkLine}` }}
            >
              광고 게재를 찾으신다면
            </Link>
          </div>
          <p className="text-xs mt-10 leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.onDarkMeta }}>
            운영: {COMPANY_ONELINE}
            <br />
            {COMPANY.address}
            <br />
            {COMPANY.email}
          </p>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 스타일 · 서브 컴포넌트
// ──────────────────────────────────────────────────

const h2Style = { fontFamily: "var(--font-noto-serif-kr)", color: C.ink, wordBreak: "keep-all" } as const;
const bodyStyle = { fontFamily: "var(--font-noto-sans-kr)", color: C.text, wordBreak: "keep-all" } as const;

function SectionLabel({ no, label }: { no: string; label: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <span className="text-xs tracking-[0.3em]" style={{ fontFamily: "var(--font-inter)", color: C.muted }}>
        {no}
      </span>
      <span className="text-xs tracking-[0.2em]" style={{ fontFamily: "var(--font-noto-sans-kr)", color: C.link, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

function WhatCard({ t, d }: { t: string; d: string }) {
  return (
    <div className="p-6" style={{ backgroundColor: C.bg, border: `1px solid ${C.line}` }}>
      <p className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: C.ink2 }}>
        {t}
      </p>
      <p className="text-sm leading-relaxed" style={bodyStyle}>
        {d}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs mb-1" style={{ color: C.muted }}>
        {k}
      </dt>
      <dd style={{ color: C.text, wordBreak: "keep-all" }}>{v}</dd>
    </div>
  );
}
