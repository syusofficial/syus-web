import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList } from "@/lib/structuredData";

export const metadata: Metadata = {
  title: "소개",
  description:
    "한국 대학 무대예술의 진흥을 향해 — 무대올림은 대학 무대예술 공연을 올리고, 지역 관객이 좌석을 예약하는 플랫폼입니다. 공연팀 게재료 없음. 연극·뮤지컬·순수무용·실용무용·국악·음악·전통연희. 운영: 사유유사 SYUS.",
  alternates: { canonical: "https://syus.co.kr/about" },
  openGraph: {
    title: "소개 · 무대올림",
    description:
      "한국 대학 무대예술의 진흥을 향해 — 대학 무대예술 공연을 올리고, 지역 관객이 좌석을 예약하는 플랫폼. 공연팀 게재료 없음. 운영: 사유유사 SYUS.",
    url: "https://syus.co.kr/about",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "무대올림 — 흩어진 무대를, 같은 흐름 위에.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "소개 · 무대올림",
    description:
      "한국 대학 무대예술의 진흥을 향해. 대학 무대예술 공연 플랫폼. 공연팀 게재료 없음. 16개 지역·8개 장르의 학생 공연을 한 곳에서.",
    images: ["/og-default.png"],
  },
};

export default function AboutPage() {
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "소개" },
  ]);

  return (
    <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* ── Hero ── 그라데이션+그레인 (사장님 요청 시각 효과) */}
      <section
        className="px-6 md:px-12 lg:px-20 pt-16 md:pt-20 pb-24 md:pb-32 relative overflow-hidden grad-grain grad-mineral-radial"
        style={{ color: "#F0EEE9" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.4em] uppercase mb-10"
            style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", fontWeight: 600 }}
          >
            About 무대올림
          </p>
          {/* 2026-06-15 사장님 직접 수정: "무대올림" 브랜드 각인 + 부제 (촌스럽다는 평가로 폐기) */}
          <h1
            className="leading-[0.95] font-black tracking-tighter mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(4.4rem, 11vw, 9.5rem)",
              color: "#F0EEE9",
              wordBreak: "keep-all",
              textWrap: "balance",
              letterSpacing: "-0.04em",
            }}
          >
            {/* "올림" 두 글자에만 Damson 라이트 틴트 강조 — 메모리 §1 강조 한 글자 예외 범위
                (2026-07-14 정정: 예전 주석이 "페일 라임"이라 적혀 있었으나 실제 값은 로즈빛 Damson 계열이라
                globals.css에 --color-damson-light로 정식 등록. 값은 그대로, 이름표만 바로잡음) */}
            무대<span style={{ color: "var(--color-damson-light)" }}>올림</span>
          </h1>
          <p
            className="leading-relaxed max-w-2xl"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              fontSize: "clamp(1.05rem, 1.8vw, 1.35rem)",
              color: "#F0EEE9",
              opacity: 0.9,
              wordBreak: "keep-all",
              fontWeight: 300,
            }}
          >
            {/* 사장님 지시 띄어쓰기 그대로: "대학 무대예술", "관람할 수 있도록", "이끌어 드립니다" */}
            우리는 대학 무대예술 공연을 올리고,
            <br />
            관객이 편하게 방문하여 공연을 더욱 원활히 관람할 수 있도록 이끌어 드립니다.
          </p>

          <div
            className="mt-14 pt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2"
            style={{ borderTop: "1px solid rgba(248, 249, 252, 0.25)" }}
          >
            <span
              className="text-sm tracking-[0.15em]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F0EEE9", opacity: 0.75 }}
            >
              연극 · 뮤지컬 · 순수무용 · 실용무용 · 국악
            </span>
            <span
              className="text-sm tracking-[0.15em]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F0EEE9", opacity: 0.75 }}
            >
              국악 · 음악 · 전통연희
            </span>
          </div>
        </div>
      </section>

      {/* ── 00. 미션 ──
          2026-07-24 사장님 확정: "한국 대학 무대예술의 진흥"이 무대올림의 핵심 기조(왜 하는가).
          기존 "대학 공연을 올리고 좌석을 예약하는 플랫폼"이라는 기능 정체성 위에 얹는 문장 — 대체 아님.
          섹션 넘버링은 01부터 시작하던 기존 관례를 존중해 00으로 그 앞에 붙인다(나머지 번호 변경 없음). */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            00. Our Mission
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-8"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
          >
            우리가 존재하는 이유
          </h2>
          <p
            className="text-[1.4rem] sm:text-[1.7rem] md:text-[2.1rem] leading-snug font-light mb-8"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#4A3B33",
              wordBreak: "keep-all",
              textWrap: "balance",
            }}
          >
            한국 대학 무대예술의 <span style={{ color: "#5C2A42" }}>진흥</span>.
          </p>
          <p
            className="text-base leading-[1.9] max-w-3xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            무대올림은 이 한 문장을 향해 존재합니다. 흩어진 대학의 무대를 기록하고, 예술가와 관객을
            잇고, 조용히 알려 — 한국 대학 무대예술이 잊히지 않고 자라나도록 돕습니다.
          </p>
        </div>
      </section>

      {/* ── 01. 이름의 의미 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            01. The Name
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-12"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
          >
            이름의 의미
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-10 items-start">
            <p
              className="text-sm tracking-[0.2em]"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
            >
              무대올림
            </p>
            <div
              className="text-base leading-[1.9]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
            >
              <p className="mb-3">
                <strong style={{ color: "#0B5563" }}>“무대를 올린다”</strong> — 공연계에서 무대가
                열린다는 바로 그 말.
              </p>
              <p className="mb-3">
                줄임말이 아니라 그 자체로 완결된 표현이라, 처음 듣는 사람도 어떤 공간인지 단번에
                압니다.
              </p>
              <p className="mb-3">
                ‘무대’ 한 글자가 연극·뮤지컬·순수무용·실용무용·국악·음악·전통연희까지 모두 품습니다.
              </p>
              <p
                className="pt-3 italic"
                style={{ borderTop: "1px solid #D4CFC1", color: "#5A4A3E" }}
              >
                공연자에게는 “내 무대가 올라간다.”
                <br />
                관객에게는 “오늘 무대가 올라간다 — 볼 게 생긴다.”
                <br />
                양쪽이 같은 말을 다르게 듣는 자리.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 02. 무엇을 하는가 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#0B5563", color: "#F0EEE9" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", fontWeight: 600 }}
          >
            02. What We Do
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-14"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F0EEE9" }}
          >
            세 가지 동사
          </h2>

          <div className="space-y-12">
            {[
              {
                num: "01",
                title: "올린다",
                body: [
                  "학생 공연자가 무대를 등록하면,",
                  "운영자가 한 번 더 정성스레 다듬어 공연 페이지로 올립니다.",
                  "자동화는 정보 전달까지. 마무리 손은 사람이 잡습니다.",
                ],
              },
              {
                num: "02",
                title: "발견한다",
                body: [
                  "지역 × 시기 × 장르 — 세 축으로 좁혀 찾습니다.",
                  "‘이번 주말 우리 동네 대학에서 뭐 하지’에 답하는 자리.",
                  "전국·상업·대형 중심의 기존 플랫폼이 비운 자리.",
                ],
              },
              {
                num: "03",
                title: "예약한다",
                body: [
                  "무대올림은 티켓을 파는 자리가 아니라, 좌석을 미리 잡아두는 자리입니다.",
                  "공연팀(공연자·학과)에게 등록·게재 수수료를 받지 않으며, 광고·구독·제휴로 운영됩니다.",
                  "운영은 후원자와 광고주의 도움으로 이어집니다.",
                ],
              },
            ].map((item) => (
              <div
                key={item.num}
                className="grid grid-cols-[56px_1fr] gap-6 md:gap-10 items-start pt-8"
                style={{ borderTop: "1px solid rgba(248, 249, 252, 0.2)" }}
              >
                <span
                  className="text-3xl md:text-4xl leading-none"
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    color: "var(--color-damson-light)",
                    opacity: 0.85,
                  }}
                >
                  {item.num}
                </span>
                <div>
                  <h3
                    className="text-xl md:text-2xl font-semibold mb-4"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F0EEE9" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-base leading-[1.9]"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      color: "#F0EEE9",
                      opacity: 0.85,
                      wordBreak: "keep-all",
                    }}
                  >
                    {item.body.map((line, idx) => (
                      <span key={idx}>
                        {line}
                        {idx < item.body.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03. 어떻게 다른가 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            03. What Makes Us Different
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-6"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
          >
            우리만의 자리
          </h2>
          <p
            className="text-base leading-relaxed mb-14 max-w-3xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
          >
            큰 플랫폼들이 전국·대형·상업 공연 중심으로 운영하는 동안, 대학 무대는 매번 첫 회를 끝으로
            잊혀집니다. 무대올림은 그 자리를 정확히 들어갑니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                tag: "지역",
                title: "이번 주말, 우리 동네",
                body: "전국 검색이 아니라 지역 축. 경기 남부 주민이 경기 남부 대학 무대를 본다.",
              },
              {
                tag: "게재료 없음",
                title: "공연팀 게재료 없음",
                body: "공연자·학과에게 등록·게재 수수료를 받지 않습니다. 광고·구독·제휴로 이어갑니다.",
              },
              {
                tag: "기록",
                title: "학생의 포트폴리오",
                body: "출연·연출·제작 크레딧이 그대로 남아 다음 무대로 가는 다리가 됩니다.",
              },
            ].map((c) => (
              <div
                key={c.tag}
                className="p-6"
                style={{ backgroundColor: "#E6E1D6", borderTop: "3px solid #5C2A42" }}
              >
                <p
                  className="text-xs tracking-[0.25em] uppercase mb-3"
                  style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
                >
                  {c.tag}
                </p>
                <h3
                  className="text-lg font-semibold mb-3"
                  style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33" }}
                >
                  {c.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    color: "#4A3B33",
                    opacity: 0.75,
                    wordBreak: "keep-all",
                  }}
                >
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 관객에게 ── 일반 회원으로 누릴 수 있는 것 (찜·좋아요·후기·예약) */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#F0EEE9" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            For Audiences
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563", wordBreak: "keep-all" }}
          >
            관객으로,
            <br className="md:hidden" />
            함께하는 법.
          </h2>
          <p
            className="text-base md:text-lg leading-relaxed mb-12 max-w-3xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            회원으로 가입하시면 마음에 든 무대를 모아 두고, 짧은 감상을 남기고,
            다음 회차가 열릴 때 알림을 받을 수 있습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                tag: "찜",
                title: "관심 공연 저장",
                body: "마음에 든 무대를 찜해 두고, 마이페이지에서 한눈에 다시 봅니다.",
              },
              {
                tag: "좋아요",
                title: "응원 한 번",
                body: "한 번의 좋아요로 공연자에게 관객의 온기가 전달됩니다.",
              },
              {
                tag: "한 줄 후기",
                title: "관람의 흔적",
                body: "10~200자, 한 공연당 한 번. 다음 관객의 망설임을 덜어줍니다.",
              },
              {
                tag: "예약",
                title: "좌석 확보",
                body: "간편한 클릭으로 좌석을 미리 잡아둡니다. 무대올림은 공연팀에게 게재 수수료를 받지 않습니다.",
              },
            ].map((b) => (
              <div
                key={b.tag}
                className="p-5"
                style={{ backgroundColor: "#E6E1D6", borderTop: "3px solid #0B5563" }}
              >
                <p
                  className="text-[0.65rem] tracking-[0.25em] uppercase mb-3"
                  style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
                >
                  {b.tag}
                </p>
                <h3
                  className="text-base font-bold mb-2"
                  style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33" }}
                >
                  {b.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                >
                  {b.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/auth/signup"
              className="inline-block px-8 py-4 text-sm tracking-wider transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#0B5563",
                color: "#F0EEE9",
                fontWeight: 600,
              }}
            >
              회원으로 가입하기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 공연자에게 ── 학생 공연자 입장에서 본 무대올림 (사장님 보완 요청) */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#E6E1D6" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
          >
            For Performers
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563", wordBreak: "keep-all" }}
          >
            공연자에게,
            <br className="md:hidden" />
            왜 무대올림인가.
          </h2>
          <p
            className="text-base md:text-lg leading-relaxed mb-12 max-w-3xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            대학에서 올린 한 번의 무대는 보통 그 주말에 흘러가버립니다.
            무대올림은 그 무대를 기록하고, 가까운 관객에게 알리고, 다음 무대로 이어지는 다리를 놓습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                num: "01",
                tag: "노출",
                title: "지역 관객에게 직접",
                body: "전국 검색이 아니라 지역 큐레이션. 우리 학교 무대를 우리 지역 관객이 먼저 봅니다.",
              },
              {
                num: "02",
                tag: "아카이브",
                title: "흘러간 무대도 남는다",
                body: "공연이 끝나도 페이지는 살아 있습니다. 출연·연출·제작 크레딧이 그대로, 다음 오디션·진학 포트폴리오로.",
              },
              {
                num: "03",
                tag: "신뢰",
                title: "공연팀 게재료 없음, 사후 정산 없음",
                body: "공연팀에게 등록·게재 수수료를 받지 않습니다. 관객 결제도 없습니다. 무대만 올리시면 됩니다.",
              },
            ].map((p) => (
              <div
                key={p.num}
                className="p-6"
                style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1" }}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <span
                    className="text-2xl font-bold"
                    style={{ fontFamily: "var(--font-inter)", color: "#0B5563" }}
                  >
                    {p.num}
                  </span>
                  <span
                    className="text-[0.65rem] tracking-[0.25em] uppercase px-2 py-0.5"
                    style={{
                      fontFamily: "var(--font-inter)",
                      backgroundColor: "#0B5563",
                      color: "#F0EEE9",
                      fontWeight: 600,
                    }}
                  >
                    {p.tag}
                  </span>
                </div>
                <p
                  className="text-base font-bold mb-2"
                  style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33" }}
                >
                  {p.title}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                >
                  {p.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/muol/performer"
              className="inline-block px-8 py-4 text-sm tracking-wider transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#0B5563",
                color: "#F0EEE9",
                fontWeight: 600,
              }}
            >
              공연자로 무대 올리기 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 04. 누구와 함께 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#4A3B33", color: "#F0EEE9" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", fontWeight: 600 }}
          >
            04. With
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-14"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F0EEE9" }}
          >
            누구와 함께하는가
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
            <div>
              <p
                className="text-sm tracking-[0.25em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", opacity: 0.85 }}
              >
                무대를 만드는 사람
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#F0EEE9",
                  opacity: 0.85,
                  wordBreak: "keep-all",
                }}
              >
                대학에서 무대를 올리는 연극·뮤지컬·순수무용·실용무용·국악·음악·전통연희 동아리, 학과, 졸업 워크샵.
                <br />
                막을 올리는 모든 젊은 예술가가 무대올림의 동료입니다.
              </p>
            </div>
            <div>
              <p
                className="text-sm tracking-[0.25em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", opacity: 0.85 }}
              >
                무대를 만나는 사람
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#F0EEE9",
                  opacity: 0.85,
                  wordBreak: "keep-all",
                }}
              >
                젊은 무대의 에너지와 열정을 직접 느껴보고 싶은 관객.
                <br />
                주말 문화생활을 가까운 곳에서 찾고 싶은 지역민.
                <br />
                다음 세대 배우의 처음을 지켜보고 싶은 모든 이.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 05. 운영 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            05. Who Runs This
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-10"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
          >
            운영
          </h2>

          <div
            className="p-8 md:p-10"
            style={{ backgroundColor: "#E6E1D6", borderLeft: "4px solid #0B5563" }}
          >
            <p
              className="text-sm tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
            >
              사유유사 SYUS
            </p>
            <p
              className="text-base leading-[1.9] mb-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
            >
              무대올림은 <strong>사유유사(思惟流沙 · System of Young Unbound Society, SYUS)</strong>
              라는 개인사업자가 운영합니다.
              <br />
              사업자등록·계약·법무의 얼굴은 사유유사이고, 관객·공연자와 만나는 서비스의 얼굴은
              무대올림입니다.
            </p>
            <p
              className="text-base leading-[1.9] mb-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
            >
              연기 서적에서 자주 만난 단어 ‘사유’를 뒤집어 ‘유사’라 다시 부른, 대칭의 이름입니다.
              대상을 두루 생각하는 일을 뜻하는 사유(思惟)와, 바람과 물에 흘러내리는 모래를 뜻하는
              유사(流沙)를 나란히 놓아 — 두루 생각한 것을 무대 위에서 가볍게 흘려보낸다는 정체성을
              담았습니다.
            </p>
            <p
              className="text-sm leading-relaxed italic"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#5A4A3E",
                wordBreak: "keep-all",
              }}
            >
              사유유사 — 깊게 머물고, 가볍게 흐르며 젊은 무대 위에 쌓이는 사고의 결.
              <br />
              그 결을 ‘무대올림’이라는 이름으로 풉니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ──
          색 분리: Footer(Silhouette)와 같은 톤 묶임 방지 → CTA는 Teal 베이스로 전환. */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ background: "linear-gradient(180deg, #2C7384 0%, #0B5563 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", fontWeight: 600 }}
          >
            Stay With Us
          </p>
          <p
            className="text-xl md:text-2xl leading-relaxed mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#F0EEE9",
              wordBreak: "keep-all",
              textWrap: "balance",
            }}
          >
            당신의 무대를, 누군가의 주말로.
            <br />
            <span style={{ opacity: 0.65, fontSize: "0.85em" }}>
              누군가의 주말을, 당신의 무대로.
            </span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/muol/shows"
              className="px-8 py-3 text-sm tracking-wider transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#5C2A42",
                color: "#F0EEE9",
                fontWeight: 600,
              }}
            >
              공연 보기
            </Link>
            <Link
              href="/auth/signup"
              className="px-8 py-3 text-sm tracking-wider transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                border: "1px solid rgba(248, 249, 252, 0.45)",
                color: "#F0EEE9",
              }}
            >
              무대 올리기
            </Link>
            <Link
              href="/muol/contact"
              className="px-8 py-3 text-sm tracking-wider transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "rgba(248,249,252,0.7)" }}
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
