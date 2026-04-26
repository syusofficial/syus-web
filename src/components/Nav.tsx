"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS } from "@/lib/constants";
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
      {/* 상단 가로선 */}
      <line x1="0" y1="120" x2="1000" y2="120" stroke={color} strokeWidth={sw} />
      {/* 하단 가로선 */}
      <line x1="0" y1="380" x2="1000" y2="380" stroke={color} strokeWidth={sw} />

      {/* 좌측 삼각형 (峰 x=165) */}
      <line x1="55"  y1="380" x2="165" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="165" y1="120" x2="275" y2="380" stroke={color} strokeWidth={sw} />

      {/* ─── 왼쪽 인물 그룹 ─── */}
      <line x1="305" y1="120" x2="305" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="305" y1="252" x2="358" y2="252" stroke={color} strokeWidth={swd} />
      <line x1="390" y1="120" x2="390" y2="380" stroke={color} strokeWidth={sw} />
      <circle cx="428" cy="72" r="48" stroke={color} strokeWidth={swc} fill="none" />
      <line x1="465" y1="120" x2="465" y2="380" stroke={color} strokeWidth={sw} />

      {/* ─── 오른쪽 인물 그룹 ─── */}
      <line x1="535" y1="120" x2="535" y2="380" stroke={color} strokeWidth={sw} />
      <circle cx="572" cy="72" r="48" stroke={color} strokeWidth={swc} fill="none" />
      <line x1="610" y1="120" x2="610" y2="380" stroke={color} strokeWidth={sw} />
      <line x1="642" y1="252" x2="695" y2="252" stroke={color} strokeWidth={swd} />
      <line x1="695" y1="120" x2="695" y2="380" stroke={color} strokeWidth={sw} />

      {/* 우측 삼각형 (峰 x=835) */}
      <line x1="725" y1="380" x2="835" y2="120" stroke={color} strokeWidth={sw} />
      <line x1="835" y1="120" x2="945" y2="380" stroke={color} strokeWidth={sw} />
    </svg>
  );
}

