import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList } from "@/lib/structuredData";

export const metadata: Metadata = {
  title: "소개",
  description:
    "한국 대학 무대예술의 진흥을 향해 — 무대올림은 대학 무대예술 공연을 올리고, 지역 관객이 좌석을 예약하는 플랫폼입니다. 공연팀 게재료 없음. 연극·뮤지컬·무용·국악·음악·전통연희. 운영: 사유유사 SYUS.",
  // 구 경로 /about 은 next.config.ts에서 /muol/about 으로 308 영구 리다이렉트된다.
  // 리다이렉트되는 URL을 canonical로 쓰면 구글이 그 canonical을 무효 처리하므로 현재 경로를 가리킨다. (2026-08-03)
  alternates: { canonical: "https://syus.co.kr/muol/about" },
  openGraph: {
    title: "소개 · 무대올림",
    description:
      "한국 대학 무대예술의 진흥을 향해 — 대학 무대예술 공연을 올리고, 지역 관객이 좌석을 예약하는 플랫폼. 공연팀 게재료 없음. 운영: 사유유사 SYUS.",
    url: "https://syus.co.kr/muol/about",
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
      // 2026-08-03 사실 정정: 장르는 7개(기타 포함)다. "8개"는 무용을 잠깐 둘로 나눴던 구성의 잔재.
      "한국 대학 무대예술의 진흥을 향해. 대학 무대예술 공연 플랫폼. 공연팀 게재료 없음. 연극·뮤지컬·무용·국악·음악·전통연희를 17개 지역에서.",
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
              {/* 2026-08-12 사실 정정: 이 줄이 "연극 · 뮤지컬 · 무용 · 국악"이라
                  아랫줄 "국악 · 음악 · 전통연희"와 국악이 겹쳐 두 번 찍히고 있었다.
                  정본은 lib/constants.ts GENRES — 기타를 뺀 6개를 3개씩 나눠 싣는다. */}
              연극 · 뮤지컬 · 무용
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

      {/* ── 두 문 ── Hero 직후 갈림길 (2026-08-12 사장님 결정)
          소개가 길어졌으므로, 읽는 사람이 자기 자리로 바로 내려갈 수 있게 한다.
          철학 섹션(00~03)을 지우거나 뒤로 미루지는 않는다 — 건너뛸 선택지만 얹는 것이다.
          앵커 대상 섹션에는 scrollMarginTop 6rem을 준다(고정 Nav에 제목이 가리지 않도록,
          faq/page.tsx의 기존 패턴과 동일). */}
      <section className="px-6 md:px-12 lg:px-20 py-16" style={{ backgroundColor: "#F0EEE9" }}>
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            Where To Start
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                href: "#for-audience",
                tag: "관객",
                title: "공연을 보러 오셨나요",
                body: "회원가입부터 좌석 신청, 관람하고 남기는 한 줄까지. 여섯 걸음으로 적어 두었습니다.",
                cue: "관객 안내로 내려가기",
              },
              {
                href: "#for-performer",
                tag: "공연자",
                title: "무대를 올리러 오셨나요",
                body: "공연자 신청부터 사이트에 걸리기까지. 다섯 걸음과 걸리는 시간을 그대로 적어 두었습니다.",
                cue: "공연자 안내로 내려가기",
              },
            ].map((d) => (
              <a
                key={d.href}
                href={d.href}
                className="block p-7 transition-transform duration-150 hover:opacity-85 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]"
                style={{ backgroundColor: "#E6E1D6", borderTop: "3px solid #0B5563" }}
              >
                <p
                  className="text-[0.65rem] tracking-[0.25em] uppercase mb-3"
                  style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
                >
                  {d.tag}
                </p>
                <h3
                  className="text-xl md:text-2xl font-bold mb-3"
                  style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27", wordBreak: "keep-all" }}
                >
                  {d.title}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-5"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
                >
                  {d.body}
                </p>
                <span
                  className="text-xs tracking-wider"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5C2A42", fontWeight: 600 }}
                >
                  {d.cue} ↓
                </span>
              </a>
            ))}
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
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* 2026-08-03 B안: 소제목은 먹빛. 청록은 누르는 것 전담 */ }}
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
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* 2026-08-03 B안: 소제목은 먹빛. 청록은 누르는 것 전담 */ }}
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
                ‘무대’ 한 글자가 연극·뮤지컬·무용·국악·음악·전통연희까지 모두 품습니다.
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
                    // 2026-08-03: opacity 0.85 제거. 투명도가 대비를 깎아
                    // 어두운 청록 위에서 3.02:1까지 떨어졌다(토큰 보정만으로는 부족).
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
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* 2026-08-03 B안: 소제목은 먹빛. 청록은 누르는 것 전담 */ }}
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

      {/* ── 관객에게 ── 일반 회원으로 누릴 수 있는 것 (찜·좋아요·후기·예약)
          2026-08-12 확장: 혜택 카드 4장만으로는 "그래서 나는 뭘 어떤 순서로 하면 되나"에
          답하지 못했다 → 아래에 여섯 걸음 흐름 + 좌석 신청 상세 안내를 덧댄다. */}
      <section
        id="for-audience"
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#F0EEE9", scrollMarginTop: "6rem" }}
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
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* 2026-08-03 B안: 소제목은 먹빛 */, wordBreak: "keep-all" }}
          >
            관객으로,
            <br className="md:hidden" />
            함께하는 법.
          </h2>
          <p
            className="text-base md:text-lg leading-relaxed mb-12 max-w-3xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            회원으로 가입하시면 마음에 든 무대를 모아 두고, 그 공연이 다가오면 미리 알려드리고,
            보고 나온 자리에 짧은 감상을 남기실 수 있습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              /* 2026-08-06 정정 — 되돌리지 말 것.
                 · "찜"과 "좋아요"는 likes 테이블 하나·하트 하나짜리 같은 기능인데
                   카드 두 장으로 나뉘어 혜택이 둘인 것처럼 보였다 → 한 장으로 합쳤다.
                 · "좌석 확보"는 회원 혜택이 아니다. 게스트도 이름·연락처만으로 예약된다
                   (actions/reservations.ts에 auth 검사가 없다). 회원에게만 해당하는 것은
                   "신청번호 없이 마이페이지에서 확인·취소"이므로 그렇게 바꿨다.
                 · 빈 자리에는 실재하는 D-3/D-1 알림(cron: show-reminders, 매일 03:00 KST)을 넣었다. */
              {
                tag: "찜",
                title: "관심 공연 저장",
                body: "마음에 든 무대에 하트를 남겨 두면, 마이페이지에서 한눈에 다시 봅니다. 공연자에게는 관객의 온기가 전해집니다.",
              },
              {
                tag: "알림",
                title: "사흘 전, 하루 전",
                body: "찜해 둔 공연이 다가오면 사흘 전과 하루 전에 메일로 알려드립니다. 잊고 지나치는 무대가 없도록.",
              },
              {
                tag: "한 줄 후기",
                title: "관람의 흔적",
                body: "10~200자, 한 공연당 한 번. 별점과 함께 남깁니다. 다음 관객의 망설임을 덜어줍니다.",
              },
              {
                /* 2026-08-12 사장님 지시로 강조 순서를 뒤집음 — "회원이 아니어도 된다"를 앞세우면
                   가입을 권하는 자리에서 가입을 말리는 문장이 된다. 비회원도 신청할 수 있다는
                   사실 자체는 지우지 않고, 바로 아래 '좌석 신청은 이렇게' 블록에서 더 정확히
                   (받는 정보·받는 이유까지) 밝힌다. */
                tag: "예약",
                title: "지난 예약도 한자리에",
                body: "가입하고 신청하시면 신청번호를 따로 챙기지 않아도 마이페이지에서 확인하고 취소하실 수 있습니다. 지난 관람도 한자리에 남습니다.",
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

          {/* ── 관객 여섯 걸음 ── 2026-08-12 신설.
              카드가 "무엇을 누리는가"라면 이 목록은 "어떤 순서로 하는가"다.
              모든 문장은 실제 구현과 맞춰 쓴다(없는 기능을 약속하지 않는다):
              · 이메일 가입은 인증 절차 없이 즉시 이용 — 2026-07-28 컨펌 절차 폐지
              · 찜(likes) 기준 D-3 / D-1 메일 — api/cron/show-reminders, 매일 03:00 KST
              · 인원수 1~10명 — actions/reservations.ts 검증값
              · 후기 10~200자 · 한 공연당 한 번 */}
          <div className="mt-20">
            <h3
              className="text-xl md:text-2xl font-bold mb-10"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27", wordBreak: "keep-all" }}
            >
              여섯 걸음이면 됩니다
            </h3>

            <div className="space-y-8">
              {[
                {
                  num: "01",
                  title: "회원으로 가입합니다",
                  body: "이메일로 가입하시거나, 카카오·구글 계정으로 바로 시작하실 수 있습니다. 따로 인증 절차를 거치지 않아도 가입한 그 자리에서 이용하실 수 있습니다.",
                },
                {
                  num: "02",
                  title: "우리 동네 무대를 찾습니다",
                  body: "지역 · 시기 · 장르 · 학교로 좁혀 찾습니다. 달력으로 이번 달 무대를 한눈에 보실 수도 있습니다. 전국에서 큰 공연을 고르는 자리가 아니라, 가까운 곳에서 이번 주말을 고르는 자리입니다.",
                },
                {
                  num: "03",
                  title: "마음이 간 무대에 하트를 남깁니다",
                  body: "하트는 두 곳으로 갑니다. 마이페이지에 나만의 목록으로 모이고, 무대를 올린 사람에게는 관객이 기다리고 있다는 신호로 전해집니다.",
                },
                {
                  num: "04",
                  title: "좌석을 신청합니다",
                  body: "관람하실 인원을 한 번에 열 명까지 신청하실 수 있습니다. 신청이 끝나면 신청번호를 드립니다. 자세한 안내는 바로 아래에 적어 두었습니다.",
                },
                {
                  num: "05",
                  title: "공연 전, 잊지 않도록 알려드립니다",
                  body: "하트를 남기신 공연이 다가오면 사흘 전과 하루 전, 두 번 메일로 알려드립니다. 알림이 필요 없으시면 마이페이지에서 언제든 끄실 수 있습니다.",
                },
                {
                  num: "06",
                  title: "보고 나온 자리에 한 줄을 남깁니다",
                  body: "열 자에서 이백 자까지, 한 공연에 한 번. 별점과 함께 남기실 수 있습니다. 길게 쓰실 필요는 없습니다. 그 한 줄이 다음 관객의 망설임을 덜어줍니다.",
                },
              ].map((s) => (
                <div
                  key={s.num}
                  className="grid grid-cols-[44px_1fr] md:grid-cols-[64px_1fr] gap-4 md:gap-8 items-start pt-6"
                  style={{ borderTop: "1px solid #D4CFC1" }}
                >
                  <span
                    className="text-2xl md:text-3xl leading-none"
                    style={{ fontFamily: "var(--font-cormorant)", color: "#0B5563", fontWeight: 600 }}
                  >
                    {s.num}
                  </span>
                  <div>
                    <p
                      className="text-base md:text-lg font-bold mb-2"
                      style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
                    >
                      {s.title}
                    </p>
                    <p
                      className="text-sm md:text-base leading-[1.9]"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                    >
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 좌석 신청 상세 ── 2026-08-12 사장님 지시로 신설.
              방침: "회원가입 후 이용을 권장하되, 비회원이면 공연팀에게 필요한 관객 정보
              (성함·전화번호·관람 인원수)를 반드시 받는다."
              실제 폼(components/SeatReservationForm.tsx)이 이미 이름·연락처·인원수를 필수로
              받고 개인정보 제공 동의까지 받고 있으므로, 여기서는 그 사실과 이유를 설명한다.
              폼 문구를 바꾸게 되면 이 섹션도 같이 손볼 것. */}
          <div
            className="mt-16 p-7 md:p-10"
            style={{ backgroundColor: "#E6E1D6", borderLeft: "4px solid #5C2A42" }}
          >
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
            >
              좌석 신청은 이렇게
            </p>
            <h3
              className="text-xl md:text-2xl font-bold mb-6"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27", wordBreak: "keep-all" }}
            >
              티켓을 사는 자리가 아니라,
              <br className="md:hidden" />
              자리를 미리 잡아두는 자리입니다.
            </h3>
            <p
              className="text-sm md:text-base leading-[1.9] mb-8"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
            >
              무대올림에는 결제 절차가 없습니다. 좌석 신청은 &ldquo;그날 가겠습니다&rdquo;라고 미리
              알려 두는 일이고, 공연팀은 그 명단을 보고 객석을 준비합니다.
            </p>

            <div className="space-y-6">
              {[
                {
                  q: "회원으로 신청하시길 권합니다",
                  a: "가입하고 신청하시면 신청번호를 따로 적어 두지 않아도 됩니다. 마이페이지에서 신청한 공연을 모아 보고, 사정이 생기면 그 자리에서 취소하실 수 있습니다. 공연 전 알림도 회원에게만 갑니다.",
                },
                {
                  q: "가입 없이도 신청하실 수 있습니다. 다만",
                  a: "성함, 연락처(전화번호 또는 이메일), 관람 인원수를 받습니다. 이 세 가지는 신청을 받은 공연팀에게 전달되어 현장에서 명단을 확인하고 입장을 안내하는 데 쓰입니다. 그래서 신청하실 때 이 내용을 알려드리고 동의를 한 번 받습니다.",
                },
                {
                  q: "신청하고 나면",
                  a: "신청번호를 드립니다. 이메일로 신청하셨다면 확인 메일도 함께 보내드립니다. 가입하지 않고 신청하신 경우, 이 번호와 연락처가 본인 확인 열쇠가 되므로 잊지 말고 챙겨주세요.",
                },
                {
                  q: "자리가 이미 찼다면",
                  a: "대기로 접수해 드립니다. 앞서 신청한 분이 취소하면 순번대로 자동 확정되고, 이메일로 신청하신 분께는 확정 안내가 갑니다.",
                },
                {
                  q: "못 가시게 되었다면",
                  a: "공연 시작 전까지 언제든 취소하실 수 있습니다. 비워주신 자리는 기다리던 다음 분께 곧바로 넘어갑니다. 취소는 미안한 일이 아니라, 다음 사람을 위한 일입니다.",
                },
              ].map((r) => (
                <div key={r.q} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2 md:gap-8">
                  <p
                    className="text-sm font-bold"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563", wordBreak: "keep-all" }}
                  >
                    {r.q}
                  </p>
                  <p
                    className="text-sm leading-[1.9]"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
                  >
                    {r.a}
                  </p>
                </div>
              ))}
            </div>
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

      {/* ── 공연자에게 ── 학생 공연자 입장에서 본 무대올림 (사장님 보완 요청)
          2026-08-12 확장: "왜 좋은가" 3장 뒤에 "어떤 순서로, 얼마나 걸리는가"를 덧댄다.
          그동안 이 절차는 FAQ(performer-1)에만 있어서 소개 페이지만 읽은 사람은
          공연자 신청이라는 관문이 있다는 사실조차 모르고 지나갔다. */}
      <section
        id="for-performer"
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#E6E1D6", scrollMarginTop: "6rem" }}
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
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* 2026-08-03 B안: 소제목은 먹빛 */, wordBreak: "keep-all" }}
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

          {/* ── 공연자 다섯 걸음 ── 2026-08-12 신설.
              소요일(영업일 1~3일)은 FAQ performer-1·performer-4와 같은 값으로 맞춰둔 것이다.
              운영 기준이 바뀌면 여기와 lib/faqs.ts를 함께 고칠 것.
              단계 04의 항목은 muol/performer 등록 폼의 실제 필드에서 가져왔다. */}
          <div className="mt-20">
            <h3
              className="text-xl md:text-2xl font-bold mb-3"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27", wordBreak: "keep-all" }}
            >
              무대를 올리기까지, 다섯 걸음
            </h3>
            <p
              className="text-sm md:text-base leading-relaxed mb-10 max-w-3xl"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
            >
              공연자 자격은 신청하고 확인을 거쳐 드립니다. 한 번 받으시면 그 뒤로는 공연을 몇 번
              올리시든 다시 신청하지 않으셔도 됩니다.
            </p>

            <div className="space-y-8">
              {[
                {
                  num: "01",
                  title: "회원으로 가입합니다",
                  body: "먼저 일반 회원으로 가입해주세요. 이메일이나 카카오·구글 계정이면 됩니다.",
                  meta: "바로",
                },
                {
                  num: "02",
                  title: "마이페이지에서 공연자 신청을 누릅니다",
                  body: "마이페이지의 ‘공연자 신청’ 탭에 버튼이 하나 있습니다. 학과·동아리·극단 어느 이름으로 활동하시든 같은 자리에서 신청하십니다.",
                  meta: "1분",
                },
                {
                  num: "03",
                  title: "운영자가 확인합니다",
                  body: "소속과 활동을 확인한 뒤 공연자 자격을 드립니다. 승인되면 안내 메일이 갑니다. 진행 상황은 마이페이지에서 바로 보실 수 있습니다.",
                  meta: "영업일 1~3일",
                },
                {
                  num: "04",
                  title: "공연을 등록합니다",
                  body: "공연 제목과 포스터, 일정과 회차, 장소, 장르, 그리고 교내·외부·워크샵 중 어느 무대인지를 적습니다. 좌석 신청을 무대올림에서 받으실지도 이때 정하십니다. 미리 챙겨두시면 좋은 것은 포스터 이미지와 확정된 일정, 그리고 객석 규모입니다.",
                  meta: "10~20분",
                },
                {
                  num: "05",
                  title: "확인을 거쳐 사이트에 걸립니다",
                  body: "올려주신 내용을 운영자가 한 번 더 살펴본 뒤 게재합니다. 등록에도 게재에도 비용은 없습니다. 나중에 내용을 고치시면 다시 한 번 확인을 거치며, 그동안은 잠시 내려갑니다.",
                  meta: "영업일 1~3일",
                },
              ].map((s) => (
                <div
                  key={s.num}
                  className="grid grid-cols-[44px_1fr] md:grid-cols-[64px_1fr] gap-4 md:gap-8 items-start pt-6"
                  style={{ borderTop: "1px solid #D4CFC1" }}
                >
                  <span
                    className="text-2xl md:text-3xl leading-none"
                    style={{ fontFamily: "var(--font-cormorant)", color: "#0B5563", fontWeight: 600 }}
                  >
                    {s.num}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                      <p
                        className="text-base md:text-lg font-bold"
                        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
                      >
                        {s.title}
                      </p>
                      <span
                        className="text-[0.7rem] px-2 py-0.5"
                        style={{
                          fontFamily: "var(--font-noto-sans-kr)",
                          backgroundColor: "#F0EEE9",
                          color: "#0B5563",
                          border: "1px solid #D4CFC1",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.meta}
                      </span>
                    </div>
                    <p
                      className="text-sm md:text-base leading-[1.9]"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
                    >
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p
              className="mt-10 text-sm leading-[1.9]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}
            >
              신청이 반려되더라도 끝이 아닙니다. 내용을 고쳐 다시 신청하실 수 있고, 이유가
              궁금하시면{" "}
              <Link href="/muol/contact" className="underline" style={{ color: "#0B5563", fontWeight: 600 }}>
                문의
              </Link>
              해주시면 확인해서 알려드립니다.
            </p>
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
                style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)" /* 2026-08-03: opacity 0.85 제거 — 투명도가 대비를 깎아 어두운 배경 위 3.02:1이었다 */ }}
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
                대학에서 무대를 올리는 연극·뮤지컬·무용·국악·음악·전통연희 동아리, 학과, 졸업 워크샵.
                <br />
                막을 올리는 모든 젊은 예술가가 무대올림의 동료입니다.
              </p>
            </div>
            <div>
              <p
                className="text-sm tracking-[0.25em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)" /* 2026-08-03: opacity 0.85 제거 — 투명도가 대비를 깎아 어두운 배경 위 3.02:1이었다 */ }}
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
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" /* 2026-08-03 B안: 소제목은 먹빛. 청록은 누르는 것 전담 */ }}
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
              유사(流沙)를 나란히 놓았습니다.
            </p>
            <p
              className="text-sm leading-relaxed italic"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#5A4A3E",
                wordBreak: "keep-all",
              }}
            >
              사유유사 — 두루 생각하여, 이를 무대 위에서 흘려보냅니다.
              <br />
              젊은 무대 위에 쌓이는 사고의 결, 그것을 ‘무대올림’이라는 이름으로 풉니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── 06. 만든 사람의 말 ── 2026-08-12 신설.
          ★ 이 섹션은 사장님이 직접 다듬으실 1인칭 초안이다(2026-08-12 결정: 초안은 내가,
            문장은 사장님이). 브랜드 화자("무대올림은")가 아니라 사람의 목소리("저는")로
            쓰는 유일한 자리이므로, 다른 섹션 톤에 맞춘다고 3인칭으로 되돌리지 말 것.
          사실 근거: "대학 공연들이 티켓 예매 링크를 만들지 않아 홍보 효과가 미비하다"는
            사장님 문제의식 + 사유유사 이름의 연기 서적 유래(05 섹션과 이어짐). */}
      <section className="px-6 md:px-12 lg:px-20 py-24" style={{ backgroundColor: "#F0EEE9" }}>
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            06. A Note From the Maker
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-12"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27" }}
          >
            만든 사람의 말
          </h2>

          <div
            className="text-base md:text-lg leading-[2.1] space-y-6"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            <p>
              공연 포스터를 보고 검색해본 적이 있습니다. 무언가 나오기는 했습니다. 다만 늘 거기까지
              였습니다. 날짜 한 줄, 사진 한 장. 그마저도 여기저기 흩어져 있어, 결국 그 무대에
              가까이 가보지는 못했습니다.
            </p>
            <p>
              대학의 무대를 한데 모아둔 자리가 있으면 좋겠다고 생각했습니다. 찾아보았지만
              없었습니다.
            </p>
            <p>
              아쉬움은 제 것만이 아니었습니다. 대학의 무대라 해도, 프로 무대와 나란히 놓아 부끄럽지
              않을 사람과 단체가 어딘가에는 분명히 있습니다. 다만 그들이 거기 있다는 사실을 알 방법이
              너무 적었습니다. 그래서 아쉬움이 더 짙었습니다.
            </p>
            {/* 2026-08-12 사장님 직접 수정: "~라고. ~라고." 반복이 오글거린다는 평가로
                한 문장으로 합침. 문장은 사장님이 주신 그대로다 — 임의로 경어체로
                되돌리지 말 것(단정형 종결이 결론을 각인시키는 자리다). */}
            <p>
              그러다 이렇게 정리하게 되었습니다. 무대가 부족한 것이 아니라, 무대와 가까워질 수
              있는 공간이 부족했던 것이다.
            </p>
            <p>
              그래서 무대올림이 하는 일은 대단하지 않습니다. 흩어진 것을 한자리에 모으고, 가까이 사는
              사람에게 조용히 알리고, 막이 내린 뒤에도 지우지 않고 남겨두는 것. 그게 전부입니다.
            </p>
            <p>
              그 정도의 작은 통로면 충분하다고 생각합니다. 무대의 주인공은 언제나 그 위에 선
              사람들이지, 이 사이트가 아니니까요.
            </p>
          </div>

          {/* 서명 — 2026-08-12 사장님 지시로 실명 제외. 다시 넣지 말 것. */}
          <p
            className="mt-12 pt-6 text-sm"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#5A4A3E",
              borderTop: "1px solid #D4CFC1",
            }}
          >
            무대올림을 만들고 운영합니다 — 사유유사 SYUS
          </p>
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
