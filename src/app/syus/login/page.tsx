"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SocialLoginButtons, { SocialDivider } from "@/components/SocialLoginButtons";

/**
 * 시우스 독립 로그인 페이지 (/syus/login)
 * - 통합로그인 유지: 무대올림과 동일한 Supabase 인증·세션(같은 도메인 쿠키 공유).
 *   여기서 로그인해도 무대올림에서 그대로 로그인 상태이며 그 반대도 같다.
 * - 다른 점은 '화면'뿐: 시우스 톤(붓칠 캔버스·서체·틸 액센트)으로, 시우스에서 로그인할 때
 *   무대올림 화면으로 튕기지 않고 시우스 안에 머문다. 로그인 후 next(기본 /syus)로 복귀.
 * - 저장 아이디 키(syus-saved-email)는 무대올림 로그인과 공유 — 계정이 하나이므로.
 */

const SAVED_EMAIL_KEY = "syus-saved-email";
const TEAL = "#0B5563";

export default function SyusLoginPage() {
  return (
    <Suspense fallback={<main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>}>
      <SyusLoginInner />
    </Suspense>
  );
}

function SyusLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // 로그인 후 복귀 목적지(기본 /syus). 오픈 리다이렉트 방지: 내부 경로만 허용.
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
      ? nextParam : "/syus";

  // 자동 로그아웃(?reason=) · 가입 완료(?signup=success)
  // · 소셜 로그인 실패(?error=missing_code|oauth_failed, callback/route.ts가 붙여서 보냄)
  useEffect(() => {
    const reason = searchParams.get("reason");
    const oauthError = searchParams.get("error");
    if (reason === "absolute") setInfo("보안상 12시간 한도가 지나 자동 로그아웃되었습니다. 다시 로그인해주세요.");
    else if (reason === "idle") setInfo("3시간 동안 활동이 없어 자동 로그아웃되었습니다.");
    else if (searchParams.get("signup") === "success") setInfo("가입이 완료되었습니다. 로그인해주세요.");
    else if (oauthError === "missing_code") setError("소셜 로그인 인증 정보를 받지 못했습니다. 다시 시도해주세요.");
    else if (oauthError === "oauth_failed") setError("소셜 로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
    else if (oauthError) setError("로그인 중 문제가 발생했습니다. 다시 시도해주세요.");
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) { setEmail(saved); setRememberId(true); }
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockedUntil(null); setAttemptCount(0); setCountdown(0); clearInterval(interval); }
      else setCountdown(remaining);
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

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
        if (newCount >= 5) {
          setLockedUntil(Date.now() + 60_000);
          setError("로그인 시도가 5회 실패하여 60초간 잠금됩니다.");
        } else {
          setError(`이메일 또는 비밀번호가 올바르지 않습니다. (남은 시도: ${5 - newCount}회)`);
        }
        return;
      }
      setAttemptCount(0);
      setLockedUntil(null);
      if (rememberId) localStorage.setItem(SAVED_EMAIL_KEY, email);
      else localStorage.removeItem(SAVED_EMAIL_KEY);
      // 시우스에서 로그인하면 시우스로 복귀(관리자도 여기선 시우스에 머문다 — 검수는 /syus/monologues/review).
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      console.error("[syus/login] unexpected error", err);
      setError("로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="syc-wrap syus-auth" style={{ ["--c" as string]: TEAL } as React.CSSProperties}>
      <Link href="/syus" className="syc-back">← 여섯 무대로</Link>

      <div className="syus-auth-head">
        <p className="syus-auth-eyebrow">SYUS · 시우스</p>
        <h1 className="syc-title" style={{ marginBottom: 8 }}>로그인</h1>
        <p className="syc-tagline">무대올림과 하나의 계정으로 이어집니다. 어느 쪽에서 로그인해도 그대로 이어져요.</p>
      </div>

      <div className="syus-auth-card">
        <SocialLoginButtons mode="login" next={safeNext} />
        <div style={{ margin: "14px 0" }}><SocialDivider label="또는 이메일로 로그인" /></div>

        <form onSubmit={handleSubmit} className="syc-form" data-clarity-mask="True">
          <label className="syc-label">이메일
            <input type="email" className="syc-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="syc-label">비밀번호
            <span className="syus-pw">
              <input type={showPw ? "text" : "password"} className="syc-input" style={{ paddingRight: 56 }} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              <button type="button" className="syus-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}>
                {showPw ? "숨기기" : "보기"}
              </button>
            </span>
          </label>

          <label className="syus-remember">
            <input type="checkbox" checked={rememberId} onChange={(e) => setRememberId(e.target.checked)} />
            아이디 저장
          </label>

          {info && <p className="syus-auth-info">{info}</p>}
          {error && <p className="syc-error">{error}</p>}

          <button type="submit" className="syc-btn" disabled={loading || !!lockedUntil} style={{ marginTop: 4 }}>
            {lockedUntil ? `${countdown}초 후 재시도 가능` : loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <div className="syus-auth-links">
          <Link href="/auth/find-id">아이디 찾기</Link>
          <span aria-hidden="true">·</span>
          <Link href="/auth/forgot-password">비밀번호 찾기</Link>
        </div>
      </div>

      <p className="syus-auth-foot">
        아직 계정이 없으신가요? <Link href={`/auth/signup?next=${encodeURIComponent(safeNext)}`}>회원가입</Link>
      </p>

      <style>{`
        .syus-auth { max-width: 27rem; }
        .syus-auth-head { text-align: center; margin-bottom: 22px; }
        .syus-auth-eyebrow {
          font-family: var(--font-inter); font-size: 0.68rem; letter-spacing: 0.3em;
          text-transform: uppercase; font-weight: 600; color: ${TEAL}; margin-bottom: 10px;
        }
        .syus-auth-card {
          background: rgba(255,255,255,0.9);
          border: 1px solid #E4DFD4;
          border-radius: 2px;
          box-shadow: 0 6px 22px rgba(36,28,24,0.06);
          padding: 24px 22px;
          backdrop-filter: blur(3px);
        }
        .syus-pw { position: relative; display: block; }
        .syus-pw-toggle {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          appearance: none; background: none; border: 0; cursor: pointer;
          font-family: var(--font-noto-sans-kr); font-size: 0.72rem; color: #5A4A3E; padding: 4px 6px;
        }
        .syus-pw-toggle:hover { color: ${TEAL}; }
        .syus-remember {
          display: flex; align-items: center; gap: 8px;
          font-family: var(--font-noto-sans-kr); font-size: 0.85rem; color: #4A3B33; cursor: pointer;
        }
        .syus-remember input { accent-color: ${TEAL}; width: 15px; height: 15px; }
        .syus-auth-info {
          font-family: var(--font-noto-sans-kr); font-size: 0.8rem; line-height: 1.6;
          color: ${TEAL}; background: #EAF1F2; padding: 10px 12px; border-radius: 2px;
        }
        .syus-auth-links {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          margin-top: 18px; font-family: var(--font-noto-sans-kr); font-size: 0.82rem;
        }
        .syus-auth-links a { color: #5A4A3E; }
        .syus-auth-links a:hover { color: ${TEAL}; }
        .syus-auth-links span { color: #D4CFC1; }
        .syus-auth-foot {
          margin-top: 22px; text-align: center;
          font-family: var(--font-noto-sans-kr); font-size: 0.9rem; color: #5A4A3E;
        }
        .syus-auth-foot a { color: ${TEAL}; font-weight: 600; }
      `}</style>
    </main>
  );
}
