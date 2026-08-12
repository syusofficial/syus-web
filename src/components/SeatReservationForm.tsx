"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { submitReservation, type SubmitReservationState } from "@/app/actions/reservations";
import { createClient } from "@/lib/supabase/client";
import type { SessionReservationSummary } from "@/types";

// 버튼 4상태(hover/focus/active/disabled) 공통 클래스 — shows/[id]/page.tsx의
// "문의하기"·"티켓 예매하기" 버튼과 동일 패턴(디자인팀 2026-07-20 진단 1번 반영).
const BTN_STATES =
  "transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor] disabled:opacity-100 disabled:cursor-wait";
const LINK_BTN_STATES =
  "transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";

type Props = {
  showId: string;
  defaultName?: string;
  initialCapacity?: number | null;
  initialConfirmedTotal?: number;
  initialReservationClosed?: boolean;
  /** 회차 목록 — 예약 시스템 B1(회차별 정원 분리), 2026-07-24 신설.
   *  undefined/빈 배열이면 회차 기능 미사용(마이그레이션 전 또는 회차 없는 공연) — 기존 UX 그대로. */
  initialSessions?: SessionReservationSummary[];
  /** 로그인 여부 — 비로그인일 때만 가입 권유 안내를 띄운다 (2026-08-12 사장님 지시).
   *  게스트 신청을 막는 값이 아니다. 신청 자체는 로그인 여부와 무관하게 그대로 열려 있다. */
  isLoggedIn?: boolean;
};

const POLL_INTERVAL_MS = 20000;

/** "2026-07-24T10:30:00+00:00" → "7월 24일(금) 19:30" 같은 한국어 표기로 변환. */
function formatSessionAt(iso: string): string {
  try {
    const d = new Date(iso);
    const datePart = new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: "Asia/Seoul",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(d);
    return `${datePart} ${timePart}`;
  } catch {
    return iso;
  }
}

/**
 * 자체 예매(좌석 신청) 폼 — 상세페이지 CTA 아코디언 확장형(디자인팀 목업 방향).
 * 로그인 여부와 무관하게 이름·연락처·인원수 3개만 받는다(게스트 허용).
 * 제출 성공 시 신청번호를 그 자리에서 보여준다(신규 화면 이동 없음).
 *
 * 매진·마감 표시: syus_reservations는 RLS상 비로그인 방문자가 직접 못 읽으므로(개인정보
 * 보호), 개별 신청자 정보 없이 "확정 합계"만 주는 security definer RPC
 * (get_show_reservation_summary)를 20초 간격으로 폴링해 근실시간으로 반영한다.
 * 진짜 postgres_changes 구독은 RLS에 막혀 익명 사용자에겐 이벤트가 안 오므로 쓰지 않는다.
 *
 * 회차(B1, 2026-07-24): get_show_reservation_summary가 돌려주는 `sessions` 필드의
 * 유무·개수로 회차 기능을 스스로 감지한다(재배포 없이 DB 마이그레이션만으로 켜짐).
 *   - sessions가 없거나 0개 → 회차 미사용, 기존 로직(공연 전체 capacity/confirmedTotal) 그대로
 *   - sessions가 1개 → 그 회차를 자동 선택, 선택 UI는 숨김(기존 UX와 100% 동일하게 유지)
 *   - sessions가 2개 이상 → 회차 선택 UI를 보여주고, 선택 전엔 제출을 막는다
 */
