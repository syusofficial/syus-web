"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 견해글 발행 (/syus/essays/new). 운영자(admin) 전용. RLS로도 강제됨.
 *
 * 수정 모드(2026-09-28): /syus/essays/new?edit={id} 로 들어오면 그 글을 불러와 고친다(update).
 * 새 글·수정을 한 화면에서 처리해 입력 규칙(글자 수·시리즈 번호)이 두 벌로 갈라지지 않게 했다.
 * 공개 여부(published)는 여기서 건드리지 않는다 — /syus/admin 「견해글」 탭에서 따로 켜고 끈다.
 * 쿼리는 useSearchParams 대신 첫 렌더 뒤 window.location에서 읽는다(빌드 시 Suspense 경계 요구를 피하려고).
 */
export default function EssayNew() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "denied" | "missing" | "ok">("checking");
  const [uid, setUid] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [seriesNo, setSeriesNo] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 수정 모드: 고칠 글의 id와 불러올 때의 원래 제목(제목 변경 안내용)
  const [editId, setEditId] = useState<string | null>(null);
  const [origTitle, setOrigTitle] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const edit = new URLSearchParams(window.location.search).get("edit");
    const self = edit ? `/syus/essays/new?edit=${encodeURIComponent(edit)}` : "/syus/essays/new";
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace(`/syus/login?next=${encodeURIComponent(self)}`); return; }
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (prof?.role !== "admin") { setState("denied"); return; }
      if (edit) {
        const { data: essay } = await supabase.from("syus_essays")
          .select("id, title, excerpt, body, series_no").eq("id", edit).maybeSingle();
        // 못 찾았을 때 빈 새 글 양식을 띄우면 '저장'이 새 글 발행이 되어 버린다 — 양식 대신 안내만 보인다
        if (!essay) { setState("missing"); return; }
        setEditId(essay.id); setOrigTitle(essay.title);
        setTitle(essay.title); setExcerpt(essay.excerpt ?? ""); setBody(essay.body);
        setSeriesNo(essay.series_no == null ? "" : String(essay.series_no));
      }
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
    if (editId) {
      // 수정 — 바뀐 행을 돌려받아 0건(권한·삭제)도 실패로 본다
      const { data: upd, error: e3 } = await supabase.from("syus_essays")
        .update({ title: title.trim(), excerpt: excerpt.trim() || null, body: body.trim(), series_no: isNaN(n) ? null : n })
        .eq("id", editId).select("id");
      if (e3 || !upd || upd.length === 0) { setError("저장하지 못했습니다. 잠시 후 다시 시도해주세요."); setSaving(false); return; }
      router.push(`/syus/essays/${editId}`);
      return;
    }
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

  if (state === "missing") return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-proscenium)" } as React.CSSProperties}>
      <p className="syc-loading">고칠 글을 찾지 못했습니다. 이미 삭제됐을 수 있어요.</p>
      <Link href="/syus/admin#essays" className="syc-back" style={{ marginTop: 16 }}>← 시우스 관리 · 견해글</Link>
    </main>
  );

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-proscenium)" } as React.CSSProperties}>
      <Link href="/syus/proscenium" className="syc-back">← 주인장 견해글</Link>
      <h1 className="syc-title">{editId ? "견해글 고치기" : "견해글 쓰기"}</h1>
      <p className="syc-tagline">{editId ? "걸어 둔 한 편을 다시 다듬습니다. 공개 여부는 그대로 둡니다." : "액자에 걸 한 편을 올립니다."}</p>

      <form onSubmit={submit} className="syc-form" style={{ marginTop: "12px" }}>
        <label className="syc-label">제목
          <input className="syc-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
        </label>
        {editId && title.trim() !== origTitle && (
          // 검색용 제목·설명(src/lib/seo/syusSeo.ts ESSAY_SEO)은 원래 제목을 열쇠로 찾는다 — 바꾸면 그 연결이 끊긴다
          <p className="syc-note" style={{ marginTop: -6 }}>제목을 바꾸면 이 글에 따로 적어 둔 검색용 제목·설명이 더는 붙지 않습니다(기본 제목으로 돌아갑니다).</p>
        )}
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
          <button type="submit" className="syc-btn" disabled={saving}>{editId ? (saving ? "저장 중…" : "고친 내용 저장") : (saving ? "발행 중…" : "발행")}</button>
          <Link href={editId ? "/syus/admin#essays" : "/syus/proscenium"} className="syc-cancel">취소</Link>
        </div>
      </form>
    </main>
  );
}
