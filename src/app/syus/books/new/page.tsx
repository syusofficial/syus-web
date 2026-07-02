"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const TOPICS = ["이론", "발성", "신체", "연출", "전기", "희곡", "기타"];

/** 책 등록 (/syus/books/new). 로그인 필수. 표지 이미지 선택 업로드(syus-media). */
export default function BookNew() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [topic, setTopic] = useState("이론");
  const [rating, setRating] = useState("0");
  const [note, setNote] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/syus/login?next=/syus/books/new"); return; }
      setUid(data.user.id); setReady(true);
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 1) { setError("책 제목을 적어주세요."); return; }
    if (!uid) return;
    setSaving(true);
    const supabase = createClient();

    let cover_url: string | null = null;
    if (cover) {
      const ext = (cover.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("syus-media").upload(path, cover, { upsert: false });
      if (upErr) { setError("표지 업로드에 실패했습니다. 이미지 없이 등록하거나 다시 시도해주세요."); setSaving(false); return; }
      cover_url = supabase.storage.from("syus-media").getPublicUrl(path).data.publicUrl;
    }

    const r = parseInt(rating, 10);
    const { data, error: e2 } = await supabase.from("syus_books")
      .insert({ user_id: uid, title: title.trim(), author: author.trim() || null, topic, rating: r > 0 ? r : null, note: note.trim() || null, cover_url })
      .select("id").single();
    if (e2 || !data) { setError("등록하지 못했습니다. 잠시 후 다시 시도해주세요."); setSaving(false); return; }
    router.push(`/syus/books/${data.id}`);
  };

  if (!ready) return <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-corridor)" } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-corridor)" } as React.CSSProperties}>
      <Link href="/syus/corridor" className="syc-back">← 책 서재</Link>
      <h1 className="syc-title">책 등록하기</h1>
      <p className="syc-tagline">곁에 두고 싶은 이유를 짧게 적어 주세요.</p>

      <form onSubmit={submit} className="syc-form" style={{ marginTop: "12px" }}>
        <label className="syc-label">책 제목
          <input className="syc-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </label>
        <div className="syc-row2">
          <label className="syc-label">저자
            <input className="syc-input" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />
          </label>
          <label className="syc-label">주제
            <select className="syc-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className="syc-label">별점
          <select className="syc-select" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="0">선택 안 함</option>
            {[1,2,3,4,5].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
          </select>
        </label>
        <label className="syc-label">한 줄 후기
          <textarea className="syc-textarea" value={note} onChange={(e) => setNote(e.target.value)} rows={5} maxLength={4000} placeholder="이 책이 곁에 있어 좋은 이유." />
        </label>
        <label className="syc-label">표지 이미지 <span className="syc-hint">선택 · 본인이 촬영/보유했거나 정당한 이용 범위에서</span>
          <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="syc-error">{error}</p>}
        <div className="syc-actions">
          <button type="submit" className="syc-btn" disabled={saving}>{saving ? "등록 중…" : "책 등록"}</button>
          <Link href="/syus/corridor" className="syc-cancel">취소</Link>
        </div>
      </form>
    </main>
  );
}
