"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    // 역할 확인 후 리다이렉트
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/");
    }
    router.refresh();
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#E8DDD0",
    color: "#1A1A1A",
    border: "1px solid transparent",
  };

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Account
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            로그인
          </h1>
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

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              비밀번호
            </label>
            <PasswordInput value={password} onChange={setPassword} required />
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
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
          <Link
            href="/auth/find-id"
            style={{ color: "#9B9693" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#6D3115")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9B9693")}
          >
            아이디 찾기
          </Link>
          <span style={{ color: "#D4CFC9" }}>|</span>
          <Link
            href="/auth/forgot-password"
            style={{ color: "#9B9693" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#6D3115")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9B9693")}
          >
            비밀번호 찾기
          </Link>
        </div>

        <p className="mt-8 text-center text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
          아직 계정이 없으신가요?{" "}
          <Link href="/auth/signup" style={{ color: "#6D3115" }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
