"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRecentIds } from "@/lib/recentViews";
import { cancelReservationAction } from "@/app/actions/reservations";
import PageLoader from "@/components/PageLoader";
import ShowCard from "@/components/ShowCard";
import PasswordInput from "@/components/PasswordInput";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Profile, Show, Reservation } from "@/types";

type Tab = "info" | "likes" | "recent" | "performer" | "reservations";

// 버튼 4상태 공통 클래스(디자인팀 2026-07-20 진단 3번 반영)
const LINK_BTN_STATES =
  "transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";

type PendingConfirm = { type: "cancelReservation"; reservation: Reservation } | { type: "withdraw" } | null;

/** syus_reservations + 조인 결과(shows·show_sessions) 원본 행 — 예약 시스템 B1, 2026-07-24 */
type ReservationJoinRow = Reservation & {
  shows?: { title?: string; schedule_start?: string; schedule_end?: string } | null;
  show_sessions?: { session_at?: string } | null;
};

/** "2026-07-24T10:30:00+00:00" → "7월 24일(금) 19:30" — 내 예약 목록 회차 표기용 (예약 시스템 B1) */
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

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [likedShows, setLikedShows] = useState<Show[]>([]);
  const [recentShows, setRecentShows] = useState<Show[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [waitlistPositions, setWaitlistPositions] = useState<Record<string, number>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [authProvider, setAuthProvider] = useState<string>("email");

  // 이름 수정
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // 비밀번호 변경
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");

  // 관심 공연 알림 토글
  const [notifySaving, setNotifySaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }

      // 가입 경로 (email | google | kakao)
      const provider = data.user.app_metadata?.provider ?? "email";
      setAuthProvider(provider);

      const [profileRes, likesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", data.user.id).single(),
        supabase
          .from("likes")
          .select("show_id, shows(*)")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false }),
      ]);

      setProfile(profileRes.data as Profile);
      setNewName(profileRes.data?.name ?? "");

      const liked = (likesRes.data ?? [])
        .map((row) => row.shows as unknown as Show)
        .filter((s) => s && s.status === "approved");
      setLikedShows(liked);

      // 최근 본 공연 - localStorage → DB 조회
      const recentIds = getRecentIds();
      if (recentIds.length > 0) {
        const { data: recents } = await supabase
          .from("shows")
          .select("*")
          .in("id", recentIds)
          .eq("status", "approved");

        const ordered = recentIds
          .map((id) => (recents ?? []).find((s) => s.id === id))
          .filter(Boolean) as Show[];
        setRecentShows(ordered);
      }

      // 내 좌석 신청 내역 (show_sessions 조인은 예약 시스템 B1, 2026-07-24 신설).
      // 마이그레이션 전에는 show_sessions 테이블·session_id 관계 자체가 없어 이 조인이 에러가
      // 나므로, 그때는 조인 없는 예전 쿼리로 안전하게 폴백한다(신청 내역이 통째로 안 보이는
      // 사고를 막기 위한 안전장치 — "컬럼·테이블 존재 여부에 안전한 폴백" 원칙).
      let reservationRows: ReservationJoinRow[] | null = null;
      const withSessions = await supabase
        .from("syus_reservations")
        .select("*, shows(title, schedule_start, schedule_end), show_sessions(session_at)")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });
      if (withSessions.error) {
        const legacy = await supabase
          .from("syus_reservations")
          .select("*, shows(title, schedule_start, schedule_end)")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });
        reservationRows = legacy.data as ReservationJoinRow[] | null;
      } else {
        reservationRows = withSessions.data as ReservationJoinRow[] | null;
      }

      setMyReservations(
        (reservationRows ?? []).map((row) => ({
          ...row,
          show_title: row.shows?.title,
          schedule_start: row.shows?.schedule_start,
          schedule_end: row.shows?.schedule_end,
          session_at: row.show_sessions?.session_at ?? null,
        }))
      );

      // 대기 순번 — 다른 신청자 정보 노출 없이 본인 대기 건의 순번(숫자)만 받아온다 (디자인팀 B3)
      const { data: positionsData } = await supabase.rpc("get_my_waitlist_positions");
      if (Array.isArray(positionsData)) {
        const positions: Record<string, number> = {};
        for (const p of positionsData as { id: string; position: number }[]) {
          positions[p.id] = p.position;
        }
        setWaitlistPositions(positions);
      }

      setLoading(false);
    });
  }, [router]);

  const handleNameSave = async () => {
    if (!profile || !newName.trim()) return;
    setNameSaving(true);
    const supabase = createClient();
    const trimmed = newName.trim();
    const [profileRes, authRes] = await Promise.all([
      supabase.from("profiles").update({ name: trimmed }).eq("id", profile.id),
      supabase.auth.updateUser({ data: { name: trimmed } }),
    ]);
    if (!profileRes.error && !authRes.error) {
      setProfile({ ...profile, name: trimmed });
      setEditingName(false);
    }
    setNameSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage("");
    if (newPw.length < 8) {
      setPwMessage("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setPwMessage("비밀번호 변경 중 오류가 발생했습니다.");
    } else {
      setPwMessage("비밀번호가 변경되었습니다.");
      setNewPw("");
      setConfirmPw("");
      setShowPwForm(false);
    }
    setPwSaving(false);
  };

  const handleNotifyToggle = async (next: boolean) => {
    if (!profile) return;
    setNotifySaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ notify_show_reminders: next })
      .eq("id", profile.id);
    if (!error) setProfile({ ...profile, notify_show_reminders: next });
    setNotifySaving(false);
  };

  const handlePerformerApply = async () => {
    if (!profile) return;
    setApplying(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ performer_status: "pending" })
      .eq("id", profile.id);
    if (!error) setProfile({ ...profile, performer_status: "pending" });
    setApplying(false);
  };

  const handleCancelReservation = (reservation: Reservation) => {
    setPendingConfirm({ type: "cancelReservation", reservation });
  };

  const executeCancelReservation = async (reservation: Reservation) => {
    setPendingConfirm(null);
    setCancellingId(reservation.id);
    const res = await cancelReservationAction(reservation.reservation_code, "");
    if (res.ok) {
      setMyReservations((prev) =>
        prev.map((r) => (r.id === reservation.id ? { ...r, status: "cancelled" } : r))
      );
    } else {
      alert(res.message);
    }
    setCancellingId(null);
  };

  const executeWithdraw = async () => {
    setPendingConfirm(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      alert("탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.");
      router.push("/");
      router.refresh();
    } else {
      alert(json.error ?? "탈퇴 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
        <PageLoader />
      </div>
    );
  }

  if (!profile) return null;

  const roleLabel = { member: "일반 회원", performer: "공연자", admin: "관리자" }[profile.role];

  return (
    <div className="pt-24 md:pt-36 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F0EEE9" }}>
      <ConfirmDialog
        open={pendingConfirm !== null}
        title={pendingConfirm?.type === "withdraw" ? "회원 탈퇴" : "좌석 신청 취소"}
        message={
          pendingConfirm?.type === "withdraw"
            ? "정말 탈퇴하시겠습니까?\n\n등록한 공연, 찜 목록, 모든 가입 정보가 영구 삭제되며 복구할 수 없습니다."
            : "이 좌석 신청을 취소하시겠습니까?\n\n취소하시면 대기 중인 다음 분께 자리가 자동으로 안내됩니다. 취소 후 다시 신청하시면 대기로 접수될 수 있습니다."
        }
        confirmLabel={pendingConfirm?.type === "withdraw" ? "탈퇴하기" : "취소하기"}
        danger
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (!pendingConfirm) return;
          if (pendingConfirm.type === "withdraw") executeWithdraw();
          else executeCancelReservation(pendingConfirm.reservation);
        }}
      />
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            My Page
          </p>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            {profile.name ?? "회원"}님
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
            {profile.email ?? "이메일 미제공 (소셜 가입)"} · {roleLabel}
          </p>
          <Link
            href="/syus/mypage"
            className="inline-block mt-4 text-sm"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", fontWeight: 600, borderBottom: "1px solid #0B5563", paddingBottom: "2px" }}
          >
            시우스 마이페이지 →
          </Link>
        </div>

        {/* Tabs — 모바일에서는 줄바꿈으로 5개를 전부 드러낸다.
            한 줄 가로 스크롤로 두면 360px 화면에 2개 반만 들어가고, 폰에는 스크롤바도
            힌트도 없어서 마지막 '공연자 신청' 탭의 존재 자체를 모르게 된다.
            공연자 전환은 핵심 동선이므로 감춰지면 안 된다(디자인팀 진단 5번).
            md 이상에서는 기존처럼 한 줄로 둔다. */}
        <div className="flex flex-wrap md:flex-nowrap gap-0 mb-10 md:overflow-x-auto" style={{ borderBottom: "1px solid #D4CFC1" }}>
          {[
            { key: "info",      label: "내 정보" },
            { key: "likes",     label: `찜한 공연${likedShows.length ? ` (${likedShows.length})` : ""}` },
            { key: "recent",    label: `최근 본 공연${recentShows.length ? ` (${recentShows.length})` : ""}` },
            { key: "reservations", label: `내 예약${myReservations.length ? ` (${myReservations.length})` : ""}` },
            { key: "performer", label: "공연자 신청" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className="px-3 md:px-5 py-3 text-sm tracking-wide transition-colors whitespace-nowrap"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: tab === t.key ? "#0B5563" : "#5A4A3E",
                borderBottom: tab === t.key ? "2px solid #0B5563" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: 내 정보 */}
        {tab === "info" && (
          <div className="space-y-6">
            {/* ── 회원으로 누릴 수 있는 것 — 일반 회원 혜택 안내 ── */}
            <div className="p-6" style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1" }}>
              <p
                className="text-[0.7rem] tracking-[0.25em] uppercase mb-3"
                style={{ fontFamily: "var(--font-inter)", color: "#0B5563", fontWeight: 600 }}
              >
                회원으로 누릴 수 있는 것
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {/* 2026-08-06 정정 — 되돌리지 말 것. 찜과 좋아요는 likes 테이블 하나짜리
                    같은 기능이라 두 줄로 셀 수 없고, "새 공연 알림"은 구현이 존재하지 않는다
                    (marketing_opt_in을 읽는 코드 0줄). 실재하는 알림은 찜한 공연의 D-3/D-1뿐. */}
                {[
                  { label: "공연 찜하기", desc: "관심 공연을 모아 두고 다시 보기" },
                  { label: "공연 알림", desc: "찜한 공연의 사흘 전 · 하루 전 메일" },
                  { label: "한 줄 후기", desc: "별점과 함께 짧게 (10~200자)" },
                  { label: "예약 내역", desc: "신청번호 없이 확인 · 취소" },
                ].map((b) => (
                  <div key={b.label} className="flex items-baseline gap-2">
                    <span style={{ color: "#0B5563", fontWeight: 600 }}>✓</span>
                    <div>
                      <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", fontWeight: 600 }}>
                        {b.label}
                      </p>
                      <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                        {b.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {profile?.role !== "performer" && profile?.role !== "admin" && (
                <div className="mt-5 pt-4" style={{ borderTop: "1px solid #D4CFC1" }}>
                  <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
                    <strong style={{ color: "#5C2A42" }}>학과·동아리·극단</strong>이라면, 아래 <strong>공연자 신청</strong> 탭에서 공연자 자격을 신청할 수 있습니다.
                    승인 후에는 내 공연을 직접 등록·수정할 수 있어요.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 space-y-4" style={{ backgroundColor: "#E6E1D6" }}>
              {/* 이름 (수정 가능) — 모바일에서는 라벨/값을 세로로 쌓는다.
                  360px 화면에서 [100px_1fr] 2열을 유지하면 입력창에 남는 폭이 약 36px까지
                  줄어들어 글자 두어 개도 안 보였다(디자인팀 진단 4번). */}
              <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 sm:gap-4 items-start sm:items-center">
                <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                  이름
                </span>
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 text-base outline-none"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#F0EEE9", color: "#4A3B33", border: "1px solid #0B5563" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleNameSave}
                        disabled={nameSaving || !newName.trim()}
                        className="px-3 py-2 text-xs"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
                      >
                        {nameSaving ? "저장 중..." : "저장"}
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNewName(profile.name ?? ""); }}
                        className="px-3 py-2 text-xs"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", border: "1px solid #D4CFC1" }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>{profile.name ?? "—"}</span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-xs"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
                    >
                      수정
                    </button>
                  </div>
                )}
              </div>

              {/* 그 외 정보 (읽기전용) */}
              {[
                { label: "이메일", value: profile.email ?? "—" },
                { label: "회원 등급", value: roleLabel },
                { label: "가입일", value: profile.created_at.slice(0, 10) },
                { label: "가입 경로", value: { email: "이메일", google: "Google", kakao: "카카오" }[authProvider] ?? authProvider },
              ].map((item) => (
                <div key={item.label} className="grid grid-cols-[100px_1fr] gap-4 text-sm">
                  <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                    {item.label}
                  </span>
                  <span style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* 비밀번호 변경 — 이메일 가입자만 */}
            {authProvider === "email" && (
              <div className="p-6" style={{ backgroundColor: "#E6E1D6" }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
                    비밀번호 변경
                  </h3>
                  {!showPwForm && (
                    <button
                      onClick={() => { setShowPwForm(true); setPwMessage(""); }}
                      className="text-xs"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}
                    >
                      변경하기
                    </button>
                  )}
                </div>
                {showPwForm && (
                  <form onSubmit={handlePasswordChange} className="space-y-3" data-clarity-mask="True">
                    <PasswordInput value={newPw} onChange={setNewPw} required minLength={8} />
                    <PasswordInput value={confirmPw} onChange={setConfirmPw} required minLength={8} />
                    {pwMessage && (
                      <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: pwMessage.includes("변경되었습니다") ? "#3A5E42" : "#C0392B" }}>
                        {pwMessage}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={pwSaving}
                        className="px-4 py-2 text-xs"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
                      >
                        {pwSaving ? "변경 중..." : "비밀번호 저장"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowPwForm(false); setNewPw(""); setConfirmPw(""); setPwMessage(""); }}
                        className="px-4 py-2 text-xs"
                        style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", border: "1px solid #D4CFC1" }}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {authProvider !== "email" && (
              <div className="p-4 text-xs" style={{ backgroundColor: "#E6E1D6", color: "#5A4A3E", fontFamily: "var(--font-noto-sans-kr)" }}>
                {authProvider === "google" ? "Google" : "카카오"} 계정으로 가입하셨기 때문에 비밀번호는 해당 서비스에서 관리됩니다.
              </div>
            )}

            {/* 관심 공연 알림 — 좋아요한 공연 D-3 / D-1 메일 */}
            <div className="p-6" style={{ backgroundColor: "#E6E1D6" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
                    관심 공연 알림
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                    찜한 공연이 사흘 뒤, 또는 내일 막을 올릴 때 메일로 짧게 알려드립니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNotifyToggle(!(profile.notify_show_reminders ?? true))}
                  disabled={notifySaving}
                  aria-pressed={profile.notify_show_reminders ?? true}
                  className="shrink-0 px-4 py-2 text-xs transition-colors"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    backgroundColor: (profile.notify_show_reminders ?? true) ? "#0B5563" : "transparent",
                    color: (profile.notify_show_reminders ?? true) ? "#F0EEE9" : "#5A4A3E",
                    border: (profile.notify_show_reminders ?? true) ? "1px solid #0B5563" : "1px solid #D4CFC1",
                  }}
                >
                  {notifySaving ? "저장 중..." : (profile.notify_show_reminders ?? true) ? "받는 중" : "받지 않음"}
                </button>
              </div>
            </div>

            {(profile.role === "performer" || profile.role === "admin") && (
              <Link
                href="/muol/performer"
                className="inline-block px-8 py-3 text-sm tracking-wider transition-colors"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
              >
                공연자 페이지로 →
              </Link>
            )}

            {/* 회원 탈퇴 섹션 */}
            <div className="pt-8 mt-8" style={{ borderTop: "1px solid #D4CFC1" }}>
              <h3 className="text-sm font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#A63D2F" }}>
                회원 탈퇴
              </h3>
              <p className="text-xs leading-relaxed mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                탈퇴 시 모든 정보(공연 등록 내역, 찜 목록, 가입 정보)가 영구 삭제되며 복구할 수 없습니다.
              </p>
              <button
                onClick={() => setPendingConfirm({ type: "withdraw" })}
                className={`text-xs px-4 py-2 ${LINK_BTN_STATES}`}
                style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#A63D2F", border: "1px solid #A63D2F" }}
              >
                탈퇴하기
              </button>
            </div>
          </div>
        )}

        {/* Tab: 찜한 공연 */}
        {tab === "likes" && (
          <>
            {likedShows.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                  아직 찜한 공연이 없습니다.
                </p>
                <Link href="/" className="text-sm tracking-wider" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                  공연 보러 가기 →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
                {likedShows.map((show) => <ShowCard key={show.id} show={show} />)}
              </div>
            )}
          </>
        )}

        {/* Tab: 최근 본 공연 */}
        {tab === "recent" && (
          <>
            {recentShows.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                  최근 본 공연이 없습니다.
                </p>
                <Link href="/" className="text-sm tracking-wider" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                  공연 둘러보기 →
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs mb-6" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                  이 기기에서 본 최근 10개 공연이 표시됩니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
                  {recentShows.map((show) => <ShowCard key={show.id} show={show} />)}
                </div>
              </>
            )}
          </>
        )}

        {/* Tab: 내 예약 */}
        {tab === "reservations" && (
          <>
            <p className="text-xs leading-relaxed mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
              취소는 공연 시작 전까지 언제든 가능하며, 별도 위약금이나 페널티는 없습니다.
              <br />
              확정 신청을 취소하시면 대기 순번대로 자동 확정되어 안내됩니다.
            </p>
            {myReservations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                  아직 신청한 좌석이 없습니다.
                </p>
                <Link href="/" className="text-sm tracking-wider" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                  공연 보러 가기 →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myReservations.map((r) => {
                  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                    confirmed: { label: "확정", bg: "#D4EDD4", color: "#3A5E42" },
                    waitlisted: { label: "대기", bg: "#E6E1D6", color: "#0B5563" },
                    cancelled: { label: "취소됨", bg: "#EDD4D4", color: "#5A4A3E" },
                  };
                  const s = statusMap[r.status] ?? statusMap.confirmed;
                  return (
                    <div key={r.id} className="p-5 flex items-center justify-between" style={{ backgroundColor: "#F0EEE9", border: "1px solid #D4CFC1" }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33" }}>
                          {r.show_title ?? "공연 정보 없음"}
                        </p>
                        <p className="text-xs mt-1" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                          {r.session_at && `${formatSessionAt(r.session_at)} · `}
                          인원 {r.party_size}명 · 신청번호 {r.reservation_code}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: s.bg, color: s.color }}>
                          {s.label}
                          {r.status === "waitlisted" && waitlistPositions[r.id] != null && ` · ${waitlistPositions[r.id]}번째`}
                        </span>
                        {r.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancelReservation(r)}
                            disabled={cancellingId === r.id}
                            className={`text-xs underline ${LINK_BTN_STATES}`}
                            style={{ color: "#D54545" }}
                          >
                            {cancellingId === r.id ? "취소 중…" : "취소"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab: 공연자 신청 */}
        {tab === "performer" && (
          <div>
            <div className="p-8 mb-6" style={{ backgroundColor: "#E6E1D6" }}>
              <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
                공연자 신청이란?
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
                공연자 신청을 하시면 운영자 검토를 거쳐 공연을 직접 등록할 수 있는 권한이 부여됩니다.
                <br />
                등록한 공연은 관리자 최종 승인 후 게시됩니다.
              </p>
              <div className="space-y-2">
                {[
                  "공연자 신청 → 운영자 검토 → 승인 시 공연자 권한 부여 (보통 1~3일)",
                  "공연자 페이지에서 공연 등록 (제목, 포스터, 일정 등)",
                  "등록된 공연은 관리자 검토 후 메인 페이지에 게시",
                ].map((text, i) => (
                  <p key={i} className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                    {i + 1}. {text}
                  </p>
                ))}
              </div>
            </div>

            {/* 일반 회원: 신청 상태별 UI */}
            {profile.role === "member" && !profile.performer_status && (
              <button
                onClick={handlePerformerApply}
                disabled={applying}
                className="px-8 py-3 text-sm tracking-wider transition-colors"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: applying ? "#5A4A3E" : "#0B5563",
                  color: "#F0EEE9",
                  cursor: applying ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (!applying) e.currentTarget.style.backgroundColor = "#2C7384"; }}
                onMouseLeave={(e) => { if (!applying) e.currentTarget.style.backgroundColor = "#0B5563"; }}
              >
                {applying ? "신청 중..." : "공연자 신청하기"}
              </button>
            )}

            {profile.role === "member" && profile.performer_status === "pending" && (
              <div className="p-6" style={{ backgroundColor: "#E6E1D6" }}>
                <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
                  ⏳ 신청이 접수되었습니다
                </p>
                <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                  관리자 검토 후 승인되면 공연자 권한이 부여됩니다. (보통 1~3일 소요)
                </p>
              </div>
            )}

            {profile.role === "member" && profile.performer_status === "rejected" && (
              <div className="space-y-3">
                <div className="p-6" style={{ backgroundColor: "#EDD4D4" }}>
                  <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#A63D2F" }}>
                    ✕ 신청이 반려되었습니다
                  </p>
                  <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#A63D2F" }}>
                    반려 사유가 궁금하시면 문의해주세요. 수정 후 재신청하실 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={handlePerformerApply}
                  disabled={applying}
                  className="px-8 py-3 text-sm tracking-wider"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    backgroundColor: applying ? "#5A4A3E" : "#0B5563",
                    color: "#F0EEE9",
                  }}
                >
                  {applying ? "신청 중..." : "재신청하기"}
                </button>
              </div>
            )}

            {profile.role === "performer" && (
              <div className="p-6 flex items-center justify-between" style={{ backgroundColor: "#D4EDD4" }}>
                <div>
                  <p className="font-semibold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A5E42" }}>
                    ✓ 공연자로 등록되어 있습니다
                  </p>
                  <p className="text-xs mt-1" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#3A5E42" }}>
                    공연자 페이지에서 공연을 등록할 수 있습니다.
                  </p>
                </div>
                <Link href="/muol/performer" className="text-sm tracking-wider" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#3A5E42" }}>
                  바로가기 →
                </Link>
              </div>
            )}

            {profile.role === "admin" && (
              <div className="p-6" style={{ backgroundColor: "#EDD4E4" }}>
                <p className="font-semibold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#7A2A5E" }}>
                  관리자 계정입니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
