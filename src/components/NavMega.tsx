"use client";

/**
 * NavMega — apr-in.com 스타일 메가 메뉴 NAV (2026-06-15 디자인 시안)
 *
 * 사장님 지시:
 *  - 좌측 4메뉴: 공연 · 지역 · 소개 · FAQ
 *  - 우측 3메뉴: 관리자(role=admin) · 마이페이지 · 로그인/회원가입(로그인 상태에 따라)
 *  - hover 시 한 챕터에서 여러 페이지를 한눈에 — 메가 메뉴 슬라이드 다운
 *
 * 잠금:
 *  - Mineral Stage 팔레트(#3B5A6B 메인 / #FBF8F1 배경 / #C8D96F CTA / #202833 본문 / #5F584F 보조)
 *  - 금지어(비영리·비상업적·(주)·주식회사·대표이사·공익 플랫폼·무료 서비스) 포함하지 않음
 *  - 폰트 토큰(--font-noto-sans-kr / --font-noto-serif-kr / --font-inter) 그대로
 *  - 모바일: 메가 메뉴 X, 햄버거 드로어 + 아코디언 챕터
 *
 * 접근성:
 *  - hover + focus-within 모두 메가 메뉴 열기
 *  - ESC 키로 닫기
 *  - 메가 메뉴 바깥 클릭/포커스 이탈 시 닫기
 *  - prefers-reduced-motion 시 트랜지션 0
 */

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS_EXCLUDE_ALL, GENRES } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";
import { SyusLogoSvg } from "@/components/Nav";

// ────────────────────────────────────────────────
// 메가 메뉴 챕터 정의 (라우트 전수조사 기반)
// ────────────────────────────────────────────────

type ChapterItem = { label: string; href: string; desc?: string };
type Chapter = {
  key: "shows" | "region" | "about" | "faq";
  label: string;
  // 컬럼 단위 그룹. 각 컬럼은 제목 + 짧은 설명 + 하위 페이지 리스트.
  columns: { heading: string; tagline?: string; items: ChapterItem[] }[];
  // 컬럼 외 별도 그리드 (지역 16개 같은 경우)
  grid?: { heading: string; items: ChapterItem[] };
  // 우측 강조 카드 (소개 챕터의 "공연자 신청" 같은 CTA)
  feature?: { heading: string; body: string; cta: { label: string; href: string } };
};

const CHAPTERS: Chapter[] = [
  // ── 공연 ──
  {
    key: "shows",
    label: "공연",
    columns: [
      {
        heading: "둘러보기",
        tagline: "지역·시기·장르로 좁혀 찾는다",
        items: [
          { label: "전체 공연", href: "/shows", desc: "현재 올라온 모든 무대" },
          { label: "공연 캘린더", href: "/shows/calendar", desc: "월별 일정으로 보기" },
          { label: "기록 (아카이브)", href: "/archive", desc: "끝난 무대를 모아 남긴다" },
        ],
      },
      {
        heading: "장르",
        tagline: "무대예술 8개로 펼쳐본다",
        items: GENRES.map((g) => ({
          label: g,
          href: `/shows?genre=${encodeURIComponent(g)}`,
        })),
      },
    ],
    feature: {
      heading: "학과 디렉토리",
      body: "전국 무대예술 학과를 학교·지역별로 모았습니다. 활성 학과부터 펼쳐 보세요.",
      cta: { label: "학과 디렉토리 열기", href: "/universities" },
    },
  },

  // ── 지역 ──
  {
    key: "region",
    label: "지역",
    columns: [
      {
        heading: "이 동네 무대",
        tagline: "광역시 · 도 단위로 좁혀본다",
        items: [
          { label: "전체 지역 보기", href: "/shows", desc: "모든 지역의 무대를 한 번에" },
          { label: "지금 가까운 무대", href: "/shows?sort=upcoming", desc: "곧 시작하는 공연" },
        ],
      },
    ],
    grid: {
      heading: "광역시 · 도 (16)",
      items: REGIONS_EXCLUDE_ALL.map((r) => ({
        label: r,
        href: `/shows?region=${encodeURIComponent(r)}`,
      })),
    },
  },

  // ── 소개 ──
  {
    key: "about",
    label: "소개",
    columns: [
      {
        heading: "무대올림 이야기",
        tagline: "왜, 어떻게 무대를 모으는가",
        items: [
          { label: "무대올림이란", href: "/about", desc: "정체성과 운영 원칙" },
          { label: "공연자 안내", href: "/performer", desc: "무대를 올리는 분께" },
        ],
      },
      {
        heading: "협력 · 약속",
        tagline: "함께 일할 분과의 거리감",
        items: [
          { label: "B2B 협력", href: "/for-business", desc: "기관 · 인쇄 · 광고주" },
          { label: "이용약관", href: "/terms" },
          { label: "개인정보처리방침", href: "/privacy" },
        ],
      },
    ],
    feature: {
      heading: "공연팀 게재료 없음",
      body: "공연자·학과로부터 등록·게재 수수료를 받지 않습니다. 광고·구독·제휴로 운영됩니다.",
      cta: { label: "운영 방식 자세히", href: "/about" },
    },
  },

  // ── FAQ ──
  {
    key: "faq",
    label: "FAQ",
    columns: [
      {
        heading: "자주 묻는 질문",
        tagline: "응대 전 한 번 더 살펴봅니다",
        items: [
          { label: "FAQ 전체 보기", href: "/faq", desc: "공연 등록·예약·계정" },
        ],
      },
      {
        heading: "닿는 길",
        tagline: "한 분이 직접 받습니다",
        items: [
          { label: "1:1 문의", href: "/contact", desc: "운영자가 직접 회신" },
        ],
      },
    ],
  },
];

