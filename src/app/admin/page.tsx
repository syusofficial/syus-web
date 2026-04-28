"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageLoader from "@/components/PageLoader";
import AdminStats from "@/components/AdminStats";
import AdMediaKit from "@/components/AdMediaKit";
import { CONTACT_CATEGORIES } from "@/lib/constants";
import type { Show, Profile, Contact } from "@/types";

type Tab = "stats" | "media-kit" | "shows" | "applications" | "members" | "contacts";

const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
  "공연자 신청":     { bg: "#D4E4ED", color: "#2A5E7A" },
  "공연 등록 문의":  { bg: "#E8DDD0", color: "#6D3115" },
  "예매 / 환불":     { bg: "#EDE0D4", color: "#7A4A2A" },
  "협업 / 후원 제안": { bg: "#EDD4E4", color: "#7A2A5E" },
  "광고 / 제휴":     { bg: "#D4EDE8", color: "#2A7A6A" },
  "미디어 / 인터뷰": { bg: "#E0D4ED", color: "#4A2A7A" },
  "사이트 오류 신고": { bg: "#EDD4D4", color: "#A63D2F" },
  "개인정보 / 계정": { bg: "#D4EDD4", color: "#3A5E42" },
  "기타":            { bg: "#E0E0E0", color: "#5A5A5A" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:  { label: "대기중",  bg: "#E8DDD0", color: "#6D3115" },
    approved: { label: "승인됨",  bg: "#D4EDD4", color: "#3A5E42" },
    rejected: { label: "반려됨",  bg: "#EDD4D4", color: "#A63D2F" },
    resolved: { label: "처리완료", bg: "#D4EDD4", color: "#3A5E42" },
    member:   { label: "일반",    bg: "#E8DDD0", color: "#9B9693" },
    performer:{ label: "공연자",  bg: "#D4E4ED", color: "#2A5E7A" },
    admin:    { label: "관리자",  bg: "#EDD4E4", color: "#7A2A5E" },
  };
  const s = map[status] ?? { label: status, bg: "#E8DDD0", color: "#9B9693" };
  return (
    <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: s.bg, color: s.color, fontFamily: "var(--font-inter)" }}>
      {s.label}
    </span>
  );
};

