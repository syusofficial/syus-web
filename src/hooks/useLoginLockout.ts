"use client";

import { useState, useEffect, useCallback } from "react";

const LOGIN_ATTEMPT_KEY_PREFIX = "syus-login-attempts:";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60_000;

/**
 * 이메일별 로그인 실패 횟수·잠금 시각을 localStorage에 저장 — 새로고침해도 잠금이 풀리지 않도록.
 * ⚠ 이건 UX 안내(반복 실패 시 재시도 텀을 두라는 안내)일 뿐 진짜 보안 방어가 아니다.
 *   localStorage는 사용자가 얼마든지 지우거나 우회할 수 있다. 실제 브루트포스 방어는
 *   Supabase Auth 자체 rate limit(서버 측)에 의존한다.
 *
 * /auth/login, /syus/login 양쪽이 이 훅을 공유한다(2026-07-28, 두 화면의 보안 수준을 통일).
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

export function useLoginLockout(email: string) {
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

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

  /** 로그인 실패 시 호출 — 카운트 증가, 5회째면 60초 잠금(localStorage에도 기록). 안내 문구를 반환한다. */
  const recordFailure = useCallback(
    (targetEmail: string): string => {
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);
      if (newCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_DURATION_MS;
        setLockedUntil(until);
        saveAttemptRecord(targetEmail, { count: newCount, lockedUntil: until });
        return `로그인 시도가 ${MAX_ATTEMPTS}회 실패하여 60초간 잠금됩니다.`;
      }
      saveAttemptRecord(targetEmail, { count: newCount, lockedUntil: null });
      return `이메일 또는 비밀번호가 올바르지 않습니다. (남은 시도: ${MAX_ATTEMPTS - newCount}회)`;
    },
    [attemptCount]
  );

  /** 로그인 성공 시 호출 — 카운터·잠금 기록 초기화(localStorage 기록도 함께 삭제) */
  const recordSuccess = useCallback((targetEmail: string) => {
    setAttemptCount(0);
    setLockedUntil(null);
    clearAttemptRecord(targetEmail);
  }, []);

  return { attemptCount, lockedUntil, countdown, recordFailure, recordSuccess };
}
