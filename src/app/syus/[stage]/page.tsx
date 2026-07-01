import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

/**
 * 시우스 무대 섹션 소개 (/syus/[stage]) — 2026-06-30 3층 구조 뼈대.
 * 선행오픈 3섹션(견해글·QnA·책 서재)은 마인드맵에서 여기로 이동(소개 + '곧 콘텐츠').
 * 나머지 3섹션은 직접 URL 접근 시 '준비 중'으로 안내(마인드맵에선 모달로 차단).
 * 실제 글쓰기·DB·커뮤니티 기능은 다음 차수.
 */

type StageInfo = {
  name: string;
  section: string;
  color: string;
  open: boolean;
  tagline: string;
  intro: string;
  points: string[];
};

const STAGE_INFO: Record<string, StageInfo> = {
  proscenium: {
    name: "프로시니엄 무대", section: "주인장 견해글", color: "var(--color-syus-stage-proscenium)", open: true,
    tagline: "정면으로 마주하는, 정제된 시선",
    intro: "운영자가 연기를 오래 들여다본 글이 한 편씩 쌓이는 자리입니다.",
    points: ["한 배우, 한 장면을 오래 들여다본 글", "‘연기의 냉장고’ — 차곡차곡 재워둔 관찰", "읽고 나면 다음 무대가 조금 다르게 보이도록"],
  },
  thrust: {
    name: "돌출 무대", section: "연기 고민 QnA", color: "var(--color-syus-stage-thrust)", open: true,
    tagline: "객석으로 걸어 나오는, 가까운 대화",
    intro: "연기 고민을 묻고, 함께 답을 더듬는 자리입니다.",
    points: ["대사가 겉도는 것 같을 때", "오디션·발성·호흡의 막막함", "혼자 삼키던 물음을 꺼내 두는 곳"],
  },
  corridor: {
    name: "사잇 무대", section: "책 서재", color: "var(--color-syus-stage-corridor)", open: true,
    tagline: "관문이자 문지방, 사이의 통로",
    intro: "연기와 무대 곁에 둘 책을 천천히 모으는 자리입니다.",
    points: ["연기론·희곡·배우의 기록", "한 권씩 골라 곁에 두는 서가", "무대 밖에서 무대를 기르는 시간"],
  },
  arena: {
    name: "원형 무대", section: "자유 커뮤니티", color: "var(--color-syus-stage-arena)", open: false,
    tagline: "사방이 객석인, 둘러앉은 광장",
    intro: "연습·잡담·모집이 자유롭게 오가는 광장입니다.", points: [],
  },
  blackbox: {
    name: "블랙박스", section: "관람의 잔상", color: "var(--color-syus-stage-blackbox)", open: false,
    tagline: "무엇이든 될 수 있는 빈 검은 상자",
    intro: "공연·영화·드라마를 본 뒤 남은 잔상을 적는 자리입니다.", points: [],
  },
  flex: {
    name: "변형 무대", section: "창작 독백 아카이브", color: "var(--color-syus-stage-flex)", open: false,
    tagline: "형태가 바뀌는, 다목적 무대",
    intro: "원하는 결의 독백을 새로 지어 건네받는 자리입니다.", points: [],
  },
};

export function generateStaticParams() {
  return Object.keys(STAGE_INFO).map((stage) => ({ stage }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  const info = STAGE_INFO[stage];
  if (!info) return { title: "시우스" };
  return {
    title: `${info.section} · ${info.name}`,
    description: info.intro,
    alternates: { canonical: `https://syus.co.kr/syus/${stage}` },
  };
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  const info = STAGE_INFO[stage];
  if (!info) notFound();

  return (
    <main
      style={{
        maxWidth: "44rem",
        margin: "0 auto",
        padding: "clamp(48px, 9vh, 104px) clamp(24px, 6vw, 48px) 120px",
      }}
    >
      <Link
        href="/syus"
        style={{
          display: "inline-block",
          fontFamily: "var(--font-noto-sans-kr)",
          fontSize: "0.82rem",
          letterSpacing: "0.08em",
          color: "#6B5C50",
          textDecoration: "none",
          marginBottom: "36px",
        }}
      >
        ← 여섯 무대로
      </Link>

      <p
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: "0.72rem",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "var(--color-syus-cream)",
          background: info.color,
          display: "inline-block",
          padding: "6px 14px",
          marginBottom: "22px",
        }}
      >
        {info.open ? "지금 열림" : "준비 중"}
      </p>

      <h1
        style={{
          fontFamily: "var(--font-noto-serif-kr)",
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#241C18",
          marginBottom: "10px",
          wordBreak: "keep-all",
        }}
      >
        {info.section}
      </h1>
      <p
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          fontSize: "0.95rem",
          color: info.color,
          fontWeight: 600,
          marginBottom: "28px",
        }}
      >
        {info.name} · {info.tagline}
      </p>

      <p
        style={{
          fontFamily: "var(--font-noto-serif-kr)",
          fontSize: "clamp(1.2rem, 2.6vw, 1.6rem)",
          lineHeight: 1.6,
          fontWeight: 400,
          color: "#241C18",
          wordBreak: "keep-all",
          marginBottom: "40px",
          paddingBottom: "40px",
          borderBottom: "1px solid #E0DBD0",
        }}
      >
        {info.intro}
      </p>

      {info.open ? (
        <>
          <ul style={{ listStyle: "none", margin: "0 0 44px", padding: 0 }}>
            {info.points.map((p) => (
              <li
                key={p}
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  fontWeight: 300,
                  color: "#4A3B33",
                  paddingLeft: "20px",
                  position: "relative",
                  marginBottom: "12px",
                  wordBreak: "keep-all",
                }}
              >
                <span style={{ position: "absolute", left: 0, color: info.color, fontWeight: 700 }}>·</span>
                {p}
              </li>
            ))}
          </ul>
          <div
            style={{
              padding: "22px 24px",
              background: "#FFFFFF",
              border: "1px solid #E4DFD4",
              borderLeft: `3px solid ${info.color}`,
            }}
          >
            <p style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.95rem", lineHeight: 1.7, color: "#6B5C50", wordBreak: "keep-all" }}>
              지금은 자리를 여는 중입니다. 곧 첫 글과 대화가 이곳에 쌓입니다.
            </p>
          </div>
        </>
      ) : (
        <div
          style={{
            padding: "22px 24px",
            background: "#FFFFFF",
            border: "1px solid #E4DFD4",
            borderLeft: `3px solid ${info.color}`,
          }}
        >
          <p style={{ fontFamily: "var(--font-noto-sans-kr)", fontSize: "0.95rem", lineHeight: 1.7, color: "#6B5C50", wordBreak: "keep-all" }}>
            이 무대는 아직 준비 중입니다. 견해글·연기 고민·책 서재가 먼저 열린 뒤 이어서 문을 엽니다.
          </p>
        </div>
      )}
    </main>
  );
}
