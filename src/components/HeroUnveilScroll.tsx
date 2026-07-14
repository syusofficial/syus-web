"use client";

/**
 * HeroUnveilScroll — unveil.fr 스타일 세로 스크롤 히어로 (2026-06-15 디자인 시안)
 *
 * 사장님 지시:
 *  - https://unveil.fr 형식 — 스크롤하며 넘겨지는 히어로
 *  - 공연 포스터들이 대각선으로 나열
 *
 * 구현 방향:
 *  - 세로 스크롤 영역(100vh×N). 안에서 sticky 텍스트 + 대각선 포스터 흐름.
 *  - 포스터는 grid 안에 rotate(-12 ~ 12deg)로 흩뿌려 대각선 인상을 만든다.
 *  - 스크롤 진행도(0~1)에 따라 translate3d + opacity로 포스터들이 위로 흐른다.
 *  - 모바일: 대각선 줄이고(±4deg), 단순 세로 흐름으로 약화.
 *
 * 잠금:
 *  - Mineral Stage 팔레트 + Pretendard/Geist 폰트 토큰
 *  - 광고형 어휘 금지(주목·놓치지 마세요·지금 바로)
 *  - prefers-reduced-motion 시 정지
 *
 * 빈 상태:
 *  - items.length === 0 이면 안내 카드 노출
 *
 * 2026-06-16 옵션 2 통합 성능 패스 (사장님 결정):
 *  C: 스크롤 트래킹 React state 제거 — DOM에 --p CSS 변수 직접 갱신(매 프레임 리렌더 회피)
 *  E: sticky 영역 220vh → 160vh (스크롤 흐름 유지하며 영역 단축)
 *  A: 포스터 좌표 재배치 — 카피 영역(가운데 14~57%) 비우는 대각선 흐름
 *  B: Image 최적화 — unoptimized 제거, priority(첫 2장), sizes 정확화
 *  H1: 사장님 직접 작성 카피 — "오늘도 우리들의 막이 오릅니다" + 부제
 *      "우리"라는 1인칭 복수형으로 운영자·공연자 학생을 같은 호흡에 묶음
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { StreamItem } from "@/components/HeroPosterStream";

type Props = {
  items: StreamItem[];
  /**
   * 한 줄 카피 — 미사용 (2026-06-15 2차 미리보기 수정: H1을 "무대올림" 브랜드 각인으로 교체).
   * 이전 카피("오늘, 어느 대학의 막이 오른다.")는 사장님 요청으로 폐기.
   * prop은 외부 호환을 위해 남겨두되 렌더에는 반영하지 않는다.
   */
  headline?: string;
  /** 보조 카피 — 미사용. subline도 부제 영역 전용 카피로 교체됨. */
  subline?: string;
};