// ────────────────────────────────────────────────
// 메가 메뉴 패널
// ────────────────────────────────────────────────

function MegaPanel({ chapter }: { chapter: Chapter }) {
  return (
    <div className="mega-panel-inner">
      <div className="mega-panel-grid">
        {/* 컬럼 그룹 */}
        {chapter.columns.map((col) => (
          <div key={col.heading} className="mega-col">
            <p className="mega-col-heading">{col.heading}</p>
            {col.tagline && <p className="mega-col-tagline">{col.tagline}</p>}
            <ul className="mega-col-list">
              {col.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="mega-item">
                    <span className="mega-item-label">{item.label}</span>
                    {item.desc && <span className="mega-item-desc">{item.desc}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* 그리드 (지역 16개 등) */}
        {chapter.grid && (
          <div className="mega-col mega-col-wide">
            <p className="mega-col-heading">{chapter.grid.heading}</p>
            <div className="mega-region-grid">
              {chapter.grid.items.map((item) => (
                <Link key={item.href} href={item.href} className="mega-region-cell">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 강조 카드 */}
        {chapter.feature && (
          <div className="mega-feature">
            <p className="mega-feature-heading">{chapter.feature.heading}</p>
            <p className="mega-feature-body">{chapter.feature.body}</p>
            <Link href={chapter.feature.cta.href} className="mega-feature-cta">
              {chapter.feature.cta.label} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────

export default function NavMega() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // 데스크탑 메가 메뉴 상태
  const [openChapter, setOpenChapter] = useState<Chapter["key"] | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  // 모바일 드로어
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileChapter, setMobileChapter] = useState<Chapter["key"] | null>(null);

  // ── auth 로드 (기존 Nav.tsx 패턴 그대로) ──
  const loadUserAndRole = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);
    if (!currentUser) {
      setRole(null);
      return;
    }

    const meta = currentUser.user_metadata ?? {};
    const isAuthPage = pathname?.startsWith("/auth/");
    if (!isAuthPage && (!meta.terms_agreed_at || !meta.privacy_agreed_at)) {
      router.replace("/auth/onboarding");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      console.error("프로필 조회 실패:", error.message);
      setRole(null);
      return;
    }
    setRole(profile?.role ?? null);
  }, [pathname, router]);

  useEffect(() => {
    const supabase = createClient();
    loadUserAndRole();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => loadUserAndRole());
    return () => subscription.unsubscribe();
  }, [loadUserAndRole]);

  useEffect(() => {
    loadUserAndRole();
  }, [pathname, loadUserAndRole]);

  // ── 메가 메뉴: ESC로 닫기 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenChapter(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── 메가 메뉴: 바깥 클릭으로 닫기 ──
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!navRef.current) return;
      if (!navRef.current.contains(e.target as Node)) setOpenChapter(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // 경로 바뀌면 메뉴 닫기
  useEffect(() => {
    setOpenChapter(null);
    setMobileOpen(false);
    setMobileChapter(null);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  const openCurrent = CHAPTERS.find((c) => c.key === openChapter);

  return (
    <nav className="navmega-root" ref={navRef} aria-label="주요 메뉴">
      {/* ── 데스크탑 ── */}
      <div className="navmega-desktop">
        <div className="navmega-row">
          {/* 좌측 4메뉴 */}
          <div
            className="navmega-left"
            onMouseLeave={() => setOpenChapter(null)}
          >
            {CHAPTERS.map((ch) => {
              const isOpen = openChapter === ch.key;
              return (
                <div
                  key={ch.key}
                  className={`navmega-item${isOpen ? " is-open" : ""}`}
                  onMouseEnter={() => setOpenChapter(ch.key)}
                  onFocus={() => setOpenChapter(ch.key)}
                >
                  <button
                    type="button"
                    className="navmega-trigger"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenChapter(isOpen ? null : ch.key)}
                  >
                    {ch.label}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 중앙 로고 */}
          <Link href="/" className="navmega-logo" aria-label="무대올림 홈">
            <SyusLogoSvg width={120} height={48} />
            <span className="navmega-logo-text">무대올림</span>
          </Link>

          {/* 우측 3메뉴 */}
          <div className="navmega-right">
            {user ? (
              <>
                {role === "admin" && (
                  <Link href="/admin" className="navmega-side navmega-side-admin">
                    관리자
                  </Link>
                )}
                <Link href="/mypage" className="navmega-side">
                  마이페이지
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="navmega-cta"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="navmega-side">
                  로그인
                </Link>
                <Link href="/auth/signup" className="navmega-cta">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 메가 패널 — 한 챕터씩 슬라이드 다운 */}
        <div
          className={`mega-panel${openCurrent ? " is-open" : ""}`}
          onMouseEnter={() => openCurrent && setOpenChapter(openCurrent.key)}
          onMouseLeave={() => setOpenChapter(null)}
          aria-hidden={!openCurrent}
        >
          {openCurrent && <MegaPanel chapter={openCurrent} />}
        </div>
      </div>

      {/* ── 모바일 ── */}
      <div className="navmega-mobile">
        <div className="navmega-mobile-row">
          <div className="navmega-mobile-spacer" />
          <Link href="/" className="navmega-logo" aria-label="무대올림 홈">
            <SyusLogoSvg width={88} height={34} />
            <span className="navmega-logo-text navmega-logo-text-sm">무대올림</span>
          </Link>
          <button
            type="button"
            className={`navmega-hamburger${mobileOpen ? " is-open" : ""}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {mobileOpen && (
          <div className="navmega-mobile-drawer">
            {CHAPTERS.map((ch) => {
              const opened = mobileChapter === ch.key;
              return (
                <div key={ch.key} className="navmega-mobile-chapter">
                  <button
                    type="button"
                    className="navmega-mobile-chapter-btn"
                    onClick={() => setMobileChapter(opened ? null : ch.key)}
                    aria-expanded={opened}
                  >
                    <span>{ch.label}</span>
                    <span className="navmega-mobile-chevron">{opened ? "▲" : "▼"}</span>
                  </button>
                  {opened && (
                    <div className="navmega-mobile-chapter-body">
                      {ch.columns.map((col) => (
                        <div key={col.heading} className="navmega-mobile-col">
                          <p className="navmega-mobile-col-heading">{col.heading}</p>
                          <ul>
                            {col.items.map((item) => (
                              <li key={item.href}>
                                <Link href={item.href} onClick={() => setMobileOpen(false)}>
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {ch.grid && (
                        <div className="navmega-mobile-col">
                          <p className="navmega-mobile-col-heading">{ch.grid.heading}</p>
                          <div className="navmega-mobile-grid">
                            {ch.grid.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className="navmega-mobile-grid-cell"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {ch.feature && (
                        <div className="navmega-mobile-feature">
                          <p className="navmega-mobile-feature-heading">
                            {ch.feature.heading}
                          </p>
                          <p className="navmega-mobile-feature-body">
                            {ch.feature.body}
                          </p>
                          <Link
                            href={ch.feature.cta.href}
                            onClick={() => setMobileOpen(false)}
                            className="navmega-mobile-feature-cta"
                          >
                            {ch.feature.cta.label} →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 계정 섹션 */}
            <div className="navmega-mobile-account">
              {user ? (
                <>
                  {role === "admin" && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)}>
                      관리자
                    </Link>
                  )}
                  <Link href="/mypage" onClick={() => setMobileOpen(false)}>
                    마이페이지
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="navmega-mobile-cta"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileOpen(false)}
                    className="navmega-mobile-cta"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ── 루트 ── */
        .navmega-root {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          background-color: #FBF8F1;
          border-bottom: 1px solid #D8D3C9;
          font-family: var(--font-noto-sans-kr);
        }

        /* ── 데스크탑 ── */
        .navmega-desktop { display: none; }
        @media (min-width: 1024px) {
          .navmega-desktop { display: block; }
          .navmega-mobile { display: none; }
        }
        .navmega-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          max-width: 1600px;
          margin: 0 auto;
          padding: 14px 32px;
          gap: 32px;
        }
        .navmega-left {
          display: flex;
          gap: 36px;
          justify-content: flex-end;
        }
        .navmega-item { position: relative; }
        .navmega-trigger {
          appearance: none;
          background: transparent;
          border: 0;
          padding: 6px 0;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          color: #202833;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .navmega-trigger:hover,
        .navmega-trigger:focus-visible,
        .navmega-item.is-open .navmega-trigger {
          color: #3B5A6B;
        }
        .navmega-item.is-open .navmega-trigger::after {
          content: "";
          display: block;
          height: 1px;
          background: #3B5A6B;
          margin-top: 4px;
        }

        .navmega-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          text-decoration: none;
        }
        .navmega-logo-text {
          font-family: var(--font-noto-serif-kr);
          color: #3B5A6B;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          line-height: 1;
        }
        .navmega-logo-text-sm { font-size: 0.7rem; }

        .navmega-right {
          display: flex;
          gap: 22px;
          align-items: center;
          justify-content: flex-start;
        }
        .navmega-side {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.9rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: #202833;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .navmega-side:hover { color: #3B5A6B; }
        .navmega-side-admin { color: #3B5A6B; }
        .navmega-cta {
          appearance: none;
          border: 0;
          padding: 10px 18px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          background-color: #3B5A6B;
          color: #FBF8F1;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.15s ease;
        }
        .navmega-cta:hover { background-color: #2D4554; }

        /* ── 메가 패널 ── */
        .mega-panel {
          position: absolute;
          left: 0; right: 0;
          background-color: #FBF8F1;
          border-bottom: 1px solid #D8D3C9;
          box-shadow: 0 12px 24px rgba(32, 40, 51, 0.08);
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.28s ease, opacity 0.18s ease;
        }
        .mega-panel.is-open {
          max-height: 560px;
          opacity: 1;
        }
        .mega-panel-inner {
          max-width: 1600px;
          margin: 0 auto;
          padding: 32px 32px 40px;
        }
        .mega-panel-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 32px;
        }
        .mega-col { grid-column: span 3; }
        .mega-col-wide { grid-column: span 6; }
        .mega-feature {
          grid-column: span 3;
          padding: 22px;
          background-color: #F0EBE0;
          border-left: 2px solid #C8D96F;
        }

        .mega-col-heading {
          font-family: var(--font-inter);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #3B5A6B;
          margin-bottom: 4px;
        }
        .mega-col-tagline {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.75rem;
          color: #5F584F;
          margin-bottom: 14px;
          line-height: 1.5;
        }
        .mega-col-list { list-style: none; margin: 0; padding: 0; }
        .mega-item {
          display: block;
          padding: 8px 0;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.15s ease;
        }
        .mega-item:hover { border-bottom-color: #D8D3C9; }
        .mega-item-label {
          display: block;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.9rem;
          font-weight: 500;
          color: #202833;
          letter-spacing: 0.02em;
        }
        .mega-item:hover .mega-item-label { color: #3B5A6B; }
        .mega-item-desc {
          display: block;
          margin-top: 3px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.72rem;
          color: #5F584F;
          letter-spacing: 0.02em;
        }

        .mega-region-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 8px;
        }
        .mega-region-cell {
          padding: 10px 8px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.8rem;
          color: #202833;
          background-color: #F0EBE0;
          text-align: center;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .mega-region-cell:hover {
          background-color: #3B5A6B;
          color: #FBF8F1;
        }

        .mega-feature-heading {
          font-family: var(--font-noto-serif-kr);
          font-size: 1rem;
          font-weight: 700;
          color: #3B5A6B;
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }
        .mega-feature-body {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.8rem;
          color: #202833;
          line-height: 1.6;
          margin-bottom: 14px;
          word-break: keep-all;
        }
        .mega-feature-cta {
          display: inline-block;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: #3B5A6B;
          text-decoration: none;
          border-bottom: 1px solid #3B5A6B;
          padding-bottom: 2px;
        }

        /* ── 모바일 ── */
        .navmega-mobile-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
        }
        .navmega-mobile-spacer { width: 32px; }
        .navmega-hamburger {
          appearance: none;
          background: transparent;
          border: 0;
          width: 32px;
          height: 28px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: flex-end;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }
        .navmega-hamburger span {
          display: block;
          height: 1px;
          width: 22px;
          background-color: #202833;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .navmega-hamburger.is-open span:nth-child(1) {
          transform: rotate(45deg) translate(4px, 4px);
        }
        .navmega-hamburger.is-open span:nth-child(2) { opacity: 0; }
        .navmega-hamburger.is-open span:nth-child(3) {
          transform: rotate(-45deg) translate(4px, -4px);
        }

        .navmega-mobile-drawer {
          border-top: 1px solid #D8D3C9;
          background-color: #FBF8F1;
          padding: 12px 20px 28px;
          max-height: calc(100vh - 64px);
          overflow-y: auto;
        }
        .navmega-mobile-chapter {
          border-bottom: 1px solid #E5E0D5;
        }
        .navmega-mobile-chapter-btn {
          appearance: none;
          background: transparent;
          border: 0;
          width: 100%;
          padding: 16px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--font-noto-sans-kr);
          font-size: 1rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: #202833;
          cursor: pointer;
        }
        .navmega-mobile-chevron { color: #5F584F; font-size: 0.7rem; }
        .navmega-mobile-chapter-body {
          padding-bottom: 16px;
        }
        .navmega-mobile-col + .navmega-mobile-col { margin-top: 16px; }
        .navmega-mobile-col-heading {
          font-family: var(--font-inter);
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #3B5A6B;
          margin-bottom: 8px;
        }
        .navmega-mobile-col ul {
          list-style: none; margin: 0; padding: 0;
        }
        .navmega-mobile-col li a {
          display: block;
          padding: 10px 0;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.92rem;
          color: #202833;
          text-decoration: none;
        }
        .navmega-mobile-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 6px;
        }
        .navmega-mobile-grid-cell {
          padding: 10px 4px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          color: #202833;
          background-color: #F0EBE0;
          text-align: center;
          text-decoration: none;
        }
        .navmega-mobile-feature {
          margin-top: 16px;
          padding: 14px;
          background-color: #F0EBE0;
          border-left: 2px solid #C8D96F;
        }
        .navmega-mobile-feature-heading {
          font-family: var(--font-noto-serif-kr);
          font-size: 0.95rem;
          font-weight: 700;
          color: #3B5A6B;
          margin-bottom: 6px;
        }
        .navmega-mobile-feature-body {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          color: #202833;
          line-height: 1.55;
          margin-bottom: 10px;
          word-break: keep-all;
        }
        .navmega-mobile-feature-cta {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          font-weight: 600;
          color: #3B5A6B;
          text-decoration: none;
          border-bottom: 1px solid #3B5A6B;
          padding-bottom: 2px;
        }
        .navmega-mobile-account {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #D8D3C9;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .navmega-mobile-account > a {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.92rem;
          color: #202833;
          text-decoration: none;
          padding: 6px 0;
        }
        .navmega-mobile-cta {
          appearance: none;
          border: 0;
          padding: 14px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          background-color: #3B5A6B;
          color: #FBF8F1;
          text-decoration: none;
          text-align: center;
          cursor: pointer;
        }

        @media (prefers-reduced-motion: reduce) {
          .mega-panel,
          .navmega-hamburger span,
          .navmega-trigger,
          .navmega-side,
          .navmega-cta { transition: none; }
        }
      `}</style>
    </nav>
  );
}
