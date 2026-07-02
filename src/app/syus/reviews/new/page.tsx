"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["공연", "영화", "드라마"];

/** 관람 후기 작성 (/syus/reviews/new). 로그인 필수. 이미지 첨부 시 출처 필수(가이드북 §9). */
export default function ReviewNew() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [workTitle, setWorkTitle] = useState("");
  const [workType, setWorkType] = useState("공연");
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageSource, setImageSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/syus/login?next=/syus/reviews/new"); return; }
      setUid(data.user.id); setReady(true);
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (workTitle.trim().length < 1) { setError("작품명을 적어주세요."); return; }
    if (body.trim().length < 1) { setError("감상을 적어주세요."); return; }
    if (image && imageSource.trim().length < 1) { setError("이미지를 올리려면 출처를 반드시 입력해야 합니다."); return; }
    if (!uid) return;
    setSaving(true);
    const supabase = createClient();

    let image_url: string | null = null;
    if (image) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(image.type)) {
        setError("이미지는 JPG·PNG·WEBP·GIF만 올릴 수 있어요."); setSaving(false); return;
      }
      if (image.size > 5 * 1024 * 1024) { setError("이미지는 5MB 이하만 올릴 수 있어요."); setSaving(false); return; }
      const ext = image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1]; // 확장자는 MIME에서 도출(파일명 위조 차단)
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("syus-media").upload(path, image, { upsert: false });
      if (upErr) { setError("이미지 업로드에 실패했습니다. 이미지 없이 남기거나 다시 시도해주세요."); setSaving(false); return; }
      image_url = supabase.storage.from("syus-media").getPublicUrl(path).data.publicUrl;
    }

    const tags = tagsInput.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 5);
    const { data, error: e2 } = await supabase.from("syus_reviews")
      .insert({
        user_id: uid, work_title: workTitle.trim(), work_type: workType, rating: parseInt(rating, 10),
        body: body.trim(), tags, image_url, image_source: image_url ? imageSource.trim() : null,
      })
      .select("id").single();
    if (e2 || !data) { setError("후기를 남기지 못했습니다. 잠시 후 다시 시도해주세요."); setSaving(false); return; }
    router.push(`/syus/reviews/${data.id}`);
  };

  if (!ready) return <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-blackbox)" } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-blackbox)" } as React.CSSProperties}>
      <Link href="/syus/blackbox" className="syc-back">← 관람의 잔상</Link>
      <h1 className="syc-title">잔상 남기기</h1>
      <p className="syc-tagline">무대가 꺼진 뒤 마음에 남은 것을 적어 주세요.</p>

      <form onSubmit={submit} className="syc-form" style={{ marginTop: "12px" }}>
        <div className="syc-row2">
          <label className="syc-label">작품명
            <input className="syc-input" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)} maxLength={160} required />
          </label>
          <label className="syc-label">종류
            <select className="syc-select" value={workType} onChange={(e) => setWorkType(e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className="syc-label">별점
          <select className="syc-select" value={rating} onChange={(e) => setRating(e.target.value)}>
            {[5,4,3,2,1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
          </select>
        </label>
        <label className="syc-label">감상
          <textarea className="syc-textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={8000} placeholder="남은 잔상을 적어 주세요." required />
        </label>
        <label className="syc-label">태그 <span className="syc-hint">쉼표로 구분 · 최대 5개</span>
          <input className="syc-input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="여운, 앙상블" />
        </label>
        <label className="syc-label">이미지 <span className="syc-hint">선택 · 포스터·스틸 등. 올리면 아래 출처 필수</span>
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        </label>
        {image && (
          <label className="syc-label">이미지 출처 <span className="syc-hint">필수 · 예: 영화 「올드보이」 / ○○극단 공연 스틸</span>
            <input className="syc-input" value={imageSource} onChange={(e) => setImageSource(e.target.value)} maxLength={200} placeholder="출처를 반드시 적어 주세요" />
          </label>
        )}
        {error && <p className="syc-error">{error}</p>}
        <p className="syc-note">※ 출처 표기가 사용 권리를 뜻하진 않습니다. 정당한 비평·인용 범위에서만 올려 주세요. 신고 시 즉시 내려갑니다.</p>
        <div className="syc-actions">
          <button type="submit" className="syc-btn" disabled={saving}>{saving ? "남기는 중…" : "후기 남기기"}</button>
          <Link href="/syus/blackbox" className="syc-cancel">취소</Link>
        </div>
      </form>
    </main>
  );
}
