"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#1A1A1A", color: "#F4EDE3" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <p
              className="text-2xl font-light tracking-[0.2em] mb-2"
              style={{ fontFamily: "var(--font-cormorant)", color: "#F4EDE3" }}
            >
              SYUS
            </p>
            <p
              className="text-xs tracking-[0.3em] mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              思惟流沙
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
            >
              깊게 생각하고, 얕게 말합니다.
            </p>
          </div>

          {/* Site links */}
          <div>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              Site
            </p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/shows", label: "공연 목록" },
                { href: "/contact", label: "문의" },
                { href: "/performer", label: "공연자 등록" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm transition-colors"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F4EDE3")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9B9693")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account links */}
          <div>
            <p
              className="text-xs tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              Account
            </p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/auth/login", label: "로그인" },
                { href: "/auth/signup", label: "회원가입" },
                { href: "/mypage", label: "마이페이지" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm transition-colors"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#F4EDE3")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9B9693")}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div
          className="pt-8 pb-8 mb-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs"
          style={{ borderTop: "1px solid #2C2C2C", fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
        >
          {[
            { label: "상호", value: "(주)사유유사" },
            { label: "대표", value: "이혁호" },
            { label: "사업자등록번호", value: "168-05-03666" },
            { label: "이메일", value: "syusflux@gmail.com" },
          ].map((item) => (
            <div key={item.label} className="flex gap-3">
              <span style={{ minWidth: "100px", color: "#6D6560" }}>{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 저작권 */}
        <div
          className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{ borderTop: "1px solid #2C2C2C" }}
        >
          <p
            className="text-xs tracking-wider"
            style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
          >
            © 2026 SYUS · 사유유사. All rights reserved.
          </p>
          <p
            className="text-xs italic"
            style={{ fontFamily: "var(--font-cormorant)", color: "#9B9693" }}
          >
            Think deeply. Speak lightly.
          </p>
        </div>
      </div>
    </footer>
  );
}
