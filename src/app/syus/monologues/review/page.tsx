"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 창작 독백 검수·재처리 페이지 (/syus/monologues/review) — 운영자(profiles.role='admin')만 접근.
 *
 * 2026-07-29 사장님 결정으로 정상 흐름의 수동 승인 단계는 폐지됐다(신규 요청은 생성 성공 시
 * /api/syus/monologue/generate 안에서 곧바로 delivered로 전달된다). 이 화면은 이제
 * 두 가지 예외 용도로만 쓰인다:
 * - reviewing: 이번 변경 전에 이미 검수 대기로 쌓여 있던 과거 건 → 승인(delivered, 동의 시 공개) / 반려(rejected)
 * - pending  : 생성이 아직 안 됐거나 실패한 요청 → '생성 실행'으로 파이프라인 재호출(그대로 유효)
 * RLS상 syus_monologues update는 운영자 전용이므로 admin 세션의 브라우저 update가 통과한다.
 */

type Mono = {
  id: string; user_id: string; char_type: string | null; emotion: string | null;
  length_spec: string | null; tone: string | null; purpose: string | null;
  gender: string | null; age_range: string | null; generated_text: string | null;
  status: string; allow_public: boolean; is_public: boolean; created_at: string;
};

const COLOR = "var(--color-syus-stage-flex)";
function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }

export default function MonologueReview() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [rows, setRows] = useState<Mono[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    if (!me.user) { setState("denied"); return; }
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", me.user.id).maybeSingle();
    if (prof?.role !== "admin") { setState("denied"); return; }
    const { data } = await supabase
      .from("syus_monologues")
      .select("id, user_id, char_type, emotion, length_spec, tone, purpose, gender, age_range, generated_text, status, allow_public, is_public, created_at")
      .in("status", ["reviewing", "pending"])
      .order("created_at", { ascending: true });
    setRows(((data ?? []) as unknown) as Mono[]);
    setState("ready");
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (m: Mono) => {
    if (busy) return;
    setBusy(m.id); setMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("syus_monologues")
      .update({ status: "delivered", is_public: m.allow_public })
      .eq("id", m.id);
    if (error) { setMsg("승인 처리에 실패했어요. 권한/네트워크를 확인해 주세요."); setBusy(null); return; }
    setRows((p) => p.filter((r) => r.id !== m.id)); setBusy(null);
  };

  const reject = async (m: Mono) => {
    if (busy) return;
    if (!window.confirm("이 독백을 반려할까요? (요청자에게는 전달되지 않습니다)")) return;
    setBusy(m.id); setMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("syus_monologues")
      .update({ status: "rejected", is_public: false })
      .eq("id", m.id);
    if (error) { setMsg("반려 처리에 실패했어요."); setBusy(null); return; }
    setRows((p) => p.filter((r) => r.id !== m.id)); setBusy(null);
  };

  const regenerate = async (m: Mono) => {
    if (busy) return;
    setBusy(m.id); setMsg("");
    try {
      const resp = await fetch("/api/syus/monologue/generate", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: m.id }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) { setMsg(j.error || "생성에 실패했어요."); setBusy(null); return; }
    } catch { setMsg("생성 호출에 실패했어요."); setBusy(null); return; }
    setBusy(null);
    await load();
  };

  if (state === "loading") return <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}><p className="syc-loading">불러오는 중…</p></main>;
  if (state === "denied") return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <p className="syc-loading">운영자만 볼 수 있는 페이지입니다.</p>
      <button type="button" className="syc-back" style={{ marginTop: 16 }} onClick={() => router.push("/syus")}>← 여섯 무대로</button>
    </main>
  );

  const reviewing = rows.filter((r) => r.status === "reviewing");
  const pending = rows.filter((r) => r.status === "pending");

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: COLOR } as React.CSSProperties}>
      <Link href="/syus/flex" className="syc-back">← 창작 독백 아카이브</Link>
      <span className="syc-badge">운영자 검수</span>
      <h1 className="syc-title">독백 검수·재처리</h1>
      <p className="syc-tagline">신규 요청은 이제 자동으로 전달되며, 이 화면은 생성 실패 재처리·예외 처리용입니다.</p>
      {msg && <p className="syc-error">{msg}</p>}

      <div className="syc-block">
        <h2 className="syc-h2">과거 검수 대기 · {reviewing.length}건</h2>
        {reviewing.length === 0 ? (
          <div className="syc-empty"><p className="syc-empty-h">검수할 독백이 없어요.</p></div>
        ) : (
          <div className="syc-cards">
            {reviewing.map((m) => {
              const reqLine = [m.char_type, m.emotion, m.tone, m.purpose].filter(Boolean).join(" · ");
              return (
                <article key={m.id} className="syc-card" style={{ cursor: "default" }}>
                  <span className="syc-card-meta">요청 {fmt(m.created_at)} · {m.allow_public ? "공개 동의" : "비공개 요청"}</span>
                  <h3 className="syc-card-title" style={{ fontSize: "0.98rem" }}>{reqLine || "창작 독백"}</h3>
                  <p className="syc-detail-body" style={{ whiteSpace: "pre-wrap", marginTop: 8, marginBottom: 14 }}>{m.generated_text}</p>
                  <div className="syc-actions">
                    <button type="button" className="syc-btn" disabled={busy === m.id} onClick={() => approve(m)}>
                      {busy === m.id ? "처리 중…" : m.allow_public ? "승인 · 전달 + 공개" : "승인 · 전달"}
                    </button>
                    <button type="button" className="syc-cancel" disabled={busy === m.id} onClick={() => regenerate(m)}>다시 생성</button>
                    <button type="button" className="syc-comment-del" disabled={busy === m.id} onClick={() => reject(m)}>반려</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="syc-block">
          <h2 className="syc-h2">생성 대기 · {pending.length}건</h2>
          <p className="syc-lead" style={{ fontSize: "0.95rem", marginBottom: 14 }}>생성이 아직 안 됐거나 실패한 요청입니다. ‘생성 실행’으로 다시 시도할 수 있어요.</p>
          <div className="syc-cards">
            {pending.map((m) => {
              const reqLine = [m.char_type, m.emotion, m.tone, m.purpose].filter(Boolean).join(" · ");
              return (
                <article key={m.id} className="syc-card" style={{ cursor: "default" }}>
                  <span className="syc-card-meta">요청 {fmt(m.created_at)}</span>
                  <h3 className="syc-card-title" style={{ fontSize: "0.98rem" }}>{reqLine || "창작 독백"}</h3>
                  <div className="syc-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="syc-btn" disabled={busy === m.id} onClick={() => regenerate(m)}>{busy === m.id ? "생성 중…" : "생성 실행"}</button>
                    <button type="button" className="syc-comment-del" disabled={busy === m.id} onClick={() => reject(m)}>반려</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <nav className="syc-bridge">
        <Link href="/syus/flex" className="syc-bridge-link">← 창작 독백 아카이브</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
      </nav>
    </main>
  );
}
