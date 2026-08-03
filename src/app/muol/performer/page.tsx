"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageLoader from "@/components/PageLoader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { REGIONS_EXCLUDE_ALL, GENRES, SHOW_CATEGORIES, GENRE_DETAILS, GENRE_DETAIL_GROUPS, hasGenreDetails } from "@/lib/constants";
import { isValidUrl, normalizeUrl, KAKAO_MAP_HOSTS, NAVER_MAP_HOSTS } from "@/lib/validators";
import type { Show } from "@/types";

// 버튼 4상태 공통 클래스(디자인팀 2026-07-20/23 진단 반영)
const OUTLINE_BTN_STATES =
  "transition-transform duration-150 hover:opacity-75 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";

type PendingShowAction = { type: "delete" | "close"; show: Show } | null;

// ── 예약 시스템 B1(회차별 정원 분리) — 2026-07-24 신설 ──────────────────────
// 회차 한 행. id가 있으면 DB에 이미 존재하는 회차(수정 대상), 없으면 신규 입력행(삽입 대상).
// capacity를 비워두면(빈 문자열) DB에는 null로 저장되고, 그 회차는 공연 전체 정원을 상속한다.
type SessionRow = { id?: string; date: string; time: string; capacity: string };

// 자동 생성은 한 달(31일)까지만 — 그보다 긴 기간을 "매일 회차"로 만들면 회차가 지나치게
// 많아질 수 있어(예: 학기 전체 기간 오기입), 이 경우 회차 1개로 시작해 공연자가 직접 나누게 한다.
const AUTO_GENERATE_MAX_DAYS = 31;

/** "2026.05.10"·"2026-05-10"·"2026/05/10" 같은 자유 텍스트에서 날짜를 최대한 읽어낸다. 실패 시 null. */
function parseFreeformDate(text: string): Date | null {
  const m = text.trim().match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** show_time("평일 19:30 / 주말 15:00")에서 첫 HH:MM을 찾아 회차 기본 시간으로 쓴다. 없으면 19:30. */
function extractDefaultTime(showTime: string): string {
  const m = showTime.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "19:30";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function toLocalDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 회차 날짜+시간 입력값을 서버 저장용 ISO 문자열로 변환(한국 사용자 대상 서비스라 브라우저 로컬시간 = KST 가정). */
function toSessionIso(date: string, time: string): string {
  const t = (time || "19:30").trim();
  return new Date(`${date}T${t}:00`).toISOString();
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pending:  { label: "승인 대기", bg: "#E6E1D6", color: "#0B5563" },
    approved: { label: "게시 중",   bg: "#D4EDD4", color: "#3A5E42" },
    rejected: { label: "반려됨",    bg: "#EDD4D4", color: "#A63D2F" },
  };
  const s = map[status] ?? { label: status, bg: "#E6E1D6", color: "#5A4A3E" };
  return (
    <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: s.bg, color: s.color, fontFamily: "var(--font-inter)" }}>
      {s.label}
    </span>
  );
};

