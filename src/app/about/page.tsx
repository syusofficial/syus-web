import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList } from "@/lib/structuredData";

export const metadata: Metadata = {
  title: "사유유사 SYUS · 소개",
  description:
    "사유유사 SYUS는 배우의 사유가 흐르는 무대, 젊은 예술의 경계를 허물고 무한한 영감을 잇는 플랫폼입니다. 대학·신진 공연을 기록하고, 연결하고, 알립니다.",
  openGraph: {
    title: "사유유사 SYUS · 소개",
    description:
      "배우의 사유가 흐르는 무대, 젊은 예술의 경계를 허물고 무한한 영감을 잇는 플랫폼.",
  },
};

export default function AboutPage() {
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "소개" },
  ]);

  return (
    <div className="pt-24 min-h-screen" style={{ backgroundColor: "#F8F9FC" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* ── Hero ── */}
      <section className="px-6 md:px-12 lg:px-20 pt-20 pb-24">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs tracking-[0.4em] uppercase mb-10"
            style={{ fontFamily: "var(--font-inter)", color: "#6B7385" }}
          >
            About SYUS
          </p>
          <h1
            className="text-[2.5rem] md:text-[3.75rem] leading-[1.2] font-light mb-12"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#2E5BB8",
              textWrap: "balance",
              wordBreak: "keep-all",
            }}
          >
            배우의 사유가 흐르는 무대,
            <br />
            젊은 예술의 경계를 허물고
            <br />
            무한한 영감을 잇는 플랫폼.
          </h1>
          <div
            className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-8"
            style={{ borderTop: "1px solid #C5CCD9" }}
          >
            <span
              className="text-3xl md:text-4xl"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8" }}
            >
              사유유사
            </span>
            <span
              className="text-xl md:text-2xl tracking-[0.15em]"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8", opacity: 0.7 }}
            >
              思惟流沙
            </span>
            <span
              className="text-sm tracking-[0.35em] uppercase"
              style={{ fontFamily: "var(--font-cormorant)", color: "#6B7385" }}
            >
              SYUS · System of Young Unbound Society
            </span>
          </div>
        </div>
      </section>

      {/* ── 이름의 뜻 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#E7ECF5" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#6B7385" }}
          >
            01. The Name
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-12"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8" }}
          >
            이름의 의미
          </h2>

          <div className="space-y-12">
            {/* 한글·한문 */}
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-8 items-start">
              <p
                className="text-sm tracking-[0.2em]"
                style={{ fontFamily: "var(--font-inter)", color: "#2E5BB8", fontWeight: 600 }}
              >
                사유유사 · 思惟流沙
              </p>
              <div
                className="text-base leading-[1.9]"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
              >
                <p className="mb-3">
                  <strong style={{ color: "#2E5BB8" }}>思惟</strong>(사유) — 개념·구성·판단·추리를
                  행하는 인간의 이성 작용.
                </p>
                <p className="mb-3">
                  <strong style={{ color: "#2E5BB8" }}>流沙</strong>(유사) — 바람이나 흐르는 물에
                  의하여 흘러내리는 모래.
                </p>
                <p
                  className="pt-3 italic"
                  style={{ borderTop: "1px solid #C5CCD9", color: "#5A5A5A" }}
                >
                  개념·구성·판단·추리를 행하는 배우의 이성 작용이 상상과 질문에 의하여 채워지는 무대.
                  <br />
                  그리고 그 무대를 공유하여 연기 예술의 다양성을 함께 누리는 흐름.
                </p>
              </div>
            </div>

            {/* 영문 */}
            <div
              className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-8 items-start pt-12"
              style={{ borderTop: "1px solid #C5CCD9" }}
            >
              <p
                className="text-sm tracking-[0.2em]"
                style={{ fontFamily: "var(--font-inter)", color: "#2E5BB8", fontWeight: 600 }}
              >
                SYUS
              </p>
              <div
                className="text-base leading-[1.9]"
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
              >
                <p className="mb-3">
                  <strong style={{ color: "#2E5BB8" }}>System of Young Unbound Society</strong>
                </p>
                <p>
                  한글 초성에서 따왔지만, 한문과는 별개의 독립된 의미를 가집니다.
                  <br />
                  젊고 무언가에 얽매이지 않은 사회의 시스템 — 자유롭고 창의적인 예술 세계를
                  지향하는 예술가들의 사회·플랫폼.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 시작한 이유 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#6B7385" }}
          >
            02. Origin
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-12"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8" }}
          >
            시작한 이유
          </h2>

          <div className="space-y-10">
            {[
              {
                num: "1",
                title: "묻혀버리는 공연 정보",
                lines: [
                  "기존 공연 플랫폼은 대형 상업 공연 중심이라, 대학과 소극장에서 올라가는 무대는 좀처럼 발견되지 않습니다.",
                  "관객 한 사람이 좋은 공연 하나를 찾기까지 너무 멀고, 너무 많은 노력이 듭니다.",
                ],
              },
              {
                num: "2",
                title: "무대를 알릴 곳이 없는 공연자",
                lines: [
                  "정보화 시대에서 공연의 정보 가치는 매우 소중합니다.",
                  "젊은 예술가가 자신의 무대를 정성스레 소개할 수 있는 전용 공간이 필요했습니다.",
                ],
              },
              {
                num: "3",
                title: "한 번 끝나면 사라지는 기록",
                lines: [
                  "막이 내리면 모든 게 흩어집니다.",
                  "다음 학번이, 다음 세대가 참고하고 영감을 받을 기록이 남지 않습니다.",
                  "그 순간의 무대를 흐름으로 잇고 싶었습니다.",
                ],
              },
            ].map((item) => (
              <div key={item.num} className="flex gap-6 md:gap-10">
                <span
                  className="text-3xl md:text-4xl shrink-0 leading-none"
                  style={{ fontFamily: "var(--font-cormorant)", color: "#2E5BB8", opacity: 0.4 }}
                >
                  {item.num}
                </span>
                <div>
                  <h3
                    className="text-lg md:text-xl font-semibold mb-3"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-base leading-[1.9]"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      color: "#1A1A1A",
                      wordBreak: "keep-all",
                    }}
                  >
                    {item.lines.map((line, idx) => (
                      <span key={idx}>
                        {line}
                        {idx < item.lines.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 누구와 함께 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#2E5BB8", color: "#F8F9FC" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#F8F9FC", opacity: 0.6 }}
          >
            03. With
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-12"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F8F9FC" }}
          >
            누구와 함께하는가
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            <div>
              <p
                className="text-sm tracking-[0.25em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "#F8F9FC", opacity: 0.55 }}
              >
                무대를 만드는 사람
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#F8F9FC",
                  opacity: 0.85,
                  wordBreak: "keep-all",
                }}
              >
                대학에서 무대를 올리는 연극·뮤지컬·연기예술 동아리, 학과 공연.
                <br />
                막을 올리는 모든 젊은 예술가가 SYUS의 동료입니다.
              </p>
            </div>
            <div>
              <p
                className="text-sm tracking-[0.25em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "#F8F9FC", opacity: 0.55 }}
              >
                무대를 만나는 사람
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#F8F9FC",
                  opacity: 0.85,
                  wordBreak: "keep-all",
                }}
              >
                젊은 무대의 에너지와 열정을 직접 느껴보고 싶은 관객.
                <br />
                다음 세대 배우의 처음을 곁에서 지켜보고 싶은 사람.
                <br />
                그리고 무대 너머의 사유에 머무르고 싶은 모든 이.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 거부 원칙 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#6B7385" }}
          >
            04. What We Refuse
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8" }}
          >
            우리가 만들지 않는 것
          </h2>
          <p
            className="text-sm leading-relaxed mb-12"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A5A5A" }}
          >
            무엇을 두지 않을지 정하는 일이, 무엇을 둘지 정하는 일만큼 사이트의 결을 만듭니다.
          </p>

          <div className="space-y-10">
            <div
              className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 md:gap-10 items-start pt-8"
              style={{ borderTop: "2px solid #2E5BB8" }}
            >
              <p
                className="text-base md:text-lg font-semibold"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8" }}
              >
                리뷰·한줄평 시스템
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#1A1A1A",
                  wordBreak: "keep-all",
                }}
              >
                대학생 공연자가 익명 비방으로 상처받는 일은 만들지 않습니다.
                <br />
                평가의 자유보다 무대에 선 사람의 첫 마음을 더 소중히 여깁니다.
              </p>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 md:gap-10 items-start pt-8"
              style={{ borderTop: "1px solid #C5CCD9" }}
            >
              <p
                className="text-base md:text-lg font-semibold"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2E5BB8" }}
              >
                랭킹·베스트·서열
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#1A1A1A",
                  wordBreak: "keep-all",
                }}
              >
                TOP 10, 베스트, 명예의 전당 같은 말은 쓰지 않습니다.
                <br />
                ‘이번 달 주목할 만한 공연’ 정도의 부드러운 큐레이션만 두고, 모든 무대를 같은 높이에
                둡니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 미션·비전 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#1A1A1A", color: "#F8F9FC" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#F8F9FC", opacity: 0.55 }}
          >
            05. Mission &amp; Vision
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-16"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F8F9FC" }}
          >
            우리가 가려는 곳
          </h2>

          <div className="space-y-16">
            <div>
              <p
                className="text-xs tracking-[0.3em] uppercase mb-5"
                style={{ fontFamily: "var(--font-cormorant)", color: "#F8F9FC", opacity: 0.5 }}
              >
                Mission · 왜 존재하는가
              </p>
              <p
                className="text-xl md:text-2xl leading-[1.6] font-light"
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  color: "#F8F9FC",
                  wordBreak: "keep-all",
                  textWrap: "balance",
                }}
              >
                배우의 고독한 사유를 모두의 영감으로 연결하고,
                <br />
                정보의 장벽 없이 젊은 예술이 마음껏 흐르게 합니다.
              </p>
            </div>

            <div className="pt-16" style={{ borderTop: "1px solid #2C2C2C" }}>
              <p
                className="text-xs tracking-[0.3em] uppercase mb-5"
                style={{ fontFamily: "var(--font-cormorant)", color: "#F8F9FC", opacity: 0.5 }}
              >
                Vision · 어디로 가고 싶은가
              </p>
              <p
                className="text-xl md:text-2xl leading-[1.6] font-light mb-6"
                style={{
                  fontFamily: "var(--font-noto-serif-kr)",
                  color: "#F8F9FC",
                  wordBreak: "keep-all",
                  textWrap: "balance",
                }}
              >
                모든 젊은 예술가의 처음과 새로움이 발견되고,
                <br />
                경계 없는 사유가 연기 예술의 새로운 지평을 여는 무대.
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#F8F9FC",
                  opacity: 0.7,
                  wordBreak: "keep-all",
                }}
              >
                단순한 홍보 도구를 넘어, 국내 모든 연기 전공자와 신진 예술가가 서로의 가치관을
                공유하고 함께 성장하는 — 이름 그대로의 ‘System of Young Unbound Society’ 생태계가
                되는 것.
                <br />
                그것이 사유유사가 향하는 자리입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "var(--font-inter)", color: "#6B7385" }}
          >
            Stay With Us
          </p>
          <p
            className="text-lg md:text-xl leading-relaxed mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#2E5BB8",
              wordBreak: "keep-all",
              textWrap: "balance",
            }}
          >
            지금 무대를 만들고 계신 분도, 누군가의 무대를 찾고 계신 분도,
            <br />
            모두의 자리가 사유유사 안에 있습니다.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/shows"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#2E5BB8",
                color: "#F8F9FC",
              }}
            >
              공연 보기
            </Link>
            <Link
              href="/auth/signup"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                border: "1px solid #2E5BB8",
                color: "#2E5BB8",
              }}
            >
              회원가입
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#6B7385",
              }}
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
