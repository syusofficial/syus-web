"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError("전송 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Email Sent
          </p>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            이메일을 확인해주세요
          </h2>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
            <strong>{email}</strong>으로
            <br />
            비밀번호 재설정 링크를 보냈습니다.
            <br />
            메일함(스팸함 포함)을 확인해주세요.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 text-sm tracking-wider"
            style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#E8DDD0",
    color: "#1A1A1A",
    border: "1px solid transparent",
  };

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Password Reset
          </p>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            비밀번호 찾기
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            가입 시 사용한 이메일을 입력하시면
            <br />
            재설정 링크를 보내드립니다.
          </p>
        </div>

        {/* 소셜 로그인 가입자 안내 */}
        <div className="mb-6 p-4 text-xs leading-relaxed" style={{ backgroundColor: "#E8DDD0", color: "#6D3115", fontFamily: "var(--font-noto-sans-kr)" }}>
          <strong>Google · 카카오로 가입하셨다면?</strong>
          <br />
          비밀번호 재설정이 아닌 해당 서비스에서 직접 로그인해주세요.
          <br />
          <Link href="/auth/login" className="underline" style={{ color: "#6D3115" }}>
            로그인 페이지로 돌아가기 →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#C0392B" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm tracking-wider transition-colors mt-2"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: loading ? "#9B9693" : "#6D3115",
              color: "#F4EDE3",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "전송 중..." : "재설정 링크 받기"}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-4 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
          <Link href="/auth/login" style={{ color: "#6D3115" }}>로그인</Link>
          <span style={{ color: "#D4CFC9" }}>|</span>
          <Link href="/auth/find-id" style={{ color: "#6D3115" }}>아이디 찾기</Link>
        </div>
      </div>
    </div>
  );
}
