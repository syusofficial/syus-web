import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList } from "@/lib/structuredData";

export const metadata: Metadata = {
  title: "광고주를 위한 안내 · 무대올림",
  description:
    "대학 무대예술 공연자와 지역 관객이 모이는 무대올림에 광고를 게재해보세요. 공연·문화 인접 브랜드를 위한 광고 안내 페이지입니다. 운영: 사유유사 SYUS.",
  openGraph: {
    title: "광고주를 위한 안내 · 무대올림",
    description: "공연·문화 인접 브랜드를 위한 광고 안내. 1:1 견적 문의 환영합니다.",
  },
};

const MAILTO =
  "mailto:syusflux@gmail.com?subject=%5BSYUS%20%EA%B4%91%EA%B3%A0%20%EB%AC%B8%EC%9D%98%5D%201%3A1%20%EA%B2%AC%EC%A0%81%20%EC%9A%94%EC%B2%AD&body=%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94.%20SYUS%20%EA%B4%91%EA%B3%A0%20%EA%B2%AC%EC%A0%81%EC%9D%84%20%EB%AC%B8%EC%9D%98%EB%93%9C%EB%A6%BD%EB%8B%88%EB%8B%A4.%0A%0A%E2%96%A0%20%ED%9A%8C%EC%82%AC%2F%EB%B8%8C%EB%9E%9C%EB%93%9C%3A%20%0A%E2%96%A0%20%EA%B4%91%EA%B3%A0%20%EB%AA%A9%EC%A0%81%3A%20%0A%E2%96%A0%20%ED%9D%AC%EB%A7%9D%20%EC%83%81%ED%92%88%2F%EC%9C%84%EC%B9%98%3A%20%0A%E2%96%A0%20%ED%9D%AC%EB%A7%9D%20%EA%B2%8C%EC%9E%AC%20%EA%B8%B0%EA%B0%84%3A%20%0A%E2%96%A0%20%EC%98%88%EC%82%B0%20%EB%B2%94%EC%9C%84(%EC%84%A0%ED%83%9D)%3A%20%0A%E2%96%A0%20%EB%8B%B4%EB%8B%B9%EC%9E%90%2F%EC%97%B0%EB%9D%BD%EC%B2%98%3A%20";

