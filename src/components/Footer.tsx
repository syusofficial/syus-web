"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LAUNCH_PARTNERS } from "@/lib/partners";
import type { User } from "@supabase/supabase-js";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 게이트웨이(/)와 시우스(/syus*)에서는 이 무대올림 푸터를 숨긴다.
  //  - 시우스는 전용 밝은 푸터(SyusFooter)를 자체 레이아웃에서 노출.
  // 모든 hook 호출 뒤에서 조건부 반환 — hook 순서 보존(React 규칙).
  if (pathname === "/" || pathname?.startsWith("/syus")) return null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // 다크 배경(#4A3B33) 위에서는 #5A4A3E가 약 3.0:1 (AA 미달)
  // 크림 계열 흰색을 opacity 72%로 사용하면 약 9:1 — 위계는 살리고 가독성 확보
  const linkCls = "text-sm transition-colors";
  const FOOTER_LINK_BASE = "rgba(248, 249, 252, 0.72)";
  const FOOTER_LINK_HOVER = "#F0EEE9";
  const FOOTER_META = "rgba(248, 249, 252, 0.55)"; // 약 6:1 — 라벨용 보조 정보
  const linkStyle: React.CSSProperties = { fontFamily: "var(--font-noto-sans-kr)", color: FOOTER_LINK_BASE };

  return (
    <footer style={{ backgroundColor: "#4A3B33", color: "#F0EEE9" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <p
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#F0EEE9" }}
            >
              무대올림
            </p>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "var(--color-damson-light)", fontWeight: 600 }}
            >
              운영: 사유유사 SYUS
            </p>
            {/* 2026-07-24 신설 — 사장님 확정 미션 문장. 이 Footer는 "/" "/syus*"에서 이미 렌더 안 함(위 pathname 가드) → 무대올림 전용 안전 */}
            <p
              className="text-[0.7rem] mb-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: FOOTER_META, letterSpacing: "0.02em" }}
            >
              한국 대학 무대예술의 진흥을 향해
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: FOOTER_LINK_BASE, wordBreak: "keep-all" }}
            >
              우리는 대학 무대예술 공연을 올리고,
              <br />
              관객이 편하게 방문하여 공연을 더욱 원활히 관람할 수 있도록 이끌어 드립니다.
            </p>
          </div>

          {/* Site links */}
          <div>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: FOOTER_META }}
            >
              Site
            </p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/muol/about", label: "사유유사 소개" },
                { href: "/muol/shows", label: "공연 목록" },
                { href: "/muol/archive", label: "지난 공연" },
                { href: "/muol/faq", label: "자주 묻는 질문" },
                { href: "/muol/contact", label: "1:1 문의" },
                { href: "/muol/performer", label: "공연자 등록" },
                { href: "/muol/for-business", label: "광고주 안내" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkCls}
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = FOOTER_LINK_HOVER)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = FOOTER_LINK_BASE)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account links — 로그인 상태에 따라 조건부 표시 */}
          <div>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: FOOTER_META }}
            >
              Account
            </p>
            <div className="flex flex-col gap-3">
              {user ? (
                <>
                  <Link
                    href="/mypage"
                    className={linkCls}
                    style={linkStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.color = FOOTER_LINK_HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = FOOTER_LINK_BASE)}
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={linkCls + " text-left"}
                    style={{ ...linkStyle, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = FOOTER_LINK_HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = FOOTER_LINK_BASE)}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className={linkCls}
                    style={linkStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.color = FOOTER_LINK_HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = FOOTER_LINK_BASE)}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup"
                    className={linkCls}
                    style={linkStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.color = FOOTER_LINK_HOVER)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = FOOTER_LINK_BASE)}
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 런칭 협력사 (LAUNCH_PARTNERS 비어있으면 자동 숨김) */}
        {LAUNCH_PARTNERS.length > 0 && (
          <div className="pt-8 pb-2" style={{ borderTop: "1px solid #3A3631" }}>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: FOOTER_META }}
            >
              Launch Partners
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {LAUNCH_PARTNERS.map((p) => {
                const content = (
                  <span className="inline-flex items-baseline gap-2">
                    <span
                      className="text-sm"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F0EEE9" }}
                    >
                      {p.name}
                    </span>
                    {p.category && (
                      <span
                        className="text-xs"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", color: FOOTER_META }}
                      >
                        {p.category}
                      </span>
                    )}
                  </span>
                );
                return p.url ? (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-70"
                  >
                    {content}
                  </a>
                ) : (
                  <span key={p.name}>{content}</span>
                );
              })}
            </div>
            <p
              className="text-xs mt-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: FOOTER_META }}
            >
              SYUS 런칭과 함께해주신 협력사입니다.
            </p>
          </div>
        )}

        {/* 사업자 정보 */}
        <div
          className="pt-8 pb-8 mb-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs"
          style={{ borderTop: "1px solid #3A3631", fontFamily: "var(--font-noto-sans-kr)", color: FOOTER_LINK_BASE }}
        >
          {[
            { label: "상호", value: "사유유사" },
            { label: "대표", value: "이혁호" },
            { label: "사업자등록번호", value: "168-05-03666" },
            { label: "이메일", value: "syusflux@gmail.com" },
          ].map((item) => (
            <div key={item.label} className="flex gap-3">
              <span style={{ minWidth: "100px", color: FOOTER_META }}>{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
          <div className="flex gap-3">
            <span style={{ minWidth: "100px", color: FOOTER_META }}>카카오톡</span>
            <a
              href="https://pf.kakao.com/_xkPVTX"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: FOOTER_LINK_BASE }}
              onMouseEnter={(e) => (e.currentTarget.style.color = FOOTER_LINK_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.color = FOOTER_LINK_BASE)}
            >
              사유유사 SYUS 채널 →
            </a>
          </div>
          <div className="flex gap-3">
            <span style={{ minWidth: "100px", color: FOOTER_META }}>인스타그램</span>
            <a
              href="https://www.instagram.com/syus_official"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: FOOTER_LINK_BASE }}
              onMouseEnter={(e) => (e.currentTarget.style.color = FOOTER_LINK_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.color = FOOTER_LINK_BASE)}
            >
              @syus_official →
            </a>
          </div>
        </div>

        {/* 정책 링크 */}
        <div className="pt-6 flex flex-wrap gap-x-4 gap-y-2" style={{ borderTop: "1px solid #3A3631" }}>
          <Link
            href="/terms"
            className="text-xs transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0EEE9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A4A3E")}
          >
            이용약관
          </Link>
          <Link
            href="/privacy"
            className="text-xs transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F0EEE9", fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            개인정보처리방침
          </Link>
          <Link
            href="/muol/faq"
            className="text-xs transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0EEE9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A4A3E")}
          >
            자주 묻는 질문
          </Link>
          <Link
            href="/muol/contact"
            className="text-xs transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0EEE9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A4A3E")}
          >
            1:1 문의
          </Link>
        </div>

        {/* 저작권 */}
        <div className="pt-6 mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p
            className="text-xs tracking-wider"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            © 2026 무대올림 · 운영: 사유유사 SYUS. All rights reserved.
          </p>
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}
          >
            오늘, 어느 대학의 막이 오른다.
          </p>
        </div>
      </div>
    </footer>
  );
}
