"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRecentIds } from "@/lib/recentViews";
import PageLoader from "@/components/PageLoader";
import ShowCard from "@/components/ShowCard";
import type { Profile, Show } from "@/types";

type Tab = "info" | "likes" | "recent" | "performer";

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [likedShows, setLikedShows] = useState<Show[]>([]);
  const [recentShows, setRecentShows] = useState<Show[]>([]);
  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }

      const [profileRes, likesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", data.user.id).single(),
        supabase
          .from("likes")
          .select("show_id, shows(*)")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false }),
      ]);

      setProfile(profileRes.data as Profile);

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

      setLoading(false);
    });
  }, [router]);

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

  if (loading) {
    return (
      <div className="pt-24 min-h-screen" style={{ backgroundColor: "#F4EDE3" }}>
        <PageLoader />
      </div>
    );
  }

  if (!profile) return null;

  const roleLabel = { member: "일반 회원", performer: "공연자", admin: "관리자" }[profile.role];

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            My Page
          </p>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            {profile.name ?? "회원"}님
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            {profile.email ?? "이메일 미제공 (소셜 가입)"} · {roleLabel}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-10 overflow-x-auto" style={{ borderBottom: "1px solid #D4CFC9" }}>
          {[
            { key: "info",      label: "내 정보" },
            { key: "likes",     label: `찜한 공연${likedShows.length ? ` (${likedShows.length})` : ""}` },
            { key: "recent",    label: `최근 본 공연${recentShows.length ? ` (${recentShows.length})` : ""}` },
            { key: "performer", label: "공연자 신청" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className="px-5 py-3 text-sm tracking-wide transition-colors whitespace-nowrap"
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

        {/* Tab: 내 정보 */}
        {tab === "info" && (
          <div className="space-y-6">
            <div className="p-6" style={{ backgroundColor: "#E8DDD0" }}>
              <div className="grid grid-cols-[100px_1fr] gap-4 text-sm">
                {[
                  { label: "이름", value: profile.name ?? "—" },
                  { label: "이메일", value: profile.email ?? "—" },
                  { label: "회원 등급", value: roleLabel },
                  { label: "가입일", value: profile.created_at.slice(0, 10) },
                ].map((item) => (
                  <div key={item.label} className="contents">
                    <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                      {item.label}
                    </span>
                    <span style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(profile.role === "performer" || profile.role === "admin") && (
              <Link
                href="/performer"
                className="inline-block px-8 py-3 text-sm tracking-wider transition-colors"
                style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
              >
                공연자 페이지로 →
              </Link>
            )}

            {/* 회원 탈퇴 섹션 */}
            <div className="pt-8 mt-8" style={{ borderTop: "1px solid #D4CFC9" }}>
              <h3 className="text-sm font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#A63D2F" }}>
                회원 탈퇴
              </h3>
              <p className="text-xs leading-relaxed mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                탈퇴 시 모든 정보(공연 등록 내역, 찜 목록, 가입 정보)가 영구 삭제되며 복구할 수 없습니다.
              </p>
              <button
                onClick={async () => {
                  const ok = window.confirm(
                    "정말 탈퇴하시겠습니까?\n\n등록한 공연, 찜 목록, 모든 가입 정보가 영구 삭제되며 복구할 수 없습니다."
                  );
                  if (!ok) return;
                  const res = await fetch("/api/account/delete", { method: "POST" });
                  const json = await res.json();
                  if (res.ok) {
                    alert("탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.");
                    router.push("/");
                    router.refresh();
                  } else {
                    alert(json.error ?? "탈퇴 중 오류가 발생했습니다.");
                  }
                }}
                className="text-xs px-4 py-2"
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
                <p className="text-sm mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  아직 찜한 공연이 없습니다.
                </p>
                <Link href="/" className="text-sm tracking-wider" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
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
                <p className="text-sm mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  최근 본 공연이 없습니다.
                </p>
                <Link href="/" className="text-sm tracking-wider" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                  공연 둘러보기 →
                </Link>
              </div>
            ) : (
              <>
                <p className="text-xs mb-6" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                  이 기기에서 본 최근 10개 공연이 표시됩니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
                  {recentShows.map((show) => <ShowCard key={show.id} show={show} />)}
                </div>
              </>
            )}
          </>
        )}

        {/* Tab: 공연자 신청 */}
        {tab === "performer" && (
          <div>
            <div className="p-8 mb-6" style={{ backgroundColor: "#E8DDD0" }}>
              <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                공연자 신청이란?
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
                공연자 신청을 하시면 공연을 직접 등록할 수 있는 권한이 부여됩니다.
                <br />
                등록한 공연은 관리자 최종 승인 후 게시됩니다.
              </p>
              <div className="space-y-2">
                {[
                  "공연자 신청 → 즉시 공연자 권한 부여",
                  "공연자 페이지에서 공연 등록 (제목, 포스터, 일정 등)",
                  "등록된 공연은 관리자 검토 후 메인 페이지에 게시",
                ].map((text, i) => (
                  <p key={i} className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
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
                  backgroundColor: applying ? "#9B9693" : "#6D3115",
                  color: "#F4EDE3",
                  cursor: applying ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (!applying) e.currentTarget.style.backgroundColor = "#8B4A2A"; }}
                onMouseLeave={(e) => { if (!applying) e.currentTarget.style.backgroundColor = "#6D3115"; }}
              >
                {applying ? "신청 중..." : "공연자 신청하기"}
              </button>
            )}

            {profile.role === "member" && profile.performer_status === "pending" && (
              <div className="p-6" style={{ backgroundColor: "#E8DDD0" }}>
                <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                  ⏳ 신청이 접수되었습니다
                </p>
                <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                  관리자 검토 후 승인되면 공연자 권한이 부여됩니다. (보통 1~3 영업일 소요)
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
                    backgroundColor: applying ? "#9B9693" : "#6D3115",
                    color: "#F4EDE3",
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
                <Link href="/performer" className="text-sm tracking-wider" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#3A5E42" }}>
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