/** 공연 메뉴 호버 드롭다운 (데스크톱 전용) */
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
        onMouseEnter={(e) => (e.currentTarget.style.color = "#6D3115")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#1A1A1A")}
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
              backgroundColor: "#F4EDE3",
              border: "1px solid #D4CFC9",
              boxShadow: "0 8px 24px rgba(109, 49, 21, 0.08)",
            }}
          >
            {REGIONS.map((region) => (
              <Link
                key={region}
                href={region === "전체" ? "/shows" : `/shows?region=${encodeURIComponent(region)}`}
                className="px-2 py-1.5 text-xs transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#1A1A1A",
                  fontWeight: region === "전체" ? 600 : 400,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6D3115")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1A1A1A")}
              >
                {region}
              </Link>
            ))}
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
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const loadUserAndRole = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    if (!currentUser) { setRole(null); return; }

    // 약관 미동의 사용자는 onboarding으로 강제 이동 (인증/온보딩 페이지 자체는 제외)
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

  // 초기 로드 + 로그인/로그아웃 이벤트 감지
  useEffect(() => {
    const supabase = createClient();
    loadUserAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserAndRole();
    });

    return () => subscription.unsubscribe();
  }, [loadUserAndRole]);

  // 페이지 이동할 때마다 최신 role 재조회 (관리자 승격 반영)
  useEffect(() => {
    loadUserAndRole();
  }, [pathname, loadUserAndRole]);

  // 창 포커스 복귀 시 재조회 (다른 탭에서 역할 변경됐을 때 반영)
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
    color: "#1A1A1A",
    fontSize: "0.8125rem",
    letterSpacing: "0.08em",
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: "#F4EDE3", borderBottom: "1px solid #D4CFC9" }}
    >
      {/* Desktop — 3열 그리드 */}
      <div className="hidden md:grid grid-cols-3 items-center max-w-7xl mx-auto px-8 py-3">
        {/* Left */}
        <div className="flex items-center gap-8">
          <ShowsHoverMenu linkStyle={linkStyle} />
          <Link
            href="/contact"
            style={linkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#6D3115")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#1A1A1A")}
          >
            문의
          </Link>
        </div>

        {/* Center — Logo */}
        <Link href="/" className="flex flex-col items-center gap-1">
          <SyusLogoSvg width={160} height={64} />
          <span
            style={{
              fontFamily: "var(--font-cormorant)",
              color: "#6D3115",
              fontSize: "0.65rem",
              letterSpacing: "0.4em",
            }}
          >
            SYUS
          </span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-6 justify-end">
          {user ? (
            <>
              {role === "admin" && (
                <Link
                  href="/admin"
                  style={{ ...linkStyle, color: "#6D3115", fontWeight: 600 }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  관리자
                </Link>
              )}
              <Link
                href="/mypage"
                style={linkStyle}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6D3115")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1A1A1A")}
              >
                마이페이지
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: "#6D3115",
                  color: "#F4EDE3",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B4A2A")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6D3115")}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                style={linkStyle}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6D3115")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1A1A1A")}
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 text-xs tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: "#6D3115",
                  color: "#F4EDE3",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B4A2A")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6D3115")}
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-center justify-between px-5 py-3">
        <div className="w-8" />
        <Link href="/" className="flex flex-col items-center gap-0.5">
          <SyusLogoSvg width={110} height={44} />
          <span
            style={{
              fontFamily: "var(--font-cormorant)",
              color: "#6D3115",
              fontSize: "0.55rem",
              letterSpacing: "0.3em",
            }}
          >
            SYUS
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
              backgroundColor: "#1A1A1A",
              transform: menuOpen ? "rotate(45deg) translateY(6px)" : "none",
            }}
          />
          <span
            className="block h-px w-5 transition-all duration-200"
            style={{ backgroundColor: "#1A1A1A", opacity: menuOpen ? 0 : 1 }}
          />
          <span
            className="block h-px w-5 transition-all duration-200"
            style={{
              backgroundColor: "#1A1A1A",
              transform: menuOpen ? "rotate(-45deg) translateY(-6px)" : "none",
            }}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{ borderTop: "1px solid #D4CFC9", backgroundColor: "#F4EDE3" }}
        >
          <div className="flex flex-col px-6 py-4 gap-4">
            {/* 공연 (지역 펼치기) */}
            <div>
              <button
                className="w-full flex items-center justify-between text-left py-2"
                style={{ ...linkStyle, padding: "8px 0" }}
                onClick={() => setMobileShowsOpen(!mobileShowsOpen)}
              >
                공연
                <span style={{ color: "#9B9693", fontSize: "0.75rem" }}>
                  {mobileShowsOpen ? "▲" : "▼"}
                </span>
              </button>
              {mobileShowsOpen && (
                <div className="grid grid-cols-3 gap-1 mt-2 pb-2">
                  {REGIONS.map((region) => (
                    <Link
                      key={region}
                      href={region === "전체" ? "/shows" : `/shows?region=${encodeURIComponent(region)}`}
                      className="px-2 py-2 text-xs"
                      style={{
                        fontFamily: "var(--font-noto-sans-kr)",
                        color: "#1A1A1A",
                        backgroundColor: "#E8DDD0",
                        textAlign: "center",
                        fontWeight: region === "전체" ? 600 : 400,
                      }}
                      onClick={() => { setMenuOpen(false); setMobileShowsOpen(false); }}
                    >
                      {region}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/contact"
              style={{ ...linkStyle, padding: "8px 0" }}
              onClick={() => setMenuOpen(false)}
            >
              문의
            </Link>
            {user ? (
              <>
                {role === "admin" && (
                  <Link
                    href="/admin"
                    style={{ ...linkStyle, padding: "8px 0", color: "#6D3115", fontWeight: 600 }}
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
                    backgroundColor: "#6D3115",
                    color: "#F4EDE3",
                  }}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
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
                    backgroundColor: "#6D3115",
                    color: "#F4EDE3",
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
