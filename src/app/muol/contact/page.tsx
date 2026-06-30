"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/lib/constants";

export default function ContactPage() {
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    category: ContactCategory | "";
    message: string;
  }>({ name: "", email: "", phone: "", category: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // PIPA v2.1 — 문의 폼 개인정보 수집·이용 동의 (필수)
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.category) {
      setError("문의 유형을 선택해주세요.");
      return;
    }

    if (!privacyAgreed) {
      setError("개인정보 수집·이용에 동의해주세요.");
      return;
    }

    setLoading(true);

    // 클라이언트 측 쿨다운 (즉시 피드백)
    const LAST_KEY = "syus-last-contact";
    const COOLDOWN_MS = 5 * 60 * 1000;
    const last = typeof window !== "undefined" ? localStorage.getItem(LAST_KEY) : null;
    if (last && Date.now() - parseInt(last) < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - parseInt(last))) / 60000);
      setError(`잠시 후 다시 시도해주세요. (약 ${remaining}분 후 가능)`);
      setLoading(false);
      return;
    }

    // 서버 측 rate limit (Supabase RPC 함수)
    const supabase = createClient();
    const { data, error } = await supabase.rpc("submit_contact", {
      p_name: form.name,
      p_email: form.email,
      p_message: form.message,
      p_category: form.category,
      p_phone: form.phone || null,
    });

    if (error) {
      setError("전송 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    if (data === "rate_limited") {
      setError("같은 이메일로 5분 내 재문의는 제한됩니다. 잠시 후 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    if (data === "invalid_input") {
      setError("입력 내용을 확인해주세요.");
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_KEY, Date.now().toString());
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F0EEE9" }}>
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
            접수 완료
          </p>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            감사합니다.
          </h2>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}>
            문의가 접수되었습니다.
            <br />
            빠른 시일 내에 답변 드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-36 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F0EEE9" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
            1:1 Contact
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            1:1 문의
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}>
            아래에서 문의 유형을 선택하시고 내용을 남겨주세요.
          </p>
        </div>

        {/* 회신 안내 (SLA) */}
        <div
          className="mb-6 p-5"
          style={{
            backgroundColor: "#F0EEE9",
            border: "1px solid #D4CFC1",
          }}
        >
          <p
            className="text-xs tracking-wider uppercase mb-2"
            style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}
          >
            회신 안내
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
          >
            보내주신 문의는 영업일 기준 24시간 이내에 운영자가 직접 회신드립니다.
            <br />
            운영자 1인 구조 특성상 야간·주말·공휴일은 다음 영업일에 순차로 처리됩니다.
          </p>
        </div>

        {/* FAQ 안내 배너 */}
        <div
          className="mb-10 p-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ backgroundColor: "#E6E1D6" }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-xs tracking-wider uppercase mb-1"
              style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}
            >
              먼저 확인해보세요
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
            >
              자주 묻는 질문에 답변이 있을 수 있습니다. 빠른 해결을 위해 FAQ를 먼저 살펴보세요.
            </p>
          </div>
          <Link
            href="/muol/faq"
            className="px-4 py-2 text-xs tracking-wider transition-colors shrink-0"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: "#0B5563",
              color: "#F0EEE9",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2C7384")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0B5563")}
          >
            FAQ 보기 →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" data-clarity-mask="True">
          {/* 카테고리 선택 */}
          <div>
            <label className="block text-xs tracking-wider uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
              문의 유형 *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONTACT_CATEGORIES.map((c) => {
                const isActive = form.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className="px-3 py-3 text-xs tracking-wide transition-colors"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      backgroundColor: isActive ? "#0B5563" : "transparent",
                      color: isActive ? "#F0EEE9" : "#0B5563",
                      border: `1px solid ${isActive ? "#0B5563" : "#D4CFC1"}`,
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
                이름 *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 text-sm outline-none"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E6E1D6", color: "#4A3B33", border: "1px solid transparent" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
                연락처
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 text-sm outline-none"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E6E1D6", color: "#4A3B33", border: "1px solid transparent" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
              이메일 *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full px-4 py-3 text-sm outline-none"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E6E1D6", color: "#4A3B33", border: "1px solid transparent" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
              문의 내용 *
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              rows={6}
              className="w-full px-4 py-3 text-sm outline-none resize-none"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E6E1D6", color: "#4A3B33", border: "1px solid transparent" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          {/* PIPA v2.1 — 개인정보 수집·이용 동의 (필수) */}
          <div className="pt-2" style={{ borderTop: "1px solid #D4CFC1" }}>
            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-4">
              <span
                className="w-5 h-5 shrink-0 flex items-center justify-center transition-colors mt-0.5"
                style={{
                  backgroundColor: privacyAgreed ? "#0B5563" : "transparent",
                  border: `1.5px solid ${privacyAgreed ? "#0B5563" : "#6B5C50"}`,
                }}
              >
                {privacyAgreed && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0EEE9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={() => setPrivacyAgreed((v) => !v)}
                className="sr-only"
              />
              <span className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
                <span style={{ color: "#A63D2F", marginRight: "4px" }}>[필수]</span>
                개인정보 수집·이용에 동의합니다 (수집 항목: 이름·이메일·문의 내용 / 보유 기간: 3년 또는 처리 완료 시까지).{" "}
                <Link href="/privacy" target="_blank" className="underline" style={{ color: "#0B5563" }}>
                  자세히
                </Link>
              </span>
            </label>
          </div>

          {error && (
            <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#C0392B" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !privacyAgreed}
            className="px-10 py-3 text-sm tracking-wider transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: loading || !privacyAgreed ? "#6B5C50" : "#0B5563",
              color: "#F0EEE9",
              cursor: loading || !privacyAgreed ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!loading && privacyAgreed) e.currentTarget.style.backgroundColor = "#2C7384"; }}
            onMouseLeave={(e) => { if (!loading && privacyAgreed) e.currentTarget.style.backgroundColor = "#0B5563"; }}
          >
            {loading ? "전송 중..." : "문의 보내기"}
          </button>
        </form>

        <div className="mt-16 pt-8 space-y-4" style={{ borderTop: "1px solid #D4CFC1" }}>
          <p className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
            Other Channels
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="mailto:syusflux@gmail.com"
              className="block p-4 transition-colors"
              style={{ backgroundColor: "#E6E1D6" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#D4CFC1")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E6E1D6")}
            >
              <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
                Email
              </p>
              <p className="text-sm break-all" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                syusflux@gmail.com
              </p>
            </a>
            <a
              href="https://pf.kakao.com/_xkPVTX"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 transition-colors"
              style={{ backgroundColor: "#E6E1D6" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#D4CFC1")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E6E1D6")}
            >
              <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
                KakaoTalk
              </p>
              <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                사유유사 SYUS 채널 →
              </p>
            </a>
            <a
              href="https://www.instagram.com/syus_official"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 transition-colors"
              style={{ backgroundColor: "#E6E1D6" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#D4CFC1")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E6E1D6")}
            >
              <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}>
                Instagram
              </p>
              <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                @syus_official →
              </p>
            </a>
          </div>
          <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6B5C50" }}>
            카카오톡 채널과 인스타그램 DM도 1~2일 이내에 답변드리겠습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
