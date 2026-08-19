import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildBreadcrumbList } from "@/lib/structuredData";
import { COMPANY, COMPANY_ROWS } from "@/lib/company";

/**
 * /company — 사유유사(모회사) 소개 · CI 페이지. 2026-08-19 신설.
 *
 * 왜 /about이 아닌가:
 *   /about 은 next.config.ts에서 /muol/about 으로 308 영구 리다이렉트된다(3층 구조 재편 잔재).
 *   308은 브라우저가 영구 캐시하므로 그 자리에 다른 페이지를 놓으면 기존 방문자가 계속
 *   무대올림 소개로 튕긴다. 그래서 충돌 없는 /company 를 쓴다.
 *
 * /muol/about 과의 경계 (2026-08-19 사장님 결정):
 *   - /muol/about = 서비스(무대올림) 소개. 「만든 사람의 말」 1인칭 글은 그쪽에 그대로 둔다.
 *   - /company    = 회사(사유유사) 소개. 같은 사연도 3인칭 회사 서술로만 쓴다.
 *   두 페이지가 같은 문장을 쓰지 않도록, 이 파일에서 1인칭("저는")을 쓰지 말 것.
 *
 * 진입점: 게이트웨이(/) 지붕 배지 → 이 페이지. 두 문(무대올림·시우스)과 나란한 제3의 문이다.
 */

export const metadata: Metadata = {
  title: "사유유사 SYUS",
  description:
    "사유유사(思惟流沙)는 한국 대학 무대예술을 기록하고 연결하고 알리는 작은 통로입니다. 이름의 뜻, 시작한 이유, 방향과 가치, 그리고 브랜드 정체성(CI)을 담았습니다.",
  alternates: { canonical: "https://syus.co.kr/company" },
  openGraph: {
    title: "사유유사 SYUS — 두루 생각하여, 이를 무대 위에서 흘려보냅니다",
    description:
      "사유유사(思惟流沙)는 한국 대학 무대예술을 기록하고 연결하고 알리는 작은 통로입니다. 무대올림과 시우스를 운영합니다.",
    url: "https://syus.co.kr/company",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "사유유사 SYUS — 두루 생각하여, 이를 무대 위에서 흘려보냅니다.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "사유유사 SYUS",
    description:
      "한국 대학 무대예술을 기록하고 연결하고 알리는 작은 통로. 무대올림과 시우스를 운영합니다.",
    images: ["/og-default.png"],
  },
};

/** 이름 풀이 — 네 글자. 사전 뜻과 브랜드 해석을 나눠 적는다. */
const HANJA = [
  { char: "思", reading: "생각할 사", note: "떠올린다" },
  { char: "惟", reading: "생각할 유", note: "머문다" },
  { char: "流", reading: "흐를 류", note: "흘러간다" },
  { char: "沙", reading: "모래 사", note: "쌓인다" },
] as const;

/** 세 동사 — 헌장의 정체성 그대로. 이 셋을 벗어나는 일은 사유유사의 자산이 되지 않는다. */
const VERBS = [
  {
    verb: "기록한다",
    en: "Record",
    body: "흩어지는 무대를 모아 남깁니다. 공연은 끝나면 사라지지만, 그 자리에 누가 무엇을 올렸는지는 남을 수 있습니다.",
  },
  {
    verb: "연결한다",
    en: "Connect",
    body: "거장과 신진을, 예술가와 관객을 같은 흐름 위에 놓습니다. 무대는 이미 있었고, 부족했던 것은 그 무대와 가까워질 방법이었습니다.",
  },
  {
    verb: "알린다",
    en: "Deliver",
    body: "시끄럽지 않은 방식으로, 닿아야 할 사람에게 닿습니다. 크게 외치는 대신 정확히 건네는 쪽을 택합니다.",
  },
] as const;

/** CI 색 — globals.css 토큰이 정본이고 비율은 브랜드 룰(2026-06-15 잠금)이다. */
const PALETTE = [
  {
    hex: "#F0EEE9",
    name: "Cloud Dancer",
    ratio: "70%",
    use: "바탕",
    origin: "Pantone 11-4201",
    dark: false,
  },
  {
    hex: "#0B5563",
    name: "Transformative Teal",
    ratio: "20%",
    use: "중심 · 제목 · 링크",
    origin: "WGSN · Coloro",
    dark: true,
  },
  {
    hex: "#4A3B33",
    name: "Silhouette",
    ratio: "7%",
    use: "본문 · 하단",
    origin: "Benjamin Moore",
    dark: true,
  },
  {
    hex: "#5C2A42",
    name: "Divine Damson",
    ratio: "3%",
    use: "강조 한 점",
    origin: "Graham & Brown",
    dark: true,
  },
] as const;

