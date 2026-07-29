"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SyusLikeButton from "@/components/SyusLikeButton";

type Mono = {
  id: string; user_id: string; char_type: string | null; emotion: string | null; length_spec: string | null;
  tone: string | null; purpose: string | null; gender: string | null; age_range: string | null;
  generated_text: string | null; status: string; is_public: boolean; created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "접수됨 · 생성 대기", reviewing: "생성 중", delivered: "전달 완료", rejected: "반려됨",
};

// 소유자에게 보여줄 상태별 안내 문구. status마다 실제로 무슨 일이 벌어지고 있는지 정확히 구분한다
// (2026-07-29 사고: rejected여도 "짓고 있어요"가 뜨던 버그 수정 — pending/reviewing/rejected 각각 분기).
const OWNER_STATUS_MESSAGE: Record<string, string> = {
  pending: "요청이 접수됐어요. 곧 AI가 독백을 짓기 시작해요. 완료되면 바로 이 자리에 나타납니다.",
  reviewing: "지금 AI가 독백을 짓고 있어요. 완료되면 바로 이 자리에 독백이 나타납니다.",
  rejected: "이 요청은 반려됐어요. 다른 결로 다시 청해 주세요.",
};
// 생성이 아직 진행 중인 상태(폴링 대상). 이 상태를 벗어나면(delivered/rejected) 자동 갱신을 멈춘다.
const IN_PROGRESS_STATUSES = new Set(["pending", "reviewing"]);
// 백그라운드 자동 재조회 간격(ms). 5~10초 사이.
const POLL_INTERVAL_MS = 7000;

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }

export default function MonologueDetail() {
  const params = useParams();
  const id = String(params.id);
  const [loading, setLoading] = useState(true);
  const [m, setM] = useState<Mono | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // silent=true면 전체화면 "불러오는 중…" 스피너를 다시 띄우지 않고 데이터만 조용히 갱신한다(폴링용).
  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    setUid(me.user?.id ?? null);
    const { data } = await supabase.from("syus_monologues").select("*").eq("id", id).maybeSingle();
    setM((data as Mono | null) ?? null);
    if (!opts?.silent) setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // 생성 진행 중(pending/reviewing)에는 새로고침 없이도 완료 시 자동으로 반영되도록 주기적으로 조용히 재조회.
  // delivered·rejected로 바뀌면(또는 아직 데이터가 없으면) 폴링하지 않는다 — 불필요한 요청 방지.
  const status = m?.status;
  useEffect(() => {
    if (!status || !IN_PROGRESS_STATUSES.has(status)) return;
    const timer = setInterval(() => { load({ silent: true }); }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status, load]);

  if (loading) return <main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>;
  if (!m) return <main className="syc-wrap"><p className="syc-loading">독백을 찾을 수 없거나 비공개입니다.</p><Link href="/syus/flex" className="syc-back" style={{ marginTop: 16 }}>← 창작 독백 아카이브</Link></main>;

  const isOwner = uid === m.user_id;
  const reqLine = [m.char_type, m.emotion, m.tone, m.purpose].filter(Boolean).join(" · ");
  // 전달 게이트: AI 생성 즉시 delivered(2026-07-29~, 운영자 수동 승인 없음) 또는 공개 처리된 뒤에만 본문 노출.
  // 과거 reviewing 잔여 건은 운영자가 /syus/monologues/review 에서 수동 승인해야 delivered가 됨. pending/rejected는 상태만.
  const revealed = !!m.generated_text && (m.status === "delivered" || m.is_public);

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-flex)" } as React.CSSProperties}>
      <Link href="/syus/flex" className="syc-back">← 창작 독백 아카이브</Link>
      <article className="syc-detail">
        <span className="syc-card-meta">{reqLine || "창작 독백"}</span>
        <p className="syc-detail-meta">요청 {fmt(m.created_at)}{isOwner ? ` · ${STATUS_LABEL[m.status] ?? m.status}` : ""}</p>

        {revealed ? (
          <>
            <span className="syc-badge syc-badge--static" style={{ color: "var(--color-syus-stage-flex)", marginBottom: 12 }}>AI 창작 원본</span>
            <p className="syc-detail-body" style={{ fontSize: "1.05rem", lineHeight: 1.9 }}>{m.generated_text}</p>
          </>
        ) : (
          <div className="syc-empty" style={{ textAlign: "left" }}>
            <p className="syc-empty-h">{STATUS_LABEL[m.status] ?? "처리 중"}</p>
            <p className="syc-empty-b" style={{ marginBottom: isOwner && m.status === "rejected" ? 10 : 0 }}>
              {isOwner
                ? (OWNER_STATUS_MESSAGE[m.status] ?? "요청이 접수되었어요. 지금 AI가 독백을 짓고 있어요. 완료되면 바로 이 자리에 독백이 나타납니다.")
                : "아직 전달·공개되지 않은 요청입니다."}
            </p>
            {isOwner && m.status === "rejected" && (
              <Link href="/syus/monologues/request" className="syc-empty-link">새로 요청하기 →</Link>
            )}
          </div>
        )}

        {revealed && (
          <div className="syc-detail-foot" style={{ marginTop: 18 }}>
            <SyusLikeButton targetType="monologue" targetId={m.id} />
          </div>
        )}
      </article>

      <nav className="syc-bridge">
        <Link href="/syus/flex" className="syc-bridge-link">← 창작 독백 아카이브</Link>
        <Link href="/syus/mypage" className="syc-bridge-link is-muted">내 요청 보기</Link>
      </nav>
    </main>
  );
}
