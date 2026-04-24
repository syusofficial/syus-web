"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FindIdPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResults(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("find_masked_emails_by_name", {
      p_name: name.trim(),
    });

    if (error) {
      setError("조회 중 오류가 발생했습니다.");
      setLoading(false);
      return;
    }

    const emails = (data ?? []).map((row: { masked_email: string }) => row.masked_email);
    setResults(emails);
    setLoading(false);
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
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Find ID
          </p>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            아이디 찾기
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            가입 시 사용한 이름을 입력하시면
            <br />
            일부 가려진 이메일을 안내해드립니다.
          </p>
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
            {loading ? "조회 중..." : "아이디 찾기"}
          </button>
        </form>

        {/* 결과 영역 */}
        {results !== null && (
          <div className="mt-8 p-5" style={{ backgroundColor: "#E8DDD0" }}>
            {results.length === 0 ? (
              <div className="text-center space-y-2">
                <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                  일치하는 계정이 없습니다
                </p>
                <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  이름을 다시 확인해주세요.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs tracking-wider uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                  가입된 이메일
                </p>
                <div className="space-y-2">
                  {results.map((email, i) => (
                    <p key={i} className="text-base font-semibold" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                      {email}
                    </p>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  보안을 위해 일부만 표시됩니다.
                  <br />
                  전체 이메일은 가입 시 사용한 메일함에서 확인해주세요.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-4 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
          <Link href="/auth/login" style={{ color: "#6D3115" }}>로그인</Link>
          <span style={{ color: "#D4CFC9" }}>|</span>
          <Link href="/auth/forgot-password" style={{ color: "#6D3115" }}>비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
