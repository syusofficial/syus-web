"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title?: string;
  /** 줄바꿈은 \n으로. whitespace-pre-line으로 그대로 렌더링된다. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 취소·탈퇴·삭제 등 되돌리기 어려운 조작이면 true — 버튼을 경고색으로 표시 */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const BTN_STATES =
  "transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";
const OUTLINE_BTN_STATES =
  "transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";

/**
 * window.confirm 대체 — 사유유사 톤의 커스텀 확인 모달 (2026-07-23 디자인팀 B4 반영).
 * 브라우저 기본 팝업 대신 사색적 여백 톤을 유지하기 위한 공용 컴포넌트.
 * 호출부는 열림 상태(boolean)와 onConfirm/onCancel만 관리하면 된다 — 이 컴포넌트가
 * Promise를 반환하지 않는 이유는, 여러 호출부가 "무엇을 확인하는 중인지"를
 * discriminated union state로 스스로 들고 있는 기존 패턴과 맞추기 위함이다.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onCancel}
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(74, 59, 51, 0.45)" }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title ?? "확인"}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm p-6"
        style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1" }}
      >
        {title && (
          <h2
            className="text-sm font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: danger ? "#A63D2F" : "#0B5563" }}
          >
            {title}
          </h2>
        )}
        <p
          className="text-xs leading-relaxed whitespace-pre-line mb-6"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
        >
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 text-xs tracking-wider ${OUTLINE_BTN_STATES}`}
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", border: "1px solid #D4CFC1" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs tracking-wider ${BTN_STATES}`}
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              backgroundColor: danger ? "#A63D2F" : "#0B5563",
              color: "#F0EEE9",
              fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