export default function CompanyPage() {
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "사유유사 SYUS" },
  ]);

  return (
    <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* ══ Hero ══ 로고 · 한자 · 슬로건. 게이트웨이 지붕에서 이어지는 자리라 배지와 같은 얼굴을 쓴다. */}
      <section className="px-6 md:px-12 lg:px-20 pt-12 md:pt-16 pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto text-center">
          <Image
            src="/sayuyusa-logo.png"
            alt="사유유사 SYUS"
            width={160}
            height={64}
            className="mx-auto mb-10 h-14 md:h-16 w-auto"
            priority
          />
          <p
            className="text-xs tracking-[0.4em] uppercase mb-8"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            Sayuyusa · SYUS
          </p>
          <h1
            className="mb-10 leading-[1.5]"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 700,
              color: "#4A3B33",
              letterSpacing: "0.18em",
            }}
          >
            思惟流沙
          </h1>
          <p
            className="leading-[1.9] mb-4"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.05rem, 2.2vw, 1.35rem)",
              color: "#0B5563",
              wordBreak: "keep-all",
            }}
          >
            두루 생각하여, 이를 무대 위에서 흘려보냅니다.
          </p>
          <p
            className="text-sm md:text-base leading-[1.9]"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
          >
            사유유사는 한국 대학 무대예술을 기록하고 연결하고 알리는 작은 통로입니다.
          </p>
        </div>
      </section>

      {/* ══ 01. 이름 ══ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-20 md:py-28"
        style={{ backgroundColor: "#E6E1D6" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-sm tracking-[0.25em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            01. The Name
          </p>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              color: "#4A3B33",
            }}
          >
            이름의 뜻
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
            {HANJA.map((h) => (
              <div
                key={h.char}
                className="text-center py-8 px-3"
                style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1" }}
              >
                <p
                  className="mb-3"
                  style={{
                    fontFamily: "var(--font-noto-serif-kr)",
                    fontSize: "clamp(2.2rem, 5vw, 3rem)",
                    fontWeight: 700,
                    color: "#0B5563",
                    lineHeight: 1,
                  }}
                >
                  {h.char}
                </p>
                <p
                  className="text-xs mb-1"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
                >
                  {h.reading}
                </p>
                <p
                  className="text-sm"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", fontWeight: 600 }}
                >
                  {h.note}
                </p>
              </div>
            ))}
          </div>

          <div
            className="space-y-5 text-base leading-[1.9]"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            <p>
              <strong style={{ color: "#0B5563" }}>사유(思惟)</strong>는 대상을 두루 생각하는 일이고,{" "}
              <strong style={{ color: "#0B5563" }}>유사(流沙)</strong>는 바람과 물에 흘러내리는
              모래입니다.
            </p>
            <p>
              연기 서적에서 자주 만난 단어 &lsquo;사유&rsquo;를 뒤집어 &lsquo;유사&rsquo;라 다시
              불렀습니다. 앞뒤를 바꾸어도 같은 글자가 남는 대칭의 이름입니다. 오래 생각한 것을
              끝까지 쥐고 있지는 않겠다는 뜻이기도 합니다.
            </p>
            <p>
              모래는 흘러가지만 어딘가에는 쌓입니다. 사유유사가 쌓이기를 바라는 자리는 젊은
              무대입니다.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 02. 시작 ══
          ★ /muol/about 「만든 사람의 말」과 같은 사연을 다루지만 화자가 다르다.
            그쪽은 1인칭("저는"), 이곳은 회사 서술("사유유사는"). 3인칭을 1인칭으로 되돌리지 말 것. */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-sm tracking-[0.25em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            02. Why We Began
          </p>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              color: "#4A3B33",
            }}
          >
            시작한 이유
          </h2>
          <div
            className="space-y-5 text-base leading-[1.9]"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            <p>
              대학의 무대는 매년 올라갑니다. 그러나 포스터를 보고 검색해도 나오는 것은 날짜 한 줄과
              사진 한 장, 그마저도 여기저기 흩어져 있었습니다. 무대를 찾은 사람이 그 무대에 가까이
              가지 못한 채 돌아서는 일이 반복되었습니다.
            </p>
            <p>
              프로 무대와 나란히 놓아도 부끄럽지 않을 사람과 단체가 대학에는 분명히 있습니다. 다만
              그들이 거기 있다는 사실을 알 방법이 너무 적었습니다.
            </p>
            <p
              className="py-6 px-6 md:px-8"
              style={{
                backgroundColor: "#E6E1D6",
                borderLeft: "4px solid #5C2A42",
                fontFamily: "var(--font-noto-serif-kr)",
                fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
                lineHeight: 1.8,
                color: "#4A3B33",
              }}
            >
              무대가 부족한 것이 아니라, 무대와 가까워질 수 있는 공간이 부족했던 것입니다.
            </p>
            <p>
              사유유사는 그 공간을 만들기 위해 시작했습니다. 무대를 새로 만드는 회사가 아니라, 이미
              있는 무대가 더 잘 보이도록 곁에 서는 회사입니다.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 03. 세 동사 ══ */}
      <section
        className="px-6 md:px-12 lg:px-20 py-20 md:py-28"
        style={{ backgroundColor: "#0B5563" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-sm tracking-[0.25em] uppercase mb-4"
            style={{
              fontFamily: "var(--font-inter)",
              color: "var(--color-damson-light)",
              fontWeight: 600,
            }}
          >
            03. What We Do
          </p>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              color: "#F0EEE9",
            }}
          >
            세 개의 동사
          </h2>
          <p
            className="mb-12 text-sm md:text-base leading-[1.9]"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "rgba(240,238,233,0.78)",
              wordBreak: "keep-all",
            }}
          >
            사유유사의 모든 활동은 이 셋 위에 섭니다. 이 셋을 벗어나는 일은 트래픽이나 수익을
            만들더라도 사유유사의 자산이 되지 않습니다.
          </p>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {VERBS.map((v, i) => (
              <div
                key={v.verb}
                className="p-7 md:p-8"
                style={{ backgroundColor: "rgba(240,238,233,0.07)", border: "1px solid rgba(240,238,233,0.16)" }}
              >
                <p
                  className="text-xs tracking-[0.3em] uppercase mb-4"
                  style={{
                    fontFamily: "var(--font-inter)",
                    color: "var(--color-damson-light)",
                    fontWeight: 600,
                  }}
                >
                  {String(i + 1).padStart(2, "0")} · {v.en}
                </p>
                <p
                  className="mb-4"
                  style={{
                    fontFamily: "var(--font-noto-serif-kr)",
                    fontSize: "clamp(1.25rem, 2.4vw, 1.5rem)",
                    fontWeight: 700,
                    color: "#F0EEE9",
                  }}
                >
                  {v.verb}
                </p>
                <p
                  className="text-sm leading-[1.9]"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    color: "rgba(240,238,233,0.82)",
                    wordBreak: "keep-all",
                  }}
                >
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 04. 방향 ══
          수치는 2026-08-14 실측 확정분이다. 장르 7개(발레는 무용 하위)·지역 17개·113개 학과/77개 대학.
          "8개 장르·16개 지역·200여 개"는 과거 오기이니 되살리지 말 것.
          ★학과/대학 수만 하드코딩이다 — /muol/universities는 같은 값을 DB에서 실시간 계산하므로,
            데이터가 늘면 이 숫자가 먼저 낡는다. 아래 링크로 실시간 목록을 함께 걸어 둔 이유다.
            장르(GENRES 7)·지역(REGIONS 17)은 src/lib/constants.ts가 정본이라 그쪽이 바뀔 때만 손대면 된다. */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-sm tracking-[0.25em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            04. Where We Go
          </p>
          <h2
            className="mb-8"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              color: "#4A3B33",
            }}
          >
            향하는 곳
          </h2>

          <p
            className="mb-10 py-6 px-6 md:px-8"
            style={{
              backgroundColor: "#E6E1D6",
              borderLeft: "4px solid #0B5563",
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.15rem, 2.4vw, 1.5rem)",
              fontWeight: 700,
              lineHeight: 1.7,
              color: "#0B5563",
              wordBreak: "keep-all",
            }}
          >
            한국 대학 무대예술의 진흥
          </p>

          <div
            className="space-y-5 text-base leading-[1.9] mb-12"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            <p>
              대학 공연은 대부분 무료입니다. 티켓 수익이 없다는 뜻이고, 그래서 홍보에 쓸 예산도
              없습니다. 사유유사가 공연팀에게 게재료를 받지 않는 이유입니다.
            </p>
            <p>
              무대를 올리는 쪽에서 돈을 받는 대신, 그 무대가 더 많은 사람에게 닿게 하는 일에서
              사유유사의 자리를 찾습니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {[
              { n: "7", label: "무대예술 장르" },
              { n: "17", label: "지역" },
              { n: "113", label: "관련 학과 · 77개 대학" },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center py-7 px-3"
                style={{ backgroundColor: "#E6E1D6" }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)",
                    fontWeight: 700,
                    color: "#0B5563",
                    lineHeight: 1.2,
                  }}
                >
                  {s.n}
                </p>
                <p
                  className="text-xs md:text-sm mt-2"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
            <Link
              href="/muol/universities"
              className="underline underline-offset-4"
              style={{ color: "#0B5563" }}
            >
              학과 목록 보기
            </Link>
            <span style={{ color: "#5A4A3E" }}> — 지금 등록된 수는 이곳에서 실시간으로 확인하실 수 있습니다.</span>
          </p>
        </div>
      </section>

      {/* ══ 05. 두 개의 문 ══ 게이트웨이의 두 문과 같은 문구를 쓴다(넓게 둘러보다 / 깊게 머물다). */}
      <section
        className="px-6 md:px-12 lg:px-20 py-20 md:py-28"
        style={{ backgroundColor: "#E6E1D6" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-sm tracking-[0.25em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            05. Two Doors
          </p>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              color: "#4A3B33",
            }}
          >
            두 개의 문
          </h2>
          <p
            className="mb-12 text-sm md:text-base leading-[1.9]"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
          >
            사유유사는 두 개의 서비스를 운영합니다. 이름에 담긴 두 결 — 넓게 흐르는 쪽과 깊게 머무는
            쪽 — 을 각각 하나씩 맡고 있습니다.
          </p>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <Link
              href="/muol"
              className="block p-8 md:p-10 transition-transform hover:-translate-y-1"
              style={{ backgroundColor: "#0B5563" }}
            >
              <p
                className="text-xs tracking-[0.3em] uppercase mb-4"
                style={{
                  fontFamily: "var(--font-inter)",
                  color: "var(--color-damson-light)",
                  fontWeight: 600,
                }}
              >
                Stage · 무대올림
              </p>
              <p
                className="mb-4"
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  fontSize: "clamp(1.35rem, 2.8vw, 1.7rem)",
                  fontWeight: 700,
                  color: "#F0EEE9",
                }}
              >
                넓게 — 둘러보다
              </p>
              <p
                className="text-sm leading-[1.9] mb-5"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "rgba(240,238,233,0.82)",
                  wordBreak: "keep-all",
                }}
              >
                대학 무대예술 공연을 올리고, 지역의 관객이 좌석을 신청합니다. 가까운 무대와 관객을
                잇습니다.
              </p>
              <span
                className="text-sm"
                style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", fontWeight: 600 }}
              >
                무대올림으로 →
              </span>
            </Link>

            <Link
              href="/syus"
              className="block p-8 md:p-10 transition-transform hover:-translate-y-1"
              style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1" }}
            >
              <p
                className="text-xs tracking-[0.3em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
              >
                SYUS · 시우스
              </p>
              <p
                className="mb-4"
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  fontSize: "clamp(1.35rem, 2.8vw, 1.7rem)",
                  fontWeight: 700,
                  color: "#4A3B33",
                }}
              >
                깊게 — 머물다
              </p>
              <p
                className="text-sm leading-[1.9] mb-5"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
              >
                연기를 기록하고, 고민을 나누고, 무대를 오래 들여다봅니다. 독백과 견해가 쌓이는
                자리입니다.
              </p>
              <span
                className="text-sm"
                style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
              >
                시우스로 →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ 06. CI ══ 로고·색·슬로건. 색 값은 globals.css 토큰이 정본이고 비율은 브랜드 룰이다. */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-sm tracking-[0.25em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            06. Corporate Identity
          </p>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              color: "#4A3B33",
            }}
          >
            브랜드 정체성
          </h2>
          <p
            className="mb-12 text-sm md:text-base leading-[1.9]"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
          >
            사유유사의 얼굴은 크게 셋입니다. 이름, 색, 그리고 한 문장.
          </p>

          {/* 로고 */}
          <div className="mb-14">
            <p
              className="text-xs tracking-[0.3em] uppercase mb-5"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
            >
              Logotype
            </p>
            <div
              className="flex items-center justify-center py-14 px-6"
              style={{ backgroundColor: "#E6E1D6", border: "1px solid #D4CFC1" }}
            >
              <Image
                src="/sayuyusa-logo.png"
                alt="사유유사 SYUS 로고"
                width={220}
                height={88}
                className="h-16 md:h-20 w-auto"
              />
            </div>
            <p
              className="mt-4 text-sm leading-[1.9]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
            >
              로고는 바탕색 위에 여백을 두고 놓습니다. 임의로 늘리거나 기울이지 않고, 색을 바꾸어
              쓰지 않습니다.
            </p>
          </div>

          {/* 색 */}
          <div className="mb-14">
            <p
              className="text-xs tracking-[0.3em] uppercase mb-5"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
            >
              Color · 70 · 20 · 7 · 3
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {PALETTE.map((c) => (
                <div key={c.hex} style={{ border: "1px solid #D4CFC1" }}>
                  <div
                    className="h-28 md:h-32 flex items-end justify-end p-3"
                    style={{ backgroundColor: c.hex }}
                  >
                    <span
                      className="text-xs"
                      style={{
                        fontFamily: "var(--font-inter)",
                        color: c.dark ? "rgba(240,238,233,0.9)" : "#5A4A3E",
                        fontWeight: 700,
                      }}
                    >
                      {c.ratio}
                    </span>
                  </div>
                  <div className="p-4" style={{ backgroundColor: "#F0EEE9" }}>
                    <p
                      className="text-sm mb-1"
                      style={{ fontFamily: "var(--font-inter)", color: "#4A3B33", fontWeight: 700 }}
                    >
                      {c.hex}
                    </p>
                    <p
                      className="text-xs mb-2"
                      style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
                    >
                      {c.name}
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
                    >
                      {c.use}
                      <br />
                      <span style={{ opacity: 0.75 }}>{c.origin}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p
              className="mt-4 text-sm leading-[1.9]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
            >
              비율이 곧 규칙입니다. 바탕이 대부분을 차지하고, 자두빛은 한 화면에 한 점만 씁니다. 색을
              고르게 나누어 쓰면 사유유사의 얼굴이 아니게 됩니다.
            </p>
          </div>

          {/* 슬로건 */}
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-5"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
            >
              Slogan
            </p>
            <div
              className="py-12 px-6 md:px-10 text-center"
              style={{ backgroundColor: "#4A3B33" }}
            >
              <p
                className="mb-5"
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  fontSize: "clamp(1.3rem, 3vw, 1.8rem)",
                  fontWeight: 700,
                  color: "#F0EEE9",
                  letterSpacing: "0.16em",
                }}
              >
                思惟流沙
              </p>
              <p
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
                  color: "var(--color-damson-light)",
                  lineHeight: 1.8,
                  wordBreak: "keep-all",
                }}
              >
                두루 생각하여, 이를 무대 위에서 흘려보냅니다.
              </p>
            </div>
            <p
              className="mt-4 text-sm leading-[1.9]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
            >
              한자와 문장은 함께 놓는 것을 기본으로 합니다. 자리가 좁으면 문장만 씁니다. 문장을
              줄이거나 어미를 바꾸어 쓰지 않습니다.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 07. 사업자 정보 ══ COMPANY_ROWS가 정본이다. 값을 이 파일에 따로 적지 말 것. */}
      <section
        className="px-6 md:px-12 lg:px-20 py-20 md:py-28"
        style={{ backgroundColor: "#E6E1D6" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-sm tracking-[0.25em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            07. Business Information
          </p>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.5rem, 3.2vw, 2.1rem)",
              fontWeight: 700,
              color: "#4A3B33",
            }}
          >
            사업자 정보
          </h2>

          <dl className="mb-10">
            {COMPANY_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex flex-col sm:flex-row gap-1 sm:gap-6 py-4"
                style={{ borderBottom: "1px solid #D4CFC1" }}
              >
                <dt
                  className="text-sm sm:w-40 shrink-0"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", fontWeight: 600 }}
                >
                  {row.label}
                </dt>
                <dd
                  className="text-sm leading-[1.8]"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <a
              href={`mailto:${COMPANY.email}`}
              className="text-sm underline underline-offset-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
            >
              이메일 문의
            </a>
            <a
              href={COMPANY.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
            >
              인스타그램
            </a>
            <a
              href={COMPANY.kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline underline-offset-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
            >
              카카오톡 채널
            </a>
            <Link
              href="/muol/about"
              className="text-sm underline underline-offset-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
            >
              무대올림 서비스 소개
            </Link>
          </div>
        </div>
      </section>

      {/* ══ 닫는 말 ══ */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="leading-[2]"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.05rem, 2.2vw, 1.3rem)",
              color: "#4A3B33",
              wordBreak: "keep-all",
            }}
          >
            사유유사는 무대를 만들지 않습니다.
            <br />
            이미 오르고 있는 무대가 더 잘 보이도록 곁에 설 뿐입니다.
          </p>
          <p
            className="mt-8 text-sm"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
          >
            — 사유유사 드림
          </p>
        </div>
      </section>
    </div>
  );
}
