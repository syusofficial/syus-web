"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Show, Profile, Contact } from "@/types";

type Tab = "shows" | "members" | "contacts";

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
  const [dataLoading, setDataLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    setDataLoading(true);

    const [showsRes, membersRes, contactsRes] = await Promise.all([
      supabase.from("shows").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
    ]);

    setShows((showsRes.data as Show[]) ?? []);
    setMembers((membersRes.data as Profile[]) ?? []);
    setContacts((contactsRes.data as Contact[]) ?? []);
    setDataLoading(false);
  }, []);

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
    }
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

  // ── 상태별 화면 ──────────────────────────────
  if (authState === "loading") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F4EDE3" }}>
        <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>확인 중...</p>
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
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "전체 공연", value: shows.length },
            { label: "승인 대기", value: pendingShows },
            { label: "미처리 문의", value: pendingContacts },
          ].map((s) => (
            <div key={s.label} className="p-6 text-center" style={{ backgroundColor: "#E8DDD0" }}>
              <p className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-inter)", color: "#6D3115" }}>
                {dataLoading ? "—" : s.value}
              </p>
              <p className="text-xs tracking-wide" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-8" style={{ borderBottom: "1px solid #D4CFC9" }}>
          {([
            { key: "shows", label: "공연 승인" },
            { key: "members", label: "회원 관리" },
            { key: "contacts", label: "문의 확인" },
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
          <div className="text-center py-20">
            <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>불러오는 중...</p>
          </div>
        ) : (
          <>
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
                            {show.title}
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
                            <div className="flex gap-3">
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
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
                        {["이름", "이메일", "역할", "가입일", "역할 변경"].map((h) => (
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
                            {m.email}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── 문의 확인 탭 ── */}
            {tab === "contacts" && (
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <p className="text-center py-20 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                    접수된 문의가 없습니다.
                  </p>
                ) : (
                  contacts.map((c) => (
                    <div key={c.id} className="p-6" style={{ backgroundColor: "#E8DDD0" }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold mb-0.5" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}>
                            {c.name}
                          </p>
                          <p className="text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                            {c.email} · {c.created_at.slice(0, 10)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={c.status} />
                          {c.status === "pending" && (
                            <button
                              onClick={() => resolveContact(c.id)}
                              className="text-xs px-3 py-1"
                              style={{ color: "#3A5E42", border: "1px solid #3A5E42" }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4EDD4"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            >
                              처리완료
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                        {c.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
