import type { Metadata } from "next";
import Link from "next/link";

/**
 * 시우스란 (/syus/about) — 2026-07-01 재구성.
 * 사장님 지시: SYUS 정체성 = "젊고 얽매이지 않은 사회의 시스템"(system of young unbound society).
 * 레이아웃 = 3(좌)ㅣSYUS 소개(중앙)ㅣ3(우) 대칭. 각 섹션이 '어떤 공간이자 무엇을 담는지'를
 * 세분화·다양하게 소개(가이드북 §4.2 무대↔섹션 매핑 기반). 양측 공백 축소, 가독성·예술성 강화.
 */

export const metadata: Metadata = {
  title: "시우스란",
  description:
    "시우스(SYUS) — 젊고 얽매이지 않은 사회의 시스템(system of young unbound society). 무대올림이 무대를 넓게 알린다면, 시우스는 연기를 깊게 모으는 커뮤니티입니다.",
  alternates: { canonical: "https://syus.co.kr/syus/about" },
};

type SectionIntro = {
  slug: string;
  stage: string;
  section: string;
  color: string;
  space: string; // 어떤 공간인가
  holds: string; // 무엇을 담고 추구하는가
};

// 히어로 기준 좌측 3 / 우측 3
const LEFT: SectionIntro[] = [
  {
    slug: "corridor", stage: "사잇 무대", section: "책 서재", color: "var(--color-syus-stage-corridor)",
    space: "안과 밖을 잇는 아치, 관문이자 문지방.",
    holds: "무대 밖에서 무대를 기르는 책을 함께 모읍니다. 한 사람의 추천이 다른 사람의 다음 한 권이 되는, 천천히 자라는 서가.",
  },
  {
    slug: "flex", stage: "변형 무대", section: "창작 독백 아카이브", color: "var(--color-syus-stage-flex)",
    space: "필요에 따라 형태가 바뀌는 가변 무대.",
    holds: "요청할 때마다 새 독백이 지어지는 서고입니다. 기존 작품을 베끼지 않은 AI 창작 원본을 운영자 검수를 거쳐 건네고, 동의한 것들이 쌓입니다.",
  },
  {
    slug: "blackbox", stage: "블랙박스", section: "관람의 잔상", color: "var(--color-syus-stage-blackbox)",
    space: "아무 장치도 없는 빈 검은 상자, 무엇이든 될 수 있는.",
    holds: "공연·영화·드라마가 꺼진 뒤 마음에 남은 잔상을 기록합니다. 같은 작품의 다른 잔상이 포개질 때, 혼자 본 것보다 오래 남습니다.",
  },
];

const RIGHT: SectionIntro[] = [
  {
    slug: "proscenium", stage: "프로시니엄 무대", section: "주인장 견해글", color: "var(--color-syus-stage-proscenium)",
    space: "액자 너머로 정면을 보여주는, 가장 격식 있는 무대.",
    holds: "운영자가 연기를 오래 들여다본 글을 한 편씩 액자에 걸듯 내겁니다. ‘연기와 냉장고’ — 차곡차곡 재워둔 관찰.",
  },
  {
    slug: "thrust", stage: "돌출 무대", section: "연기 고민 QnA", color: "var(--color-syus-stage-thrust)",
    space: "객석 한가운데로 걸어 나와 삼면이 둘러싸이는, 가장 가까운 무대.",
    holds: "연기 고민을 혼자 삼키지 않고 꺼내 두면, 먼저 겪은 동료와 운영자가 함께 답을 더듬습니다.",
  },
  {
    slug: "arena", stage: "원형 무대", section: "자유 커뮤니티", color: "var(--color-syus-stage-arena)",
    space: "사방이 객석이라 위계가 없는 360°의 광장.",
    holds: "연기에 관한 이야기라면 무엇이든 자유롭게 오갑니다. 잡담도, 소식도, 함께할 사람을 찾는 일도 여기서.",
  },
];

