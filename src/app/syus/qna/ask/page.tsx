"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 연기 고민 QnA — 질문 작성 (/syus/qna/ask). 로그인 필수(RLS: 본인만 insert).
 */
export default function QnaAskPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/syus/login?next=/syus/qna/ask");
        return;
      }
      setUserId(data.user.id);
      setReady(true);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 2) { setError("제목을 2자 이상 적어주세요."); return; }
    if (body.trim().length < 1) { setError("고민 내용을 적어주세요."); return; }
    if (!userId) { setError("로그인이 필요합니다."); return; }

    setSaving(true);
    try {
      const supabase = createClient();
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 5);

      const { data, error: insErr } = await supabase
        .from("syus_questions")
        .insert({ user_id: userId, title: title.trim(), body: body.trim(), tags })
        .select("id")
        .single();

      if (insErr || !data) {
        setError("질문을 올리지 못했습니다. 잠시 후 다시 시도해주세요.");
        setSaving(false);
        return;
      }
      router.push(`/syus/qna/${data.id}`);
    } catch {
      setError("질문을 올리지 못했습니다. 잠시 후 다시 시도해주세요.");
      setSaving(false);
    }
  };

  if (!ready) {
    return <main className="qa-wrap"><p className="qa-loading">불러오는 중…</p><Style /></main>;
  }

  return (
    <main className="qa-wrap">
      <Link href="/syus/thrust" className="qa-back">← 연기 고민 QnA</Link>
      <h1 className="qa-title">연기 고민을 꺼내 두기</h1>
      <p className="qa-sub">혼자 삼키던 물음을 적어 두면, 먼저 겪은 동료와 운영자가 함께 답을 더듬습니다.</p>

      <form onSubmit={handleSubmit} className="qa-form">
        <label className="qa-label">
          제목
          <input
            className="qa-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="한 줄로 고민을 요약해 주세요"
            required
          />
        </label>

        <label className="qa-label">
          내용
          <textarea
            className="qa-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={9}
            placeholder="어떤 상황에서, 무엇이 막막한지 편하게 적어 주세요."
            required
          />
        </label>

        <label className="qa-label">
          태그 <span className="qa-hint">쉼표로 구분 · 최대 5개 (예: 발성, 오디션, 심리)</span>
          <input
            className="qa-input"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="발성, 오디션"
          />
        </label>

        {error && <p className="qa-error">{error}</p>}

        <div className="qa-actions">
          <button type="submit" className="qa-submit" disabled={saving}>
            {saving ? "올리는 중…" : "질문 올리기"}
          </button>
          <Link href="/syus/thrust" className="qa-cancel">취소</Link>
        </div>
      </form>
      <Style />
    </main>
  );
}

function Style() {
  return (
    <style>{`
      .qa-wrap { max-width: 40rem; margin: 0 auto; padding: clamp(40px, 8vh, 88px) clamp(24px, 6vw, 48px) 120px; }
      .qa-loading { font-family: var(--font-noto-sans-kr); color: #5A4A3E; }
      .qa-back { display: inline-block; font-family: var(--font-noto-sans-kr); font-size: 0.82rem; letter-spacing: 0.08em; color: #5A4A3E; text-decoration: none; margin-bottom: 28px; }
      .qa-back:hover { color: #241C18; }
      .qa-title { font-family: var(--font-noto-serif-kr); font-size: clamp(1.8rem, 4.4vw, 2.4rem); font-weight: 700; color: #241C18; margin-bottom: 10px; }
      .qa-sub { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; line-height: 1.7; font-weight: 300; color: #5A4A3E; word-break: keep-all; margin-bottom: 34px; }
      .qa-form { display: grid; gap: 22px; }
      .qa-label { display: grid; gap: 8px; font-family: var(--font-noto-sans-kr); font-size: 0.85rem; font-weight: 700; color: #241C18; }
      .qa-hint { font-weight: 300; color: #A79E90; font-size: 0.78rem; }
      .qa-input, .qa-textarea { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; color: #241C18; background: #FFFFFF; border: 1px solid #D4CFC1; padding: 12px 14px; outline: none; width: 100%; }
      .qa-input:focus, .qa-textarea:focus { border-color: var(--color-syus-stage-thrust); }
      .qa-textarea { resize: vertical; line-height: 1.7; }
      .qa-error { font-family: var(--font-noto-sans-kr); font-size: 0.85rem; color: #C0392B; margin: 0; }
      .qa-actions { display: flex; align-items: center; gap: 18px; margin-top: 4px; }
      .qa-submit { appearance: none; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.9rem; font-weight: 600; letter-spacing: 0.04em; color: #F4F2ED; background: var(--color-syus-stage-thrust); border: 0; padding: 13px 30px; }
      .qa-submit:disabled { opacity: 0.55; cursor: not-allowed; }
      .qa-cancel { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; color: #5A4A3E; text-decoration: none; }
      .qa-cancel:hover { color: #241C18; }
    `}</style>
  );
}
