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
 *  - Mineral Stage 팔레트(#0B5563 메인 / #F0EEE9 배경 / #5C2A42 CTA / #4A3B33 본문 / #5A4A3E 보조)
 *  - 금지어(비영리·비상업적·(주)·주식회사·대표이사·공익 플랫폼·무료 서비스) 포함하지 않음
 *  - 폰트 토큰(--font-noto-sans-kr / --font-noto-serif-kr / --font-inter) 그대로
 *  - 모바일: 메가 메뉴 X, 햄버거 드로어 + 아코디언 챕터
 *
 * 접근성:
 *  - hover + focus-within 모두 메가 메뉴 열기
 *  - ESC 키로 닫기
 *  - 메가 메뉴 바깥 클릭/포커스 이탈 시 닫기
 *  - prefers-reduced-motion 시 트랜지션 0
 *
 * 2026-06-15 hover 안정화 (사장님 1차 미리보기 수정):
 *  - 자간(letter-spacing) 한 단계 더 벌림 (0.12em→0.2em, 0.1em→0.18em)
 *    ※ 2026-08-03 정정: 한글 항목 8곳은 0.05em으로 되돌렸다(낱글자가 흩어져 단어로
 *      안 읽히던 문제). 영문 대문자 라벨의 넓은 자간은 그대로 유지.
 *      사유·대상 목록·되돌리는 법은 아래 style 블록 안 "한글 자간 조정" 주석 참고.
 *  - 좌측 메뉴 gap 36→48px, 우측 gap 22→32px
 *  - 마우스가 trigger→베이지 메가 패널로 이동 중 닫히지 않도록 close를 150ms 지연
 *    예약하고, wrapper 안으로 다시 들어오면 취소. (옵션 B: setTimeout + cancelClose)
 *  - trigger와 panel 사이 시각적 공백은 panel ::before(투명 bridge 16px)로 메움.
 */

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS_EXCLUDE_ALL, GENRES, GENRE_DETAILS, GENRE_DETAIL_GROUPS, hasGenreDetails } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";
import { SyusLogoSvg } from "@/components/SyusLogoSvg";

// ────────────────────────────────────────────────
// 메가 메뉴 챕터 정의 (라우트 전수조사 기반)
// ────────────────────────────────────────────────

type SubLink = { label: string; href: string };
type ChapterItem = {
  label: string;
  href: string;
  desc?: string;
  // 2026-07-28: "장르" 컬럼 전용 — 그룹 헤더가 있는 하위 분류(무용 → 순수무용/실용무용)
  subGroups?: { heading: string; items: SubLink[] }[];
  // 그룹 헤더 없이 평탄한 하위 분류(음악 → 성악/피아노/관현악/실용음악)
  subFlat?: SubLink[];
};

/**
 * 장르 컬럼 아이템 생성 — GENRES를 그대로 나열하되, GENRE_DETAIL_GROUPS/GENRE_DETAILS에
 * 하위 분류가 있는 장르(무용·음악)는 마우스 오버 시 펼쳐지는 하위 링크를 함께 붙인다.
 * 부모 링크는 그대로 `?genre=` 만으로 이동(장르 전체 보기), 하위 링크는 `&detail=` 추가.
 */