function SectionCard({ s, align }: { s: SectionIntro; align: "left" | "right" }) {
  return (
    <Link href={`/syus/${s.slug}`} className={`syab-card syab-card--${align}`} style={{ ["--c" as string]: s.color } as React.CSSProperties}>
      <span className="syab-card-stage">{s.stage}</span>
      <h3 className="syab-card-section">{s.section}</h3>
      <p className="syab-card-space">{s.space}</p>
      <p className="syab-card-holds">{s.holds}</p>
      <span className="syab-card-go">들어가기 →</span>
    </Link>
  );
}

export default function SyusAboutPage() {
  return (
    <main className="syab-wrap">
      <header className="syab-head">
        <p className="syab-eyebrow">About · 시우스 SYUS</p>
        <h1 className="syab-title">젊고 얽매이지 않은<br />사회의 시스템</h1>
        <p className="syab-gloss">system of young unbound society</p>
      </header>

      <div className="syab-grid">
        {/* 좌 3 */}
        <div className="syab-col syab-col--left">
          {LEFT.map((s) => <SectionCard key={s.slug} s={s} align="left" />)}
        </div>

        {/* 중앙 — SYUS 정체성 */}
        <div className="syab-center">
          <div className="syab-core">
            <span className="syab-core-mark" aria-hidden="true" />
            <p className="syab-core-line">여섯 무대가 향하는 하나의 중심</p>
          </div>

          {[
            {
              h: "얽매이지 않기 위한 ‘시스템’.",
              b: "시우스는 규칙에 갇힌 공동체가 아니라, 젊은 연기가 얽매이지 않도록 받쳐 주는 구조입니다. 무대의 형태를 빌려 여섯 개의 자리를 짜두고, 그 위에서 각자의 결이 자유롭게 흐르게 합니다.",
            },
            {
              h: "무대올림이 넓게 알린다면, 시우스는 깊게 모읍니다.",
              b: "무대올림은 흩어진 대학 무대를 모아 넓게 알립니다. 시우스는 그 곁에서 연기라는 한 우물을 깊게 팝니다. 같은 사유유사 아래 두 개의 결.",
            },
            {
              h: "기록하고, 나누고, 머뭅니다.",
              b: "배우의 말과 장면, 연기의 고민, 무대를 본 뒤의 잔상을 함께 남깁니다. 빠르게 소비되고 지나가는 대신, 오래 곁에 두고 다시 꺼내봅니다. 시우스는 연기 커뮤니티입니다.",
            },
            {
              h: "다채로움은 시끄러움이 아닙니다.",
              b: "여섯 무대의 다른 색은 자극의 다양함이 아니라 시간과 결의 풍부함입니다. 소란스럽지 않게, 닿아야 할 사람에게 닿습니다.",
            },
          ].map((s) => (
            <section key={s.h} className="syab-idea">
              <h2 className="syab-idea-h">{s.h}</h2>
              <p className="syab-idea-b">{s.b}</p>
            </section>
          ))}

          <div className="syab-links">
            <Link href="/syus" className="syab-link">여섯 무대 둘러보기 →</Link>
            <Link href="/" className="syab-link syab-link--muted">사유유사 갈림길로</Link>
          </div>
        </div>

        {/* 우 3 */}
        <div className="syab-col syab-col--right">
          {RIGHT.map((s) => <SectionCard key={s.slug} s={s} align="right" />)}
        </div>
      </div>

      <style>{`
        .syab-wrap {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(48px, 9vh, 104px) clamp(20px, 4vw, 48px) 120px;
        }
        .syab-head { text-align: center; margin-bottom: clamp(40px, 7vh, 72px); }
        .syab-eyebrow {
          font-family: var(--font-inter);
          font-size: 0.72rem; letter-spacing: 0.34em; text-transform: uppercase; font-weight: 600;
          color: #0B5563; margin-bottom: 20px;
        }
        .syab-title {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(2rem, 5.2vw, 3.4rem); line-height: 1.16; font-weight: 700; letter-spacing: -0.02em;
          color: #241C18; margin-bottom: 16px; word-break: keep-all;
        }
        .syab-gloss {
          font-family: var(--font-inter);
          font-size: clamp(0.82rem, 1.6vw, 1rem); letter-spacing: 0.14em; color: #0B5563;
        }

        /* 모바일 = 중앙 먼저, 그 뒤 섹션들 세로 */
        .syab-grid { display: flex; flex-direction: column; gap: 28px; }
        .syab-col { display: flex; flex-direction: column; gap: 18px; }
        .syab-center { order: -1; }

        .syab-core {
          text-align: center; padding: 8px 0 24px; margin-bottom: 24px; border-bottom: 1px solid #E0DBD0;
        }
        .syab-core-mark {
          display: block; width: min(72%, 260px); height: 84px; margin: 0 auto 14px;
          background: url('/wm-syus-mark.png') no-repeat center center; background-size: contain;
        }
        .syab-core-line {
          font-family: var(--font-noto-sans-kr); font-size: 0.9rem; letter-spacing: 0.04em; color: #6B5C50;
        }
        .syab-idea { margin-bottom: 26px; }
        .syab-idea-h {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(1.15rem, 2.2vw, 1.4rem); font-weight: 700; color: #241C18;
          margin-bottom: 10px; word-break: keep-all;
        }
        .syab-idea-b {
          font-family: var(--font-noto-sans-kr);
          font-size: 1rem; line-height: 1.85; font-weight: 300; color: #6B5C50; word-break: keep-all;
        }
        .syab-links { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 30px; }
        .syab-link {
          font-family: var(--font-noto-sans-kr); font-size: 0.9rem; font-weight: 600; letter-spacing: 0.04em;
          color: #241C18; text-decoration: none; border-bottom: 1px solid #241C18; padding-bottom: 3px;
        }
        .syab-link--muted { color: #6B5C50; border-bottom-color: #E0DBD0; font-weight: 500; }
        .syab-link:hover { opacity: 0.7; }

        /* 섹션 카드 */
        .syab-card {
          display: block; text-decoration: none;
          background: #FFFFFF; border: 1px solid #E4DFD4; border-top: 3px solid var(--c);
          padding: 22px 22px 20px; box-shadow: 0 2px 10px rgba(36,28,24,0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .syab-card:hover, .syab-card:focus-visible {
          transform: translateY(-3px); box-shadow: 0 10px 24px rgba(36,28,24,0.10); border-color: var(--c);
        }
        .syab-card-stage {
          font-family: var(--font-inter); font-size: 0.64rem; letter-spacing: 0.2em; text-transform: uppercase;
          font-weight: 600; color: var(--c);
        }
        .syab-card-section {
          font-family: var(--font-noto-serif-kr); font-size: 1.28rem; font-weight: 700; color: #241C18;
          margin: 6px 0 12px; word-break: keep-all;
        }
        .syab-card-space {
          font-family: var(--font-noto-sans-kr); font-size: 0.9rem; font-weight: 600; color: #4A3B33;
          line-height: 1.6; margin-bottom: 8px; word-break: keep-all;
        }
        .syab-card-holds {
          font-family: var(--font-noto-sans-kr); font-size: 0.92rem; font-weight: 300; line-height: 1.75;
          color: #6B5C50; word-break: keep-all; margin-bottom: 14px;
        }
        .syab-card-go {
          font-family: var(--font-noto-sans-kr); font-size: 0.8rem; font-weight: 600; letter-spacing: 0.06em;
          color: var(--c);
        }

        /* 데스크탑 = 3ㅣ중앙ㅣ3 대칭 */
        @media (min-width: 1024px) {
          .syab-grid {
            display: grid;
            grid-template-columns: 1fr 1.18fr 1fr;
            gap: clamp(20px, 2.4vw, 40px);
            align-items: start;
          }
          .syab-center { order: 0; padding: 0 clamp(4px, 1vw, 16px); }
          .syab-col { gap: 20px; }
          .syab-card--left { text-align: right; border-top: 0; border-right: 3px solid var(--c); }
          .syab-card--right { text-align: left; border-top: 0; border-left: 3px solid var(--c); }
        }

        @media (prefers-reduced-motion: reduce) {
          .syab-card { transition: none; }
        }
      `}</style>
    </main>
  );
}
