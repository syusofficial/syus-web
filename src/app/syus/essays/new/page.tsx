"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** 견해글 발행 (/syus/essays/new). 운영자(admin) 전용. RLS로도 강제됨. */
export default function EssayNew() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "denied" | "ok">("checking");
  const [uid, setUid] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [seriesNo, setSeriesNo] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/syus/login?next=/syus/essays/new"); return; }
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (prof?.role !== "admin") { setState("denied"); return; }
      setUid(data.user.id); setState("ok");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 2) { setError("제목을 2자 이상 적어주세요."); return; }
    if (body.trim().length < 1) { setError("본문을 적어주세요."); return; }
    if (!uid) return;
    setSaving(true);
    const supabase = createClient();
    const n = parseInt(seriesNo, 10);
    const { data, error: e2 } = await supabase.from("syus_essays")
      .insert({ user_id: uid, title: title.trim(), excerpt: excerpt.trim() || null, body: body.trim(), series_no: isNaN(n) ? null : n, published: true })
      .select("id").single();
    if (e2 || !data) { setError("발행하지 못했습니다. 잠시 후 다시 시도해주세요."); setSaving(false); return; }
    router.push(`/syus/essays/${data.id}`);
  };

  if (state === "checking") return <main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>;
  if (state === "denied") return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-proscenium)" } as React.CSSProperties}>
      <p className="syc-loading">견해글 발행은 운영자만 할 수 있어요.</p>
      <Link href="/syus/proscenium" className="syc-back" style={{ marginTop: 16 }}>← 주인장 견해글</Link>
    </main>
  );

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-proscenium)" } as React.CSSProperties}>
      <Link href="/syus/proscenium" className="syc-back">← 주인장 견해글</Link>
      <h1 className="syc-title">견해글 쓰기</h1>
      <p className="syc-tagline">액자에 걸 한 편을 올립니다.</p>

      <form onSubmit={submit} className="syc-form" style={{ marginTop: "12px" }}>
        <label className="syc-label">제목
          <input className="syc-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
        </label>
        <div className="syc-row2">
          <label className="syc-label">시리즈 번호 <span className="syc-hint">선택 · 연기와 냉장고 N</span>
            <input className="syc-input" value={seriesNo} onChange={(e) => setSeriesNo(e.target.value)} inputMode="numeric" placeholder="1" />
          </label>
          <label className="syc-label">발췌 <span className="syc-hint">선택 · 목록에 보일 한 줄</span>
            <input className="syc-input" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={200} />
          </label>
        </div>
        <label className="syc-label">본문
          <textarea className="syc-textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={16} maxLength={40000} required />
        </label>
        {error && <p className="syc-error">{error}</p>}
        <div className="syc-actions">
          <button type="submit" className="syc-btn" disabled={saving}>{saving ? "발행 중…" : "발행"}</button>
          <Link href="/syus/proscenium" className="syc-cancel">취소</Link>
        </div>
      </form>
    </main>
  );
}
