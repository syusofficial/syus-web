"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import SocialLoginButtons, { SocialDivider } from "@/components/SocialLoginButtons";

const SAVED_EMAIL_KEY = "syus-saved-email";
const LOGIN_ATTEMPT_KEY_PREFIX = "syus-login-attempts:";

/**
 * 이메일별 로그인 실패 횟수·잠금 시각을 localStorage에 저장 — 새로고침해도 잠금이 풀리지 않도록.
 * ⚠ 이건 UX 안내(반복 실패 시 재시도 텀을 두라는 안내)일 뿐 진짜 보안 방어가 아니다.
 *   localStorage는 사용자가 얼마든지 지우거나 우회할 수 있다. 실제 브루트포스 방어는
 *   Supabase Auth 자체 rate limit(서버 측)에 의존한다.
 */
type LoginAttemptRecord = { count: number; lockedUntil: number | null };

function attemptKey(email: string): string {
  return LOGIN_ATTEMPT_KEY_PREFIX + email.trim().toLowerCase();
}

function loadAttemptRecord(email: string): LoginAttemptRecord | null {
  if (!email.trim()) return null;
  try {
    const raw = localStorage.getItem(attemptKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LoginAttemptRecord;
    if (typeof parsed?.count !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAttemptRecord(email: string, record: LoginAttemptRecord) {
  if (!email.trim()) return;
  try {
    localStorage.setItem(attemptKey(email), JSON.stringify(record));
  } catch {
    // localStorage 접근 실패(프라이빗 모드 등) — UX 안내용이므로 조용히 무시
  }
}

function clearAttemptRecord(email: string) {
  if (!email.trim()) return;
  try {
    localStorage.removeItem(attemptKey(email));
  } catch {}
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberId, setRememberId] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // 로그인 후 복귀 목적지(?next=/syus 등). 오픈 리다이렉트 방지: 내부 경로만 허용.
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
      ? nextParam : "/";

  // 자동 로그아웃 메시지 (?reason=absolute|idle) · 가입 완료 (?signup=success)
  // · 소셜 로그인 실패 (?error=missing_code|oauth_failed, callback/route.ts가 붙여서 보냄)
  useEffect(() => {
    const reason = searchParams.get("reason");
    const oauthError = searchParams.get("error");
    if (reason === "absolute") {
      setInfo("보안상 12시간 한도가 지나 자동 로그아웃되었습니다. 다시 로그인해주세요.");
    } else if (reason === "idle") {
      setInfo("3시간 동안 활동이 없어 자동 로그아웃되었습니다.");
    } else if (searchParams.get("signup") === "success") {
      setInfo("가입이 완료되었습니다. 로그인해주세요.");
    } else if (oauthError === "missing_code") {
      setError("소셜 로그인 인증 정보를 받지 못했습니다. 다시 시도해주세요.");
    } else if (oauthError === "oauth_failed") {
      setError("소셜 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
    } else if (oauthError) {
      setError("로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
    }
  }, [searchParams]);

  // 저장된 아이디 자동 채움
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberId(true);
    }
  }, []);

  // 이메일이 바뀔 때마다(자동완성 포함) 그 이메일의 잠금 기록을 localStorage에서 불러온다.
  // 새로고침 후에도 잠금이 유지되는 이유가 바로 이 effect.
  useEffect(() => {
    const record = loadAttemptRecord(email);
    if (!record) {
      setAttemptCount(0);
      setLockedUntil(null);
      return;
    }
    if (record.lockedUntil && record.lockedUntil > Date.now()) {
      setAttemptCount(record.count);
      setLockedUntil(record.lockedUntil);
    } else if (record.lockedUntil) {
      // 저장된 잠금 시각이 이미 지남 → 초기화
      clearAttemptRecord(email);
      setAttemptCount(0);
      setLockedUntil(null);
    } else {
      setAttemptCount(record.count);
      setLockedUntil(null);
    }
  }, [email]);

  // 잠금 카운트다운
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttemptCount(0);
        setCountdown(0);
        clearAttemptRecord(email);
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (lockedUntil && Date.now() < lockedUntil) {
      setError(`로그인 시도가 너무 많습니다. ${countdown}초 후 다시 시도해주세요.`);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        const newCount = attemptCount + 1;
        setAttemptCount(newCount);

        // 5회 실패 시 60초 잠금 — 새로고침해도 유지되도록 localStorage에도 기록
        if (newCount >= 5) {
          const until = Date.now() + 60_000;
          setLockedUntil(until);
          setError("로그인 시도가 5회 실패하여 60초간 잠금됩니다.");
          saveAttemptRecord(email, { count: newCount, lockedUntil: until });
        } else {
          const remaining = 5 - newCount;
          setError(`이메일 또는 비밀번호가 올바르지 않습니다. (남은 시도: ${remaining}회)`);
          saveAttemptRecord(email, { count: newCount, lockedUntil: null });
        }
        return;
      }

      // 로그인 성공 → 카운터 초기화 (localStorage 기록도 함께 삭제)
      setAttemptCount(0);
      setLockedUntil(null);
      clearAttemptRecord(email);

      // 아이디 저장 옵션 처리
      if (rememberId) {
        localStorage.setItem(SAVED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }

      // 역할 확인 후 리다이렉트 — maybeSingle()로 행 없어도 throw 안 함
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        router.push("/admin");
      } else {
        router.push(safeNext);
      }
      router.refresh();
    } catch (err) {
      console.error("[login] unexpected error", err);
      setError("로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#E6E1D6",
    color: "#4A3B33",
    border: "1px solid transparent",
  };

  return (
    <div className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F0EEE9" }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            Account
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            로그인
          </h1>
        </div>

        {/* 소셜 로그인 — 페이지 상단 배치 (현대 웹 표준) */}
        <div className="mb-6 space-y-3">
          <SocialLoginButtons mode="login" next={safeNext} />
          <SocialDivider label="또는 이메일로 로그인" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-clarity-mask="True">
          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              비밀번호
            </label>
            <PasswordInput value={password} onChange={setPassword} required />
          </div>

          {/* 아이디 저장 — 한국 사이트 표준 */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span
              className="w-4 h-4 shrink-0 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: rememberId ? "#0B5563" : "transparent",
                border: `1.5px solid ${rememberId ? "#0B5563" : "#5A4A3E"}`,
              }}
            >
              {rememberId && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F0EEE9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <input
              type="checkbox"
              checked={rememberId}
              onChange={(e) => setRememberId(e.target.checked)}
              className="sr-only"
            />
            <span
              className="text-xs"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
            >
              아이디 저장
            </span>
          </label>

          {info && (
            <p
              className="text-xs p-3"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", backgroundColor: "#E6E1D6" }}
            >
              {info}
            </p>
          )}

          {error && (
            <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#C0392B" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !!lockedUntil}
            className="w-full py-3 text-sm tracking-wider transition-colors mt-2"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: loading || lockedUntil ? "#5A4A3E" : "#0B5563",
              color: "#F0EEE9",
              cursor: loading || lockedUntil ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!loading && !lockedUntil) e.currentTarget.style.backgroundColor = "#2C7384"; }}
            onMouseLeave={(e) => { if (!loading && !lockedUntil) e.currentTarget.style.backgroundColor = "#0B5563"; }}
          >
            {lockedUntil ? `${countdown}초 후 재시도 가능` : (loading ? "로그인 중..." : "로그인")}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
          <Link
            href="/auth/find-id"
            style={{ color: "#5A4A3E" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0B5563")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A4A3E")}
          >
            아이디 찾기
          </Link>
          <span style={{ color: "#D4CFC1" }}>|</span>
          <Link
            href="/auth/forgot-password"
            style={{ color: "#5A4A3E" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0B5563")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5A4A3E")}
          >
            비밀번호 찾기
          </Link>
        </div>

        <p className="mt-8 text-center text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
          아직 계정이 없으신가요?{" "}
          <Link href="/auth/signup" style={{ color: "#0B5563" }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
