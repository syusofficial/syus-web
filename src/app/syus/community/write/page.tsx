"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const CATS = ["잡담", "소식", "모집", "연습후기", "질문"];

/** 자유 커뮤니티 글 작성 (/syus/community/write). 로그인 필수. */
export default function CommunityWrite() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [category, setCategory] = useState("잡담");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/auth/login?next=/syus/community/write"); return; }
      setUid(data.user.id); setReady(true);
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 2) { setError("제목을 2자 이상 적어주세요."); return; }
    if (body.trim().length < 1) { setError("내용을 적어주세요."); return; }
    if (!uid) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error: e2 } = await supabase.from("syus_posts")
      .insert({ user_id: uid, category, title: title.trim(), body: body.trim() })
      .select("id").single();
    if (e2 || !data) { setError("글을 올리지 못했습니다. 잠시 후 다시 시도해주세요."); setSaving(false); return; }
    router.push(`/syus/community/${data.id}`);
  };

  if (!ready) return <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-arena)" } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-arena)" } as React.CSSProperties}>
      <Link href="/syus/arena" className="syc-back">← 자유 커뮤니티</Link>
      <h1 className="syc-title">광장에 글 올리기</h1>
      <p className="syc-tagline">둘러앉은 자리에 이야기를 건네보세요.</p>

      <form onSubmit={submit} className="syc-form" style={{ marginTop: "12px" }}>
        <label className="syc-label">분류
          <select className="syc-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="syc-label">제목
          <input className="syc-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="한 줄 제목" required />
        </label>
        <label className="syc-label">내용
          <textarea className="syc-textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={9} maxLength={8000} placeholder="편하게 적어 주세요." required />
        </label>
        {error && <p className="syc-error">{error}</p>}
        <div className="syc-actions">
          <button type="submit" className="syc-btn" disabled={saving}>{saving ? "올리는 중…" : "글 올리기"}</button>
          <Link href="/syus/arena" className="syc-cancel">취소</Link>
        </div>
      </form>
    </main>
  );
}