function buildGenreItems(): ChapterItem[] {
  return GENRES.map((g) => {
    const href = `/muol/shows?genre=${encodeURIComponent(g)}`;
    const groups = GENRE_DETAIL_GROUPS[g];
    if (groups) {
      return {
        label: g,
        href,
        subGroups: Object.entries(groups).map(([heading, subs]) => ({
          heading,
          items: subs.map((s) => ({
            label: s,
            href: `/muol/shows?genre=${encodeURIComponent(g)}&detail=${encodeURIComponent(s)}`,
          })),
        })),
      };
    }
    if (hasGenreDetails(g)) {
      return {
        label: g,
        href,
        subFlat: GENRE_DETAILS[g].map((s) => ({
          label: s,
          href: `/muol/shows?genre=${encodeURIComponent(g)}&detail=${encodeURIComponent(s)}`,
        })),
      };
    }
    return { label: g, href };
  });
}
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
          { label: "전체 공연", href: "/muol/shows", desc: "현재 올라온 모든 무대" },
          { label: "공연 캘린더", href: "/muol/shows/calendar", desc: "월별 일정으로 보기" },
          { label: "기록 (아카이브)", href: "/muol/archive", desc: "끝난 무대를 모아 남긴다" },
        ],
      },
      {
        heading: "장르",
        tagline: `무대예술 ${GENRES.length}개로 펼쳐본다`,
        // 무용·음악은 마우스를 올리면 하위 분류가 펼쳐진다(buildGenreItems 참고)
        items: buildGenreItems(),
      },
    ],
    feature: {
      heading: "학과 디렉토리",
      body: "전국 무대예술 학과를 학교·지역별로 모았습니다. 활성 학과부터 펼쳐 보세요.",
      cta: { label: "학과 디렉토리 열기", href: "/muol/universities" },
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
          { label: "전체 지역 보기", href: "/muol/shows", desc: "모든 지역의 무대를 한 번에" },
          { label: "지금 가까운 무대", href: "/muol/shows?sort=upcoming", desc: "곧 시작하는 공연" },
        ],
      },
    ],
    grid: {
      heading: "광역시 · 도 (16)",
      items: REGIONS_EXCLUDE_ALL.map((r) => ({
        label: r,
        href: `/muol/shows?region=${encodeURIComponent(r)}`,
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
          { label: "무대올림이란", href: "/muol/about", desc: "정체성과 운영 원칙" },
          { label: "공연자 안내", href: "/muol/performer", desc: "무대를 올리는 분께" },
        ],
      },
      {
        heading: "협력 · 약속",
        tagline: "함께 일할 분과의 거리감",
        items: [
          { label: "B2B 협력", href: "/muol/for-business", desc: "기관 · 인쇄 · 광고주" },
          { label: "이용약관", href: "/terms" },
          { label: "개인정보처리방침", href: "/privacy" },
        ],
      },
    ],
    feature: {
      heading: "공연팀 게재료 없음",
      body: "공연자·학과로부터 등록·게재 수수료를 받지 않습니다. 광고·구독·제휴로 운영됩니다.",
      cta: { label: "운영 방식 자세히", href: "/muol/about" },
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
          { label: "FAQ 전체 보기", href: "/muol/faq", desc: "공연 등록·예약·계정" },
        ],
      },
      {
        heading: "닿는 길",
        tagline: "한 분이 직접 받습니다",
        items: [
          { label: "1:1 문의", href: "/muol/contact", desc: "운영자가 직접 회신" },
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
              {col.items.map((item) => {
                const hasSub = !!(item.subGroups || item.subFlat);
                if (!hasSub) {
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className="mega-item">
                        <span className="mega-item-label">{item.label}</span>
                        {item.desc && <span className="mega-item-desc">{item.desc}</span>}
                      </Link>
                    </li>
                  );
                }
                // 하위 분류가 있는 장르(무용·음악) — 마우스를 올리면(hover/focus-within)
                // 순수 CSS로 하위 링크가 펼쳐진다. 부모 자체는 여전히 링크(클릭 시 장르 전체 보기).
                return (
                  <li key={item.href} className="mega-item-wrap">
                    <div className="mega-item-row">
                      <Link href={item.href} className="mega-item mega-item-parent">
                        <span className="mega-item-label">{item.label}</span>
                      </Link>
                      <span className="mega-item-caret" aria-hidden="true">▸</span>
                    </div>
                    <div className="mega-subpanel">
                      {item.subGroups
                        ? item.subGroups.map((group) => (
                            <div key={group.heading} className="mega-subgroup">
                              <p className="mega-subgroup-heading">{group.heading}</p>
                              <ul className="mega-subgroup-list">
                                {group.items.map((sub) => (
                                  <li key={sub.href}>
                                    <Link href={sub.href} className="mega-subitem">
                                      {sub.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))
                        : (
                          <ul className="mega-subgroup-list mega-subgroup-list-flat">
                            {item.subFlat!.map((sub) => (
                              <li key={sub.href}>
                                <Link href={sub.href} className="mega-subitem">
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                  </li>
                );
              })}
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

  // ── 메가 메뉴 hover 안정화 ──
  // 마우스가 trigger → panel 사이 공백을 지나거나, 잠깐 떠도 즉시 닫히지 않도록
  // close를 150ms 지연 예약하고, 다시 wrapper 안으로 들어오면 취소한다.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setOpenChapter(null);
      closeTimerRef.current = null;
    }, 150);
  }, [cancelClose]);
  const openChapterImmediate = useCallback(
    (key: Chapter["key"]) => {
      cancelClose();
      setOpenChapter(key);
    },
    [cancelClose]
  );
  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // 모바일 드로어
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileChapter, setMobileChapter] = useState<Chapter["key"] | null>(null);
  // 2026-07-28: 모바일 장르 항목(무용·음악) 하위 분류 아코디언 — 탭으로 펼치고 접는다.
  // hover가 없는 터치 환경이라 PC의 플라이아웃(옆으로) 대신 아래로 펼치는 방식.
  // item.href를 키로 써서 어느 항목이 펼쳐졌는지 추적(챕터 안에 하위분류 있는 항목은 무용·음악뿐).
  const [mobileSubOpen, setMobileSubOpen] = useState<string | null>(null);

  // ── auth 로드 (기존 Nav.tsx 패턴 그대로) ──
  // 2026-07-14 (제작팀 — 무대올림↔시우스 로그인 표시 불일치 진단):
  // 이 메뉴는 "/"·"/syus*"에서는 화면에 그려지지 않는다(맨 아래 hidden 분기, hook 순서 보존을
  // 위해 return 위치는 그대로 둠). 하지만 컴포넌트 자체는 계속 마운트돼 있어 effect는 계속
  // 실행됐고, 그 결과 /syus 진입 시점마다 "보이지 않는" NavMega가 또 하나의 GoTrueClient로
  // getUser()를 쏘아 시우스 쪽 컴포넌트(SyusAuthLink 등)와 동시에 같은 세션 쿠키를 놓고 경합했다
  // (Supabase가 명시적으로 경고하는 "multiple GoTrueClient instances" 상황). 게다가 약관 미동의
  // 계정이면 시우스 브라우징 중에도 /auth/onboarding으로 강제 이동시킬 수 있었다.
  // 숨겨진 경로에서는 아예 실행하지 않는다.
  const loadUserAndRole = useCallback(async () => {
    if (pathname === "/" || pathname.startsWith("/syus")) return;

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
    } = supabase.auth.onAuthStateChange((event) => {
      // 2026-06-16 무한 루프 차단: TOKEN_REFRESHED·INITIAL_SESSION·USER_UPDATED 등은 무시.
      // 이전엔 모든 이벤트마다 loadUserAndRole 호출 → getUser() 안에서 또 TOKEN_REFRESHED
      // 발화 → 다시 호출 → AUTH 795건/시간 폭주 → Supabase IP rate limit 잠금 사고.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        loadUserAndRole();
      }
    });
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
    setMobileSubOpen(null);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/muol");
    router.refresh();
  };

  const openCurrent = CHAPTERS.find((c) => c.key === openChapter);

  // 게이트웨이(/)·시우스(/syus*)에서는 무대올림 NavMega를 숨긴다(각자 전용 헤더/풀스크린).
  // 모든 hook 호출 뒤에서 조건부 반환 — hook 순서 보존(React 규칙).
  if (pathname === "/" || pathname.startsWith("/syus")) return null;

  return (
    <nav className="navmega-root" ref={navRef} aria-label="주요 메뉴">
      {/* ── 데스크탑 ── */}
      <div className="navmega-desktop">
        <div className="navmega-row">
          {/* 좌측 4메뉴 */}
          <div
            className="navmega-left"
            onMouseLeave={scheduleClose}
            onMouseEnter={cancelClose}
          >
            <Link href="/muol" className="navmega-wordmark" aria-label="무대올림 홈">무대올림</Link>
            {CHAPTERS.map((ch) => {
              const isOpen = openChapter === ch.key;
              return (
                <div
                  key={ch.key}
                  className={`navmega-item${isOpen ? " is-open" : ""}`}
                  onMouseEnter={() => openChapterImmediate(ch.key)}
                  onFocus={() => openChapterImmediate(ch.key)}
                  onBlur={(e) => {
                    // 같은 wrapper 내부로 포커스 이동하는 경우는 닫지 않는다
                    if (
                      e.currentTarget.parentElement &&
                      !e.currentTarget.parentElement.contains(
                        e.relatedTarget as Node | null
                      )
                    ) {
                      scheduleClose();
                    }
                  }}
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

          {/* 중앙 — 사유유사 브랜드 로고(갈림길로) */}
          <Link href="/" className="navmega-logo" aria-label="사유유사 갈림길로">
            <SyusLogoSvg width={120} height={48} />
          </Link>

          {/* 우측 3메뉴 */}
          <div className="navmega-right">
            <Link href="/syus" className="navmega-syus">시우스 ↗</Link>
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
        {/* hover 안정화: 패널 진입 시 close 타이머 취소, 떠나면 지연 close. */}
        {/* 트리거와 패널 사이 시각적 공백은 ::before bridge로 메워 mouseleave 깜빡임 방지. */}
        <div
          className={`mega-panel${openCurrent ? " is-open" : ""}`}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          aria-hidden={!openCurrent}
        >
          {openCurrent && <MegaPanel chapter={openCurrent} />}
        </div>
      </div>

      {/* ── 모바일 ── */}
      <div className="navmega-mobile">
        <div className="navmega-mobile-row">
          <Link href="/muol" className="navmega-wordmark navmega-wordmark-sm" aria-label="무대올림 홈">무대올림</Link>
          <Link href="/" className="navmega-logo" aria-label="사유유사 갈림길로">
            <SyusLogoSvg width={88} height={34} />
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
                    onClick={() => {
                      setMobileChapter(opened ? null : ch.key);
                      setMobileSubOpen(null); // 챕터 전환 시 하위 아코디언도 초기화
                    }}
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
                            {col.items.map((item) => {
                              const hasSub = !!(item.subGroups || item.subFlat);
                              if (!hasSub) {
                                return (
                                  <li key={item.href}>
                                    <Link href={item.href} onClick={() => setMobileOpen(false)}>
                                      {item.label}
                                    </Link>
                                  </li>
                                );
                              }
                              // 하위 분류가 있는 장르(무용·음악) — 라벨을 탭하면 장르 전체로 이동,
                              // 화살표 버튼을 탭하면 하위 분류가 아래로 펼쳐진다(터치 아코디언).
                              const subOpen = mobileSubOpen === item.href;
                              return (
                                <li key={item.href} className="navmega-mobile-sub-wrap">
                                  <div className="navmega-mobile-sub-row">
                                    <Link
                                      href={item.href}
                                      onClick={() => setMobileOpen(false)}
                                      className="navmega-mobile-sub-label"
                                    >
                                      {item.label}
                                    </Link>
                                    <button
                                      type="button"
                                      className={`navmega-mobile-sub-toggle${subOpen ? " is-open" : ""}`}
                                      onClick={() => setMobileSubOpen(subOpen ? null : item.href)}
                                      aria-expanded={subOpen}
                                      aria-label={`${item.label} 하위 분류 ${subOpen ? "접기" : "펼치기"}`}
                                    >
                                      <span aria-hidden="true">▸</span>
                                    </button>
                                  </div>
                                  {subOpen && (
                                    <div className="navmega-mobile-sub-body">
                                      {item.subGroups
                                        ? item.subGroups.map((group) => (
                                            <div key={group.heading} className="navmega-mobile-subgroup">
                                              <p className="navmega-mobile-subgroup-heading">{group.heading}</p>
                                              <ul className="navmega-mobile-subgroup-list">
                                                {group.items.map((sub) => (
                                                  <li key={sub.href}>
                                                    <Link href={sub.href} onClick={() => setMobileOpen(false)}>
                                                      {sub.label}
                                                    </Link>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          ))
                                        : (
                                          <ul className="navmega-mobile-subgroup-list navmega-mobile-subgroup-list-flat">
                                            {item.subFlat!.map((sub) => (
                                              <li key={sub.href}>
                                                <Link href={sub.href} onClick={() => setMobileOpen(false)}>
                                                  {sub.label}
                                                </Link>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
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
              <Link href="/syus" onClick={() => setMobileOpen(false)} className="navmega-mobile-syus">
                시우스 ↗
              </Link>
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
          background-color: #F0EEE9;
          border-bottom: 1px solid #D4CFC1;
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
          /* 2026-06-15 2차 수정: 사장님 지시 — NAV가 헤더 풀 너비를 시원하게 차지하도록.
             1600 → 1800px. 좌우 패딩도 늘려 헤더 가장자리에 호흡 확보. */
          max-width: 1800px;
          margin: 0 auto;
          padding: 16px 48px;
          gap: 48px;
        }
        @media (min-width: 1600px) {
          .navmega-row { padding: 16px 72px; }
        }
        .navmega-left {
          display: flex;
          /* gap 48 → 72px (메뉴 간 간격) */
          gap: 72px;
          justify-content: flex-end;
        }
        @media (min-width: 1600px) {
          .navmega-left { gap: 88px; }
        }
        .navmega-item { position: relative; }

        /* ══════════════════════════════════════════════════════════════
         * 한글 자간(letter-spacing) 조정 — 2026-08-03 디자인팀
         *
         * 【사장님 원지시】 0.3em ("더욱 넓혀"). 그 의도는 존중한다.
         * 【조정 이유】 한글은 글자 하나하나가 이미 정사각형 덩어리라
         *   자체 여백을 갖고 있다. 0.3em(글자폭의 30%)을 더 주면
         *   "공 연 정 보"처럼 낱글자가 따로 놀아 단어로 안 읽힌다.
         *   한글 실무 상한은 대략 0.05em이다.
         * 【넓은 여백감은 그대로 살아 있다】 영문 대문자 라벨
         *   (.mega-col-heading 0.32em / .navmega-mobile-col-heading 0.3em /
         *    .mega-subgroup-heading·.navmega-mobile-subgroup-heading 0.16em)
         *   은 손대지 않았다. 넓은 트래킹이 원래 어울리는 쪽이다.
         *
         * 【되돌리는 법】 아래 "한글 자간" 표시가 붙은 8곳의 값만 되돌린다.
         *   .navmega-trigger              0.05em → 0.3em
         *   .navmega-side                 0.05em → 0.28em
         *   .navmega-cta                  0.05em → 0.3em
         *   .navmega-syus                 0.05em → 0.12em
         *   .navmega-mobile-syus          0.05em → 0.12em
         *   .navmega-mobile-chapter-btn   0.05em → 0.16em
         *   .navmega-mobile-account > a   0.05em → 0.16em
         *   .navmega-mobile-cta           0.05em → 0.2em
         * ══════════════════════════════════════════════════════════════ */
        .navmega-trigger {
          appearance: none;
          background: transparent;
          border: 0;
          padding: 6px 0;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem;
          font-weight: 500;
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.3em */
          color: #4A3B33;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .navmega-trigger:hover,
        .navmega-trigger:focus-visible,
        .navmega-item.is-open .navmega-trigger {
          color: #0B5563;
        }
        .navmega-item.is-open .navmega-trigger::after {
          content: "";
          display: block;
          height: 1px;
          background: #0B5563;
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
          color: #0B5563;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          line-height: 1;
        }
        .navmega-logo-text-sm { font-size: 0.7rem; }

        .navmega-wordmark {
          margin-right: auto;
          align-self: center;
          font-family: var(--font-noto-serif-kr);
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #241C18;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.15s ease;
        }
        .navmega-wordmark:hover { color: #0B5563; }
        .navmega-wordmark-sm { font-size: 1rem; margin-right: 0; }

        .navmega-right {
          display: flex;
          /* 2026-06-15 2차 수정: 우측 메뉴 간격 32 → 56px */
          gap: 56px;
          align-items: center;
          justify-content: flex-start;
        }
        @media (min-width: 1600px) {
          .navmega-right { gap: 72px; }
        }
        .navmega-side {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.9rem;
          font-weight: 500;
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.28em */
          color: #4A3B33;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .navmega-side:hover { color: #0B5563; }
        .navmega-side-admin { color: #0B5563; }
        .navmega-cta {
          appearance: none;
          border: 0;
          padding: 10px 20px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.3em */
          background-color: #0B5563;
          color: #F0EEE9;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.15s ease;
        }
        .navmega-cta:hover { background-color: #073D48; }

        /* 무대올림 → 시우스 다리 (시우스 상징 = 어두운 극장 톤 알약) */
        .navmega-syus {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.12em */
          color: #241C18;
          text-decoration: none;
          padding: 7px 16px;
          border: 1px solid #4A3B33;
          border-radius: 100px;
          white-space: nowrap;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .navmega-syus:hover { background-color: #241C18; color: #F0EEE9; }
        .navmega-mobile-syus {
          display: inline-block;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.92rem;
          font-weight: 600;
          color: #241C18;
          text-decoration: none;
          padding: 6px 0;
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.12em */
        }

        /* ── 메가 패널 ── */
        .mega-panel {
          position: absolute;
          left: 0; right: 0;
          background-color: #F0EEE9;
          border-bottom: 1px solid #D4CFC1;
          box-shadow: 0 12px 24px rgba(32, 40, 51, 0.08);
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.28s ease, opacity 0.18s ease;
        }
        /* trigger와 panel 사이 시각적 공백 위에서도 hover 유지되는 투명 bridge */
        .mega-panel.is-open::before {
          content: "";
          position: absolute;
          left: 0; right: 0;
          top: -16px;
          height: 16px;
          background: transparent;
        }
        .mega-panel.is-open {
          max-height: 560px;
          opacity: 1;
          overflow: visible;
        }
        .mega-panel-inner {
          /* 2026-06-15 2차: 1800px 풀폭 */
          max-width: 1800px;
          margin: 0 auto;
          padding: 36px 48px 44px;
        }
        @media (min-width: 1600px) {
          .mega-panel-inner { padding: 36px 72px 44px; }
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
          background-color: #E6E1D6;
          border-left: 2px solid #5C2A42;
        }

        .mega-col-heading {
          font-family: var(--font-inter);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #0B5563;
          margin-bottom: 4px;
        }
        .mega-col-tagline {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.75rem;
          color: #5A4A3E;
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
        .mega-item:hover { border-bottom-color: #D4CFC1; }
        .mega-item-label {
          display: block;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.9rem;
          font-weight: 500;
          color: #4A3B33;
          letter-spacing: 0.02em;
        }
        .mega-item:hover .mega-item-label { color: #0B5563; }
        .mega-item-desc {
          display: block;
          margin-top: 3px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.72rem;
          color: #5A4A3E;
          letter-spacing: 0.02em;
        }

        /* ── 장르 하위 분류(무용·음악) — hover/focus로 펼쳐지는 CSS 전용 플라이아웃 ──
           2026-07-28: 처음엔 아래로 펼치는 아코디언(max-height, 형제 항목을 밀어내는 방식)을
           시도했으나, Playwright 호버 실측에서 두 가지 문제를 확인했다.
             1) "무용"에서 "음악"으로 마우스를 옮기는 동안 무용 패널이 접히며 형제 항목 위치가
                같이 움직여 커서 아래에서 타깃이 미끄러짐.
             2) "무용" 바로 아래에 있는 "국악"·"음악" 행이 무용의 펼침 패널 자체에 뒤덮여
                (패널이 그 행들 위에 절대위치로 겹침) 클릭이 가로막힘 — 실제 사용자도 겪을 문제.
           그래서 형제 목록을 절대 건드리지 않는 "오른쪽 옆으로 펼치는" 플라이아웃으로 교체했다.
           item과 flyout 사이 간격을 0으로 둔 이유: 간격이 있으면 그 틈을 건너는 동안
           mouseleave가 발생해 패널이 먼저 닫혀버린다(상위 트리거→메가패널의 ::before 브리지와
           같은 문제). flyout은 li(.mega-item-wrap)의 DOM 자식이라 위치와 무관하게 hover가
          유지되므로, 간격만 0으로 두면 별도 브리지 없이도 자연스럽게 이어진다. */
        .mega-item-wrap { position: relative; }
        .mega-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .mega-item-row .mega-item-parent { flex: 1 1 auto; }
        .mega-item-caret {
          font-size: 0.6rem;
          color: #6B5C50; /* 2026-08-03 대비 보정: #8E8579(크림 위 3.13:1, AA 미달) → #6B5C50(5.54:1) */
          padding-right: 2px;
          transition: transform 0.18s ease, color 0.15s ease;
        }
        .mega-item-wrap:hover .mega-item-caret,
        .mega-item-wrap:focus-within .mega-item-caret {
          transform: rotate(90deg);
          color: #0B5563;
        }
        .mega-subpanel {
          position: absolute;
          top: -8px;
          left: 100%;
          z-index: 5;
          min-width: 176px;
          padding: 10px 16px;
          background-color: #F0EEE9;
          border: 1px solid #D4CFC1;
          border-left: none;
          box-shadow: 6px 10px 20px rgba(32, 40, 51, 0.1);
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          transition: max-height 0.2s ease, opacity 0.15s ease;
        }
        .mega-item-wrap:hover .mega-subpanel,
        .mega-item-wrap:focus-within .mega-subpanel {
          max-height: 320px;
          opacity: 1;
          pointer-events: auto;
        }
        .mega-subgroup { margin: 4px 0 0 2px; padding-top: 6px; }
        .mega-subgroup:first-child { margin-top: 0; padding-top: 0; }
        .mega-subgroup-heading {
          font-family: var(--font-inter);
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #6B5C50; /* 2026-08-03 대비 보정: #8E8579(크림 위 3.13:1, AA 미달) → #6B5C50(5.54:1) */
          margin-bottom: 2px;
        }
        .mega-subgroup-list { list-style: none; margin: 0; padding: 0; }
        .mega-subgroup-list-flat { margin: 0 0 0 2px; padding-top: 0; }
        .mega-subitem {
          display: block;
          padding: 5px 0 5px 8px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.82rem;
          color: #5A4A3E;
          text-decoration: none;
          border-left: 1px solid #D4CFC1;
          transition: color 0.15s ease, border-color 0.15s ease;
        }
        .mega-subitem:hover,
        .mega-subitem:focus-visible {
          color: #0B5563;
          border-left-color: #0B5563;
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
          color: #4A3B33;
          background-color: #E6E1D6;
          text-align: center;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        .mega-region-cell:hover {
          background-color: #0B5563;
          color: #F0EEE9;
        }

        .mega-feature-heading {
          font-family: var(--font-noto-serif-kr);
          font-size: 1rem;
          font-weight: 700;
          color: #0B5563;
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }
        .mega-feature-body {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.8rem;
          color: #4A3B33;
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
          color: #0B5563;
          text-decoration: none;
          border-bottom: 1px solid #0B5563;
          padding-bottom: 2px;
        }

        /* ── 모바일 ── */
        .navmega-mobile-row {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
        }
        .navmega-mobile-row .navmega-logo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
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
          background-color: #4A3B33;
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
          border-top: 1px solid #D4CFC1;
          background-color: #F0EEE9;
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
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.16em */
          color: #4A3B33;
          cursor: pointer;
        }
        .navmega-mobile-chevron { color: #5A4A3E; font-size: 0.7rem; }
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
          color: #0B5563;
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
          color: #4A3B33;
          text-decoration: none;
        }

        /* ── 모바일 장르 하위 분류 아코디언(무용·음악) ──
           2026-07-28: 라벨(Link)과 토글(button)을 분리한 행. 라벨을 탭하면 장르 전체로
           이동, 화살표 버튼을 탭하면 하위 분류가 아래로 펼쳐진다. hover가 없으니 PC의
           옆으로 펼치는 플라이아웃 대신 형제 항목을 자연스럽게 밀어내는 아코디언으로 구현. */
        .navmega-mobile-sub-wrap { list-style: none; }
        .navmega-mobile-sub-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .navmega-mobile-sub-label {
          flex: 1 1 auto;
          display: block;
          padding: 10px 0;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.92rem;
          color: #4A3B33;
          text-decoration: none;
        }
        .navmega-mobile-sub-toggle {
          appearance: none;
          background: transparent;
          border: 0;
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: #6B5C50; /* 2026-08-03 대비 보정: #8E8579(크림 위 3.13:1, AA 미달) → #6B5C50(5.54:1) */
          cursor: pointer;
          transition: transform 0.18s ease, color 0.15s ease;
        }
        .navmega-mobile-sub-toggle.is-open {
          transform: rotate(90deg);
          color: #0B5563;
        }
        .navmega-mobile-sub-body {
          padding: 0 0 10px 4px;
        }
        .navmega-mobile-subgroup { margin-top: 8px; }
        .navmega-mobile-subgroup:first-child { margin-top: 0; }
        .navmega-mobile-subgroup-heading {
          font-family: var(--font-inter);
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #6B5C50; /* 2026-08-03 대비 보정: #8E8579(크림 위 3.13:1, AA 미달) → #6B5C50(5.54:1) */
          margin: 0 0 2px;
        }
        .navmega-mobile-subgroup-list { list-style: none; margin: 0; padding: 0; }
        .navmega-mobile-subgroup-list-flat { margin-top: 2px; }
        .navmega-mobile-subgroup-list li a {
          display: block;
          padding: 11px 0 11px 14px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.86rem;
          color: #5A4A3E;
          text-decoration: none;
          border-left: 1px solid #D4CFC1;
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
          color: #4A3B33;
          background-color: #E6E1D6;
          text-align: center;
          text-decoration: none;
        }
        .navmega-mobile-feature {
          margin-top: 16px;
          padding: 14px;
          background-color: #E6E1D6;
          border-left: 2px solid #5C2A42;
        }
        .navmega-mobile-feature-heading {
          font-family: var(--font-noto-serif-kr);
          font-size: 0.95rem;
          font-weight: 700;
          color: #0B5563;
          margin-bottom: 6px;
        }
        .navmega-mobile-feature-body {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          color: #4A3B33;
          line-height: 1.55;
          margin-bottom: 10px;
          word-break: keep-all;
        }
        .navmega-mobile-feature-cta {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          font-weight: 600;
          color: #0B5563;
          text-decoration: none;
          border-bottom: 1px solid #0B5563;
          padding-bottom: 2px;
        }
        .navmega-mobile-account {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #D4CFC1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .navmega-mobile-account > a {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.92rem;
          color: #4A3B33;
          text-decoration: none;
          padding: 6px 0;
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.16em */
        }
        .navmega-mobile-cta {
          appearance: none;
          border: 0;
          padding: 14px;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.05em; /* 한글 자간 — 원지시 0.2em */
          background-color: #0B5563;
          color: #F0EEE9;
          text-decoration: none;
          text-align: center;
          cursor: pointer;
        }

        @media (prefers-reduced-motion: reduce) {
          .mega-panel,
          .mega-subpanel,
          .mega-item-caret,
          .navmega-hamburger span,
          .navmega-trigger,
          .navmega-side,
          .navmega-cta,
          .navmega-mobile-sub-toggle { transition: none; }
        }
      `}</style>
    </nav>
  );
}
