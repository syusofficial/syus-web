"use client";

import { useState, useTransition, use } from "react";
import { lookupReservationAction, cancelReservationAction, type LookupReservationResult } from "@/app/actions/reservations";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "확정",
  waitlisted: "대기",
  cancelled: "취소됨",
};

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

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelMessage(null);
    startTransition(async () => {
      const res = await lookupReservationAction(code, contact.trim());
      setData(res);
    });
  };

  const handleCancel = () => {
    if (!window.confirm("이 좌석 신청을 취소하시겠습니까?")) return;
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
            className="px-6 py-3 text-sm tracking-wider self-start"
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
          <p className="text-xs" style={{ color: "#5A4A3E" }}>
            인원 {data.party_size}명 · 상태 {STATUS_LABEL[data.status] ?? data.status}
          </p>
          {data.status !== "cancelled" && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="text-xs underline self-start"
              style={{ color: "#D54545" }}
            >
              신청 취소
            </button>
          )}
        </div>
      )}

      {cancelMessage && (
        <p className="text-xs mt-4" style={{ color: "#5A4A3E" }}>{cancelMessage}</p>
      )}

      <p className="text-xs mt-8" style={{ color: "#5A4A3E" }}>
        인원 변경 등 그 외 요청은{" "}
        <a href="/muol/contact" className="underline">문의하기</a>를 이용해주세요.
      </p>
    </main>
  );
}
