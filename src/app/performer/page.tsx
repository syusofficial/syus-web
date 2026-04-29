"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageLoader from "@/components/PageLoader";
import { REGIONS_EXCLUDE_ALL, GENRES, SHOW_CATEGORIES } from "@/lib/constants";
import { isValidUrl, normalizeUrl, KAKAO_MAP_HOSTS, NAVER_MAP_HOSTS } from "@/lib/validators";
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
  title: "", subtitle: "", description: "",
  venue: "", venue_address: "", schedule_start: "", schedule_end: "",
  cast_members: "", directions: "", ticket_url: "",
  genre_custom: "", school_department: "", show_time: "", running_time: "",
  age_rating: "", map_kakao_url: "", map_naver_url: "",
  performer_name: "",
};

export default function PerformerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authState, setAuthState] = useState<"loading" | "denied" | "ready">("loading");
  const [myShows, setMyShows] = useState<Show[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [genre, setGenre] = useState<string>("");
  const [showCategory, setShowCategory] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [defaultPerformerName, setDefaultPerformerName] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [existingPosterUrl, setExistingPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const draftKey = currentUserId ? `syus-performer-draft-${currentUserId}` : null;

  // 권한 체크 + 내 공연 로딩
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "performer" && profile?.role !== "admin") {
        setAuthState("denied");
        return;
      }

      setDefaultPerformerName(profile?.name ?? "");
      setCurrentUserId(data.user.id);

      const { data: shows } = await supabase
        .from("shows")
        .select("*")
        .eq("organizer_id", data.user.id)
        .order("created_at", { ascending: false });

      setMyShows((shows as Show[]) ?? []);
      setAuthState("ready");
    });
  }, [router]);

  // 임시저장 — 신규 등록 모드에서만, 폼 변경 1초 debounce
  useEffect(() => {
    if (!showForm || editingId || !draftKey) return;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ form, genre, showCategory, region }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [form, genre, showCategory, region, showForm, editingId, draftKey]);

  // 신규 등록 모드 진입 시 저장된 draft 감지
  useEffect(() => {
    if (showForm && !editingId && draftKey) {
      const draft = localStorage.getItem(draftKey);
      setHasDraft(!!draft);
    } else {
      setHasDraft(false);
    }
  }, [showForm, editingId, draftKey]);

  const restoreDraft = () => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.form) setForm(draft.form);
      if (draft.genre) setGenre(draft.genre);
      if (draft.showCategory) setShowCategory(draft.showCategory);
      if (draft.region) setRegion(draft.region);
    } catch {
      // 잘못된 JSON이면 무시
    }
    setHasDraft(false);
  };

  const discardDraft = () => {
    if (draftKey) localStorage.removeItem(draftKey);
    setHasDraft(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setGenre("");
    setShowCategory("");
    setRegion("");
    setPosterFile(null);
    setPosterPreview(null);
    setExistingPosterUrl(null);
    setEditingId(null);
    setError("");
  };

  // 수정 모드 진입 — 기존 공연 데이터로 폼 채우기
  const startEditing = (show: Show) => {
    setEditingId(show.id);
    setForm({
      title: show.title ?? "",
      subtitle: show.subtitle ?? "",
      description: show.description ?? "",
      venue: show.venue ?? "",
      venue_address: show.venue_address ?? "",
      schedule_start: show.schedule_start ?? "",
      schedule_end: show.schedule_end ?? "",
      cast_members: show.cast_members?.join(", ") ?? "",
      directions: show.directions ?? "",
      ticket_url: show.ticket_url ?? "",
      genre_custom: show.genre_custom ?? "",
      school_department: show.school_department ?? "",
      show_time: show.show_time ?? "",
      running_time: show.running_time ?? "",
      age_rating: show.age_rating ?? "",
      map_kakao_url: show.map_kakao_url ?? "",
      map_naver_url: show.map_naver_url ?? "",
      performer_name: show.performer_name ?? "",
    });
    setGenre(show.genre ?? "");
    setShowCategory(show.show_category ?? "");
    setRegion(show.region ?? "");
    setExistingPosterUrl(show.poster_url ?? null);
    setPosterFile(null);
    setPosterPreview(null);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 공연 삭제
  const deleteShow = async (show: Show) => {
    const confirmed = window.confirm(
      `"${show.title}" 공연을 삭제하시겠습니까?\n\n포스터 이미지와 공연 정보가 완전히 제거되며 복구할 수 없습니다.`
    );
    if (!confirmed) return;

    const supabase = createClient();

    // Storage에서 포스터 삭제
    if (show.poster_url) {
      const filename = show.poster_url.split("/posters/").pop();
      if (filename) {
        await supabase.storage.from("posters").remove([filename]);
      }
    }

    const { error } = await supabase.from("shows").delete().eq("id", show.id);
    if (!error) {
      setMyShows((prev) => prev.filter((s) => s.id !== show.id));
      if (editingId === show.id) {
        setShowForm(false);
        resetForm();
      }
    } else {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!genre) { setError("공연 장르를 선택해주세요."); return; }
    if (genre === "기타" && !form.genre_custom.trim()) {
      setError("기타 장르명을 입력해주세요.");
      return;
    }
    if (!showCategory) { setError("공연 구분을 선택해주세요."); return; }
    if (!region) { setError("공연 지역을 선택해주세요."); return; }

    // URL 정규화 — 프로토콜 없이 입력해도 자동 https:// 보완
    const ticketUrl = normalizeUrl(form.ticket_url);
    const mapKakaoUrl = normalizeUrl(form.map_kakao_url);
    const mapNaverUrl = normalizeUrl(form.map_naver_url);

    // URL 검증
    if (!isValidUrl(ticketUrl)) {
      setError("티켓 예매 링크가 올바른 주소 형식이 아닙니다. 정확한 링크(예: ticket.interpark.com/...)를 입력하시거나, 사용하지 않으신다면 입력란을 비워주세요.");
      return;
    }
    if (!isValidUrl(mapKakaoUrl, { allowedHosts: KAKAO_MAP_HOSTS })) {
      setError("카카오맵 링크는 카카오맵(kakao.com) 주소만 사용 가능합니다. 비워두시거나 카카오맵에서 복사한 링크를 입력해주세요.");
      return;
    }
    if (!isValidUrl(mapNaverUrl, { allowedHosts: NAVER_MAP_HOSTS })) {
      setError("네이버지도 링크는 네이버 지도(naver.com / naver.me) 주소만 사용 가능합니다. 비워두시거나 네이버 지도에서 복사한 링크를 입력해주세요.");
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

    // 단체명 — 사용자가 입력한 값 우선, 없으면 본인 이름
    const performerNameForShow = (form.performer_name || "").trim() || (profile?.name ?? "");

    let poster_url: string | null = existingPosterUrl;

    // 새 포스터 업로드
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

      // 기존 포스터가 있다면 삭제
      if (existingPosterUrl) {
        const oldFilename = existingPosterUrl.split("/posters/").pop();
        if (oldFilename) {
          await supabase.storage.from("posters").remove([oldFilename]);
        }
      }
      poster_url = urlData.publicUrl;
    }

    const castArray = form.cast_members
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      subtitle: form.subtitle || null,
      description: form.description,
      venue: form.venue,
      venue_address: form.venue_address || null,
      schedule_start: form.schedule_start,
      schedule_end: form.schedule_end,
      cast_members: castArray,
      directions: form.directions || null,
      ticket_url: ticketUrl || null,
      poster_url,
      organizer_id: user.id,
      performer_name: performerNameForShow,
      genre,
      genre_custom: genre === "기타" ? form.genre_custom : null,
      show_category: showCategory,
      region,
      school_department: form.school_department || null,
      show_time: form.show_time || null,
      running_time: form.running_time || null,
      age_rating: form.age_rating || null,
      map_kakao_url: mapKakaoUrl || null,
      map_naver_url: mapNaverUrl || null,
    };

    if (editingId) {
      // 수정 모드 — 상태는 다시 pending으로 (관리자 재검토)
      const { data: updated, error: updateError } = await supabase
        .from("shows")
        .update({ ...payload, status: "pending" })
        .eq("id", editingId)
        .select()
        .single();

      if (updateError) {
        setError("공연 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
        setLoading(false);
        return;
      }
      setMyShows((prev) => prev.map((s) => s.id === editingId ? (updated as Show) : s));
    } else {
      // 신규 등록
      const { data: newShow, error: insertError } = await supabase
        .from("shows")
        .insert({ ...payload, status: "pending" })
        .select()
        .single();

      if (insertError) {
        setError("공연 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
        setLoading(false);
        return;
      }
      setMyShows((prev) => [newShow as Show, ...prev]);
      // 등록 성공 → 임시저장 삭제
      if (draftKey) localStorage.removeItem(draftKey);
    }

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

  // 권한 없음 화면
  if (authState === "loading") {
    return (
      <div className="pt-24 min-h-screen" style={{ backgroundColor: "#F4EDE3" }}>
        <PageLoader />
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F4EDE3" }}>
        <div className="text-center max-w-sm space-y-5">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
            403
          </p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
            공연자 권한이 필요합니다
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            공연을 등록하려면 마이페이지에서 공연자 신청을 먼저 진행해주세요.
            관리자 검토 후 권한이 부여됩니다.
          </p>
          <Link
            href="/mypage"
            className="inline-block px-8 py-3 text-sm tracking-wider"
            style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
          >
            마이페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F4EDE3" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={labelStyle}>
            Performer
          </p>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-4xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              내 공연 관리
            </h1>
            <button
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                  resetForm();
                } else {
                  resetForm();
                  // 신규 등록 시 단체명 default를 본인 이름으로
                  setForm((prev) => ({ ...prev, performer_name: defaultPerformerName }));
                  setShowForm(true);
                }
              }}
              className="px-6 py-3 text-sm tracking-wider transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B4A2A")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6D3115")}
            >
              {showForm ? "취소" : "+ 공연 등록"}
            </button>
          </div>
        </div>

        {/* 등록 / 수정 폼 */}
        {showForm && (
          <div className="mb-12 p-8 space-y-8" style={{ backgroundColor: "#E8DDD0" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                {editingId ? "공연 수정" : "새 공연 등록"}
              </h2>
              {editingId && (
                <span className="text-xs px-2 py-1" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#A63D2F", backgroundColor: "#EDD4D4" }}>
                  수정 시 다시 관리자 승인 필요
                </span>
              )}
            </div>

            {/* 임시저장 복원 안내 */}
            {hasDraft && !editingId && (
              <div
                className="p-4 flex items-center justify-between gap-4 flex-wrap"
                style={{ backgroundColor: "#F4EDE3", border: "1px solid #6D3115" }}
              >
                <p className="text-xs leading-relaxed flex-1 min-w-0" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                  이전에 작성하던 내용이 있습니다. 이어서 작성하시겠어요?
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={restoreDraft}
                    className="px-3 py-1.5 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
                  >
                    이어서 작성
                  </button>
                  <button
                    type="button"
                    onClick={discardDraft}
                    className="px-3 py-1.5 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "transparent", color: "#9B9693", border: "1px solid #D4CFC9" }}
                  >
                    버리고 새로 시작
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 포스터 */}
              <div>
                <label className="block text-xs tracking-wider uppercase mb-3" style={labelStyle}>
                  포스터 이미지
                </label>
                <div className="flex items-start gap-4">
                  {(posterPreview || existingPosterUrl) && (
                    <div className="w-24 aspect-[3/4] relative overflow-hidden shrink-0" style={{ backgroundColor: "#D4CFC9" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={posterPreview ?? existingPosterUrl ?? ""} alt="미리보기" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 text-sm"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#F4EDE3", color: "#6D3115", border: "1px solid #D4CFC9" }}
                  >
                    {posterFile ? "파일 변경" : (existingPosterUrl ? "포스터 교체" : "파일 선택")}
                  </button>
                  {posterFile && (
                    <span className="text-xs pt-3" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                      {posterFile.name}
                    </span>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* 공연 발표 단체명 */}
              <div>
                <label className="block text-xs tracking-wider uppercase mb-3" style={labelStyle}>
                  공연 발표 단체명 <span style={{ color: "#A63D2F" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.performer_name}
                  onChange={(e) => setForm({ ...form, performer_name: e.target.value })}
                  required
                  placeholder="이 공연을 올리는 명의 (예: 한양대 연극영화학과, 극단 노을, 본인 이름)"
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
                <p className="mt-2 text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  공연마다 다른 명의로 등록할 수 있습니다. 회원가입 시 입력한 본인 이름이 기본값이며, 단체·극단·학과명 등으로 자유롭게 변경 가능합니다.
                </p>
              </div>

              {/* 장르 */}
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
                    placeholder="장르를 직접 입력해주세요 (예: 인형극, 마술쇼, 넌버벌)"
                    className="w-full mt-3 px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                )}
              </div>

              {/* 공연 구분 */}
              <div>
                <label className="block text-xs tracking-wider uppercase mb-3" style={labelStyle}>
                  공연 구분 <span style={{ color: "#A63D2F" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {SHOW_CATEGORIES.map((c) => {
                    const active = showCategory === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setShowCategory(c)}
                        className="px-5 py-2.5 text-sm transition-colors"
                        style={{
                          fontFamily: "var(--font-noto-sans-kr)",
                          backgroundColor: active ? "#6D3115" : "#F4EDE3",
                          color: active ? "#F4EDE3" : "#1A1A1A",
                          border: `1px solid ${active ? "#6D3115" : "#D4CFC9"}`,
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                  교내 공연 (학교 정기·졸업 공연), 외부 공연 (학교 외부 무대), 워크샵 (수업·연습 단계 공연) 중 선택해주세요.
                </p>
              </div>

              {/* 지역 */}
              <div>
                <label className="block text-xs tracking-wider uppercase mb-3" style={labelStyle}>
                  공연 지역 <span style={{ color: "#A63D2F" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS_EXCLUDE_ALL.map((r) => {
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
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC9" }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                  기본 정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "공연명 *", key: "title", required: true, span: "sm:col-span-2" },
                    { label: "영문 제목 (선택)", key: "subtitle", required: false },
                    { label: "학교명 (선택)", key: "school_department", required: false, placeholder: "예: 한양대학교, 동국대학교 (학과명 제외)" },
                    { label: "공연 기간 시작 *", key: "schedule_start", required: true, placeholder: "예: 2026.05.10" },
                    { label: "공연 기간 종료 *", key: "schedule_end", required: true, placeholder: "예: 2026.05.25" },
                    { label: "공연 시간 (선택)", key: "show_time", required: false, placeholder: "평일 19:30 / 주말 15:00" },
                    { label: "러닝 타임 (선택)", key: "running_time", required: false, placeholder: "100분" },
                    { label: "관람 연령 (선택)", key: "age_rating", required: false, placeholder: "7세 이상" },
                    { label: "티켓 예매 링크 (선택)", key: "ticket_url", required: false, placeholder: "예매처가 없다면 비워두세요" },
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

              {/* 장소 */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC9" }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
                  장소 · 오시는 길
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "공연장 *", key: "venue", required: true },
                    { label: "주소 (선택)", key: "venue_address", required: false },
                    { label: "오시는 길 (선택)", key: "directions", required: false, span: "sm:col-span-2", placeholder: "예: 4호선 혜화역 1번 출구 도보 5분" },
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

                {/* 지도 링크 (선택) — 권장 안내 */}
                <div className="mt-6 pt-5" style={{ borderTop: "1px dashed #D4CFC9" }}>
                  <div className="mb-3">
                    <p className="text-xs tracking-wider uppercase mb-1" style={labelStyle}>
                      지도 링크 <span style={{ textTransform: "none", color: "#9B9693" }}>(선택)</span>
                    </p>
                    <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                      관객이 공연장을 쉽게 찾을 수 있도록 지도 링크 첨부를 권장드립니다.
                      카카오맵 또는 네이버지도 중 <strong style={{ color: "#6D3115" }}>하나만 입력하셔도 됩니다.</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                        카카오맵 링크
                      </label>
                      <input
                        type="text"
                        value={form.map_kakao_url}
                        onChange={(e) => setForm({ ...form, map_kakao_url: e.target.value })}
                        placeholder="https://place.map.kakao.com/..."
                        className="w-full px-4 py-3 text-sm outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                        네이버지도 링크
                      </label>
                      <input
                        type="text"
                        value={form.map_naver_url}
                        onChange={(e) => setForm({ ...form, map_naver_url: e.target.value })}
                        placeholder="https://map.naver.com/..."
                        className="w-full px-4 py-3 text-sm outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#6D3115")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 작품 */}
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

              {error && (
                <p className="text-sm p-3" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#C0392B", backgroundColor: "#EDD4D4" }}>
                  {error}
                </p>
              )}

              <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                ※ {editingId ? "수정한 공연은 다시 관리자 검토 후 게시됩니다." : "등록 후 관리자 검토를 거쳐 게시됩니다."} (1~3일 소요)
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
                  {loading ? "처리 중..." : (editingId ? "수정 완료" : "공연 업로드")}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
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
          {myShows.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
                등록한 공연이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myShows.map((show) => (
                <div key={show.id} className="p-5 flex items-center justify-between gap-3 flex-wrap" style={{ backgroundColor: "#E8DDD0" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-1 truncate" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}>
                      {show.title}
                    </p>
                    <p className="text-xs truncate mb-1" style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}>
                      {[
                        show.genre === "기타" ? show.genre_custom : show.genre,
                        show.region,
                        show.venue,
                        show.schedule_start,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {/* 통계: 조회수 (approved 공연만 표시) */}
                    {show.status === "approved" && (
                      <p className="text-xs flex items-center gap-3" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115" }}>
                        <span>
                          <span style={{ color: "#9B9693" }}>조회수</span>{" "}
                          <strong style={{ fontFamily: "var(--font-inter)" }}>{show.view_count ?? 0}</strong>
                        </span>
                        {show.featured && (
                          <span
                            className="px-2 py-0.5 text-[10px]"
                            style={{ backgroundColor: "#6D3115", color: "#F4EDE3", letterSpacing: "0.1em" }}
                          >
                            ★ EDITOR&apos;S PICK
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={show.status} />
                    <Link
                      href={`/shows/${show.id}`}
                      className="text-xs px-2 py-1"
                      style={{ fontFamily: "var(--font-inter)", color: "#6D3115" }}
                    >
                      미리보기
                    </Link>
                    <button
                      onClick={() => startEditing(show)}
                      className="text-xs px-3 py-1 transition-colors"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#6D3115", border: "1px solid #6D3115" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#6D3115"; e.currentTarget.style.color = "#F4EDE3"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#6D3115"; }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteShow(show)}
                      className="text-xs px-3 py-1 transition-colors"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#A63D2F", border: "1px solid #A63D2F" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EDD4D4"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      삭제
                    </button>
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