const emptyForm = {
  title: "", subtitle: "", description: "",
  venue: "", venue_address: "", schedule_start: "", schedule_end: "",
  cast_members: "", directions: "", ticket_url: "", reservation_url: "",
  genre_custom: "", genre_detail: "", school_department: "", show_time: "", running_time: "",
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
  const [useInhouseReservation, setUseInhouseReservation] = useState<boolean>(true);
  const [capacity, setCapacity] = useState<string>("");
  const [defaultPerformerName, setDefaultPerformerName] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [existingPosterUrl, setExistingPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingShowAction>(null);
  const [capacitySummaries, setCapacitySummaries] = useState<Record<string, { confirmedTotal: number; capacity: number | null }>>({});

  // 예약 시스템 B1(회차별 정원 분리) — 2026-07-24 신설
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [originalSessionIds, setOriginalSessionIds] = useState<string[]>([]);
  // 회차 테이블(show_sessions)이 아직 DB에 없으면(마이그레이션 전) true → false로 바뀌어
  // 회차 관리 UI 전체를 조용히 숨긴다. 낙관적으로 true로 시작하고 실패 시에만 끈다.
  const [sessionsFeatureAvailable, setSessionsFeatureAvailable] = useState(true);

  const draftKey = currentUserId ? `syus-performer-draft-${currentUserId}` : null;

  /** 이 공연의 회차 목록을 불러온다 — 실패(테이블 없음 등)하면 회차 기능을 조용히 끈다. */
  const loadSessionsFor = async (showId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("show_sessions")
      .select("*")
      .eq("show_id", showId)
      .order("session_at", { ascending: true });

    if (error) {
      setSessionsFeatureAvailable(false);
      setSessions([]);
      setOriginalSessionIds([]);
      return;
    }
    setSessionsFeatureAvailable(true);
    const rows = (data ?? []) as { id: string; session_at: string; capacity: number | null }[];
    setSessions(
      rows.map((r) => {
        const d = new Date(r.session_at);
        return {
          id: r.id,
          date: toLocalDateInputValue(d),
          time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
          capacity: r.capacity != null ? String(r.capacity) : "",
        };
      })
    );
    setOriginalSessionIds(rows.map((r) => r.id));
  };

  const addSessionRow = () => setSessions((prev) => [...prev, { date: "", time: "19:30", capacity: "" }]);
  const updateSessionRow = (idx: number, patch: Partial<SessionRow>) =>
    setSessions((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeSessionRow = (idx: number) => setSessions((prev) => prev.filter((_, i) => i !== idx));

  /** 공연 기간(schedule_start~schedule_end)을 보고 회차를 자동 생성 — 애매하면 회차 1개로 시작 */
  const handleAutoGenerateSessions = () => {
    const start = parseFreeformDate(form.schedule_start);
    if (!start) {
      setSessions([{ date: "", time: extractDefaultTime(form.show_time), capacity: "" }]);
      return;
    }
    const end = parseFreeformDate(form.schedule_end);
    const defaultTime = extractDefaultTime(form.show_time);
    const dayMs = 24 * 60 * 60 * 1000;
    const spanDays = end ? Math.round((end.getTime() - start.getTime()) / dayMs) : 0;

    if (!end || spanDays < 0 || spanDays > AUTO_GENERATE_MAX_DAYS) {
      // 기간이 없거나(종료일 파싱 실패) 한 달 초과 — 회차 1개로 시작, 나머지는 공연자가 직접 추가
      setSessions([{ date: toLocalDateInputValue(start), time: defaultTime, capacity: "" }]);
      return;
    }
    const rows: SessionRow[] = [];
    for (let i = 0; i <= spanDays; i++) {
      const d = new Date(start.getTime() + i * dayMs);
      rows.push({ date: toLocalDateInputValue(d), time: defaultTime, capacity: "" });
    }
    setSessions(rows);
  };

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

  // 정원 임박 배지 — 정원이 설정된 게시 중인 공연만 확정 합계를 가져와 90%/100% 도달 여부 계산 (디자인팀 B5)
  useEffect(() => {
    const targets = myShows.filter(
      (s) => s.status === "approved" && s.use_inhouse_reservation !== false && s.capacity != null
    );
    if (targets.length === 0) return;

    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const entries = await Promise.all(
        targets.map(async (s) => {
          const { data } = await supabase.rpc("get_show_reservation_summary", { p_show_id: s.id });
          const summary = data as { confirmed_total: number; capacity: number | null } | null;
          return [s.id, { confirmedTotal: summary?.confirmed_total ?? 0, capacity: summary?.capacity ?? s.capacity ?? null }] as const;
        })
      );
      if (!cancelled) setCapacitySummaries(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [myShows]);

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
    // 파일 검증 — reviews/new·books/new와 동일 기준(MIME 화이트리스트 + 5MB).
    // accept="image/*"는 브라우저 힌트일 뿐 강제되지 않으므로 여기서 직접 막는다.
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("포스터는 JPG·PNG·WEBP·GIF 이미지만 올릴 수 있어요.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("포스터는 5MB 이하만 올릴 수 있어요.");
      e.target.value = "";
      return;
    }
    setError("");
    setPosterPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setPosterFile(file);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setGenre("");
    setShowCategory("");
    setUseInhouseReservation(true);
    setCapacity("");
    setRegion("");
    setPosterFile(null);
    setPosterPreview(null);
    setExistingPosterUrl(null);
    setEditingId(null);
    setError("");
    // 신규 등록 모드 — 회차는 빈 채로 시작(제출 시 최소 1개로 자동 백필됨). 이 시점엔 아직
    // showId가 없어 loadSessionsFor를 못 쓰므로, 테이블 존재 여부만 가볍게 확인해둔다.
    setSessions([]);
    setOriginalSessionIds([]);
    const supabase = createClient();
    supabase
      .from("show_sessions")
      .select("id")
      .limit(1)
      .then(({ error }) => setSessionsFeatureAvailable(!error));
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
      reservation_url: show.reservation_url ?? "",
      genre_custom: show.genre_custom ?? "",
      genre_detail: show.genre_detail ?? "",
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
    setUseInhouseReservation(show.use_inhouse_reservation ?? true);
    setCapacity(show.capacity != null ? String(show.capacity) : "");
    setExistingPosterUrl(show.poster_url ?? null);
    setPosterFile(null);
    setPosterPreview(null);
    setShowForm(true);
    setError("");
    setSessions([]);
    setOriginalSessionIds([]);
    loadSessionsFor(show.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 공연 삭제 — 확인 모달을 먼저 띄우고, 실제 삭제는 executeDeleteShow가 처리 (디자인팀 B4)
  const deleteShow = (show: Show) => setPendingAction({ type: "delete", show });

  const executeDeleteShow = async (show: Show) => {
    setPendingAction(null);
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

  /** 예약 마감/재개 — 공연팀이 직접 매진 처리 (정원 자동 마감과 별개). 마감(닫기) 방향만 확인 모달을 거친다. */
  const toggleReservationClosed = (show: Show) => {
    const next = !show.reservation_closed;
    if (next) { setPendingAction({ type: "close", show }); return; }
    applyToggleReservationClosed(show, next);
  };

  const applyToggleReservationClosed = async (show: Show, next: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from("shows").update({ reservation_closed: next }).eq("id", show.id);
    if (error) {
      alert("처리 중 오류가 발생했습니다.");
      return;
    }
    setMyShows((prev) => prev.map((s) => (s.id === show.id ? { ...s, reservation_closed: next } : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!genre) { setError("공연 장르를 선택해주세요."); return; }
    if (genre === "기타" && !form.genre_custom.trim()) {
      setError("기타 장르명을 입력해주세요.");
      return;
    }
    // 2026-06-17: 무용·음악 선택 시 상세 분류 필수 (2026-07-28 오후: 무용은 다시 단일 장르, 그룹은 UI 표시만)
    if (hasGenreDetails(genre) && !form.genre_detail.trim()) {
      setError(`${genre}의 상세 분류를 선택해주세요.`);
      return;
    }
    if (!showCategory) { setError("공연 구분을 선택해주세요."); return; }
    if (!region) { setError("공연 지역을 선택해주세요."); return; }

    // URL 정규화 — 프로토콜 없이 입력해도 자동 https:// 보완
    const ticketUrl = normalizeUrl(form.ticket_url);
    const reservationUrl = normalizeUrl(form.reservation_url);
    const mapKakaoUrl = normalizeUrl(form.map_kakao_url);
    const mapNaverUrl = normalizeUrl(form.map_naver_url);

    // URL 검증
    if (!isValidUrl(ticketUrl)) {
      setError("티켓 예매 링크가 올바른 주소 형식이 아닙니다. 정확한 링크(예: ticket.interpark.com/...)를 입력하시거나, 사용하지 않으신다면 입력란을 비워주세요.");
      return;
    }
    if (!isValidUrl(reservationUrl)) {
      setError("좌석 예약 링크가 올바른 주소 형식이 아닙니다. 정확한 링크(예: forms.gle/... 또는 naver.me/...)를 입력하시거나, 사용하지 않으신다면 입력란을 비워주세요.");
      return;
    }
    if (!isValidUrl(mapKakaoUrl, { allowedHosts: KAKAO_MAP_HOSTS })) {
      setError("카카오맵 링크는 카카오맵(kakao.com / kko.to) 주소만 사용 가능합니다. PC 링크 또는 모바일 공유 텍스트를 그대로 붙여넣어 주세요.");
      return;
    }
    if (!isValidUrl(mapNaverUrl, { allowedHosts: NAVER_MAP_HOSTS })) {
      setError("네이버지도 링크는 네이버 지도(naver.com / naver.me) 주소만 사용 가능합니다. PC 링크 또는 모바일 공유 텍스트를 그대로 붙여넣어 주세요.");
      return;
    }

    // 정원 검증 — 입력했다면 1 이상의 정수만 (비워두면 무제한)
    let parsedCapacity: number | null = null;
    if (capacity.trim()) {
      const n = Number(capacity.trim());
      if (!Number.isInteger(n) || n < 1) {
        setError("정원은 1 이상의 숫자로 입력해주세요. 제한이 없다면 비워두세요.");
        return;
      }
      parsedCapacity = n;
    }

    // 회차 검증 — 날짜가 채워진 행만 유효한 회차로 취급(빈 행은 조용히 무시), 정원은
    // 비워두면(무제한 아니라) "공연 전체 정원을 그대로 상속" 의미이므로 검증만 하고 통과시킨다.
    const validSessionRows = sessions.filter((r) => r.date.trim());
    for (const r of validSessionRows) {
      if (r.capacity.trim()) {
        const n = Number(r.capacity.trim());
        if (!Number.isInteger(n) || n < 1) {
          setError("회차별 정원은 1 이상의 숫자로 입력해주세요. 공연 전체 정원을 그대로 쓰려면 비워두세요.");
          return;
        }
      }
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
      reservation_url: reservationUrl || null,
      poster_url,
      organizer_id: user.id,
      performer_name: performerNameForShow,
      genre,
      genre_custom: genre === "기타" ? form.genre_custom : null,
      genre_detail: hasGenreDetails(genre) ? form.genre_detail : null,
      show_category: showCategory,
      region,
      school_department: form.school_department || null,
      show_time: form.show_time || null,
      running_time: form.running_time || null,
      age_rating: form.age_rating || null,
      map_kakao_url: mapKakaoUrl || null,
      map_naver_url: mapNaverUrl || null,
      use_inhouse_reservation: useInhouseReservation,
      capacity: parsedCapacity,
    };

    let savedShowId: string | null = null;

    if (editingId) {
      // 수정 모드 — 상태는 다시 pending으로 (관리자 재검토)
      const { data: updated, error: updateError } = await supabase
        .from("shows")
        .update({ ...payload, status: "pending" })
        .eq("id", editingId)
        .select()
        .single();

      if (updateError) {
        console.error("[performer/update] error:", updateError);
        console.error("[performer/update] payload:", payload);
        setError(`공연 수정 중 오류: ${updateError.message}${updateError.details ? ` — ${updateError.details}` : ""}${updateError.hint ? ` (${updateError.hint})` : ""}`);
        setLoading(false);
        return;
      }
      setMyShows((prev) => prev.map((s) => s.id === editingId ? (updated as Show) : s));
      savedShowId = editingId;
    } else {
      // 신규 등록
      const { data: newShow, error: insertError } = await supabase
        .from("shows")
        .insert({ ...payload, status: "pending" })
        .select()
        .single();

      if (insertError) {
        console.error("[performer/insert] error:", insertError);
        console.error("[performer/insert] payload:", payload);
        setError(`공연 등록 중 오류: ${insertError.message}${insertError.details ? ` — ${insertError.details}` : ""}${insertError.hint ? ` (${insertError.hint})` : ""}`);
        setLoading(false);
        return;
      }
      setMyShows((prev) => [newShow as Show, ...prev]);
      savedShowId = (newShow as Show).id;
      // 등록 성공 → 임시저장 삭제
      if (draftKey) localStorage.removeItem(draftKey);
    }

    // 회차 동기화 — 공연 저장 자체는 이미 끝났으므로, 이 단계가 실패해도 조용히 기록만
    // 하고 넘어간다(회차는 부가 정보, 나중에 "수정"에서 다시 손볼 수 있다).
    if (sessionsFeatureAvailable && useInhouseReservation && savedShowId) {
      try {
        // 회차를 하나도 안 만들었다면 "회차 1개(전체 기간)"로 자동 백필 — 회차 UI를 전혀
        // 안 건드린 공연자도 관객 신청 경험이 기존과 동일하게 유지된다.
        const rowsToSave: SessionRow[] =
          validSessionRows.length > 0
            ? validSessionRows
            : [
                {
                  date: toLocalDateInputValue(parseFreeformDate(form.schedule_start) ?? new Date()),
                  time: extractDefaultTime(form.show_time),
                  capacity,
                },
              ];

        const keepIds = rowsToSave.filter((r) => r.id).map((r) => r.id as string);
        const toDelete = originalSessionIds.filter((id) => !keepIds.includes(id));
        if (toDelete.length) {
          await supabase.from("show_sessions").delete().in("id", toDelete);
        }
        for (const r of rowsToSave.filter((r) => r.id)) {
          await supabase
            .from("show_sessions")
            .update({
              session_at: toSessionIso(r.date, r.time),
              capacity: r.capacity.trim() ? Number(r.capacity.trim()) : null,
            })
            .eq("id", r.id);
        }
        const newRows = rowsToSave
          .filter((r) => !r.id)
          .map((r) => ({
            show_id: savedShowId,
            session_at: toSessionIso(r.date, r.time),
            capacity: r.capacity.trim() ? Number(r.capacity.trim()) : null,
          }));
        if (newRows.length) {
          await supabase.from("show_sessions").insert(newRows);
        }
      } catch (e) {
        console.error("[performer/syncSessions] error:", e);
      }
    }

    setShowForm(false);
    resetForm();
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    backgroundColor: "#F0EEE9",
    color: "#4A3B33",
    border: "1px solid transparent",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-inter)",
    color: "#5A4A3E",
  };

  // 권한 없음 화면
  if (authState === "loading") {
    return (
      <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
        <PageLoader />
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="pt-24 md:pt-36 min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F0EEE9" }}>
        <div className="text-center max-w-sm space-y-5">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
            403
          </p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            공연자 권한이 필요합니다
          </h1>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
            공연을 등록하려면 마이페이지에서 공연자 신청을 먼저 진행해주세요.
            관리자 검토 후 권한이 부여됩니다.
          </p>
          <Link
            href="/mypage"
            className="inline-block px-8 py-3 text-sm tracking-wider"
            style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
          >
            마이페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-36 min-h-screen px-6 md:px-12 lg:px-20 py-20" style={{ backgroundColor: "#F0EEE9" }}>
      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.type === "delete" ? "공연 삭제" : "예약 마감"}
        message={
          pendingAction?.type === "delete"
            ? `"${pendingAction.show.title}" 공연을 삭제하시겠습니까?\n\n포스터 이미지와 공연 정보가 완전히 제거되며 복구할 수 없습니다.`
            : pendingAction
              ? `"${pendingAction.show.title}" 공연의 예약을 마감(매진 처리)하시겠습니까?\n\n관객은 더 이상 좌석을 신청할 수 없게 됩니다.`
              : ""
        }
        confirmLabel={pendingAction?.type === "delete" ? "삭제하기" : "마감하기"}
        danger
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.type === "delete") executeDeleteShow(pendingAction.show);
          else applyToggleReservationClosed(pendingAction.show, true);
        }}
      />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={labelStyle}>
            Performer
          </p>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-4xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
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
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2C7384")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0B5563")}
            >
              {showForm ? "취소" : "+ 공연 등록"}
            </button>
          </div>
        </div>

        {/* 등록 / 수정 폼 */}
        {showForm && (
          <div className="mb-12 p-8 space-y-8" style={{ backgroundColor: "#E6E1D6" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
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
                style={{ backgroundColor: "#F0EEE9", border: "1px solid #0B5563" }}
              >
                <p className="text-xs leading-relaxed flex-1 min-w-0" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                  이전에 작성하던 내용이 있습니다. 이어서 작성하시겠어요?
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={restoreDraft}
                    className="px-3 py-1.5 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
                  >
                    이어서 작성
                  </button>
                  <button
                    type="button"
                    onClick={discardDraft}
                    className="px-3 py-1.5 text-xs"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "transparent", color: "#5A4A3E", border: "1px solid #D4CFC1" }}
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
                    <div className="w-24 aspect-[3/4] relative overflow-hidden shrink-0" style={{ backgroundColor: "#D4CFC1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={posterPreview ?? existingPosterUrl ?? ""} alt="미리보기" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-3 text-sm"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#F0EEE9", color: "#0B5563", border: "1px solid #D4CFC1" }}
                  >
                    {posterFile ? "파일 변경" : (existingPosterUrl ? "포스터 교체" : "파일 선택")}
                  </button>
                  {posterFile && (
                    <span className="text-xs pt-3" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
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
                  className="w-full px-4 py-3 text-base outline-none"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
                <p className="mt-2 text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
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
                        onClick={() => {
                          setGenre(g);
                          // 2026-06-17: 장르 변경 시 상세 분류·기타 입력 리셋 — 잔존값 오염 방지
                          setForm((prev) => ({ ...prev, genre_detail: "", genre_custom: "" }));
                        }}
                        className="px-5 py-2.5 text-sm transition-colors"
                        style={{
                          fontFamily: "var(--font-noto-sans-kr)",
                          backgroundColor: active ? "#0B5563" : "#F0EEE9",
                          color: active ? "#F0EEE9" : "#4A3B33",
                          border: `1px solid ${active ? "#0B5563" : "#D4CFC1"}`,
                        }}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>

                {/* 무용·음악 sub-genre — 2026-06-17 신설, 2026-07-28 오전 순수/실용무용 분리 →
                    2026-07-28 오후 "무용" 단일 장르로 복귀 + 그룹 표시(순수무용/실용무용 소제목)로 전환.
                    음악은 그룹 없이 기존처럼 flat 4버튼. */}
                {hasGenreDetails(genre) && (
                  <div className="mt-3">
                    <p className="text-xs mb-2" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                      {genre} 상세 분류 <span style={{ color: "#A63D2F" }}>*</span>
                    </p>
                    {(() => {
                      const detailButton = (d: string) => {
                        const dActive = form.genre_detail === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setForm({ ...form, genre_detail: d })}
                            className="px-4 py-2 text-sm transition-colors"
                            style={{
                              fontFamily: "var(--font-noto-sans-kr)",
                              backgroundColor: dActive ? "#5C2A42" : "#F0EEE9",
                              color: dActive ? "#F0EEE9" : "#4A3B33",
                              border: `1px solid ${dActive ? "#5C2A42" : "#D4CFC1"}`,
                            }}
                          >
                            {d}
                          </button>
                        );
                      };
                      const groups = GENRE_DETAIL_GROUPS[genre];
                      if (groups) {
                        return (
                          <div className="space-y-3">
                            {Object.entries(groups).map(([groupHeading, subs]) => (
                              <div key={groupHeading}>
                                <p
                                  className="text-[11px] tracking-[0.12em] uppercase mb-1.5"
                                  style={{ fontFamily: "var(--font-inter)", color: "#8E8579" }}
                                >
                                  {groupHeading}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {subs.map((d) => detailButton(d))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-2">
                          {GENRE_DETAILS[genre].map((d) => detailButton(d))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {genre === "기타" && (
                  <input
                    type="text"
                    value={form.genre_custom}
                    onChange={(e) => setForm({ ...form, genre_custom: e.target.value })}
                    placeholder="장르를 직접 입력해주세요 (예: 인형극, 마술쇼, 넌버벌)"
                    className="w-full mt-3 px-4 py-3 text-base outline-none"
                    style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
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
                          backgroundColor: active ? "#0B5563" : "#F0EEE9",
                          color: active ? "#F0EEE9" : "#4A3B33",
                          border: `1px solid ${active ? "#0B5563" : "#D4CFC1"}`,
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
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
                          backgroundColor: active ? "#0B5563" : "#F0EEE9",
                          color: active ? "#F0EEE9" : "#4A3B33",
                          border: `1px solid ${active ? "#0B5563" : "#D4CFC1"}`,
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC1" }}>
                <h3 className="text-sm font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
                  기본 정보
                </h3>
                <p className="text-xs leading-relaxed mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                  학교/학과는 <strong style={{ color: "#0B5563" }}>‘○○대학교 ○○학과(과/학부)’</strong> 형식으로 적어주시면 지역 관객이 더 쉽게 찾습니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "공연명 *", key: "title", required: true, span: "sm:col-span-2" },
                    { label: "영문 제목 (선택)", key: "subtitle", required: false },
                    { label: "학교/학과 (선택)", key: "school_department", required: false, placeholder: "예: 한양대학교 연극영화학과 / 동국대학교 연극학부" },
                    { label: "공연 기간 시작 *", key: "schedule_start", required: true, placeholder: "예: 2026.05.10" },
                    { label: "공연 기간 종료 *", key: "schedule_end", required: true, placeholder: "예: 2026.05.25" },
                    { label: "공연 시간 (선택)", key: "show_time", required: false, placeholder: "평일 19:30 / 주말 15:00" },
                    { label: "러닝 타임 (선택)", key: "running_time", required: false, placeholder: "100분" },
                    { label: "관람 연령 (선택)", key: "age_rating", required: false, placeholder: "7세 이상" },
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
                        className="w-full px-4 py-3 text-base outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 예약 설정 */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC1" }}>
                <h3 className="text-sm font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
                  예약 설정
                </h3>
                <label className="flex items-center gap-2 mb-4 cursor-pointer" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
                  <input
                    type="checkbox"
                    checked={useInhouseReservation}
                    onChange={(e) => setUseInhouseReservation(e.target.checked)}
                  />
                  <span className="text-sm" style={{ color: "#4A3B33" }}>
                    무대올림 자체 예약 받기 (권장) — 관객이 사이트 안에서 바로 좌석을 신청합니다
                  </span>
                </label>

                {useInhouseReservation ? (
                  <div className="max-w-xs">
                    <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                      정원 (선택)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="비워두면 무제한"
                      className="w-full px-4 py-3 text-base outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    />

                    {/* 회차 관리 — 예약 시스템 B1(회차별 정원 분리), 2026-07-24 신설.
                        DB 마이그레이션 전에는 sessionsFeatureAvailable이 false가 되어 이 블록 전체가
                        조용히 숨는다(재배포 없이 마이그레이션 실행 후 자동으로 나타남). */}
                    {sessionsFeatureAvailable && (
                      <div className="mt-6 pt-5 max-w-none" style={{ borderTop: "1px dashed #D4CFC1" }}>
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <label className="block text-xs tracking-wider uppercase" style={labelStyle}>
                            회차 관리 (선택)
                          </label>
                          <div className="flex gap-3">
                            {sessions.length === 0 && form.schedule_start.trim() && form.schedule_end.trim() && (
                              <button
                                type="button"
                                onClick={handleAutoGenerateSessions}
                                className={`text-xs underline ${OUTLINE_BTN_STATES}`}
                                style={{ color: "#0B5563" }}
                              >
                                공연 기간으로 회차 자동 생성
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={addSessionRow}
                              className={`text-xs underline ${OUTLINE_BTN_STATES}`}
                              style={{ color: "#0B5563" }}
                            >
                              + 회차 추가
                            </button>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "#5A4A3E", wordBreak: "keep-all" }}>
                          공연이 여러 날·여러 시간대로 열린다면 회차별로 날짜·시간·정원을 따로 관리할 수
                          있습니다. 아무 것도 추가하지 않으면 공연 기간 전체를 회차 1개로 자동 등록합니다
                          (지금까지와 동일한 방식). 회차별 정원을 비워두면 위 정원을 그대로 씁니다.
                        </p>
                        {sessions.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {sessions.map((row, idx) => (
                              <div key={row.id ?? `new-${idx}`} className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="date"
                                  value={row.date}
                                  onChange={(e) => updateSessionRow(idx, { date: e.target.value })}
                                  className="px-3 py-2 text-base outline-none"
                                  style={inputStyle}
                                />
                                <input
                                  type="time"
                                  value={row.time}
                                  onChange={(e) => updateSessionRow(idx, { time: e.target.value })}
                                  className="px-3 py-2 text-base outline-none"
                                  style={inputStyle}
                                />
                                <input
                                  type="number"
                                  min={1}
                                  value={row.capacity}
                                  onChange={(e) => updateSessionRow(idx, { capacity: e.target.value })}
                                  placeholder="정원(비우면 위 정원 사용)"
                                  className="px-3 py-2 text-base outline-none w-48"
                                  style={inputStyle}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSessionRow(idx)}
                                  className={`text-xs underline ${OUTLINE_BTN_STATES}`}
                                  style={{ color: "#A63D2F" }}
                                >
                                  삭제
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                      예매·좌석 신청 링크 (선택)
                    </label>
                    <input
                      type="text"
                      value={form.reservation_url}
                      onChange={(e) => setForm({ ...form, reservation_url: e.target.value })}
                      placeholder="공연팀 자체 폼만 받습니다(구글폼·네이버폼 등). 상업 예매처 링크는 받지 않습니다"
                      className="w-full px-4 py-3 text-base outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    />
                  </div>
                )}
              </div>

              {/* 장소 */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC1" }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
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
                        className="w-full px-4 py-3 text-base outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      />
                    </div>
                  ))}
                </div>

                {/* 지도 링크 (선택) — 권장 안내 */}
                <div className="mt-6 pt-5" style={{ borderTop: "1px dashed #D4CFC1" }}>
                  <div className="mb-3">
                    <p className="text-xs tracking-wider uppercase mb-1" style={labelStyle}>
                      지도 링크 <span style={{ textTransform: "none", color: "#5A4A3E" }}>(선택)</span>
                    </p>
                    <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                      관객이 공연장을 쉽게 찾을 수 있도록 지도 링크 첨부를 권장드립니다.
                      카카오맵 또는 네이버지도 중 <strong style={{ color: "#0B5563" }}>하나만 입력하셔도 됩니다.</strong>
                      <br />
                      <span style={{ color: "#0B5563" }}>모바일에서 공유한 형식</span>도 그대로 붙여넣을 수 있어요.
                      <br />
                      <span style={{ color: "#8E8579" }}>예) <code>[카카오맵] 낙산공원 https://kko.to/abc</code></span>
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
                        placeholder="https://place.map.kakao.com/... 또는 모바일 공유 텍스트"
                        className="w-full px-4 py-3 text-base outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
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
                        placeholder="https://map.naver.com/... 또는 모바일 공유 텍스트"
                        className="w-full px-4 py-3 text-base outline-none"
                        style={inputStyle}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 작품 */}
              <div className="pt-6" style={{ borderTop: "1px solid #D4CFC1" }}>
                <h3 className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
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
                      placeholder="예: 홍길동(배역명), 김철수(배역명), 박영희(배역명)"
                      className="w-full px-4 py-3 text-base outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
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
                      className="w-full px-4 py-3 text-base outline-none resize-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
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

              <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                ※ {editingId ? "수정한 공연은 다시 관리자 검토 후 게시됩니다." : "등록 후 관리자 검토를 거쳐 게시됩니다."} (1~3일 소요)
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 text-base tracking-wider transition-colors"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    backgroundColor: loading ? "#5A4A3E" : "#0B5563",
                    color: "#F0EEE9",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#2C7384"; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#0B5563"; }}
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
                    color: "#0B5563",
                    border: "1px solid #D4CFC1",
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
          <h2 className="text-lg font-semibold mb-6" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
            등록한 공연
          </h2>
          {myShows.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
                등록한 공연이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myShows.map((show) => (
                <div key={show.id} className="p-5 flex items-center justify-between gap-3 flex-wrap" style={{ backgroundColor: "#E6E1D6" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold mb-1 truncate" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33" }}>
                      {show.title}
                    </p>
                    <p className="text-xs truncate mb-1" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                      {[
                        show.genre === "기타"
                          ? show.genre_custom
                          : show.genre_detail
                            ? `${show.genre} · ${show.genre_detail}`
                            : show.genre,
                        show.region,
                        show.venue,
                        show.schedule_start,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {/* 통계: 조회수 (approved 공연만 표시) */}
                    {show.status === "approved" && (
                      <p className="text-xs flex items-center gap-3" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563" }}>
                        <span>
                          <span style={{ color: "#5A4A3E" }}>조회수</span>{" "}
                          <strong style={{ fontFamily: "var(--font-inter)" }}>{show.view_count ?? 0}</strong>
                        </span>
                        {show.featured && (
                          <span
                            className="px-2 py-0.5 text-[10px]"
                            style={{ backgroundColor: "#0B5563", color: "#F0EEE9", letterSpacing: "0.1em" }}
                          >
                            ★ EDITOR&apos;S PICK
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={show.status} />
                    {(() => {
                      const summary = capacitySummaries[show.id];
                      if (!summary || summary.capacity == null) return null;
                      const ratio = summary.confirmedTotal / summary.capacity;
                      if (ratio >= 1) {
                        return (
                          <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: "#5A4A3E", color: "#F0EEE9", fontFamily: "var(--font-inter)" }}>
                            정원 도달
                          </span>
                        );
                      }
                      if (ratio >= 0.9) {
                        return (
                          <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: "#5C2A42", color: "#F0EEE9", fontFamily: "var(--font-inter)" }}>
                            정원 임박 {summary.confirmedTotal}/{summary.capacity}
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {show.status === "approved" && show.use_inhouse_reservation !== false && (
                      <>
                        <Link
                          href={`/muol/performer/reservations/${show.id}`}
                          className={`text-xs px-3 py-1 ${OUTLINE_BTN_STATES}`}
                          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5C2A42", border: "1px solid #5C2A42" }}
                        >
                          예약 현황
                        </Link>
                        <button
                          onClick={() => toggleReservationClosed(show)}
                          className={`text-xs px-3 py-1 ${OUTLINE_BTN_STATES}`}
                          style={
                            show.reservation_closed
                              ? { fontFamily: "var(--font-noto-sans-kr)", color: "#F0EEE9", backgroundColor: "#5A4A3E" }
                              : { fontFamily: "var(--font-noto-sans-kr)", color: "#A63D2F", border: "1px solid #A63D2F" }
                          }
                        >
                          {show.reservation_closed ? "예약 다시 열기" : "예약 마감"}
                        </button>
                      </>
                    )}
                    <Link
                      href={`/muol/shows/${show.id}`}
                      className="text-xs px-2 py-1"
                      style={{ fontFamily: "var(--font-inter)", color: "#0B5563" }}
                    >
                      미리보기
                    </Link>
                    <button
                      onClick={() => startEditing(show)}
                      className="text-xs px-3 py-1 transition-colors"
                      style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#0B5563", border: "1px solid #0B5563" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#0B5563"; e.currentTarget.style.color = "#F0EEE9"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#0B5563"; }}
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
