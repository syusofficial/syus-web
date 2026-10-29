"use client";

import Link from "next/link";
import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

const noSubscribe = () => () => {};
function readLinkError() {
  const params = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, "&"));
  return Boolean(params.get("error_code") || params.get("error"));
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [success, setSuccess] = useState(false);

  // 링크가 만료·이미 사용된 경우 Supabase가 주소에 error_code를 붙여 보낸다
  const linkError = useSyncExternalStore(noSubscribe, readLinkError, () => false);

  useEffect(() => {
    if (linkError) return;
    const supabase = createClient();
    // 2026-10-29: 세션이 실제로 있을 때만 입력 폼을 연다. 이전엔 세션이 없어도 오는
    // INITIAL_SESSION 알림만으로 폼을 열어, 다른 브라우저에서 연 링크도 정상처럼 보였다가
    // 저장할 때 「오류」만 떴다. getSession은 주소의 ?code= 교환이 끝난 뒤 답한다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setInvalid(true);
    }).catch(() => setInvalid(true));

    return () => subscription.unsubscribe();
  }, [linkError]);

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
      <div className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F0EEE9" }}>
        <div className="text-center space-y-5">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            Done
          </p>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            비밀번호가 변경되었습니다
          </h2>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
            잠시 후 로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F0EEE9" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            New Password
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            새 비밀번호 설정
          </h1>
        </div>

        {!ready && (invalid || linkError) ? (
          <div className="text-center space-y-5 py-4">
            <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
              링크가 만료되었거나, 재설정을 요청한 브라우저가 아닌 곳에서 열렸습니다.
              <br />
              번거로우시겠지만 한 번 더 요청해주세요.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block px-8 py-3 text-sm tracking-wider"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
            >
              재설정 링크 다시 받기
            </Link>
          </div>
        ) : !ready ? (
          <p className="text-center text-sm py-8" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
            링크를 확인하는 중...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" data-clarity-mask="True">
            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                새 비밀번호
              </label>
              <PasswordInput value={password} onChange={setPassword} required minLength={8} />
              <p className="mt-1 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>8자 이상</p>
            </div>

            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
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
                backgroundColor: loading ? "#5A4A3E" : "#0B5563",
                color: "#F0EEE9",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
          <Link href="/auth/login" style={{ color: "#0B5563" }}>로그인 페이지로</Link>
        </div>
      </div>
    </div>
  );
}
