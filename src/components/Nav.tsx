"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS, GENRES } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";

/**
 * 로고 구조 (viewBox 0 0 1000 400)
 *
 * 상단선 y=120, 하단선 y=380
 * 좌삼각(峰 165) | 외기둥305 ~대시~ 인물기둥390 | 구체(cx428,cy72,r48) | 내기둥465 · 내기둥535 | 구체(cx572,cy72,r48) | 인물기둥610 ~대시~ 외기둥695 | 우삼각(峰 835)
 * 세로 직각선 6개: 305, 390, 465, 535, 610, 695
 * 구체 2개: cx=428/572, cy=72, r=48 (하단 y=120 상단선에 접함)
 */
export function SyusLogoSvg({
  width = 200,
  height = 80,
  color = "#6D3115",
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  const sw = 4;
  const swd = 2.5;
  const swc = 3.5;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1000 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="0" y1="120" x2="1000" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="0" y1="380" x2="1000" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="55"  y1="380" x2="165" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="165" y1="120" x2="275" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="305" y1="120" x2="305" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="305" y1="252" x2="358" y2="252" stroke={color} strokeWidth={swd} />
      <line x1="390" y1="120" x2="390" y2="380" stroke={color} strokeWidth={sw} />
      <circle cx="428" cy="72" r="48" stroke={color} strokeWidth={swc} fill="none" />
      <line x1="465" y1="120" x2="465" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="535" y1="120" x2="535" y2="380" stroke={color} strokeWidth={sw} />
      <circle cx="572" cy="72" r="48" stroke={color} strokeWidth={swc} fill="none" />
      <line x1="610" y1="120" x2="610" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="642" y1="252" x2="695" y2="252" stroke={color} strokeWidth={swd} />
      <line x1="695" y1="120" x2="695" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="725" y1="380" x2="835" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="835" y1="120" x2="945" y2="380" stroke={color} strokeWidth={sw} />
    </svg>
  );
}

/**
 * 메뉴별 호버 컬러 차별화 (사장님 요청: 4메뉴 시각 구분)
 * 공연=미네랄 슬레이트(메인) / 기록=웜 그레이 / 소개=딥 인디고 / 도움말=페일 라임
 */
const MENU_HOVER = {
  shows: "#0B5563",
  archive: "#6B5C50",
  about: "#4A3B33",
  help: "#7BA86F",
} as const;

/** 호버 메뉴 — 메뉴별 hoverColor 지정 가능. 호버 시 underline 표시(클릭 가능 신호) */
function NavMenuLink({
  href,
  label,
  hoverColor,
  linkStyle,
}: {
  href: string;
  label: string;
  hoverColor: string;
  linkStyle: React.CSSProperties;
}) {
  return (
    <Link
      href={href}
      style={linkStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.textDecoration = "underline";
        e.currentTarget.style.textUnderlineOffset = "5px";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#4A3B33";
        e.currentTarget.style.textDecoration = "none";
      }}
    >
      {label}
    </Link>
  );
}

