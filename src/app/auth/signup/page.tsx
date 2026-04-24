"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(error.message === "User already registered"
        ? "이미 가입된 이메일입니다."
        : "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#E8DDD0",
    color: "#1A1A1A",
    border: "1px solid transparent",
  };

  if (done) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Done
          </p>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            가입을 환영합니다
          </h2>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
            <strong>{email}</strong>으로 인증 메일을 보냈습니다.
            <br />
            메일함을 확인해 인증을 완료해주세요.
          </p>
          <button
            onClick={() => router.push("/auth/login")}
            className="w-full py-3 text-sm tracking-wider"
            style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Account
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            회원가입
          </h1>
        </div>

        <div className="mb-8 p-4 space-y-2" style={{ backgroundColor: "#E8DDD0" }}>
          {["공연 찜하기 · 관심 공연 저장", "공연자 신청 · 내 공연 등록 자격", "새 공연 알림 · 업데이트 수신"].map((text) => (
            <p key={text} className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
              ✓ {text}
            </p>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm outline-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              비밀번호
            </label>
            <PasswordInput value={password} onChange={setPassword} required minLength={8} />
            <p className="mt-1 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>8자 이상</p>
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
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#8B4A2A"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#6D3115"; }}
          >
            {loading ? "처리 중..." : "가입하기"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" style={{ color: "#6D3115" }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
