"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LAUNCH_PARTNERS } from "@/lib/partners";
import type { User } from "@supabase/supabase-js";

export default function Footer() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const linkCls = "text-sm transition-colors";
  const linkStyle: React.CSSProperties = { fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" };

  return (
    <footer style={{ backgroundColor: "#1A1A1A", color: "#FBF8F1" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <p
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1" }}
            >
              무대올림
            </p>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
            >
              운영: 사유유사 SYUS
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C", wordBreak: "keep-all" }}
            >
              대학 무대예술 공연을 올리고,
              <br />
              지역 관객이 무료 좌석을 예약하는 곳.
            </p>
          </div>

          {/* Site links */}
          <div>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
            >
              Site
            </p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/about", label: "사유유사 소개" },
                { href: "/shows", label: "공연 목록" },
                { href: "/archive", label: "지난 공연" },
                { href: "/faq", label: "자주 묻는 질문" },
                { href: "/contact", label: "1:1 문의" },
                { href: "/performer", label: "공연자 등록" },
                { href: "/for-business", label: "광고주 안내" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkCls}
                  style={linkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
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
              style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
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
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={linkCls + " text-left"}
                    style={{ ...linkStyle, background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
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
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup"
                    className={linkCls}
                    style={linkStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
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
              style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
            >
              Launch Partners
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {LAUNCH_PARTNERS.map((p) => {
                const content = (
                  <span className="inline-flex items-baseline gap-2">
                    <span
                      className="text-sm"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#FBF8F1" }}
                    >
                      {p.name}
                    </span>
                    {p.category && (
                      <span
                        className="text-xs"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#8E8579" }}
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
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#8E8579" }}
            >
              SYUS 런칭과 함께해주신 협력사입니다.
            </p>
          </div>
        )}

        {/* 사업자 정보 */}
        <div
          className="pt-8 pb-8 mb-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs"
          style={{ borderTop: "1px solid #3A3631", fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
        >
          {[
            { label: "상호", value: "사유유사" },
            { label: "대표", value: "이혁호" },
            { label: "사업자등록번호", value: "168-05-03666" },
            { label: "이메일", value: "syusflux@gmail.com" },
          ].map((item) => (
            <div key={item.label} className="flex gap-3">
              <span style={{ minWidth: "100px", color: "#8E8579" }}>{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
          <div className="flex gap-3">
            <span style={{ minWidth: "100px", color: "#8E8579" }}>카카오톡</span>
            <a
              href="http://pf.kakao.com/_xkPVTX"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "#7A746C" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
            >
              사유유사 SYUS 채널 →
            </a>
          </div>
          <div className="flex gap-3">
            <span style={{ minWidth: "100px", color: "#8E8579" }}>인스타그램</span>
            <a
              href="https://www.instagram.com/syus_official"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: "#7A746C" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
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
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
          >
            이용약관
          </Link>
          <Link
            href="/privacy"
            className="text-xs transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#FBF8F1", fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            개인정보처리방침
          </Link>
          <Link
            href="/faq"
            className="text-xs transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
          >
            자주 묻는 질문
          </Link>
          <Link
            href="/contact"
            className="text-xs transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#FBF8F1")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#7A746C")}
          >
            1:1 문의
          </Link>
        </div>

        {/* 저작권 */}
        <div className="pt-6 mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p
            className="text-xs tracking-wider"
            style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
          >
            © 2026 무대올림 · 운영: 사유유사 SYUS. All rights reserved.
          </p>
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}
          >
            오늘, 어느 대학의 막이 오른다.
          </p>
        </div>
      </div>
    </footer>
  );
}