export default function HeroUnveilScroll({
  items,
  // 2026-06-15 2차 수정: headline/subline은 더 이상 사용하지 않는다.
  // headline = "오늘, 어느 대학의 막이 오른다.",
  // subline = "머무른 무대를 모아, 가볍게 흘려보냅니다.",
}: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 스크롤 진행도 계산 — 섹션 상단이 viewport 상단에 맞춰진 순간부터, 섹션 하단이 viewport 상단에 닿는 순간까지
  //
  // 2026-06-16 옵션 2 C안: React state 우회.
  //   기존: setProgress(p) → 매 프레임 컴포넌트 리렌더 → 자식(포스터 5장·캡션·CTA) 재조정 비용
  //   변경: el.style.setProperty("--p", p) → DOM 변수만 갱신 → CSS calc()가 transform/opacity 흡수
  //   React 렌더 트리는 손대지 않음. 모바일 60fps 유지 + 데스크톱 렉 해소.
  useEffect(() => {
    if (!sectionRef.current) return;

    let raf = 0;
    const compute = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      // DOM 변수 직접 갱신 — React state 우회 (C안 핵심)
      el.style.setProperty("--p", String(p));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        compute();
        raf = 0;
      });
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (items.length === 0) {
    // 2026-06-15 3차 미리보기 수정 (사장님 지시):
    //   - 첫 화면 임팩트 강화: min-height 80vh → 100dvh (iOS Safari 100vh 이슈 회피)
    //   - 헤드라인·CTA 시원하게 확대
    //   - 2026 트렌드 4색 — Teal(메인) · Silhouette(딥 배경) · Damson(CTA) · Cloud Dancer(텍스트)
    return (
      <section className="unveil-empty">
        <div className="unveil-empty-inner">
          <p className="unveil-empty-eyebrow">Coming Soon</p>
          <h1 className="unveil-empty-headline">곧, 어느 대학의 첫 막이 오릅니다.</h1>
          <p className="unveil-empty-body">
            공연자분들이 무대를 올리시는 동안 가장 먼저 만나보실 수 있도록 준비 중입니다.
          </p>
          <div className="unveil-empty-ctas">
            <Link href="/performer" className="unveil-cta-primary">
              공연자: 무대 올리기 →
            </Link>
            <Link href="/about" className="unveil-cta-ghost">
              무대올림이 어떤 곳인가요
            </Link>
          </div>
        </div>
        <style>{`
          .unveil-empty {
            /* 100dvh — 모바일 사파리에서도 첫 화면을 정확히 가득 채운다.
               dvh 미지원 환경(구형 브라우저) 대비 min-height: 100vh fallback */
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            /* 패딩 시원하게 — 위쪽은 NAV 높이(약 96px) 고려 */
            padding: 140px 24px 100px;
            position: relative;
            background:
              radial-gradient(70% 70% at 50% 35%, rgba(11, 85, 99, 0.55), transparent 70%),
              linear-gradient(180deg, #1F1814 0%, #4A3B33 100%);
            color: #F0EEE9;
          }
          .unveil-empty-inner {
            max-width: 880px;
            text-align: center;
            position: relative;
            z-index: 1;
          }
          .unveil-empty-eyebrow {
            font-family: var(--font-inter);
            font-size: 0.78rem;
            letter-spacing: 0.4em;
            text-transform: uppercase;
            /* 어두운 배경 위에서 Damson은 잘 안 보임 — Damson 라이트 변형 토큰 사용 */
            color: var(--color-damson-light);
            font-weight: 600;
            margin-bottom: 28px;
          }
          .unveil-empty-headline {
            font-family: var(--font-noto-serif-kr);
            /* 헤드라인 시원하게 — 2.6rem → 4.4rem 최대 */
            font-size: clamp(2.4rem, 6vw, 4.4rem);
            font-weight: 700;
            line-height: 1.15;
            letter-spacing: -0.02em;
            color: #F0EEE9;
            margin-bottom: 28px;
            word-break: keep-all;
            text-wrap: balance;
          }
          .unveil-empty-body {
            font-family: var(--font-noto-sans-kr);
            /* 본문도 1.1rem로 — 어두운 배경 대비 가독성 */
            font-size: clamp(1rem, 1.5vw, 1.15rem);
            line-height: 1.8;
            color: rgba(240, 238, 233, 0.85);
            margin-bottom: 44px;
            word-break: keep-all;
            max-width: 620px;
            margin-left: auto;
            margin-right: auto;
          }
          .unveil-empty-ctas {
            display: flex;
            gap: 14px;
            justify-content: center;
            flex-wrap: wrap;
          }
          .unveil-cta-primary {
            /* CTA 시원하게 — 패딩 14/24 → 18/32 */
            padding: 18px 32px;
            font-family: var(--font-noto-sans-kr);
            font-size: 0.9rem;
            font-weight: 600;
            letter-spacing: 0.14em;
            /* Damson + Cloud Dancer 텍스트 (가독성 확보) */
            background-color: #5C2A42;
            color: #F0EEE9;
            text-decoration: none;
            transition: background-color 0.18s ease;
          }
          .unveil-cta-primary:hover {
            background-color: #6E3450;
          }
          .unveil-cta-ghost {
            padding: 18px 32px;
            font-family: var(--font-noto-sans-kr);
            font-size: 0.9rem;
            font-weight: 500;
            letter-spacing: 0.14em;
            color: #F0EEE9;
            border: 1px solid rgba(240, 238, 233, 0.45);
            text-decoration: none;
            transition: border-color 0.18s ease, background-color 0.18s ease;
          }
          .unveil-cta-ghost:hover {
            border-color: rgba(240, 238, 233, 0.85);
            background-color: rgba(240, 238, 233, 0.05);
          }
          @media (min-width: 1024px) {
            .unveil-empty { padding: 160px 48px 120px; }
          }
        `}</style>
      </section>
    );
  }

  // 포스터 위치 계산 — 대각선 그리드
  // 5개 포스터 기준 좌표(viewport % 단위, 화면을 가로지르는 대각선 흐름)
  //
  // 2026-06-16 옵션 2 A안 (사장님 결정): 카피 영역 가독성 확보.
  //   기존 좌표는 22%·38% 등 중앙 카피(가로 14~57%) 위로 포스터가 겹쳐 H1이 묻혔다.
  //   새 좌표는 좌상·우상·우중·좌하(카피 아래)·우하 — 중앙은 비우고 좌·우 대각선만 유지.
  //   실데이터가 3개일 때도 슬라이스 순서가 자연스럽게(좌상→우상→우중) 흐른다.
  const POSITIONS: { x: number; y: number; rotate: number; scale: number }[] = [
    { x: 6,  y: 8,  rotate: -7,  scale: 0.95 }, // 좌상단
    { x: 68, y: 10, rotate: 6,   scale: 1.05 }, // 우상단
    { x: 72, y: 38, rotate: -10, scale: 1.0  }, // 우중단
    { x: 8,  y: 60, rotate: 8,   scale: 0.92 }, // 좌하단 (카피 아래)
    { x: 65, y: 70, rotate: -6,  scale: 1.08 }, // 우하단
  ];

  return (
    <section
      ref={sectionRef}
      className={`unveil-scroll${mounted ? " is-mounted" : ""}`}
      // 2026-06-16 옵션 2 C안: style prop에서 --p 제거.
      // 스크롤 핸들러가 el.style.setProperty("--p", p)로 직접 갱신하므로
      // React가 매 프레임 inline style을 재계산할 필요 없음.
      aria-label="대학 무대예술 — 인기 공연 다섯"
    >
      {/* sticky 텍스트 레이어 */}
      <div className="unveil-sticky">
        <div className="unveil-bg-grain" aria-hidden="true" />
        <div className="unveil-bg-mineral" aria-hidden="true" />

        {/* 상단 라벨 */}
        <div className="unveil-eyebrow">
          <span>무대올림 · 운영 사유유사 SYUS</span>
          <span className="unveil-eyebrow-meta">Top 5 · 조회 · 좋아요 · 별점 종합</span>
        </div>

        {/* 헤드 카피 — 2026-06-16 사장님 직접 작성안 적용
            의도: "우리들의" 1인칭 복수형으로 운영자(이혁호)와 공연자 학생을 같은 호흡에 묶음.
            메인 ↔ /about 카피 분리 — about는 "무대올림" 브랜드 각인 유지, 메인은 이 카피로.
            띄어쓰기·마침표 한 글자도 다르지 않게. */}
        <div className="unveil-copy">
          <h1 className="unveil-headline">
            오늘도 우리들의 막이 오릅니다
          </h1>
          <p className="unveil-subline">
            대학 무대예술의 오늘을 한데 모아두고 기록하고 알립니다
          </p>
          <div className="unveil-ctas">
            <Link href="/shows" className="unveil-cta-primary">
              공연 둘러보기 →
            </Link>
            <Link href="/auth/signup" className="unveil-cta-ghost">
              무대 올리기
            </Link>
          </div>
        </div>

        {/* 대각선 포스터 흐름 */}
        <div className="unveil-posters" aria-hidden={items.length === 0}>
          {items.slice(0, POSITIONS.length).map((item, i) => {
            const pos = POSITIONS[i];
            // 각 포스터마다 진행도에 따른 y 오프셋(개별 페이즈)
            return (
              <Link
                key={item.id}
                href={`/shows/${item.id}`}
                className="unveil-poster"
                style={{
                  ["--x" as string]: `${pos.x}%`,
                  ["--y" as string]: `${pos.y}%`,
                  ["--rot" as string]: `${pos.rotate}deg`,
                  ["--scale" as string]: pos.scale,
                  ["--idx" as string]: i,
                }}
              >
                <div className="unveil-poster-frame">
                  {item.poster_url ? (
                    /*
                      2026-06-16 옵션 2 B안:
                        - unoptimized 제거 → Next.js Image 최적화 파이프라인(WebP/AVIF·리사이즈) 정상 동작
                        - priority(첫 2장) → LCP(첫 화면 큰 이미지) 가속, preload hint 자동 삽입
                        - sizes 정확화 → 브레이크포인트별 실제 폭(.unveil-poster width 토큰)과 일치
                          모바일 130 / 태블릿 180 / 데스크톱 240 / xl 300 / 1600+ 340
                    */
                    <Image
                      src={item.poster_url}
                      alt={item.title}
                      fill
                      sizes="(max-width: 767px) 130px, (max-width: 1023px) 180px, (max-width: 1279px) 240px, (max-width: 1599px) 300px, 340px"
                      className="unveil-poster-img"
                      priority={i < 2}
                    />
                  ) : (
                    <div className="unveil-poster-placeholder">
                      <span style={{ fontFamily: "var(--font-cormorant)" }}>無</span>
                    </div>
                  )}
                  <div className="unveil-poster-rank">
                    <span style={{ fontFamily: "var(--font-cormorant)" }}>{i + 1}</span>
                  </div>
                </div>
                <div className="unveil-poster-caption">
                  <p className="unveil-poster-title">{item.title}</p>
                  <p className="unveil-poster-meta">
                    {[
                      item.performer_name,
                      item.schedule_start?.replace(/-/g, ".").slice(2, 10),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 하단 진행 라인 */}
        <div className="unveil-progress-row">
          <span className="unveil-progress-label">지역 × 시기 × 장르</span>
          <div className="unveil-progress-bar">
            <div className="unveil-progress-fill" />
          </div>
          <span className="unveil-progress-label">↓ 공연 발견</span>
        </div>
      </div>

      <style>{`
        .unveil-scroll {
          position: relative;
          /* 2026-06-16 옵션 2 E안: 220vh → 160vh.
             사장님 피드백 "스크롤이 너무 길어서 묻힌다"에 대응.
             160vh로도 포스터 시차 흐름·카피 페이드 충분히 살아남.
             첫 화면(100vh)을 떠난 뒤 60vh만 더 끌고 다음 섹션으로 자연 전환. */
          height: 160vh;
          background-color: #1F1814;
        }
        .unveil-sticky {
          position: sticky;
          top: 0;
          /* 2026-06-15 2차 수정: 첫 화면 임팩트 강화 — min-height 더 키움 */
          height: 100vh;
          min-height: 720px;
          overflow: hidden;
          color: #F0EEE9;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 96px 24px 32px;
        }
        @media (min-width: 1024px) {
          /* 시원한 좌우 여백 — 1800px 풀폭과 맞춘다 */
          .unveil-sticky { padding: 120px 72px 40px; min-height: 820px; }
        }
        @media (min-width: 1600px) {
          .unveil-sticky { padding: 128px 96px 44px; }
        }
        .unveil-bg-mineral {
          position: absolute;
          inset: 0;
          /* 2026-06-15 3차: 4색 그라데이션 — Teal(상단 좌)·Silhouette 다크(하단 우) */
          background:
            radial-gradient(70% 60% at 30% 30%, rgba(11, 85, 99, 0.85), transparent 60%),
            radial-gradient(60% 60% at 75% 70%, rgba(31, 24, 20, 0.95), transparent 70%),
            linear-gradient(180deg, #1F1814 0%, #4A3B33 100%);
          z-index: 0;
        }
        .unveil-bg-grain {
          position: absolute;
          inset: 0;
          opacity: 0.06;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          z-index: 1;
        }

        .unveil-eyebrow {
          position: relative;
          z-index: 3;
          /* 2026-06-15 2차: 페이지 폭 확장 (1800px) */
          max-width: 1800px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          font-family: var(--font-inter);
          font-size: 0.72rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          font-weight: 500;
          opacity: 0.72;
        }
        .unveil-eyebrow-meta {
          /* 어두운 배경 위 Damson은 안 보임 — Damson 라이트 변형 토큰 사용 */
          color: var(--color-damson-light);
          font-weight: 600;
          opacity: 0.95;
        }

        .unveil-copy {
          position: relative;
          z-index: 3;
          /* 2026-06-15 2차: 1800px 풀폭 + 좌우 시원한 여백 */
          max-width: 1800px;
          margin: 0 auto;
          width: 100%;
          align-self: center;
          /* 스크롤이 진행될수록 카피는 약간 위로 + opacity 살짝 감소 */
          transform: translate3d(0, calc(var(--p, 0) * -40px), 0);
          opacity: calc(1 - var(--p, 0) * 0.5);
          pointer-events: auto;
        }
        /* 2026-06-15 2차: "무대올림" 브랜드 각인 — 매우 크게 */
        .unveil-headline {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(4.4rem, 11vw, 9.5rem);
          font-weight: 700;
          line-height: 1.02;
          letter-spacing: -0.04em;
          color: #F0EEE9;
          margin-bottom: 36px;
          word-break: keep-all;
          text-wrap: balance;
          max-width: 100%;
        }
        /* "올림" 강조 — 어두운 배경 위 Damson 라이트 변형 토큰
           (메모리 §1 강조 한·두 글자 예외 범위) */
        .unveil-headline-accent {
          color: var(--color-damson-light);
        }
        /* 부제 — 한 줄에 한 호흡, 콤마 뒤 줄바꿈은 마크업의 <br/>로 처리 */
        .unveil-subline {
          font-family: var(--font-noto-sans-kr);
          font-size: clamp(1.05rem, 1.8vw, 1.35rem);
          color: rgba(248, 249, 252, 0.82);
          max-width: 720px;
          line-height: 1.75;
          margin-bottom: 36px;
          word-break: keep-all;
          font-weight: 300;
          letter-spacing: 0.01em;
        }
        .unveil-ctas {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .unveil-cta-primary {
          padding: 14px 22px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          /* Damson + Cloud Dancer 텍스트 — Damson 위 Silhouette는 안 보임 */
          background-color: #5C2A42;
          color: #F0EEE9;
          text-decoration: none;
          transition: background-color 0.18s ease;
        }
        .unveil-cta-primary:hover { background-color: #6E3450; }
        .unveil-cta-ghost {
          padding: 14px 22px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          color: #F0EEE9;
          border: 1px solid rgba(248, 249, 252, 0.42);
          text-decoration: none;
        }

        /* ── 대각선 포스터 흐름 ── */
        .unveil-posters {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
        }
        .unveil-poster {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: 180px;
          pointer-events: auto;
          text-decoration: none;
          color: #F0EEE9;
          /* 스크롤 진행도(0~1)와 카드 인덱스에 따라 위로 흐른다.
             각 카드는 (idx * 8%)만큼 시작 위치 다르게 → 시차 발생. */
          transform: translate3d(
              0,
              calc(var(--p, 0) * -60vh + (var(--idx, 0) * 6vh)),
              0
            )
            rotate(var(--rot, 0deg)) scale(var(--scale, 1));
          opacity: calc(1 - max(0, var(--p, 0) - 0.7) * 3);
          transition: transform 0s; /* 스크롤 트래킹이 부드러우니 transition 0 */
          will-change: transform, opacity;
        }
        @media (min-width: 768px) {
          .unveil-poster { width: 240px; }
        }
        @media (min-width: 1280px) {
          /* 2026-06-15 2차: 포스터 더 크게 — 시선 집중 */
          .unveil-poster { width: 300px; }
        }
        @media (min-width: 1600px) {
          .unveil-poster { width: 340px; }
        }
        @media (max-width: 767px) {
          /* 모바일 — 회전 약화, 가로 위치 안쪽으로 */
          .unveil-poster {
            width: 130px;
            transform: translate3d(
                0,
                calc(var(--p, 0) * -50vh + (var(--idx, 0) * 5vh)),
                0
              )
              rotate(calc(var(--rot, 0deg) * 0.4))
              scale(var(--scale, 1));
          }
        }

        .unveil-poster-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #4A3B33;
          box-shadow:
            0 24px 48px rgba(0, 0, 0, 0.45),
            0 8px 16px rgba(27, 40, 66, 0.55);
        }
        .unveil-poster-img {
          object-fit: cover;
        }
        .unveil-poster-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(248, 249, 252, 0.4);
          background: linear-gradient(135deg, #4A3B33 0%, #0B5563 100%);
          font-size: 2.2rem;
        }
        .unveil-poster-rank {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Damson + Cloud Dancer 텍스트 (랭킹 가독성) */
          background: #5C2A42;
          color: #F0EEE9;
          font-size: 1.2rem;
          font-weight: 700;
          line-height: 1;
        }
        .unveil-poster-caption { padding-top: 12px; }
        .unveil-poster-title {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem;
          font-weight: 600;
          color: #F0EEE9;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: -0.015em;
        }
        .unveil-poster-meta {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.68rem;
          color: rgba(248, 249, 252, 0.6);
          margin-top: 4px;
          letter-spacing: 0.02em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── 진행 라인 ── */
        .unveil-progress-row {
          position: relative;
          z-index: 3;
          /* 2026-06-15 2차: 1800px 풀폭 */
          max-width: 1800px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(248, 249, 252, 0.18);
        }
        .unveil-progress-label {
          font-family: var(--font-inter);
          font-size: 0.7rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(248, 249, 252, 0.72);
          font-weight: 500;
        }
        .unveil-progress-bar {
          height: 1px;
          background: rgba(248, 249, 252, 0.18);
          position: relative;
        }
        .unveil-progress-fill {
          position: absolute;
          inset: 0;
          /* 어두운 배경 위 — Damson 라이트 변형 토큰 */
          background: var(--color-damson-light);
          transform-origin: left center;
          transform: scaleX(var(--p, 0));
        }

        @media (prefers-reduced-motion: reduce) {
          .unveil-poster,
          .unveil-copy,
          .unveil-progress-fill {
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </section>
  );
}
