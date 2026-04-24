"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<"info" | "performer">("info");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      setProfile(prof as Profile);
      setLoading(false);
    });
  }, [router]);

  const handlePerformerApply = async () => {
    if (!profile) return;
    setApplying(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: "performer" })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, role: "performer" });
    }
    setApplying(false);
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F4EDE3" }}>
        <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>불러오는 중...</p>
      </div>
    );
  }

  if (!profile) return null;

  const roleLabel = { member: "일반 회원", performer: "공연자", admin: "관리자" }[profile.role];

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            My Page
          </p>
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            {profile.name ?? "회원"}님
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            {profile.email} · {roleLabel}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-10" style={{ borderBottom: "1px solid #D4CFC9" }}>
          {[
            { key: "info", label: "내 정보" },
            { key: "performer", label: "공연자 신청" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as "info" | "performer")}
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

        {/* Tab: Info */}
        {tab === "info" && (
          <div className="space-y-6">
            <div className="p-6" style={{ backgroundColor: "#E8DDD0" }}>
              <div className="grid grid-cols-[100px_1fr] gap-4 text-sm">
                {[
                  { label: "이름", value: profile.name ?? "—" },
                  { label: "이메일", value: profile.email },
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
          </div>
        )}

        {/* Tab: Performer */}
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

            {profile.role === "member" && (
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
                <Link
                  href="/performer"
                  className="text-sm tracking-wider"
                  style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#3A5E42" }}
                >
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
