"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageLoader from "@/components/PageLoader";
import { REGIONS, GENRES } from "@/lib/constants";
import type { Show } from "@/types";

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:  { label: "승인 대기", bg: "#E8DDD0", color: "#6D3115" },
    approved: { label: "게시 중",   bg: "#D4EDD4", color: "#3A5E42" },
    rejected: { label: "반려됨",    bg: "#EDD4D4", color: "#A63D2F" },
  };
  const s = map[status] ?? { label: status, bg: "#E8DDD0", color: "#9B9693" };
  return (
    <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: s.bg, color: s.color, fontFamily: "var(--font-inter)" }}>
      {s.label}
    </span>
  );
};

const emptyForm = {
  title: "",
  subtitle: "",
  description: "",
  venue: "",
  venue_address: "",
  schedule_start: "",
  schedule_end: "",
  cast_members: "",
  directions: "",
  ticket_url: "",
  genre_custom: "",
  school_department: "",
  show_time: "",
  running_time: "",
  age_rating: "",
  map_kakao_url: "",
  map_naver_url: "",
};

export default function PerformerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myShows, setMyShows] = useState<Show[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [genre, setGenre] = useState<string>("");
  const [region, setRegion] = useState<string>("전체");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }
      const { data: shows } = await supabase
        .from("shows")
        .select("*")
        .eq("organizer_id", data.user.id)
        .order("created_at", { ascending: false });
      setMyShows((shows as Show[]) ?? []);
      setFetchLoading(false);
    });
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setGenre("");
    setRegion("전체");
    setPosterFile(null);
    setPosterPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!genre) { setError("공연 장르를 선택해주세요."); return; }
    if (genre === "기타" && !form.genre_custom.trim()) {
      setError("기타 장르명을 입력해주세요.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    let poster_url: string | null = null;
    if (posterFile) {
      const ext = posterFile.name.split(".").pop();
      const filename = `${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("posters")
        .upload(filename, posterFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError("포스터 업로드 중 오류가 발생했습니다.");
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("posters").getPublicUrl(filename);
      poster_url = urlData.publicUrl;
    }

    const castArray = form.cast_members
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { data: newShow, error: insertError } = await supabase
      .from("shows")
      .insert({
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description,
        venue: form.venue,
        venue_address: form.venue_address || null,
        schedule_start: form.schedule_start,
        schedule_end: form.schedule_end,
        cast_members: castArray,
        directions: form.directions || null,
        ticket_url: form.ticket_url || null,
        poster_url,
        organizer_id: user.id,
        performer_name: profile?.name ?? "",
        status: "pending",

        // 신규 필드
        genre,
        genre_custom: genre === "기타" ? form.genre_custom : null,
        region,
        school_department: form.school_department || null,
        show_time: form.show_time || null,
        running_time: form.running_time || null,
        age_rating: form.age_rating || null,
        map_kakao_url: form.map_kakao_url || null,
        map_naver_url: form.map_naver_url || null,
      })
      .select()
      .single();

    if (insertError) {
      setError("공연 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setMyShows((prev) => [newShow as Show, ...prev]);
    setShowForm(false);
    resetForm();
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#F4EDE3",
    color: "#1A1A1A",
    border: "1px solid transparent",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-inter)",
    color: "#9B9693",
  };

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            Performer
          </p>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-4xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              내 공연 관리
            </h1>
            <button
              onClick={() => { setShowForm(!showForm); setError(""); }}
              className="px-6 py-3 text-sm tracking-wider transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B4A2A")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6D3115")}
            >
              {showForm ? "취소" : "+ 공연 등록"}
            </button>
          </div>
        </div>

        {/* 등록 폼 */}
        {showForm && (
          <div className="mb-12 p-8 space-y-8" style={{ backgroundColor: "#E8DDD0" }}>
            <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              새 공연 등록
            </h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ── 섹션 1: 포스터 ── */}
              <div>
                <label className="block text-xs tracking-wider uppercase mb-3" style={labelStyle}>
                  포스터 이미지
                </label>
                <div className="flex items-start gap-4">
                  {posterPreview && (
                    <div className="w-24 aspect-[3/4] relative overflow-hidden shrink-0" style={{ backgroundColor: "#D4CFC9" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={posterPreview} alt="미리보기" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 text-sm"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#F4EDE3", color: "#6D3115", border: "1px solid #D4CFC9" }}
                  >
                    {posterFile ? "파일 변경" : "파일 선택"}
                  </button>
                  {posterFile && (
                    <span className="text-xs pt-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                      {posterFile.name}
                    </span>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* ── 섹션 2: 장르 (버튼 선택) ── */}
              <div>
                <label className="block text-xs tracking-wider uppercase mb-3" style={labelStyle}>
                  공연 장르 <span style={{ color: "#A63D2F" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => {
                    const active = genre === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenre(g)}
                        className="px-5 py-2.5 text-sm transition-colors"
                        style={{
                          fontFamily: "var(--font-noto-sans-kr)",
                          backgroundColor: active ? "#6D3115" : "#F4EDE3",
                          color: active ? "#F4EDE3" : "#1A1A1A",
                          border: `1px solid ${active ? "#6D3115" : "#D4CFC9"}`,
                        }}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
                {genre === "기타" && (
                  <input
                    type="text"
                    value={form.genre_custom}
                    onChange={(e) => setForm({ ...form, genre_custom: e.target.value })}
                    placeholder="장르를 직접 입력해주세요 (예: 인형극, 마술쇼)"
                    className="w-full mt-3 px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                )}
              </div>

              {/* ── 섹션 3: 지역 (버튼 선택) ── */}
              <div>
                <label className="block text-xs tracking-wider uppercase mb-3" style={labelStyle}>
                  지역 <span style={{ color: "#A63D2F" }}>*</span>
                  <span className="ml-2 normal-case text-[10px]" style={{ letterSpacing: "normal" }}>
                    ('전체'를 선택하면 모든 지역에 노출됩니다)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => {
                    const active = region === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRegion(r)}
                        className="px-4 py-2 text-sm transition-colors"
                        style={{
                          fontFamily: "var(--font-noto-sans-kr)",
                          backgroundColor: active ? "#6D3115" : "#F4EDE3",
                          color: active ? "#F4EDE3" : "#1A1A1A",
                          border: `1px solid ${active ? "#6D3115" : "#D4CFC9"}`,
                          fontWeight: r === "전체" ? 600 : 400,
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 섹션 4: 기본 정보 ── */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC9" }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                  기본 정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "공연명 *", key: "title", required: true, span: "sm:col-span-2" },
                    { label: "영문 제목", key: "subtitle", required: false },
                    { label: "대학 및 학과명", key: "school_department", required: false, placeholder: "예: 한양대학교 연극영화학과" },
                    { label: "공연 기간 시작 * (예: 2026.05.10)", key: "schedule_start", required: true },
                    { label: "공연 기간 종료 * (예: 2026.05.25)", key: "schedule_end", required: true },
                    { label: "공연 시간 (예: 평일 19:30 / 주말 15:00)", key: "show_time", required: false },
                    { label: "러닝 타임 (예: 100분)", key: "running_time", required: false },
                    { label: "관람 연령 (예: 7세 이상)", key: "age_rating", required: false },
                    { label: "티켓 예매 링크", key: "ticket_url", required: false },
                  ].map((field) => (
                    <div key={field.key} className={field.span ?? ""}>
                      <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={form[field.key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 text-sm outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 섹션 5: 장소 정보 ── */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC9" }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                  장소 · 오시는 길
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "공연장 *", key: "venue", required: true },
                    { label: "주소", key: "venue_address", required: false },
                    { label: "오시는 길", key: "directions", required: false, span: "sm:col-span-2", placeholder: "예: 4호선 혜화역 1번 출구 도보 5분" },
                    { label: "카카오맵 링크", key: "map_kakao_url", required: false, placeholder: "https://place.map.kakao.com/..." },
                    { label: "네이버지도 링크", key: "map_naver_url", required: false, placeholder: "https://map.naver.com/..." },
                  ].map((field) => (
                    <div key={field.key} className={field.span ?? ""}>
                      <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={form[field.key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 text-sm outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 섹션 6: 작품 정보 ── */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC9" }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                  작품 정보
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                      출연진 * (쉼표로 구분)
                    </label>
                    <input
                      type="text"
                      value={form.cast_members}
                      onChange={(e) => setForm({ ...form, cast_members: e.target.value })}
                      required
                      placeholder="예: 홍길동(주인공), 김철수(조력자), 박영희(악역)"
                      className="w-full px-4 py-3 text-sm outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                      작품 소개 *
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                      rows={5}
                      className="w-full px-4 py-3 text-sm outline-none resize-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    />
                  </div>
                </div>
              </div>

              {/* ── 제출 영역 ── */}
              {error && (
                <p className="text-sm p-3" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#C0392B", backgroundColor: "#EDD4D4" }}>
                  {error}
                </p>
              )}

              <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                ※ 등록 후 관리자 검토를 거쳐 게시됩니다. (1~3 영업일 소요)
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 text-base tracking-wider transition-colors"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    backgroundColor: loading ? "#9B9693" : "#6D3115",
                    color: "#F4EDE3",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#8B4A2A"; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#6D3115"; }}
                >
                  {loading ? "업로드 중..." : "공연 업로드"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); setError(""); }}
                  disabled={loading}
                  className="px-8 py-4 text-base tracking-wider"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    backgroundColor: "transparent",
                    color: "#6D3115",
                    border: "1px solid #D4CFC9",
                  }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 내 공연 목록 */}
        <div>
          <h2 className="text-lg font-semibold mb-6" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            등록한 공연
          </h2>
          {fetchLoading ? (
            <PageLoader />
          ) : myShows.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                등록한 공연이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myShows.map((show) => (
                <div key={show.id} className="p-5 flex items-center justify-between" style={{ backgroundColor: "#E8DDD0" }}>
                  <div>
                    <p className="font-semibold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}>
                      {show.title}
                    </p>
                    <p className="text-xs" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                      {[
                        show.genre === "기타" ? show.genre_custom : show.genre,
                        show.region,
                        show.venue,
                        show.schedule_start,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={show.status} />
                    {show.status === "approved" && (
                      <Link
                        href={`/shows/${show.id}`}
                        className="text-xs tracking-wide"
                        style={{ fontFamily: "var(--font-inter)", color: "#6D3115" }}
                      >
                        보기 →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
