"use client";

import { useMemo } from "react";
import type { Show, Profile } from "@/types";
import { extractSchoolName, isEnded, todayKey } from "@/lib/showFilters";

type AdMediaKitProps = {
  shows: Show[];
  members: Profile[];
};

export default function AdMediaKit({ shows, members }: AdMediaKitProps) {
  const summary = useMemo(() => {
    const today = todayKey();
    const approved = shows.filter((s) => s.status === "approved");
    const active = approved.filter((s) => !isEnded(s, today));

    const schools = new Set<string>();
    for (const s of approved) {
      const sch = extractSchoolName(s.school_department);
      if (sch) schools.add(sch);
    }

    const regions = new Set<string>();
    for (const s of approved) {
      if (s.region) regions.add(s.region);
    }

    return {
      totalMembers: members.length,
      performers: members.filter((m) => m.role === "performer" || m.role === "admin").length,
      activeShows: active.length,
      totalShows: approved.length,
      schoolCount: schools.size,
      regionCount: regions.size,
    };
  }, [shows, members]);

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  const handlePrint = () => window.print();

  return (
    <div className="ad-media-kit">
      {/* 인쇄 시 적용될 스타일 */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 18mm 14mm; }
          nav, footer, .print-hide { display: none !important; }
          body { background: white !important; }
          .ad-media-kit { padding: 0 !important; max-width: 100% !important; }
          .ad-section { break-inside: avoid; page-break-inside: avoid; }
          .ad-page-break { page-break-before: always; break-before: page; }
        }
      `}</style>

      {/* 인쇄 / 출력 안내 (인쇄 시 숨김) */}
      <div
        className="print-hide mb-8 p-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ backgroundColor: "#E8DDD0" }}
      >
        <div className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
          📋 광고주에게 화면 공유로 보여주거나, <strong>인쇄(Ctrl+P) → PDF 저장</strong>으로 송부할 수 있습니다.
          <br />
          <span style={{ color: "#9B9693" }}>광고 단가는 현재 placeholder입니다. 사장님이 직접 채워주세요.</span>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 text-xs tracking-wider transition-colors shrink-0"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            backgroundColor: "#6D3115",
            color: "#F4EDE3",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B4A2A")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6D3115")}
        >
          인쇄 / PDF 저장
        </button>
      </div>

      {/* ── 표지 ─────────────────────────── */}
      <section className="ad-section mb-12 pb-10" style={{ borderBottom: "2px solid #6D3115" }}>
        <p
          className="text-xs tracking-[0.3em] uppercase mb-2"
          style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
        >
          Media Kit · {dateStr}
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold mb-4"
          style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
        >
          사유유사 SYUS
          <br />
          광고 안내
        </h1>
        <p
          className="text-base leading-relaxed max-w-2xl"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
        >
          대학·신진 공연자들의 무대를 기록·연결·홍보하는 큐레이션 플랫폼.
          연극, 뮤지컬, 넌버벌 등 한국의 젊은 공연 예술을 사랑하는 관객들과
          공연 인접 업계 광고주를 자연스럽게 연결합니다.
        </p>
      </section>

      {/* ── 1. 누구에게 닿는가 ─────────────────── */}
      <section className="ad-section mb-12">
        <SectionTitle no="01" title="누구에게 닿는가" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <Stat label="누적 회원" value={summary.totalMembers} suffix="명" />
          <Stat label="등록 공연자" value={summary.performers} suffix="명" />
          <Stat label="누적 공연" value={summary.totalShows} suffix="건" />
          <Stat label="진행 중·예정 공연" value={summary.activeShows} suffix="건" />
          <Stat label="등록 학교" value={summary.schoolCount} suffix="개" />
          <Stat label="활동 지역" value={summary.regionCount} suffix="개" />
        </div>
        <div className="p-5" style={{ backgroundColor: "#E8DDD0" }}>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
          >
            <strong style={{ color: "#6D3115" }}>주요 사용자</strong> — 18~28세 대학생·신진 공연자, 공연 관객(2030 여성 비중 높음),
            연기·연출 전공 지망생, 공연 동호인.
            <br />
            <strong style={{ color: "#6D3115" }}>강한 관심사</strong> — 공연 정보, 연기 학원/오디션, 공연 의상·분장,
            소극장·연습실 대관, 공연 음향·조명 장비, 대학로 카페, 신학기 책방·문구.
          </p>
        </div>
      </section>

      {/* ── 2. 광고 노출 위치 ─────────────────── */}
      <section className="ad-section mb-12">
        <SectionTitle no="02" title="광고 노출 위치" />
        <div className="space-y-4">
          <PlacementRow
            code="A"
            name="메인 페이지 히어로"
            desc="홈 진입 시 첫 번째로 보이는 영역. 가장 강력한 노출."
            highlight
          />
          <PlacementRow
            code="B"
            name="공연 목록 / 캘린더 사이드"
            desc="/shows · /shows/calendar 에서 카드 그리드 옆. 공연 탐색 중 자연 노출."
          />
          <PlacementRow
            code="C"
            name="공연 상세 페이지 하단"
            desc="작품 소개·관람 정보 다 본 직후 노출. 구매 의향 높은 시점."
          />
          <PlacementRow
            code="D"
            name="검색 결과 상단 스폰서드"
            desc="키워드 매칭 광고. 예) ‘대학로 + 의상 대여’ 검색 시 우선 노출."
          />
          <PlacementRow
            code="E"
            name="지난 공연 아카이브 / 공연자 프로필"
            desc="장기 노출형. 같은 학교·단체 페이지에 일관 노출 가능."
          />
          <PlacementRow
            code="F"
            name="카드뉴스 / 뉴스레터"
            desc="월간 큐레이션 발행물. 도달률 높고 구독자 직접 도달."
            highlight
          />
        </div>
      </section>

      {/* ── 3. 광고 상품 ──────────────────────── */}
      <section className="ad-section mb-12 ad-page-break">
        <SectionTitle no="03" title="광고 상품 · 단가" />

        {/* 시기별 단가 안내 박스 */}
        <div className="mb-6 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" style={{ backgroundColor: "#E8DDD0" }}>
          <div>
            <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#A63D2F" }}>
              ① 베타가 (현재 ~ 2026년 8월)
            </p>
            <p className="leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
              런칭 협력사 모집 중. 후기·데이터 공유 동의 시 무료~할인 게재
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              ② 시작가 (2026년 9~12월)
            </p>
            <p className="leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
              정식 출시 단가. 회원 1,000명+ 기준 합리적 가격대
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A5E42" }}>
              ③ 안정가 (2027년 이후)
            </p>
            <p className="leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
              회원 5,000명+, MAU 3,000+ 가정. 시장 안착 단가
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #6D3115" }}>
                {["코드", "상품 (기간)", "① 베타가", "② 시작가", "③ 안정가"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-3 text-xs tracking-wider uppercase"
                    style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <PriceRow code="A" name="메인 히어로 배너 (월)"        beta="무료 ~ ₩200,000"  start="₩300,000 ~ ₩500,000"   stable="₩800,000 ~ ₩1,500,000" />
              <PriceRow code="B" name="공연 목록 사이드 배너 (월)"   beta="무료 ~ ₩100,000"  start="₩150,000 ~ ₩250,000"   stable="₩400,000 ~ ₩800,000" />
              <PriceRow code="C" name="공연 상세 하단 배너 (월)"     beta="무료 ~ ₩100,000"  start="₩100,000 ~ ₩200,000"   stable="₩300,000 ~ ₩600,000" />
              <PriceRow code="D" name="검색 결과 스폰서드 (월)"      beta="무료 ~ ₩100,000"  start="₩100,000 ~ ₩200,000"   stable="₩300,000 ~ ₩600,000" />
              <PriceRow code="E" name="아카이브 / 프로필 (월)"       beta="무료 ~ ₩100,000"  start="₩80,000 ~ ₩150,000"    stable="₩250,000 ~ ₩500,000" />
              <PriceRow code="F" name="카드뉴스 광고 (회당)"         beta="무료 ~ ₩300,000"  start="₩300,000 ~ ₩500,000"   stable="₩800,000 ~ ₩1,500,000" />
              <PriceRow code="★" name="패키지 (A+B+F · 월)"          beta="무료 ~ ₩500,000"  start="₩800,000 ~ ₩1,200,000" stable="₩2,000,000 ~ ₩3,000,000" highlight />
            </tbody>
          </table>
        </div>
        <p
          className="text-xs mt-4 leading-relaxed"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
        >
          ※ 모든 단가는 VAT 별도, 협의 가능. 게재 직전까지 광고 톤·디자인 협의 후 진행.
          <br />
          ※ SYUS의 비상업적 톤을 해치는 광고(과도한 자극·허위 광고 등)는 정중히 사양됩니다.
        </p>
      </section>

      {/* ── 3+. 런칭 협력사 모집 ────────────────── */}
      <section className="ad-section mb-12 p-6" style={{ border: "2px solid #6D3115" }}>
        <div className="flex items-baseline gap-3 mb-4">
          <span
            className="text-xs px-2 py-0.5"
            style={{
              fontFamily: "var(--font-inter)",
              backgroundColor: "#6D3115",
              color: "#F4EDE3",
              letterSpacing: "0.2em",
            }}
          >
            BETA
          </span>
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
          >
            런칭 협력사 5사 모집
          </h3>
        </div>
        <p
          className="text-sm leading-relaxed mb-4"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
        >
          SYUS 정식 출시(2026년 9월) 이전까지 첫 5개 광고주를 <strong>런칭 협력사</strong>로 모집합니다.
          베타가(무료~할인) 게재 + SYUS 푸터 상시 노출 + &lsquo;런칭 협력사&rsquo; 라벨이 부여됩니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="p-4" style={{ backgroundColor: "#E8DDD0" }}>
            <p className="text-xs font-semibold mb-2 tracking-wider" style={{ fontFamily: "var(--font-inter)", color: "#6D3115", letterSpacing: "0.15em" }}>
              협력사 혜택
            </p>
            <ul className="text-xs leading-relaxed space-y-1" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
              <li>· 베타가(무료~할인) 게재 — 시장 최저가</li>
              <li>· SYUS 사이트 푸터 상시 노출 (모든 페이지)</li>
              <li>· &lsquo;런칭 협력사&rsquo; 공식 라벨 부여</li>
              <li>· 후기 인터뷰 콘텐츠 제작 (선택)</li>
              <li>· 정식 출시 후 가격 인상에서 1년간 동결</li>
            </ul>
          </div>
          <div className="p-4" style={{ backgroundColor: "#E8DDD0" }}>
            <p className="text-xs font-semibold mb-2 tracking-wider" style={{ fontFamily: "var(--font-inter)", color: "#6D3115", letterSpacing: "0.15em" }}>
              참여 조건
            </p>
            <ul className="text-xs leading-relaxed space-y-1" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
              <li>· SYUS 톤과 어울리는 광고 콘텐츠 (공연·문화 인접 권장)</li>
              <li>· 게재 후 효과 데이터 공유 동의</li>
              <li>· 후기·인터뷰 가능 (선택, 비강제)</li>
              <li>· 게재 기간 최소 1개월</li>
            </ul>
          </div>
        </div>
        <p
          className="text-xs"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
        >
          모집 기간: 즉시 ~ 5사 마감 시까지 / 문의: syusflux@gmail.com
        </p>
      </section>

      {/* ── 4. 진행 절차 ───────────────────── */}
      <section className="ad-section mb-12">
        <SectionTitle no="04" title="진행 절차" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Step no={1} title="광고 문의" desc="이메일로 광고 목적·예산·일정 공유" />
          <Step no={2} title="상품 제안" desc="SYUS가 적합한 상품·위치 제안" />
          <Step no={3} title="계약 및 결제" desc="세금계산서 발행, 사전 결제" />
          <Step no={4} title="게재 / 보고" desc="게재 후 노출 데이터 리포트 제공" />
        </div>
      </section>

      {/* ── 5. 문의 ─────────────────────── */}
      <section className="ad-section mb-12 p-8" style={{ backgroundColor: "#6D3115", color: "#F4EDE3" }}>
        <p
          className="text-xs tracking-[0.3em] uppercase mb-3"
          style={{ fontFamily: "var(--font-inter)", opacity: 0.7 }}
        >
          Contact
        </p>
        <h3
          className="text-2xl font-bold mb-5"
          style={{ fontFamily: "var(--font-noto-serif-kr)" }}
        >
          광고 문의
        </h3>
        <div className="space-y-2 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
          <p>
            <span style={{ opacity: 0.7, marginRight: 8 }}>이메일</span>
            <a href="mailto:syusflux@gmail.com" style={{ color: "#F4EDE3", textDecoration: "underline" }}>
              syusflux@gmail.com
            </a>
          </p>
          <p>
            <span style={{ opacity: 0.7, marginRight: 8 }}>웹사이트</span>
            <a href="https://syus.co.kr" target="_blank" rel="noopener noreferrer" style={{ color: "#F4EDE3", textDecoration: "underline" }}>
              https://syus.co.kr
            </a>
          </p>
          <p>
            <span style={{ opacity: 0.7, marginRight: 8 }}>운영사</span>
            (주)사유유사 · 대표 이혁호 · 사업자등록번호 168-05-03666
          </p>
          <p>
            <span style={{ opacity: 0.7, marginRight: 8 }}>문서 발행일</span>
            <span style={{ fontFamily: "var(--font-inter)" }}>{dateStr}</span>
          </p>
        </div>
      </section>

      {/* ── 푸터 ─────────────────────── */}
      <p
        className="text-xs text-center mt-8"
        style={{ fontFamily: "var(--font-cormorant)", color: "#9B9693", letterSpacing: "0.2em" }}
      >
        SYUS · 思惟流沙 — 깊이 머물고, 가볍게 흘려보냅니다.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 서브 컴포넌트
// ──────────────────────────────────────────────────

function SectionTitle({ no, title }: { no: string; title: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <span
        className="text-xs tracking-[0.3em]"
        style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
      >
        {no}
      </span>
      <h2
        className="text-xl md:text-2xl font-bold"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
      >
        {title}
      </h2>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="p-5 text-center" style={{ backgroundColor: "#E8DDD0" }}>
      <p
        className="text-3xl font-bold mb-1"
        style={{ fontFamily: "var(--font-inter)", color: "#6D3115" }}
      >
        {value}
        {suffix && <span className="text-sm ml-1" style={{ color: "#9B9693" }}>{suffix}</span>}
      </p>
      <p
        className="text-xs"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
      >
        {label}
      </p>
    </div>
  );
}

function PlacementRow({
  code,
  name,
  desc,
  highlight,
}: {
  code: string;
  name: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-4 p-4"
      style={{
        backgroundColor: highlight ? "#E8DDD0" : "transparent",
        border: `1px solid ${highlight ? "#6D3115" : "#D4CFC9"}`,
      }}
    >
      <span
        className="w-10 h-10 flex items-center justify-center text-base font-bold shrink-0"
        style={{
          fontFamily: "var(--font-inter)",
          backgroundColor: highlight ? "#6D3115" : "#E8DDD0",
          color: highlight ? "#F4EDE3" : "#6D3115",
        }}
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
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

function PriceRow({
  code,
  name,
  beta,
  start,
  stable,
  highlight,
}: {
  code: string;
  name: string;
  beta: string;
  start: string;
  stable: string;
  highlight?: boolean;
}) {
  return (
    <tr
      style={{
        borderBottom: "1px solid #D4CFC9",
        backgroundColor: highlight ? "#E8DDD0" : "transparent",
      }}
    >
      <td
        className="py-3 px-3 text-xs"
        style={{
          fontFamily: "var(--font-inter)",
          color: highlight ? "#6D3115" : "#9B9693",
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {code}
      </td>
      <td
        className="py-3 px-3 text-sm"
        style={{
          fontFamily: "var(--font-noto-serif-kr)",
          color: "#1A1A1A",
          fontWeight: highlight ? 600 : 500,
        }}
      >
        {name}
      </td>
      <td
        className="py-3 px-3 text-xs whitespace-nowrap"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#A63D2F" }}
      >
        {beta}
      </td>
      <td
        className="py-3 px-3 text-xs whitespace-nowrap font-semibold"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}
      >
        {start}
      </td>
      <td
        className="py-3 px-3 text-xs whitespace-nowrap"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#3A5E42" }}
      >
        {stable}
      </td>
    </tr>
  );
}

function Step({ no, title, desc }: { no: number; title: string; desc: string }) {
  return (
    <div className="p-4" style={{ backgroundColor: "#E8DDD0" }}>
      <p
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: "var(--font-inter)", color: "#6D3115" }}
      >
        {String(no).padStart(2, "0")}
      </p>
      <p
        className="text-sm font-semibold mb-1"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}
      >
        {title}
      </p>
      <p
        className="text-xs leading-relaxed"
        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
      >
        {desc}
      </p>
    </div>
  );
}