export default function SeatReservationForm({
  showId,
  defaultName,
  initialCapacity = null,
  initialConfirmedTotal = 0,
  initialReservationClosed = false,
  initialSessions = [],
  isLoggedIn = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [contact, setContact] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SubmitReservationState | null>(null);
  // 개인정보 수집·이용 및 공연팀 제공 동의(필수) — 비회원도 신청할 수 있는 폼이라
  // 약관·방침 동의를 거친 적 없는 이용자가 이름·연락처를 남기게 된다. 그래서 이 폼
  // 자체에서 동의를 받는다(개인정보처리방침 제3조 제10항·제5조와 문구를 맞춰둘 것).
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const [capacity, setCapacity] = useState<number | null>(initialCapacity);
  const [confirmedTotal, setConfirmedTotal] = useState(initialConfirmedTotal);
  const [reservationClosed, setReservationClosed] = useState(initialReservationClosed);
  const [sessions, setSessions] = useState<SessionReservationSummary[]>(initialSessions);
  // 회차가 2개 이상일 때, 관객이 직접 고른 회차만 여기 담는다(자동 선택은 렌더링 시 계산 —
  // 아래 selectedSessionId 참고). 렌더 중 useState를 동기적으로 갱신하는 effect를 피하기 위한 설계.
  const [userSelectedSessionId, setUserSelectedSessionId] = useState<string>("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const supabase = createClient();

    const refresh = async () => {
      const { data } = await supabase.rpc("get_show_reservation_summary", { p_show_id: showId });
      if (!mounted.current || !data) return;
      const summary = data as {
        confirmed_total: number;
        capacity: number | null;
        reservation_closed: boolean;
        sessions?: SessionReservationSummary[];
      };
      setConfirmedTotal(summary.confirmed_total);
      setCapacity(summary.capacity);
      setReservationClosed(summary.reservation_closed);
      setSessions(summary.sessions ?? []);
    };

    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [showId]);

  const multiSession = sessions.length >= 2;
  const singleSession = sessions.length === 1 ? sessions[0] : null;
  // 회차가 1개면 그 회차를 자동 선택, 2개 이상이면 관객이 직접 고른 값만 유효(목록이 바뀌어
  // 더 이상 존재하지 않는 선택은 자동으로 무효화) — 렌더링 시 계산이라 effect가 필요 없다.
  const selectedSessionId = singleSession
    ? singleSession.id
    : sessions.some((s) => s.id === userSelectedSessionId)
      ? userSelectedSessionId
      : "";

  // 매진 판단 — 회차가 정확히 1개면 그 회차 기준, 아니면(회차 미사용) 공연 전체 기준.
  // 회차가 2개 이상이면 특정 회차만 매진일 수 있으므로 전체를 막지 않고 폼 안에서 안내한다.
  const effectiveCapacity = singleSession ? singleSession.effective_capacity : capacity;
  const effectiveConfirmed = singleSession ? singleSession.confirmed_total : confirmedTotal;
  const isFull = !multiSession && effectiveCapacity != null && effectiveConfirmed >= effectiveCapacity;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    // 필수 동의 미체크 시 제출 차단 — 기존 에러 표시(빨간 박스)와 같은 경로로 알린다.
    if (!privacyAgreed) {
      setResult({ ok: false, message: "개인정보 수집·이용 및 공연팀 제공에 동의해주세요." });
      return;
    }
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
        <div className="mt-3">
          <Link
            href={`/reservations/${result.code}`}
            className={`inline-block text-xs underline ${LINK_BTN_STATES}`}
            style={{ color: "#0B5563", fontWeight: 600 }}
          >
            예약 조회 페이지 바로가기 →
          </Link>
        </div>
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

  // 정원 도달(자동) — 대기 신청 링크는 남겨둔다. 회차가 2개 이상이면 이 전체화면 대신
  // 폼 안에서 회차별로 매진 여부를 보여준다(일부 회차만 매진일 수 있으므로).
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
          className={`text-xs underline ${LINK_BTN_STATES}`}
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
          className={`px-8 py-4 text-sm tracking-wider text-center ${BTN_STATES}`}
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
          {/* 회차가 1개뿐이면 선택 UI 없이 자동으로 그 회차를 담는다(기존 사용자 경험 유지) */}
          {singleSession && <input type="hidden" name="session_id" value={singleSession.id} />}

          <p className="text-xs leading-relaxed" style={{ color: "#5A4A3E" }}>
            {showWaitlistForm ? (
              <>
                정원이 찼습니다. 대기자로 접수됩니다.
                <br />
                이메일로 신청하신 경우 자리가 나면 메일로 안내해 드립니다. 전화번호로 신청하신 경우 예약 조회 페이지에서 직접 확인해주세요.
              </>
            ) : (
              <>
                신청은 좌석을 희망하신다는 접수이며, 실제 입장은 공연팀·학교 현장 안내를 따릅니다.
                <br />
                취소는 공연 시작 전까지 마이페이지 또는 예약 조회 페이지에서 언제든 가능합니다.
              </>
            )}
          </p>

          {/* 가입 권유 — 2026-08-12 사장님 지시. 비로그인 방문자에게만 보인다.
              원칙: 권유이지 관문이 아니다. 이 블록 때문에 게스트 신청이 한 걸음이라도
              멀어지면 안 되므로 (1) 폼 위에 얹기만 하고 입력은 그대로 열어두며
              (2) "지금 이대로 신청하셔도 괜찮습니다"를 반드시 남긴다.
              가입·로그인 링크에는 next를 실어 이 공연 페이지로 되돌아오게 한다
              (auth/signup·auth/login 모두 내부 경로만 허용하는 safeNext 검증이 있다). */}
          {!isLoggedIn && (
            <div
              className="p-4"
              style={{ backgroundColor: "#F0EEE9", borderLeft: "3px solid #0B5563" }}
            >
              <p className="text-xs font-bold mb-2" style={{ color: "#0B5563" }}>
                회원으로 신청하시면 조금 더 수월합니다
              </p>
              <ul className="text-[11px] leading-relaxed space-y-1" style={{ color: "#4A3B33" }}>
                <li>· 신청번호를 적어두지 않아도 마이페이지에서 확인하고 취소하실 수 있습니다.</li>
                <li>· 공연 사흘 전과 하루 전, 잊지 않도록 메일로 알려드립니다.</li>
                <li>· 마음이 간 무대를 모아두고, 보고 나서 한 줄 남기실 수 있습니다.</li>
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link
                  href={`/auth/signup?next=/muol/shows/${showId}`}
                  className={`text-xs underline ${LINK_BTN_STATES}`}
                  style={{ color: "#5C2A42", fontWeight: 600 }}
                >
                  가입하고 신청하기 →
                </Link>
                <Link
                  href={`/auth/login?next=/muol/shows/${showId}`}
                  className={`text-xs underline ${LINK_BTN_STATES}`}
                  style={{ color: "#5A4A3E" }}
                >
                  이미 회원이시라면 로그인
                </Link>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: "#5A4A3E" }}>
                물론 지금 이대로 신청하셔도 괜찮습니다.
              </p>
            </div>
          )}

          {/* 회차 선택 — 회차가 2개 이상인 공연만 노출 (예약 시스템 B1) */}
          {multiSession && (
            <div>
              <label className="block text-xs tracking-wider uppercase mb-2" style={{ color: "#5A4A3E" }}>
                관람 회차 선택
              </label>
              <div className="flex flex-col gap-2">
                {sessions.map((s) => {
                  const remaining = s.effective_capacity != null ? s.effective_capacity - s.confirmed_total : null;
                  const sessionFull = remaining != null && remaining <= 0;
                  const selected = selectedSessionId === s.id;
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer ${LINK_BTN_STATES}`}
                      style={{
                        backgroundColor: selected ? "#5C2A42" : "#F0EEE9",
                        color: selected ? "#F0EEE9" : "#4A3B33",
                        border: `1px solid ${selected ? "#5C2A42" : "#D4CFC1"}`,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="session_id"
                          value={s.id}
                          checked={selected}
                          onChange={() => setUserSelectedSessionId(s.id)}
                          required
                          disabled={isPending}
                        />
                        {formatSessionAt(s.session_at)}
                      </span>
                      <span className="text-xs" style={{ color: selected ? "#E6E1D6" : "#5A4A3E" }}>
                        {sessionFull ? "대기 전용" : remaining != null ? `잔여 ${remaining}석` : "정원 무제한"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs tracking-wider uppercase mb-1" style={{ color: "#5A4A3E" }}>이름</label>
            <input
              type="text"
              name="guest_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
              autoComplete="name"
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
              autoComplete="tel"
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
                className={`w-11 h-11 text-sm ${LINK_BTN_STATES}`}
                style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1", color: "#4A3B33" }}
              >
                −
              </button>
              <span className="w-8 text-center text-sm" style={{ color: "#4A3B33" }}>{partySize}</span>
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.min(10, n + 1))}
                disabled={isPending || partySize >= 10}
                className={`w-11 h-11 text-sm ${LINK_BTN_STATES}`}
                style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1", color: "#4A3B33" }}
              >
                +
              </button>
              <input type="hidden" name="party_size" value={partySize} />
            </div>
          </div>

          {/* 개인정보 수집·이용 동의 (필수) — 비회원 신청자를 위한 고지.
              항목·보유기간·제공처는 개인정보처리방침 제3조 제10항·제4조·제5조와 일치시킬 것. */}
          <div className="pt-1" style={{ borderTop: "1px solid #D4CFC1" }}>
            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-3">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={() => setPrivacyAgreed((v) => !v)}
                disabled={isPending}
                className="mt-0.5 shrink-0"
                style={{ accentColor: "#5C2A42", width: "1rem", height: "1rem" }}
              />
              <span className="text-xs leading-relaxed" style={{ color: "#4A3B33" }}>
                <span style={{ color: "#5C2A42", fontWeight: 600, marginRight: "4px" }}>[필수]</span>
                개인정보 수집·이용 및 공연팀 제공에 동의합니다.
              </span>
            </label>
            <div className="mt-2 text-[11px] leading-relaxed" style={{ color: "#5A4A3E" }}>
              <p>수집 항목: 이름, 연락처, 신청 인원수</p>
              <p>이용 목적: 좌석 신청 확인·취소 안내</p>
              <p>보유 기간: 해당 공연 종료 후 1개월</p>
              <p>
                제공: 신청하신 공연을 등록한 공연팀에게 위 항목이 제공됩니다(관람객 명단 확인·현장 입장 안내 목적).
              </p>
              <p>
                국외 이전: 신청 정보 보관과 확인 메일 발송을 위해 미국에 서버를 둔 처리 위탁사로 전송될 수 있습니다.
              </p>
              <p className="mt-1">
                동의를 거부하실 수 있으며, 이 경우 좌석 신청은 어렵습니다. 자세한 내용은{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className={`underline ${LINK_BTN_STATES}`}
                  style={{ color: "#0B5563" }}
                >
                  개인정보처리방침
                </Link>
                에서 확인하실 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className={`px-6 py-3 text-sm tracking-wider ${BTN_STATES}`}
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
              className={`text-xs underline ${LINK_BTN_STATES}`}
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
