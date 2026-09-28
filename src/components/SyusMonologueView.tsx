import Link from "next/link";
import SyusLikeButton from "@/components/SyusLikeButton";

/**
 * 창작 독백 상세의 "화면 한 장" — 2026-09-28 서버 렌더링 전환 때 분리 (제작팀).
 *
 * 훅(useState 등)이 없는 순수 표시 컴포넌트라 두 곳에서 같이 쓴다.
 *  - 서버 페이지(src/app/syus/monologues/[id]/page.tsx): 공개 독백·완료된 독백을 HTML로 바로 그린다
 *    → 검색엔진이 본문을 읽을 수 있다.
 *  - SyusMonologueLive(클라이언트): 요청자 본인이 "생성 중" 화면을 보고 있을 때만,
 *    몇 초마다 다시 읽어 완성되면 이 화면을 새 데이터로 다시 그린다.
 * 화면 모양을 한 곳에서만 고치면 두 경우가 같이 바뀐다.
 */

export type SyusMonologue = {
  id: string;
  user_id: string;
  char_type: string | null;
  emotion: string | null;
  length_spec: string | null;
  tone: string | null;
  purpose: string | null;
  gender: string | null;
  age_range: string | null;
  generated_text: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
};

export const MONOLOGUE_STATUS_LABEL: Record<string, string> = {
  pending: "접수됨 · 생성 대기", reviewing: "생성 중", delivered: "전달 완료", rejected: "반려됨",
};

// 소유자에게 보여줄 상태별 안내 문구. status마다 실제로 무슨 일이 벌어지고 있는지 정확히 구분한다
// (2026-07-29 사고: rejected여도 "짓고 있어요"가 뜨던 버그 수정 — pending/reviewing/rejected 각각 분기).
const OWNER_STATUS_MESSAGE: Record<string, string> = {
  pending: "요청이 접수됐어요. 곧 AI가 독백을 짓기 시작해요. 완료되면 바로 이 자리에 나타납니다.",
  reviewing: "지금 AI가 독백을 짓고 있어요. 완료되면 바로 이 자리에 독백이 나타납니다.",
  rejected: "이 요청은 반려됐어요. 다른 결로 다시 청해 주세요.",
};

/** 생성이 아직 진행 중인 상태(폴링 대상). 이 상태를 벗어나면(delivered/rejected) 자동 갱신을 멈춘다. */
export const MONOLOGUE_IN_PROGRESS = new Set(["pending", "reviewing"]);

/**
 * 전달 게이트: AI 생성 즉시 delivered(2026-07-29~, 운영자 수동 승인 없음) 또는 공개 처리된 뒤에만 본문 노출.
 * 과거 reviewing 잔여 건은 운영자가 /syus/monologues/review 에서 수동 승인해야 delivered가 됨. pending/rejected는 상태만.
 */
export function isMonologueRevealed(m: SyusMonologue): boolean {
  return !!m.generated_text && (m.status === "delivered" || m.is_public);
}

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function SyusMonologueView({ m, isOwner }: { m: SyusMonologue; isOwner: boolean }) {
  const reqLine = [m.char_type, m.emotion, m.tone, m.purpose].filter(Boolean).join(" · ");
  const revealed = isMonologueRevealed(m);

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-flex)" } as React.CSSProperties}>
      <Link href="/syus/flex" className="syc-back">← 창작 독백 아카이브</Link>
      <article className="syc-detail">
        <span className="syc-card-meta">{reqLine || "창작 독백"}</span>
        <p className="syc-detail-meta">요청 {fmt(m.created_at)}{isOwner ? ` · ${MONOLOGUE_STATUS_LABEL[m.status] ?? m.status}` : ""}</p>

        {revealed ? (
          <>
            <span className="syc-badge syc-badge--static" style={{ color: "var(--color-syus-stage-flex)", marginBottom: 12 }}>인공지능(AI) 생성물</span>
            <p className="syc-detail-body" style={{ fontSize: "1.05rem", lineHeight: 1.9 }}>{m.generated_text}</p>
            <p className="syc-note" style={{ marginTop: 16, marginBottom: 0 }}>
              이 독백은 생성형 인공지능이 지은 창작 원본입니다. 기존 작품을 복제·각색하지 않으나, 표현이 우연히 유사할 가능성을 완전히 배제할 수는 없습니다.
            </p>
          </>
        ) : (
          <div className="syc-empty" style={{ textAlign: "left" }}>
            <p className="syc-empty-h">{MONOLOGUE_STATUS_LABEL[m.status] ?? "처리 중"}</p>
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
