"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";

/**
 * 로그인 안내 팝업 (전 섹션 공용).
 * 비로그인 사용자가 글쓰기/질문/댓글/좋아요/신고 등 CTA를 누르면 로그인 화면으로 튕기는
 * 대신 이 팝업으로 간결·친절하게 안내한다. "로그인하러 가기" → /syus/login?next=(원래 자리).
 * - backdrop/ESC/X 로 닫힘, 열려 있는 동안 body 스크롤 잠금(정리 포함).
 * - color 를 주면 그 색으로 강조. 안 주면 부모(.syc-wrap 등)의 --c 를 상속(섹션색 자동).
 */
export default function SyusLoginPrompt({
  open,
  onClose,
  next,
  color,
}: {
  open: boolean;
  onClose: () => void;
  next: string;
  color?: string;
}) {
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  // 오픈 리다이렉트 방지: 내부 경로만(널 안전).
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/syus";

  return (
    <div className="syc-modal-backdrop" onClick={close}>
      <div
        className="syc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="로그인 안내"
        onClick={(e) => e.stopPropagation()}
        style={color ? ({ ["--c" as string]: color } as React.CSSProperties) : undefined}
      >
        <button type="button" className="syc-modal-x" onClick={close} aria-label="닫기">×</button>
        <h2 className="syc-modal-title">잠깐, 로그인이 필요해요</h2>
        <p className="syc-modal-desc">
          시우스는 로그인하면 글을 남기고,<br />
          다른 사람과 이야기를 나눌 수 있어요.<br />
          카카오·구글·이메일로 잠깐이면 됩니다.
        </p>
        <div className="syc-modal-actions">
          <Link href={`/syus/login?next=${encodeURIComponent(safeNext)}`} className="syc-btn">
            로그인하러 가기 →
          </Link>
          <button type="button" className="syc-modal-later" onClick={close}>다음에 할게요</button>
        </div>
      </div>
    </div>
  );
}
