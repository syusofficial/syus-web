"use client";

import { useState, useTransition, use } from "react";
import { lookupReservationAction, cancelReservationAction, type LookupReservationResult } from "@/app/actions/reservations";
import ConfirmDialog from "@/components/ConfirmDialog";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "확정",
  waitlisted: "대기",
  cancelled: "취소됨",
};

/** "2026-07-24T10:30:00+00:00" → "7월 24일(금) 19:30" — 회차 표기용 (예약 시스템 B1, 2026-07-24) */
function formatSessionAt(iso: string): string {
  try {
    const d = new Date(iso);
    const datePart = new Intl.DateTimeFormat("ko-KR", {
      month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul",
    }).format(d);
    return `${datePart} ${timePart}`;
  } catch {
    return iso;
  }
}

// 버튼 4상태 공통 클래스(디자인팀 2026-07-20 진단 반영)
const BTN_STATES =
  "transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor] disabled:opacity-100 disabled:cursor-wait";
const LINK_BTN_STATES =
  "transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";

/**
 * 게스트 셀프 조회·취소 페이지 — 신청번호(URL)+연락처(입력) 일치 시에만 노출.
 * 로그인 사용자가 본인 신청을 취소할 때도 같은 페이지를 쓸 수 있다(연락처 없이 세션으로 확인).
 */
export default function ReservationLookupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [contact, setContact] = useState("");
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<LookupReservationResult | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelMessage(null);
    startTransition(async () => {
      const res = await lookupReservationAction(code, contact.trim());
      setData(res);
    });
  };

  const executeCancel = () => {
    setConfirmCancel(false);
    startTransition(async () => {
      const res = await cancelReservationAction(code, contact.trim());
      setCancelMessage(res.message);
      if (res.ok) setData(null);
    });
  };

  return (
    <main className="max-w-md mx-auto px-6 py-16" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
      <h1
        className="text-xl font-bold mb-2"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
      >
        예약 조회
      </h1>
      <p className="text-xs mb-6" style={{ color: "#5A4A3E" }}>
        신청번호 <strong style={{ color: "#4A3B33" }}>{code}</strong>
      </p>

      {!data?.ok && (
        <form onSubmit={handleLookup} className="flex flex-col gap-3">
          <label className="block text-xs tracking-wider uppercase" style={{ color: "#5A4A3E" }}>
            신청 시 입력한 연락처
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="010-0000-0000 또는 이메일"
            className="w-full px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1", color: "#4A3B33" }}
          />
          <button
            type="submit"
            disabled={isPending || !contact.trim()}
            className={`px-6 py-3 text-sm tracking-wider self-start ${BTN_STATES}`}
            style={{
              backgroundColor: isPending ? "#D4CFC1" : "#0B5563",
              color: "#F0EEE9",
              fontWeight: 600,
              cursor: isPending ? "wait" : "pointer",
            }}
          >
            {isPending ? "조회 중…" : "조회"}
          </button>
          {data && !data.ok && (
            <p className="text-xs" style={{ color: "#D54545" }}>{data.message}</p>
          )}
        </form>
      )}

      {data?.ok && (
        <div className="flex flex-col gap-3 p-5" style={{ backgroundColor: "#E6E1D6" }}>
          <p className="text-sm" style={{ color: "#4A3B33" }}>
            <strong>{data.show_title}</strong>
          </p>
          {data.session_at && (
            <p className="text-xs" style={{ color: "#5A4A3E" }}>{formatSessionAt(data.session_at)}</p>
          )}
          <p className="text-xs" style={{ color: "#5A4A3E" }}>
            인원 {data.party_size}명 · 상태 {STATUS_LABEL[data.status] ?? data.status}
            {data.status === "waitlisted" && data.waitlist_position != null && ` (대기 ${data.waitlist_position}번째)`}
          </p>
          {data.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={isPending}
              className={`text-xs underline self-start ${LINK_BTN_STATES}`}
              style={{ color: "#D54545" }}
            >
              신청 취소
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="좌석 신청 취소"
        message={"이 좌석 신청을 취소하시겠습니까?\n\n취소하시면 대기 중인 다음 분께 자리가 자동으로 안내되며, 취소 후 다시 신청하시면 대기로 접수될 수 있습니다."}
        confirmLabel="취소하기"
        danger
        onCancel={() => setConfirmCancel(false)}
        onConfirm={executeCancel}
      />

      {cancelMessage && (
        <p className="text-xs mt-4" style={{ color: "#5A4A3E" }}>{cancelMessage}</p>
      )}

      <p className="text-xs mt-8" style={{ color: "#5A4A3E" }}>
        취소는 공연 시작 전까지 시간 제한 없이 가능합니다. 인원 변경 등 그 외 요청은{" "}
        <a href="/muol/contact" className="underline">문의하기</a>를 이용해주세요.
      </p>
    </main>
  );
}
