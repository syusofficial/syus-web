"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { submitReservation } from "@/app/actions/reservations";
import { createClient } from "@/lib/supabase/client";

type Props = {
  showId: string;
  defaultName?: string;
  initialCapacity?: number | null;
  initialConfirmedTotal?: number;
  initialReservationClosed?: boolean;
};

const POLL_INTERVAL_MS = 20000;

/**
 * 자체 예매(좌석 신청) 폼 — 상세페이지 CTA 아코디언 확장형(디자인팀 목업 방향).
 * 로그인 여부와 무관하게 이름·연락처·인원수 3개만 받는다(게스트 허용).
 * 제출 성공 시 신청번호를 그 자리에서 보여준다(신규 화면 이동 없음).
 *
 * 매진·마감 표시: syus_reservations는 RLS상 비로그인 방문자가 직접 못 읽으므로(개인정보
 * 보호), 개별 신청자 정보 없이 "확정 합계"만 주는 security definer RPC
 * (get_show_reservation_summary)를 20초 간격으로 폴링해 근실시간으로 반영한다.
 * 진짜 postgres_changes 구독은 RLS에 막혀 익명 사용자에겐 이벤트가 안 오므로 쓰지 않는다.
 */
export default function SeatReservationForm({
  showId,
  defaultName,
  initialCapacity = null,
  initialConfirmedTotal = 0,
  initialReservationClosed = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [contact, setContact] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [capacity, setCapacity] = useState<number | null>(initialCapacity);
  const [confirmedTotal, setConfirmedTotal] = useState(initialConfirmedTotal);
  const [reservationClosed, setReservationClosed] = useState(initialReservationClosed);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const supabase = createClient();

    const refresh = async () => {
      const { data } = await supabase.rpc("get_show_reservation_summary", { p_show_id: showId });
      if (!mounted.current || !data) return;
      const summary = data as { confirmed_total: number; capacity: number | null; reservation_closed: boolean };
      setConfirmedTotal(summary.confirmed_total);
      setCapacity(summary.capacity);
      setReservationClosed(summary.reservation_closed);
    };

    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [showId]);

  const isFull = capacity != null && confirmedTotal >= capacity;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitReservation(fd);
      setResult(res);
    });
  };

  if (result?.ok) {
    return (
      <div
        className="p-6 text-sm leading-relaxed"
        style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E6E1D6", color: "#4A3B33" }}
      >
        {result.message}
        <br />
        <span style={{ color: "#5A4A3E", fontSize: "0.8rem" }}>
          신청번호와 연락처는 잊지 말고 기억해주세요 — 취소·조회 시 필요합니다.
        </span>
        <br />
        <span style={{ color: "#5A4A3E", fontSize: "0.8rem" }}>
          일정이 바뀌면 언제든 취소해 주세요. 취소하신 자리는 대기 중인 다음 분께 자동으로 안내됩니다.
        </span>
      </div>
    );
  }

  // 공연팀이 직접 마감 — 대기 신청도 받지 않음
  if (reservationClosed) {
    return (
      <div
        className="px-8 py-4 text-sm tracking-wider text-center"
        style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#D4CFC1", color: "#5A4A3E" }}
      >
        예약이 마감되었습니다
      </div>
    );
  }

  // 정원 도달(자동) — 대기 신청 링크는 남겨둔다
  if (isFull && !showWaitlistForm && !open) {
    return (
      <div className="flex flex-col gap-2 items-start">
        <div
          className="px-8 py-4 text-sm tracking-wider text-center"
          style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#5A4A3E", color: "#F0EEE9", fontWeight: 600 }}
        >
          매진되었습니다
        </div>
        <button
          type="button"
          onClick={() => { setShowWaitlistForm(true); setOpen(true); }}
          className="text-xs underline"
          style={{ color: "#5A4A3E" }}
        >
          그래도 대기 신청하기
        </button>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-8 py-4 text-sm tracking-wider text-center transition-colors"
          style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#5C2A42", color: "#F0EEE9", fontWeight: 600 }}
        >
          좌석 신청하기 ⌄
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-5 flex flex-col gap-4"
          style={{ backgroundColor: "#E6E1D6", fontFamily: "var(--font-noto-sans-kr)" }}
        >
          <input type="hidden" name="show_id" value={showId} />

          <p className="text-xs leading-relaxed" style={{ color: "#5A4A3E" }}>
            {showWaitlistForm ? (
              "정원이 찼습니다. 대기자로 접수되며, 자리가 나면 안내해 드립니다."
            ) : (
              <>
                신청은 좌석을 희망하신다는 접수이며, 실제 입장은 공연팀·학교 현장 안내를 따릅니다.
                <br />
                취소는 공연 시작 전까지 마이페이지 또는 예약 조회 페이지에서 언제든 가능합니다.
              </>
            )}
          </p>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-1" style={{ color: "#5A4A3E" }}>이름</label>
            <input
              type="text"
              name="guest_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
              className="w-full px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1", color: "#4A3B33" }}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-1" style={{ color: "#5A4A3E" }}>연락처(전화 또는 이메일)</label>
            <input
              type="text"
              name="guest_contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              disabled={isPending}
              placeholder="010-0000-0000 또는 이메일"
              className="w-full px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1", color: "#4A3B33" }}
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase mb-1" style={{ color: "#5A4A3E" }}>인원수</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                disabled={isPending || partySize <= 1}
                className="w-8 h-8 text-sm"
                style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1", color: "#4A3B33" }}
              >
                −
              </button>
              <span className="w-8 text-center text-sm" style={{ color: "#4A3B33" }}>{partySize}</span>
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.min(10, n + 1))}
                disabled={isPending || partySize >= 10}
                className="w-8 h-8 text-sm"
                style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1", color: "#4A3B33" }}
              >
                +
              </button>
              <input type="hidden" name="party_size" value={partySize} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: isPending ? "#D4CFC1" : "#5C2A42",
                color: "#F0EEE9",
                fontWeight: 600,
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              {isPending ? "신청 중…" : showWaitlistForm ? "대기 신청" : "신청 완료"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setShowWaitlistForm(false); }}
              disabled={isPending}
              className="text-xs underline"
              style={{ color: "#5A4A3E" }}
            >
              접기
            </button>
          </div>

          {result && !result.ok && (
            <div
              className="px-4 py-3 text-xs leading-relaxed"
              style={{ backgroundColor: "#FDECEC", color: "#D54545", border: "1px solid #D54545" }}
            >
              {result.message}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