export default function AdminPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "unauthorized" | "ready">("loading");
  const [tab, setTab] = useState<Tab>("shows");

  const [shows, setShows] = useState<Show[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [likes, setLikes] = useState<{ show_id: string }[]>([]);
  const [contactFilter, setContactFilter] = useState<string>("전체");
  const [dataLoading, setDataLoading] = useState(true);
  const [reviewShow, setReviewShow] = useState<Show | null>(null);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    setDataLoading(true);

    const [showsRes, membersRes, contactsRes, likesRes] = await Promise.all([
      supabase.from("shows").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("likes").select("show_id"),
    ]);

    setShows((showsRes.data as Show[]) ?? []);
    setMembers((membersRes.data as Profile[]) ?? []);
    setContacts((contactsRes.data as Contact[]) ?? []);
    setLikes((likesRes.data as { show_id: string }[]) ?? []);
    setDataLoading(false);
  }, []);

  // 모달 ESC 닫기 + body 스크롤 잠금
  useEffect(() => {
    if (!reviewShow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReviewShow(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [reviewShow]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "admin") {
        setAuthState("unauthorized");
        return;
      }

      setAuthState("ready");
      fetchAll();
    });
  }, [router, fetchAll]);

  const updateShowStatus = async (id: string, status: "approved" | "rejected") => {
    const supabase = createClient();
    const { error } = await supabase.from("shows").update({ status }).eq("id", id);
    if (!error) {
      setShows((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
      setReviewShow((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    }
  };

  /** 운영자 픽 토글 — 메인 페이지 노출 여부 */
  const toggleFeatured = async (id: string, featured: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from("shows").update({ featured }).eq("id", id);
    if (!error) {
      setShows((prev) => prev.map((s) => s.id === id ? { ...s, featured } : s));
      setReviewShow((prev) => (prev && prev.id === id ? { ...prev, featured } : prev));
    }
  };

  /** 관리자 강제 탈퇴 — Storage 포스터 + auth.users + CASCADE 데이터 삭제 */
  const forceDeleteMember = async (member: Profile) => {
    const confirmed = window.confirm(
      `정말로 "${member.name ?? member.email ?? member.id}" 회원을 강제 탈퇴시키겠습니까?\n\n` +
      `이 작업은 되돌릴 수 없으며, 해당 회원이 등록한 모든 공연·좋아요·문의 등이 영구 삭제됩니다.`
    );
    if (!confirmed) return;

    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: member.id }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "오류가 발생했습니다." }));
      alert(error ?? "탈퇴 처리 중 오류가 발생했습니다.");
      return;
    }

    // 회원·공연·문의 목록에서 즉시 반영 (탈퇴된 회원의 데이터 모두 cascade 삭제됨)
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    setShows((prev) => prev.filter((s) => s.organizer_id !== member.id));
    alert("회원 탈퇴가 완료되었습니다.");
  };

  /** 처리완료된 문의 영구 삭제 */
  const deleteContact = async (contact: Contact) => {
    if (contact.status !== "resolved") {
      alert("처리완료된 문의만 삭제할 수 있습니다.");
      return;
    }
    const confirmed = window.confirm(
      `"${contact.name}"님의 문의를 영구 삭제하시겠습니까?\n\n복구할 수 없습니다.`
    );
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
    if (error) {
      alert("삭제 중 오류가 발생했습니다. RLS 정책을 확인해주세요.");
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
  };

  const updateMemberRole = async (id: string, role: "member" | "performer" | "admin") => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (!error) {
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m));
    }
  };

  const resolveContact = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("contacts").update({ status: "resolved" }).eq("id", id);
    if (!error) {
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, status: "resolved" } : c));
    }
  };

  /** 공연 영구 삭제 — Storage 포스터 + DB row 제거 */
  const deleteShow = async (show: Show) => {
    const confirmed = window.confirm(
      `"${show.title}" 공연을 영구 삭제하시겠습니까?\n\n포스터 이미지와 공연 정보가 완전히 제거되며 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    const supabase = createClient();

    // 1. Storage에서 포스터 삭제
    if (show.poster_url) {
      const filename = show.poster_url.split("/posters/").pop();
      if (filename) {
        await supabase.storage.from("posters").remove([filename]);
      }
    }

    // 2. DB에서 공연 row 삭제
    const { error } = await supabase.from("shows").delete().eq("id", show.id);
    if (!error) {
      setShows((prev) => prev.filter((s) => s.id !== show.id));
      setReviewShow((prev) => (prev && prev.id === show.id ? null : prev));
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  /** 공연자 신청 승인 — role을 performer로 변경 + status를 approved로 */
  const approvePerformerApplication = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: "performer", performer_status: "approved" })
      .eq("id", id);
    if (!error) {
      setMembers((prev) => prev.map((m) =>
        m.id === id ? { ...m, role: "performer", performer_status: "approved" } : m
      ));
    }
  };

  /** 공연자 신청 반려 — role은 그대로 member, status만 rejected */
  const rejectPerformerApplication = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ performer_status: "rejected" })
      .eq("id", id);
    if (!error) {
      setMembers((prev) => prev.map((m) =>
        m.id === id ? { ...m, performer_status: "rejected" } : m
      ));
    }
  };

  // ── 상태별 화면 ──────────────────────────────
  if (authState === "loading") {
    return (
      <div className="pt-24 min-h-screen" style={{ backgroundColor: "#F4EDE3" }}>
        <PageLoader />
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
        <div className="text-center space-y-4">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            403
          </p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            접근 권한이 없습니다
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            관리자 계정으로 로그인해주세요.
          </p>
        </div>
      </div>
    );
  }

  // ── 통계 ──────────────────────────────────────
  const pendingShows = shows.filter((s) => s.status === "pending").length;
  const pendingContacts = contacts.filter((c) => c.status === "pending").length;
  const pendingApplications = members.filter((m) => m.performer_status === "pending").length;

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Admin
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            관리자 페이지
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "공연 승인 대기",  value: pendingShows,        highlight: pendingShows > 0 },
            { label: "공연자 신청",     value: pendingApplications, highlight: pendingApplications > 0 },
            { label: "미처리 문의",     value: pendingContacts,     highlight: pendingContacts > 0 },
            { label: "전체 공연",       value: shows.length,         highlight: false },
          ].map((s) => (
            <div
              key={s.label}
              className="p-6 text-center"
              style={{
                backgroundColor: s.highlight ? "#6D3115" : "#E8DDD0",
                color: s.highlight ? "#F4EDE3" : "#1A1A1A",
              }}
            >
              <p className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-inter)" }}>
                {dataLoading ? "—" : s.value}
              </p>
              <p className="text-xs tracking-wide" style={{ fontFamily: "var(--font-noto-sans-kr)", opacity: s.highlight ? 0.9 : 0.6 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-8 overflow-x-auto" style={{ borderBottom: "1px solid #D4CFC9" }}>
          {([
            { key: "stats",        label: "통계" },
            { key: "media-kit",    label: "광고" },
            { key: "shows",        label: `공연 승인${pendingShows ? ` (${pendingShows})` : ""}` },
            { key: "applications", label: `공연자 신청${pendingApplications ? ` (${pendingApplications})` : ""}` },
            { key: "members",      label: "회원 관리" },
            { key: "contacts",     label: `문의 확인${pendingContacts ? ` (${pendingContacts})` : ""}` },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-6 py-3 text-sm tracking-wide transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: tab === t.key ? "#6D3115" : "#9B9693",
                borderBottom: tab === t.key ? "2px solid #6D3115" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <PageLoader />
        ) : (
          <>
            {/* ── 통계 탭 ── */}
            {tab === "stats" && (
              <AdminStats shows={shows} members={members} likes={likes} />
            )}

            {/* ── 광고 탭 (미디어킷) ── */}
            {tab === "media-kit" && (
              <AdMediaKit shows={shows} members={members} />
            )}

            {/* ── 공연 승인 탭 ── */}
            {tab === "shows" && (
              <div className="overflow-x-auto">
                {shows.length === 0 ? (
                  <p className="text-center py-20 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                    등록된 공연이 없습니다.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #D4CFC9" }}>
                        {["공연명", "공연자", "장소", "일정", "상태", "관리"].map((h) => (
                          <th key={h} className="text-left py-3 px-3 text-xs tracking-wider" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shows.map((show) => (
                        <tr key={show.id} style={{ borderBottom: "1px solid #E8DDD0" }}>
                          <td className="py-4 px-3 font-medium" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}>
                            <button
                              type="button"
                              onClick={() => setReviewShow(show)}
                              className="text-left hover:underline transition-colors"
                              style={{ color: "#6D3115", cursor: "pointer" }}
                              title="클릭하여 상세 검토"
                            >
                              {show.title}
                            </button>
                          </td>
                          <td className="py-4 px-3 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                            {show.performer_name ?? "—"}
                          </td>
                          <td className="py-4 px-3 text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                            {show.venue}
                          </td>
                          <td className="py-4 px-3 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                            {show.schedule_start ?? "—"}
                          </td>
                          <td className="py-4 px-3">
                            <StatusBadge status={show.status} />
                          </td>
                          <td className="py-4 px-3">
                            <div className="flex gap-2 flex-wrap">
                              {show.status !== "approved" && (
                                <button
                                  onClick={() => updateShowStatus(show.id, "approved")}
                                  className="text-xs px-3 py-1 transition-colors"
                                  style={{ color: "#3A5E42", border: "1px solid #3A5E42" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4EDD4"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  승인
                                </button>
                              )}
                              {show.status !== "rejected" && (
                                <button
                                  onClick={() => updateShowStatus(show.id, "rejected")}
                                  className="text-xs px-3 py-1 transition-colors"
                                  style={{ color: "#A63D2F", border: "1px solid #A63D2F" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EDD4D4"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  반려
                                </button>
                              )}
                              <button
                                onClick={() => deleteShow(show)}
                                className="text-xs px-3 py-1 transition-colors"
                                style={{ color: "#F4EDE3", backgroundColor: "#1A1A1A", border: "1px solid #1A1A1A" }}
                                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── 공연자 신청 탭 ── */}
            {tab === "applications" && (
              <div className="overflow-x-auto">
                {(() => {
                  const pendingList = members.filter((m) => m.performer_status === "pending");
                  if (pendingList.length === 0) {
                    return (
                      <p className="text-center py-20 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                        대기 중인 공연자 신청이 없습니다.
                      </p>
                    );
                  }
                  return (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid #D4CFC9" }}>
                          {["이름", "이메일", "가입일", "관리"].map((h) => (
                            <th key={h} className="text-left py-3 px-3 text-xs tracking-wider" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pendingList.map((m) => (
                          <tr key={m.id} style={{ borderBottom: "1px solid #E8DDD0" }}>
                            <td className="py-4 px-3 font-medium" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}>
                              {m.name ?? "—"}
                            </td>
                            <td className="py-4 px-3 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                              {m.email ?? <span style={{ fontStyle: "italic" }}>이메일 없음</span>}
                            </td>
                            <td className="py-4 px-3 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                              {m.created_at.slice(0, 10)}
                            </td>
                            <td className="py-4 px-3">
                              <div className="flex gap-3">
                                <button
                                  onClick={() => approvePerformerApplication(m.id)}
                                  className="text-xs px-3 py-1 transition-colors"
                                  style={{ color: "#3A5E42", border: "1px solid #3A5E42" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4EDD4"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  승인
                                </button>
                                <button
                                  onClick={() => rejectPerformerApplication(m.id)}
                                  className="text-xs px-3 py-1 transition-colors"
                                  style={{ color: "#A63D2F", border: "1px solid #A63D2F" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EDD4D4"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  반려
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}

            {/* ── 회원 관리 탭 ── */}
            {tab === "members" && (
              <div className="overflow-x-auto">
                {members.length === 0 ? (
                  <p className="text-center py-20 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                    가입된 회원이 없습니다.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #D4CFC9" }}>
                        {["이름", "이메일", "역할", "가입일", "역할 변경", "관리"].map((h) => (
                          <th key={h} className="text-left py-3 px-3 text-xs tracking-wider" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} style={{ borderBottom: "1px solid #E8DDD0" }}>
                          <td className="py-4 px-3 font-medium" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                            {m.name ?? "—"}
                          </td>
                          <td className="py-4 px-3 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                            {m.email ?? <span style={{ fontStyle: "italic" }}>이메일 없음</span>}
                          </td>
                          <td className="py-4 px-3">
                            <StatusBadge status={m.role} />
                          </td>
                          <td className="py-4 px-3 text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                            {m.created_at.slice(0, 10)}
                          </td>
                          <td className="py-4 px-3">
                            <select
                              value={m.role}
                              onChange={(e) => updateMemberRole(m.id, e.target.value as "member" | "performer" | "admin")}
                              className="text-xs px-2 py-1 outline-none"
                              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#E8DDD0", color: "#1A1A1A", border: "1px solid #D4CFC9" }}
                            >
                              <option value="member">일반</option>
                              <option value="performer">공연자</option>
                              <option value="admin">관리자</option>
                            </select>
                          </td>
                          <td className="py-4 px-3">
                            <button
                              onClick={() => forceDeleteMember(m)}
                              className="text-xs px-3 py-1 transition-colors"
                              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F4EDE3", backgroundColor: "#1A1A1A", border: "1px solid #1A1A1A" }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                            >
                              강제 탈퇴
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── 문의 확인 탭 ── */}
            {tab === "contacts" && (
              <div className="space-y-6">
                {/* 카테고리 필터 */}
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const categoryCounts: Record<string, number> = { "전체": contacts.length };
                    for (const c of contacts) {
                      const key = c.category ?? "기타";
                      categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
                    }
                    const filterOptions = ["전체", ...CONTACT_CATEGORIES];
                    return filterOptions.map((opt) => {
                      const isActive = contactFilter === opt;
                      const count = categoryCounts[opt] ?? 0;
                      return (
                        <button
                          key={opt}
                          onClick={() => setContactFilter(opt)}
                          className="px-3 py-1.5 text-xs tracking-wide transition-colors"
                          style={{
                            fontFamily: "var(--font-noto-sans-kr)",
                            backgroundColor: isActive ? "#6D3115" : "transparent",
                            color: isActive ? "#F4EDE3" : "#6D3115",
                            border: `1px solid ${isActive ? "#6D3115" : "#D4CFC9"}`,
                          }}
                        >
                          {opt}{count > 0 && <span style={{ opacity: 0.7, marginLeft: 6 }}>({count})</span>}
                        </button>
                      );
                    });
                  })()}
                </div>

                {(() => {
                  const filteredContacts = contactFilter === "전체"
                    ? contacts
                    : contacts.filter((c) => (c.category ?? "기타") === contactFilter);

                  if (filteredContacts.length === 0) {
                    return (
                      <p className="text-center py-20 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                        {contactFilter === "전체" ? "접수된 문의가 없습니다." : `"${contactFilter}" 유형의 문의가 없습니다.`}
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filteredContacts.map((c) => {
                        const cat = c.category ?? "기타";
                        const catColor = CATEGORY_COLOR[cat] ?? { bg: "#E0E0E0", color: "#5A5A5A" };
                        return (
                          <div key={c.id} className="p-6" style={{ backgroundColor: "#E8DDD0" }}>
                            <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span
                                    className="px-2 py-0.5 text-xs tracking-wide"
                                    style={{
                                      fontFamily: "var(--font-noto-sans-kr)",
                                      backgroundColor: catColor.bg,
                                      color: catColor.color,
                                    }}
                                  >
                                    {cat}
                                  </span>
                                  <p className="font-semibold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}>
                                    {c.name}
                                  </p>
                                </div>
                                <p className="text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                                  {c.email}
                                  {c.phone ? ` · ${c.phone}` : ""}
                                  {" · "}
                                  {c.created_at.slice(0, 10)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                <StatusBadge status={c.status} />
                                {c.status === "pending" && (
                                  <button
                                    onClick={() => resolveContact(c.id)}
                                    className="text-xs px-3 py-1 transition-colors"
                                    style={{ color: "#3A5E42", border: "1px solid #3A5E42" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4EDD4"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                  >
                                    처리완료
                                  </button>
                                )}
                                {c.status === "resolved" && (
                                  <button
                                    onClick={() => deleteContact(c)}
                                    className="text-xs px-3 py-1 transition-colors"
                                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#F4EDE3", backgroundColor: "#1A1A1A", border: "1px solid #1A1A1A" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                              {c.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 공연 상세 검토 모달 ── */}
      {reviewShow && (
        <ShowReviewModal
          show={reviewShow}
          onClose={() => setReviewShow(null)}
          onApprove={() => updateShowStatus(reviewShow.id, "approved")}
          onReject={() => updateShowStatus(reviewShow.id, "rejected")}
          onDelete={() => deleteShow(reviewShow)}
          onToggleFeatured={() => toggleFeatured(reviewShow.id, !reviewShow.featured)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 공연 상세 검토 모달 — 등록된 모든 정보를 한 화면에서 확인
// ──────────────────────────────────────────────────────────────
function ShowReviewModal({
  show,
  onClose,
  onApprove,
  onReject,
  onDelete,
  onToggleFeatured,
}: {
  show: Show;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const genreLabel = show.genre === "기타" ? (show.genre_custom || "기타") : (show.genre ?? "—");

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
        {label}
      </p>
      <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
        {value && value.trim() !== "" ? value : <span style={{ color: "#9B9693" }}>—</span>}
      </p>
    </div>
  );

  const LinkRow = ({ label, url }: { label: string; url?: string | null }) => (
    <div>
      <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
        {label}
      </p>
      {url && url.trim() !== "" ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm break-all hover:underline"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}
        >
          {url} ↗
        </a>
      ) : (
        <p className="text-sm" style={{ color: "#9B9693" }}>—</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(26, 26, 26, 0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#F4EDE3" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-lg transition-colors z-10"
          style={{ color: "#6D3115", backgroundColor: "#E8DDD0" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4CFC9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#E8DDD0"; }}
        >
          ✕
        </button>

        <div className="p-6 sm:p-10 space-y-8">
          {/* 헤더 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                Review
              </p>
              <StatusBadge status={show.status} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              {show.title}
            </h2>
            {show.subtitle && (
              <p className="text-sm" style={{ fontFamily: "var(--font-inter)", color: "#9B9693", letterSpacing: "0.1em" }}>
                {show.subtitle}
              </p>
            )}
          </div>

          {/* 포스터 + 핵심 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
            <div className="aspect-[3/4] overflow-hidden" style={{ backgroundColor: "#D4CFC9" }}>
              {show.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={show.poster_url} alt={show.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                    포스터 없음
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 content-start">
              <InfoRow label="공연자" value={show.performer_name} />
              <InfoRow label="장르" value={genreLabel} />
              <InfoRow label="지역" value={show.region} />
              <InfoRow label="대학·학과" value={show.school_department} />
              <InfoRow label="공연 시작" value={show.schedule_start} />
              <InfoRow label="공연 종료" value={show.schedule_end} />
              <InfoRow label="공연 시간" value={show.show_time} />
              <InfoRow label="러닝 타임" value={show.running_time} />
              <InfoRow label="관람 연령" value={show.age_rating} />
              <InfoRow label="등록일" value={show.created_at.slice(0, 10)} />
            </div>
          </div>

          {/* 장소 */}
          <div className="pt-6" style={{ borderTop: "1px solid #D4CFC9" }}>
            <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              장소 · 오시는 길
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label="공연장" value={show.venue} />
              <InfoRow label="주소" value={show.venue_address} />
              <div className="sm:col-span-2">
                <InfoRow label="오시는 길" value={show.directions} />
              </div>
              <LinkRow label="카카오맵" url={show.map_kakao_url} />
              <LinkRow label="네이버지도" url={show.map_naver_url} />
            </div>
          </div>

          {/* 작품 */}
          <div className="pt-6" style={{ borderTop: "1px solid #D4CFC9" }}>
            <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              작품 정보
            </h3>
            <div className="space-y-5">
              <InfoRow
                label="출연진"
                value={show.cast_members && show.cast_members.length > 0 ? show.cast_members.join(", ") : null}
              />
              <div>
                <p className="text-xs tracking-wider uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                  작품 소개
                </p>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap p-4"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A", backgroundColor: "#E8DDD0" }}
                >
                  {show.description || <span style={{ color: "#9B9693" }}>작품 소개가 없습니다.</span>}
                </p>
              </div>
              <LinkRow label="티켓 예매 링크" url={show.ticket_url} />
            </div>
          </div>

          {/* 운영자 픽 토글 — approved 공연만 활성 */}
          {show.status === "approved" && (
            <div
              className="pt-6 flex items-center justify-between gap-4 flex-wrap"
              style={{ borderTop: "1px solid #D4CFC9" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs tracking-wider uppercase mb-1" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                  Editor&apos;s Pick
                </p>
                <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                  메인 페이지 &lsquo;이번 달 주목할 만한 공연&rsquo; 영역에 노출
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleFeatured}
                className="px-5 py-2 text-xs tracking-wider transition-colors shrink-0"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  backgroundColor: show.featured ? "#6D3115" : "transparent",
                  color: show.featured ? "#F4EDE3" : "#6D3115",
                  border: `1px solid #6D3115`,
                }}
              >
                {show.featured ? "✓ 픽 등록됨 (해제)" : "픽 등록하기"}
              </button>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="pt-6 flex flex-col sm:flex-row gap-3" style={{ borderTop: "1px solid #D4CFC9" }}>
            {show.status !== "approved" && (
              <button
                type="button"
                onClick={onApprove}
                className="flex-1 py-3 text-sm tracking-wider transition-colors"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#3A5E42", color: "#F4EDE3" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                승인하기
              </button>
            )}
            {show.status !== "rejected" && (
              <button
                type="button"
                onClick={onReject}
                className="flex-1 py-3 text-sm tracking-wider transition-colors"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "transparent", color: "#A63D2F", border: "1px solid #A63D2F" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EDD4D4"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                반려하기
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="px-6 py-3 text-sm tracking-wider transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#1A1A1A", color: "#F4EDE3" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              영구 삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
