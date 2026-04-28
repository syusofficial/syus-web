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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.category) {
      setError("문의 유형을 선택해주세요.");
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
      <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            접수 완료
          </p>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            감사합니다.
          </h2>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            문의가 접수되었습니다.
            <br />
            빠른 시일 내에 답변 드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            1:1 Contact
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            1:1 문의
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            아래에서 문의 유형을 선택하시고 내용을 남겨주세요.
            <br />
            보통 1일, 늦어도 2일 안에 답변드리겠습니다.
          </p>
        </div>

        {/* FAQ 안내 배너 */}
        <div
          className="mb-10 p-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ backgroundColor: "#E8DDD0" }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-xs tracking-wider uppercase mb-1"
              style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
            >
              먼저 확인해보세요
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
            >
              자주 묻는 질문에 답변이 있을 수 있습니다. 빠른 해결을 위해 FAQ를 먼저 살펴보세요.
            </p>
          </div>
          <Link
            href="/faq"
            className="px-4 py-2 text-xs tracking-wider transition-colors shrink-0"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: "#6D3115",
              color: "#F4EDE3",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B4A2A")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6D3115")}
          >
            FAQ 보기 →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 카테고리 선택 */}
          <div>
            <label className="block text-xs tracking-wider uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
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
                      backgroundColor: isActive ? "#6D3115" : "transparent",
                      color: isActive ? "#F4EDE3" : "#6D3115",
                      border: `1px solid ${isActive ? "#6D3115" : "#D4CFC9"}`,
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
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                이름 *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-3 text-sm outline-none"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E8DDD0", color: "#1A1A1A", border: "1px solid transparent" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
            </div>
            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                연락처
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 text-sm outline-none"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E8DDD0", color: "#1A1A1A", border: "1px solid transparent" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              이메일 *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full px-4 py-3 text-sm outline-none"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E8DDD0", color: "#1A1A1A", border: "1px solid transparent" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
              문의 내용 *
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              rows={6}
              className="w-full px-4 py-3 text-sm outline-none resize-none"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E8DDD0", color: "#1A1A1A", border: "1px solid transparent" }}
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
            className="px-10 py-3 text-sm tracking-wider transition-colors"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: loading ? "#9B9693" : "#6D3115",
              color: "#F4EDE3",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#8B4A2A"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#6D3115"; }}
          >
            {loading ? "전송 중..." : "문의 보내기"}
          </button>
        </form>

        <div className="mt-16 pt-8 space-y-4" style={{ borderTop: "1px solid #D4CFC9" }}>
          <p className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Other Channels
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="mailto:syusflux@gmail.com"
              className="block p-4 transition-colors"
              style={{ backgroundColor: "#E8DDD0" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#D4CFC9")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E8DDD0")}
            >
              <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                Email
              </p>
              <p className="text-sm break-all" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                syusflux@gmail.com
              </p>
            </a>
            <a
              href="http://pf.kakao.com/_xkPVTX"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 transition-colors"
              style={{ backgroundColor: "#E8DDD0" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#D4CFC9")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E8DDD0")}
            >
              <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                KakaoTalk
              </p>
              <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                사유유사 SYUS 채널 →
              </p>
            </a>
            <a
              href="https://www.instagram.com/syus_official"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 transition-colors"
              style={{ backgroundColor: "#E8DDD0" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#D4CFC9")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E8DDD0")}
            >
              <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                Instagram
              </p>
              <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                @syus_official →
              </p>
            </a>
          </div>
          <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            카카오톡 채널과 인스타그램 DM은 보통 1일, 늦어도 2일 안에 답변드리겠습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