export default function ForBusinessPage() {
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "광고주 안내" },
  ]);

  return (
    <div className="pt-24 min-h-screen" style={{ backgroundColor: "#FBF8F1" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* ── Hero ── */}
      <section
        className="px-6 md:px-12 lg:px-20 pt-16 md:pt-20 pb-24 md:pb-32 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top left, #5C7C8E 0%, #3B5A6B 35%, #202833 100%)",
          color: "#FBF8F1",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.4em] uppercase mb-10"
            style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
          >
            For Business
          </p>
          <h1
            className="text-[2.6rem] sm:text-[3.4rem] md:text-[4.4rem] leading-[1.1] font-black tracking-tighter mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#FBF8F1",
              wordBreak: "keep-all",
              textWrap: "balance",
            }}
          >
            공연 옆에서,
            <br />
            조용히 닿는
            <br />
            <span style={{ color: "#C8D96F" }}>광고</span>를 제안합니다.
          </h1>
          <p
            className="text-lg md:text-xl leading-relaxed max-w-2xl"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#FBF8F1",
              opacity: 0.9,
              wordBreak: "keep-all",
            }}
          >
            대학 무대예술 공연자와 지역 관객이 모이는 곳.
            <br />
            공연·문화 인접 브랜드와 자연스럽게 만나는 자리를 만듭니다.
          </p>

          <div className="mt-14 flex flex-wrap items-center gap-4">
            <a
              href={MAILTO}
              className="px-7 py-3.5 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#C8D96F",
                color: "#202833",
                fontWeight: 600,
              }}
            >
              1:1 견적 문의 →
            </a>
            <Link
              href="/about"
              className="px-7 py-3.5 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#FBF8F1",
                border: "1px solid rgba(248, 249, 252, 0.5)",
              }}
            >
              무대올림이 어떤 곳인가요
            </Link>
          </div>
        </div>
      </section>

      {/* ── 1. 누구에게 닿는가 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="01" label="Audience" />
          <h2
            className="text-3xl md:text-4xl font-bold mb-8 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B", wordBreak: "keep-all" }}
          >
            무대 옆에 머무는 사람들에게 닿습니다.
          </h2>
          <p
            className="text-base md:text-lg leading-relaxed mb-10 max-w-3xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A", wordBreak: "keep-all" }}
          >
            무대올림의 사용자는 단순한 트래픽이 아닙니다.
            공연을 직접 올리는 학생 공연자, 그리고 그 공연을 보러 가는 가까운 관객들.
            공연이라는 강한 관심사 위에 모여 있는 사람들입니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AudienceCard
              title="대학 공연자"
              desc="연극·뮤지컬·무용·발레·국악·음악·전통연희 등 한국 대학의 무대예술 학생 공연자. 18~26세 중심."
            />
            <AudienceCard
              title="공연 관객"
              desc="대학로·근방 문화권 관객. 2030 여성 비중이 높고, 공연·전시·서점·카페에 관심이 높음."
            />
            <AudienceCard
              title="진학 지망생"
              desc="연기·연출·뮤지컬·무용 진학을 준비하는 고등학생·학부모. 학원·교습 콘텐츠에 적극 반응."
            />
            <AudienceCard
              title="공연 인접 종사자"
              desc="기획자·평론가·소극장 운영자·음향·조명 등 공연 생태계 내 의사결정자."
            />
          </div>
        </div>
      </section>

      {/* ── 2. 왜 무대올림인가 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28" style={{ backgroundColor: "#F0EBE0" }}>
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="02" label="Why" />
          <h2
            className="text-3xl md:text-4xl font-bold mb-10 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B", wordBreak: "keep-all" }}
          >
            소음 없는 미디어,
            <br className="md:hidden" />
            정확한 맥락 매칭.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ReasonCard
              n="01"
              t="공연 맥락 위 노출"
              d="공연을 검색·예약하는 동선 위에서 자연스럽게 노출됩니다. 무관한 광고에 끼이지 않습니다."
            />
            <ReasonCard
              n="02"
              t="조용한 톤 유지"
              d="자극적 카피·과장 표현을 사양합니다. 무대올림의 차분한 톤 위에 광고도 함께 머뭅니다."
            />
            <ReasonCard
              n="03"
              t="장기 노출 가능"
              d="아카이브·공연자 프로필 등 시간이 지나도 살아 있는 페이지에 장기 게재 가능."
            />
          </div>
        </div>
      </section>

      {/* ── 3. 광고 위치 6종 (미디어킷 발췌) ── */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="03" label="Placements" />
          <h2
            className="text-3xl md:text-4xl font-bold mb-10 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B", wordBreak: "keep-all" }}
          >
            게재 가능한 위치 6종.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Placement code="A" name="메인 페이지 히어로" desc="홈 진입 시 가장 먼저 보이는 영역." />
            <Placement code="B" name="공연 목록 / 캘린더 사이드" desc="공연을 탐색하는 동선 옆 자연 노출." />
            <Placement code="C" name="공연 상세 페이지 하단" desc="작품 정보 모두 본 직후 노출. 의향이 가장 높은 시점." />
            <Placement code="D" name="검색 결과 상단 스폰서드" desc="키워드 매칭 광고. 예) ‘대학로 + 의상 대여’ 검색." />
            <Placement code="E" name="아카이브 / 공연자 프로필" desc="장기 노출형. 같은 학교·단체 페이지에 일관 노출." />
            <Placement code="F" name="카드뉴스 / 뉴스레터" desc="월간 큐레이션 발행물. 도달률 높음." />
          </div>
          <p
            className="text-xs mt-6 leading-relaxed"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
          >
            ※ 상세 광고 상품·단가표는 1:1 견적 문의 시 미디어킷(PDF)으로 발송드립니다.
          </p>
        </div>
      </section>

      {/* ── 4. 진행 절차 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28" style={{ backgroundColor: "#202833", color: "#FBF8F1" }}>
        <div className="max-w-5xl mx-auto">
          <SectionLabel no="04" label="Process" dark />
          <h2
            className="text-3xl md:text-4xl font-bold mb-10 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#C8D96F", wordBreak: "keep-all" }}
          >
            문의에서 게재까지 4단계.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Step n="01" t="광고 문의" d="이메일로 광고 목적·예산·일정 공유" />
            <Step n="02" t="상품 제안" d="적합한 위치·기간·단가 제안" />
            <Step n="03" t="계약·결제" d="세금계산서 발행, 사전 결제" />
            <Step n="04" t="게재·보고" d="게재 후 노출 데이터 리포트 제공" />
          </div>
        </div>
      </section>

      {/* ── 5. CTA ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24 md:py-32 text-center"
        style={{
          background: "linear-gradient(180deg, #3B5A6B 0%, #202833 100%)",
          color: "#FBF8F1",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
          >
            Contact
          </p>
          <h2
            className="text-3xl md:text-5xl font-bold mb-6 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1", wordBreak: "keep-all" }}
          >
            먼저, 가볍게 이야기를 나눠보세요.
          </h2>
          <p
            className="text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#FBF8F1", opacity: 0.85, wordBreak: "keep-all" }}
          >
            예산이 정해지지 않으셨어도 괜찮습니다.
            <br />
            목적과 일정을 알려주시면 가장 맞는 형태를 함께 찾아보겠습니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={MAILTO}
              className="px-8 py-4 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#C8D96F",
                color: "#202833",
                fontWeight: 600,
              }}
            >
              1:1 견적 문의 →
            </a>
            <Link
              href="/contact"
              className="px-8 py-4 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#FBF8F1",
                border: "1px solid rgba(248, 249, 252, 0.5)",
              }}
            >
              일반 문의 폼으로
            </Link>
          </div>
          <p
            className="text-xs mt-10 leading-relaxed"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#FBF8F1", opacity: 0.55 }}
          >
            운영: 사유유사 · 대표 이혁호 · 사업자등록번호 168-05-03666
            <br />
            syusflux@gmail.com
          </p>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 서브 컴포넌트
// ──────────────────────────────────────────────────

function SectionLabel({ no, label, dark }: { no: string; label: string; dark?: boolean }) {
  return (
    <div className="mb-6 flex items-baseline gap-3">
      <span
        className="text-xs tracking-[0.3em]"
        style={{
          fontFamily: "var(--font-inter)",
          color: dark ? "rgba(248, 249, 252, 0.55)" : "#7A746C",
        }}
      >
        {no}
      </span>
      <span
        className="text-xs tracking-[0.3em] uppercase"
        style={{
          fontFamily: "var(--font-inter)",
          color: dark ? "#C8D96F" : "#3B5A6B",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function AudienceCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6" style={{ backgroundColor: "#FBF8F1", border: "1px solid #D8D3C9" }}>
      <p
        className="text-base font-bold mb-2"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
      >
        {title}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A", wordBreak: "keep-all" }}
      >
        {desc}
      </p>
    </div>
  );
}

function ReasonCard({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="p-6" style={{ backgroundColor: "#FBF8F1", border: "1px solid #3B5A6B" }}>
      <p
        className="text-xs tracking-[0.25em] mb-3"
        style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
      >
        {n}
      </p>
      <p
        className="text-lg font-bold mb-3"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
      >
        {t}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A", wordBreak: "keep-all" }}
      >
        {d}
      </p>
    </div>
  );
}

function Placement({ code, name, desc }: { code: string; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 p-5" style={{ border: "1px solid #D8D3C9" }}>
      <span
        className="w-10 h-10 flex items-center justify-center text-base font-bold shrink-0"
        style={{ fontFamily: "var(--font-inter)", backgroundColor: "#3B5A6B", color: "#FBF8F1" }}
      >
        {code}
      </span>
      <div className="flex-1">
        <p
          className="text-sm font-semibold mb-1"
          style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}
        >
          {name}
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C", wordBreak: "keep-all" }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="p-5" style={{ backgroundColor: "rgba(248, 249, 252, 0.06)", border: "1px solid rgba(248, 249, 252, 0.15)" }}>
      <p
        className="text-2xl font-bold mb-3"
        style={{ fontFamily: "var(--font-inter)", color: "#C8D96F" }}
      >
        {n}
      </p>
      <p
        className="text-sm font-semibold mb-2"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1" }}
      >
        {t}
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#FBF8F1", opacity: 0.7, wordBreak: "keep-all" }}
      >
        {d}
      </p>
    </div>
  );
}
