"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Supabase는 이메일 링크로 접속 시 자동으로 세션을 설정
    // PASSWORD_RECOVERY 이벤트로 세션이 준비되었는지 확인
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // 이미 세션이 있는 경우
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/auth/login"), 2500);
  };

  if (success) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
        <div className="text-center space-y-5">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Done
          </p>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            비밀번호가 변경되었습니다
          </h2>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            잠시 후 로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            New Password
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            새 비밀번호 설정
          </h1>
        </div>

        {!ready ? (
          <p className="text-center text-sm py-8" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            링크를 확인하는 중...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                새 비밀번호
              </label>
              <PasswordInput value={password} onChange={setPassword} required minLength={8} />
              <p className="mt-1 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>8자 이상</p>
            </div>

            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                비밀번호 확인
              </label>
              <PasswordInput value={confirm} onChange={setConfirm} required minLength={8} />
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
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
          <Link href="/auth/login" style={{ color: "#6D3115" }}>로그인 페이지로</Link>
        </div>
      </div>
    </div>
  );
}
