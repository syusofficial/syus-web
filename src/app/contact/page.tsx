"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
        <div className="mb-14">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Contact
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            문의하기
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            공연자 신청, 협업 제안, 기타 문의를 남겨주세요.
            <br />
            평일 기준 2영업일 이내 답변 드립니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="mt-16 pt-8" style={{ borderTop: "1px solid #D4CFC9" }}>
          <p className="text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            이메일로도 연락하실 수 있습니다 —{" "}
            <a href="mailto:syusflux@gmail.com" style={{ color: "#6D3115" }}>
              syusflux@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