/** 도움말 메뉴 호버 드롭다운 — FAQ / 1:1 문의 (데스크톱) */
function ContactHoverMenu({ linkStyle }: { linkStyle: React.CSSProperties }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/faq"
        style={linkStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = MENU_HOVER.help;
          e.currentTarget.style.textDecoration = "underline";
          e.currentTarget.style.textUnderlineOffset = "5px";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#4A3B33";
          e.currentTarget.style.textDecoration = "none";
        }}
      >
        도움말
      </Link>
      {open && (
        <div className="absolute top-full left-0 pt-3" style={{ minWidth: "180px" }}>
          <div
            className="flex flex-col p-2"
            style={{
              backgroundColor: "#F0EEE9",
              border: "1px solid #D4CFC1",
              boxShadow: "0 8px 24px rgba(32, 40, 51, 0.10)",
            }}
          >
            <Link
              href="/faq"
              className="px-3 py-2 text-xs transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = MENU_HOVER.help)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#4A3B33")}
            >
              자주 묻는 질문 (FAQ)
            </Link>
            <Link
              href="/contact"
              className="px-3 py-2 text-xs transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = MENU_HOVER.help)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#4A3B33")}
            >
              1:1 문의
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** 공연 메뉴 호버 드롭다운 — 지역 16개 (데스크톱) */
function ShowsHoverMenu({ linkStyle }: { linkStyle: React.CSSProperties }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/shows"
        style={linkStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = MENU_HOVER.shows;
          e.currentTarget.style.textDecoration = "underline";
          e.currentTarget.style.textUnderlineOffset = "5px";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#4A3B33";
          e.currentTarget.style.textDecoration = "none";
        }}
      >
        공연
      </Link>
      {open && (
        <div
          className="absolute top-full left-0 pt-3"
          style={{ minWidth: "280px" }}
        >
          <div
            className="grid grid-cols-3 gap-x-2 gap-y-1 p-4"
            style={{
              backgroundColor: "#F0EEE9",
              border: "1px solid #D4CFC1",
              boxShadow: "0 8px 24px rgba(32, 40, 51, 0.10)",
            }}
          >
            {REGIONS.map((region) => (
              <Link
                key={region}
                href={region === "전체" ? "/shows" : `/shows?region=${encodeURIComponent(region)}`}
                className="px-2 py-1.5 text-xs transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#4A3B33",
                  fontWeight: region === "전체" ? 600 : 400,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = MENU_HOVER.shows)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4A3B33")}
              >
                {region}
              </Link>
            ))}
          </div>
          {/* 학과 디렉토리 — 활성 학과만 (2026-06-12 신설) */}
          <div
            className="px-4 py-2.5"
            style={{
              backgroundColor: "#E6E1D6",
              borderLeft: "1px solid #D4CFC1",
              borderRight: "1px solid #D4CFC1",
              borderBottom: "1px solid #D4CFC1",
            }}
          >
            <Link
              href="/universities"
              className="block text-xs transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#0B5563",
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = MENU_HOVER.shows)}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#0B5563")}
            >
              학과 디렉토리 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileShowsOpen, setMobileShowsOpen] = useState(false);
  const [mobileGenresOpen, setMobileGenresOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const loadUserAndRole = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    if (!currentUser) { setRole(null); return; }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserAndRole();
    });

    return () => subscription.unsubscribe();
  }, [loadUserAndRole]);

  useEffect(() => {
    loadUserAndRole();
  }, [pathname, loadUserAndRole]);

  useEffect(() => {
    const handleFocus = () => loadUserAndRole();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadUserAndRole]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    color: "#4A3B33",
    fontSize: "0.95rem",
    fontWeight: 450,
    letterSpacing: "0.12em",
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: "#F0EEE9", borderBottom: "1px solid #D4CFC1" }}
    >
      {/* Desktop — 3열 그리드 (메인 행)
       * 2026-06-02 가독성 개선: 메뉴를 로고 가까이(우측 정렬) + 진한 글씨(weight 600) + 간격 확장(gap-12)
       * 좌측 구석에 압축된 인상 해소.
       */}
      <div className="hidden md:grid grid-cols-3 items-center max-w-7xl mx-auto px-8 pt-3 pb-2">
        {/* Left — 메뉴를 우측(로고 쪽)으로 정렬해 시각 무게중심을 중앙으로 */}
        <div className="flex items-center gap-10 justify-end pr-4">
          <ShowsHoverMenu linkStyle={linkStyle} />
          <NavMenuLink href="/archive" label="기록" hoverColor={MENU_HOVER.archive} linkStyle={linkStyle} />
          <NavMenuLink href="/about" label="소개" hoverColor={MENU_HOVER.about} linkStyle={linkStyle} />
          <ContactHoverMenu linkStyle={linkStyle} />
        </div>

        {/* Center — Logo */}
        <Link href="/" className="flex flex-col items-center gap-0.5">
          <SyusLogoSvg width={140} height={56} />
          <span
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#0B5563",
              fontSize: "0.95rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            무대올림
          </span>
        </Link>

        {/* Right — 로그인/회원가입을 로고 가까이(좌측)로 정렬해 좌우 균형 */}
        <div className="flex items-center gap-6 justify-start pl-4">
          {user ? (
            <>
              {role === "admin" && (
                <Link
                  href="/admin"
                  style={{ ...linkStyle, color: "#0B5563", fontWeight: 450 }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  관리자
                </Link>
              )}
              <Link
                href="/mypage"
                style={linkStyle}
                onMouseEnter={(e) => (e.currentTarget.style.color = MENU_HOVER.shows)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4A3B33")}
              >
                마이페이지
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: "#0B5563",
                  color: "#F0EEE9",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2C7384")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0B5563")}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                style={linkStyle}
                onMouseEnter={(e) => (e.currentTarget.style.color = MENU_HOVER.shows)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4A3B33")}
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-xs tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: "#0B5563",
                  color: "#F0EEE9",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2C7384")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0B5563")}
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Desktop — 보조행: 장르 8개 직접 노출 (사장님 요청 — 1클릭 접근)
       * 2026-06-02 가독성 개선: 진한 글씨(weight 600·딥 인디고) + 간격 확장(gap-x-10) + 자간 0.1em
       */}
      <div
        className="hidden md:block"
        style={{ borderTop: "1px solid rgba(216, 211, 201, 0.6)" }}
      >
        <div className="max-w-7xl mx-auto px-8 py-2.5 flex items-center justify-center gap-x-10 gap-y-1 flex-wrap">
          <span
            className="text-[0.7rem] tracking-[0.32em] uppercase"
            style={{
              fontFamily: "var(--font-inter)",
              color: "#0B5563",
              fontWeight: 600,
            }}
          >
            Genres
          </span>
          {GENRES.map((g) => (
            <Link
              key={g}
              href={`/shows?genre=${encodeURIComponent(g)}`}
              className="text-sm transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#4A3B33",
                fontWeight: 600,
                letterSpacing: "0.1em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = MENU_HOVER.shows;
                e.currentTarget.style.textDecoration = "underline";
                e.currentTarget.style.textUnderlineOffset = "4px";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#4A3B33";
                e.currentTarget.style.textDecoration = "none";
              }}
            >
              {g}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-center justify-between px-5 py-3">
        <div className="w-8" />
        <Link href="/" className="flex flex-col items-center gap-0.5">
          <SyusLogoSvg width={96} height={38} />
          <span
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#0B5563",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            무대올림
          </span>
        </Link>
        <button
          className="flex flex-col gap-1.5 p-1 w-8 items-end"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="메뉴"
        >
          <span
            className="block h-px w-5 transition-all duration-200"
            style={{
              backgroundColor: "#4A3B33",
              transform: menuOpen ? "rotate(45deg) translateY(6px)" : "none",
            }}
          />
          <span
            className="block h-px w-5 transition-all duration-200"
            style={{ backgroundColor: "#4A3B33", opacity: menuOpen ? 0 : 1 }}
          />
          <span
            className="block h-px w-5 transition-all duration-200"
            style={{
              backgroundColor: "#4A3B33",
              transform: menuOpen ? "rotate(-45deg) translateY(-6px)" : "none",
            }}
          />
        </button>
      </div>

      {/* Mobile menu — 2단(기능 / 장르) */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{ borderTop: "1px solid #D4CFC1", backgroundColor: "#F0EEE9" }}
        >
          <div className="flex flex-col px-6 py-4 gap-4">
            {/* — 기능 섹션 — */}
            <p
              className="text-[0.65rem] tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}
            >
              Menu
            </p>

            {/* 공연 (지역 펼치기) */}
            <div>
              <button
                className="w-full flex items-center justify-between text-left py-2"
                style={{ ...linkStyle, padding: "8px 0" }}
                onClick={() => setMobileShowsOpen(!mobileShowsOpen)}
              >
                <span>공연 <span style={{ color: MENU_HOVER.shows, fontSize: "0.7rem", marginLeft: 4 }}>· 지역별</span></span>
                <span style={{ color: "#6B5C50", fontSize: "0.75rem" }}>
                  {mobileShowsOpen ? "▲" : "▼"}
                </span>
              </button>
              {mobileShowsOpen && (
                <>
                  <div className="grid grid-cols-3 gap-1 mt-2 pb-2">
                    {REGIONS.map((region) => (
                      <Link
                        key={region}
                        href={region === "전체" ? "/shows" : `/shows?region=${encodeURIComponent(region)}`}
                        className="px-2 py-2 text-xs"
                        style={{
                          fontFamily: "var(--font-noto-sans-kr)",
                          color: "#4A3B33",
                          backgroundColor: "#E6E1D6",
                          textAlign: "center",
                          fontWeight: region === "전체" ? 600 : 400,
                        }}
                        onClick={() => { setMenuOpen(false); setMobileShowsOpen(false); }}
                      >
                        {region}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/universities"
                    className="block px-2 py-2 text-xs"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      color: "#0B5563",
                      backgroundColor: "#E6E1D6",
                      textAlign: "center",
                      fontWeight: 500,
                      letterSpacing: "0.05em",
                    }}
                    onClick={() => { setMenuOpen(false); setMobileShowsOpen(false); }}
                  >
                    학과 디렉토리 →
                  </Link>
                </>
              )}
            </div>

            <Link
              href="/archive"
              style={{ ...linkStyle, padding: "8px 0", color: MENU_HOVER.archive }}
              onClick={() => setMenuOpen(false)}
            >
              기록
            </Link>
            <Link
              href="/about"
              style={{ ...linkStyle, padding: "8px 0", color: MENU_HOVER.about, fontWeight: 450 }}
              onClick={() => setMenuOpen(false)}
            >
              소개
            </Link>
            <Link
              href="/faq"
              style={{ ...linkStyle, padding: "8px 0" }}
              onClick={() => setMenuOpen(false)}
            >
              자주 묻는 질문
            </Link>
            <Link
              href="/contact"
              style={{ ...linkStyle, padding: "8px 0" }}
              onClick={() => setMenuOpen(false)}
            >
              1:1 문의
            </Link>

            {/* — 장르 섹션 — */}
            <div className="pt-3 mt-2" style={{ borderTop: "1px solid #D4CFC1" }}>
              <button
                className="w-full flex items-center justify-between text-left py-2"
                style={{ ...linkStyle, padding: "8px 0" }}
                onClick={() => setMobileGenresOpen(!mobileGenresOpen)}
              >
                <span>
                  <span className="text-[0.65rem] tracking-[0.3em] uppercase mr-2" style={{ color: "#6B5C50" }}>
                    Genres
                  </span>
                  장르별 공연
                </span>
                <span style={{ color: "#6B5C50", fontSize: "0.75rem" }}>
                  {mobileGenresOpen ? "▲" : "▼"}
                </span>
              </button>
              {mobileGenresOpen && (
                <div className="grid grid-cols-2 gap-1 mt-2 pb-2">
                  {GENRES.map((g) => (
                    <Link
                      key={g}
                      href={`/shows?genre=${encodeURIComponent(g)}`}
                      className="px-2 py-2 text-xs"
                      style={{
                        fontFamily: "var(--font-noto-sans-kr)",
                        color: "#4A3B33",
                        backgroundColor: "#E6E1D6",
                        textAlign: "center",
                      }}
                      onClick={() => { setMenuOpen(false); setMobileGenresOpen(false); }}
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* — 계정 섹션 — */}
            <div className="pt-3 mt-2" style={{ borderTop: "1px solid #D4CFC1" }}>
              {user ? (
                <div className="flex flex-col gap-3">
                  {role === "admin" && (
                    <Link
                      href="/admin"
                      style={{ ...linkStyle, padding: "8px 0", color: "#0B5563", fontWeight: 450 }}
                      onClick={() => setMenuOpen(false)}
                    >
                      관리자
                    </Link>
                  )}
                  <Link
                    href="/mypage"
                    style={{ ...linkStyle, padding: "8px 0" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="py-3 text-sm tracking-wider text-center"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      backgroundColor: "#0B5563",
                      color: "#F0EEE9",
                    }}
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/auth/login"
                    style={{ ...linkStyle, padding: "8px 0" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="py-3 text-sm tracking-wider text-center"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      backgroundColor: "#0B5563",
                      color: "#F0EEE9",
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
