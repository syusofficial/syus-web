"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** 창작 독백 요청 (/syus/monologues/request). 로그인 필수. 요청 큐(B안): status=pending 저장. */
export default function MonologueRequest() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [f, setF] = useState({ char_type: "", emotion: "", length_spec: "40초 내외 (8~10문장)", tone: "", purpose: "연습용", gender: "", age_range: "" });
  const [allowPublic, setAllowPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace("/auth/login?next=/syus/monologues/request"); return; }
      setUid(data.user.id); setReady(true);
    });
  }, [router]);

  const up = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (f.char_type.trim().length < 1 || f.emotion.trim().length < 1) { setError("인물 유형과 감정·상황은 적어주세요."); return; }
    if (!uid) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error: e2 } = await supabase.from("syus_monologues")
      .insert({
        user_id: uid, char_type: f.char_type.trim(), emotion: f.emotion.trim(), length_spec: f.length_spec.trim() || null,
        tone: f.tone.trim() || null, purpose: f.purpose || null, gender: f.gender.trim() || null, age_range: f.age_range.trim() || null,
        allow_public: allowPublic, status: "pending",
      })
      .select("id").single();
    if (e2 || !data) { setError("요청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요."); setSaving(false); return; }
    // 접수 후 생성 파이프라인 호출(검수 대기로 전환). 실패해도 요청은 pending으로 남아 상세에서 상태 확인 가능.
    try {
      const resp = await fetch("/api/syus/monologue/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: data.id }),
      });
      // 사용량 초과(429)만 폼에서 정직하게 안내하고 머무른다. 그 외 실패는 상세로 이동(pending으로 보임).
      if (resp.status === 429) {
        const j = await resp.json().catch(() => ({}));
        setError(j.error || "하루 요청 한도를 넘었어요. 내일 다시 청해 주세요.");
        setSaving(false);
        return;
      }
    } catch { /* 네트워크 실패 시에도 상세로 이동 — pending 상태로 보임 */ }
    router.push(`/syus/monologues/${data.id}`);
  };

  if (!ready) return <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-flex)" } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-flex)" } as React.CSSProperties}>
      <Link href="/syus/flex" className="syc-back">← 창작 독백 아카이브</Link>
      <h1 className="syc-title">독백 요청하기</h1>
      <p className="syc-tagline">원하는 결을 적어 주시면, 새 독백을 지어 검수 뒤 전달합니다.</p>

      <form onSubmit={submit} className="syc-form" style={{ marginTop: "12px" }}>
        <label className="syc-label">인물 유형
          <input className="syc-input" value={f.char_type} onChange={(e) => up("char_type", e.target.value)} placeholder="예: 20대 후반, 오래 준비한 무대를 포기하려는 사람" required />
        </label>
        <label className="syc-label">감정·상황
          <textarea className="syc-textarea" value={f.emotion} onChange={(e) => up("emotion", e.target.value)} rows={3} placeholder="예: 체념과 미련 사이, 마지막으로 무대를 돌아보며" required />
        </label>
        <div className="syc-row2">
          <label className="syc-label">길이
            <input className="syc-input" value={f.length_spec} onChange={(e) => up("length_spec", e.target.value)} />
          </label>
          <label className="syc-label">톤·장르
            <input className="syc-input" value={f.tone} onChange={(e) => up("tone", e.target.value)} placeholder="담담한 현대 구어체" />
          </label>
        </div>
        <div className="syc-row2">
          <label className="syc-label">용도
            <select className="syc-select" value={f.purpose} onChange={(e) => up("purpose", e.target.value)}>
              <option value="연습용">연습용</option>
              <option value="오디션용">오디션용</option>
            </select>
          </label>
          <label className="syc-label">성별·연령대 <span className="syc-hint">선택</span>
            <input className="syc-input" value={f.age_range} onChange={(e) => up("age_range", e.target.value)} placeholder="예: 여성 / 20대" />
          </label>
        </div>
        <label className="syc-label" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
          <input type="checkbox" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)} />
          완성된 독백을 서고에 공개하는 데 동의합니다 (다른 사람도 둘러볼 수 있어요)
        </label>
        {error && <p className="syc-error">{error}</p>}
        <p className="syc-note">※ 실시간 생성이 아니라 요청 접수 → 생성 → 운영자 검수 → 전달 순서입니다. 접수 후 마이페이지·상세에서 상태를 볼 수 있어요.</p>
        <div className="syc-actions">
          <button type="submit" className="syc-btn" disabled={saving}>{saving ? "독백을 짓는 중… (최대 1분)" : "요청 접수"}</button>
          <Link href="/syus/flex" className="syc-cancel">취소</Link>
        </div>
      </form>
    </main>
  );
}
