"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageLoader from "@/components/PageLoader";
import ConfirmDialog from "@/components/ConfirmDialog";
import ShowSamplePreview from "@/components/ShowSamplePreview";
import { REGIONS_EXCLUDE_ALL, GENRES, SHOW_CATEGORIES, GENRE_DETAILS, GENRE_DETAIL_GROUPS, hasGenreDetails } from "@/lib/constants";
import { isValidUrl, normalizeUrl, KAKAO_MAP_HOSTS, NAVER_MAP_HOSTS } from "@/lib/validators";
import { DEPARTMENTS, DEPARTMENT_COUNT, fullName, findByFullName } from "@/lib/universities";
import {
  parseShowDate,
  toDateInputValue,
  showDateKey,
  isValidShowDate,
  showDateInputMin,
  formatShowPeriod,
} from "@/lib/showDate";
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

// 날짜 파싱·표시는 전부 @/lib/showDate 로 옮겼다(2026-08-03).
// 예전엔 이 파일에 parseFreeformDate·toLocalDateInputValue 사본이 따로 있어서,
// 같은 날짜를 폼과 목록 페이지가 서로 다르게 해석했다. 사본은 남기지 않는다.

/** show_time("평일 19:30 / 주말 15:00")에서 첫 HH:MM을 찾아 회차 기본 시간으로 쓴다. 없으면 19:30. */
function extractDefaultTime(showTime: string): string {
  const m = showTime.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "19:30";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** 공연 기간 두 칸(시작·종료) — 예전 자유 텍스트 값이 들어 있을 수 있는 필드 */
type ScheduleFieldKey = "schedule_start" | "schedule_end";

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

  /* 2026-09-10 점검 — "guest"·"pending"을 새로 둔다.
   * 그전에는 비로그인이면 곧장 /auth/login 으로 튕겼고, 로그인했어도 공연자가 아니면 403 화면이었다.
   * 그런데 사이트 안에서 이 페이지로 보내는 링크는 7곳(NavMega·Footer·학과 디렉토리 2곳·공연 목록·
   * 아카이브·about)이고, 라벨은 "공연자 안내"처럼 안내를 약속한다. 처음 온 학생·조교가 그 문을 열면
   * 읽을 것 없이 벽부터 만났다 — MuolRegisterPrompt.tsx:119가 이미 "승인 공연 0건의 유력한 원인"이라고
   * 적어둔 그 벽이다. 그때는 팝업 한 곳만 우회시켰고 나머지 7곳은 그대로였다.
   * 이제 이 페이지가 상태에 따라 문을 갈라 연다: 손님에게는 안내를, 신청자에게는 진행 상황을,
   * 공연자에게는 지금까지의 대시보드를 그대로. 링크 7곳은 하나도 고치지 않아도 된다. */
  const [authState, setAuthState] = useState<"loading" | "guest" | "pending" | "denied" | "ready">("loading");
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

  // 공연 기간을 <input type="date">로 강제하되(2026-08-03), 예전에 자유 텍스트로 저장된 값
  // ("미정", "5월 둘째 주" 등)은 date input이 읽지 못해 빈칸이 된다. 그대로 저장하면 날짜가
  // 지워지므로, 읽지 못한 칸만 텍스트 입력으로 되돌려 원문을 보여주고 고쳐 달라고 안내한다.
  const [legacyDateFields, setLegacyDateFields] = useState<Record<ScheduleFieldKey, boolean>>({
    schedule_start: false,
    schedule_end: false,
  });

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
          date: toDateInputValue(d),
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
    const start = parseShowDate(form.schedule_start);
    if (!start) {
      setSessions([{ date: "", time: extractDefaultTime(form.show_time), capacity: "" }]);
      return;
    }
    const end = parseShowDate(form.schedule_end);
    const defaultTime = extractDefaultTime(form.show_time);
    const dayMs = 24 * 60 * 60 * 1000;
    const spanDays = end ? Math.round((end.getTime() - start.getTime()) / dayMs) : 0;

    if (!end || spanDays < 0 || spanDays > AUTO_GENERATE_MAX_DAYS) {
      // 기간이 없거나(종료일 파싱 실패) 한 달 초과 — 회차 1개로 시작, 나머지는 공연자가 직접 추가
      setSessions([{ date: toDateInputValue(start), time: defaultTime, capacity: "" }]);
      return;
    }
    const rows: SessionRow[] = [];
    for (let i = 0; i <= spanDays; i++) {
      const d = new Date(start.getTime() + i * dayMs);
      rows.push({ date: toDateInputValue(d), time: defaultTime, capacity: "" });
    }
    setSessions(rows);
  };

  // 권한 체크 + 내 공연 로딩
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      // 비로그인은 튕기지 않는다 — 아래 guest 화면에서 무엇을 하는 곳인지 먼저 읽게 한다.
      if (!data.user) { setAuthState("guest"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, name, performer_status")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "performer" && profile?.role !== "admin") {
        // 이미 신청해 검토를 기다리는 사람과, 아직 신청조차 못 한 사람은 다음 할 일이 다르다.
        setAuthState(profile?.performer_status === "pending" ? "pending" : "denied");
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

  /**
   * 저장돼 있던 공연 기간(예전 자유 텍스트일 수 있음)을 폼에 안전하게 채운다.
   *  - 읽히는 값 → "YYYY-MM-DD"로 정규화해 <input type="date">가 그대로 표시
   *  - 못 읽는 값 → 원문을 유지하고 그 칸만 텍스트 입력으로 폴백(legacy 플래그)
   * 이 변환을 빼먹으면 date input이 값을 못 읽어 빈칸이 되고, 그대로 저장 시 날짜가 지워진다.
   */
  const normalizeScheduleForForm = (rawStart?: string | null, rawEnd?: string | null) => {
    const startText = (rawStart ?? "").trim();
    const endText = (rawEnd ?? "").trim();
    const startKey = showDateKey(startText);
    const endKey = showDateKey(endText);
    return {
      schedule_start: startKey ?? startText,
      schedule_end: endKey ?? endText,
      legacy: {
        schedule_start: !!startText && !startKey,
        schedule_end: !!endText && !endKey,
      } as Record<ScheduleFieldKey, boolean>,
    };
  };

  /** 폴백 텍스트 칸을 비우고 달력 입력으로 되돌린다 */
  const switchToDatePicker = (key: ScheduleFieldKey) => {
    setForm((prev) => ({ ...prev, [key]: "" }));
    setLegacyDateFields((prev) => ({ ...prev, [key]: false }));
  };

  const restoreDraft = () => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.form) {
        // 이 브라우저에 남아 있던 임시저장은 자유 텍스트 시절 값일 수 있다 — 동일하게 정규화
        const schedule = normalizeScheduleForForm(draft.form.schedule_start, draft.form.schedule_end);
        setForm({
          ...draft.form,
          schedule_start: schedule.schedule_start,
          schedule_end: schedule.schedule_end,
        });
        setLegacyDateFields(schedule.legacy);
      }
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
    setLegacyDateFields({ schedule_start: false, schedule_end: false });
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
    // 공연 기간은 저장 형식이 예전(자유 텍스트)일 수 있어 반드시 정규화를 거친다.
    const schedule = normalizeScheduleForForm(show.schedule_start, show.schedule_end);
    setLegacyDateFields(schedule.legacy);
    setForm({
      title: show.title ?? "",
      subtitle: show.subtitle ?? "",
      description: show.description ?? "",
      venue: show.venue ?? "",
      venue_address: show.venue_address ?? "",
      schedule_start: schedule.schedule_start,
      schedule_end: schedule.schedule_end,
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

    // 공연 기간 — 사이트 전체가 하나의 형식(YYYY-MM-DD)만 쓰도록 여기서 확정한다.
    // 여기를 통과한 값만 DB에 들어가므로, 목록·아카이브·캘린더·리마인더가 같은 날짜를 본다.
    if (!isValidShowDate(form.schedule_start)) {
      setError("공연 시작일을 날짜로 골라주세요. (예: 2026-05-10 — 달력에서 선택하시면 됩니다)");
      return;
    }
    if (!isValidShowDate(form.schedule_end)) {
      setError("공연 종료일을 날짜로 골라주세요. 하루만 공연한다면 시작일과 같은 날을 고르시면 됩니다.");
      return;
    }
    const scheduleStart = showDateKey(form.schedule_start) as string;
    const scheduleEnd = showDateKey(form.schedule_end) as string;
    if (scheduleEnd < scheduleStart) {
      setError("공연 종료일이 시작일보다 빠릅니다. 날짜를 다시 확인해주세요.");
      return;
    }

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
      // 저장 형식은 항상 "YYYY-MM-DD" 하나 (위에서 정규화·검증 완료)
      schedule_start: scheduleStart,
      schedule_end: scheduleEnd,
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
      /* 2026-09-10 점검 — 그전에는 무엇을 고치든 무조건 status를 pending으로 되돌렸다.
       * 그래서 공연 당일 "19:30 → 19:00" 한 줄을 정정하면 그 공연이 목록·홈·캘린더·검색에서
       * 즉시 사라졌고, 다시 걸리는 건 운영자가 승인한 뒤였다. 운영자 업무 창은 평일 12:30~17:00뿐이라
       * 금요일 저녁에 고친 주말 공연은 주말 내내 사라진 채로 있었다. 공연팀 입장에서 수정이
       * 위험한 행동이 되면, 결국 틀린 정보가 그대로 걸린다 — 홍보 사이트로서는 최악이다.
       *
       * 그렇다고 승인된 공연을 무조건 게시 유지하면 심사를 우회해 내용을 바꿔치기할 수 있다.
       * 그래서 필드를 나눈다. 사람이 읽는 내용(제목·소개·포스터·출연진·장소명 등)이 바뀌면 재심사하고,
       * 날짜·시간·러닝타임·정원처럼 값이 정해진 사실 정정만 바뀐 경우에는 게시를 유지한 채 즉시 반영한다.
       * 장르·지역·공연 구분은 선택지에서 고르는 값이라 임의 문구가 들어갈 수 없어 후자에 둔다. */
      const REVIEW_TRIGGERS = [
        "title", "subtitle", "description", "poster_url", "cast_members", "performer_name",
        "genre_custom", "school_department", "venue", "venue_address", "directions",
        "reservation_url", "ticket_url",
      ] as const;

      const current = myShows.find((s) => s.id === editingId);
      const norm = (v: unknown) => JSON.stringify(v ?? null);
      const contentChanged =
        !current ||
        REVIEW_TRIGGERS.some(
          (k) => norm((payload as Record<string, unknown>)[k]) !== norm((current as unknown as Record<string, unknown>)[k])
        );
      // 이미 게시 중인 공연이고 사실 정정만 한 경우에만 게시를 유지한다.
      const keepApproved = current?.status === "approved" && !contentChanged;

      const { data: updated, error: updateError } = await supabase
        .from("shows")
        .update(keepApproved ? payload : { ...payload, status: "pending" })
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
                  // scheduleStart는 위 검증을 통과한 "YYYY-MM-DD" — 그대로 회차 날짜로 쓴다
                  date: scheduleStart,
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

  /* 손님 · 신청 대기 · 아직 신청 안 한 회원 — 셋 다 "읽을 것"이 먼저다.
   * 세 화면의 뼈대는 같고 맨 위 인사말과 맨 아래 다음 걸음만 다르다. */
  if (authState === "guest" || authState === "pending" || authState === "denied") {
    const intro =
      authState === "pending"
        ? {
            eyebrow: "신청을 받았습니다",
            title: "확인하고 있습니다",
            body: "보내주신 신청을 운영자가 살펴보고 있습니다. 영업일 기준 1~3일 안에 결과를 알려드립니다. 자격이 열리면 이 자리가 바로 공연 등록 화면으로 바뀝니다.",
          }
        : {
            /* 2026-09-11 — 앞 문구는 "올려주시면, 저희가 걸어 두겠습니다"였다.
               운영자를 거치는 과정이 먼저 읽혀서, 올리는 쪽에는 맡기고 기다리는 일로 보였다.
               확인 단계 자체는 아래 5단계에 그대로 있으므로(03·05) 여기서 감추지 않는다.
               첫 문장이 말할 것은 심사가 아니라 "준비할 게 적다"는 사실이다. */
            eyebrow: "무대를 올리는 분께",
            title: "포스터 한 장이면 충분합니다",
            body: "제목과 포스터, 일정. 이 세 가지면 됩니다. 채우시는 데 10분이면 끝나고, 무대를 올리는 데에도 사이트에 걸리는 데에도 비용을 받지 않습니다.",
          };

    /* 다음 걸음 — 지금 서 계신 자리에서 가장 가까운 문 하나만 크게 연다. */
    const cta =
      authState === "guest"
        ? { href: "/auth/signup?next=%2Fmypage%3Ftab%3Dperformer", label: "가입하고 시작하기 →" }
        : authState === "denied"
          ? { href: "/mypage?tab=performer", label: "공연자 신청하러 가기 →" }
          : { href: "/mypage?tab=performer", label: "신청 상황 보기 →" };

    const steps = [
      { num: "01", title: "회원으로 가입합니다", meta: "바로", body: "이메일이나 카카오·구글 계정이면 됩니다." },
      { num: "02", title: "마이페이지에서 공연자 신청을 누릅니다", meta: "1분", body: "학과·동아리·극단 어느 이름으로 활동하시든 같은 자리에서 신청하십니다." },
      { num: "03", title: "운영자가 확인합니다", meta: "영업일 1~3일", body: "확인이 끝나면 안내 메일이 갑니다. 진행 상황은 마이페이지에서 보실 수 있습니다." },
      { num: "04", title: "공연을 등록합니다", meta: "10~20분", body: "제목과 포스터, 일정과 회차, 장소, 장르를 적습니다. 포스터 이미지와 확정된 일정, 객석 규모를 미리 챙겨두시면 수월합니다." },
      { num: "05", title: "확인을 거쳐 사이트에 걸립니다", meta: "영업일 1~3일", body: "올려주신 내용을 한 번 더 살펴본 뒤 게재합니다. 좌석 신청도 무대올림에서 받으실 수 있습니다." },
    ];

    const focusRing =
      "transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[currentColor]";

    return (
      <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
        <div className="max-w-2xl mx-auto px-5 sm:px-8 pb-20">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-4"
            style={{ fontFamily: "var(--font-inter)", color: "#5F5145" }}
          >
            {intro.eyebrow}
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold mb-5 leading-snug"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2B211C", wordBreak: "keep-all" }}
          >
            {intro.title}
          </h1>
          <p
            className="text-sm md:text-base leading-[1.9] mb-10"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
          >
            {intro.body}
          </p>

          {/* 2026-09-11 — 절차를 글로 읽기 전에, 결과물을 먼저 눈으로 보게 한다.
              확인하러 들어온 담당자가 알고 싶은 건 "내 공연이 걸리면 어떤 모양인가"다. */}
          <ShowSamplePreview />

          <div className="space-y-6 mb-12">
            {steps.map((s) => (
              <div
                key={s.num}
                className="grid grid-cols-[38px_1fr] md:grid-cols-[56px_1fr] gap-4 md:gap-6 items-start pt-5"
                style={{ borderTop: "1px solid #D4CFC1" }}
              >
                <span
                  className="text-xl md:text-2xl leading-none"
                  style={{ fontFamily: "var(--font-cormorant)", color: "#0B5563", fontWeight: 600 }}
                >
                  {s.num}
                </span>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                    <p
                      className="text-sm md:text-base font-bold"
                      style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27", wordBreak: "keep-all" }}
                    >
                      {s.title}
                    </p>
                    <span
                      className="text-[0.7rem] px-2 py-0.5"
                      style={{
                        fontFamily: "var(--font-noto-sans-kr)",
                        backgroundColor: "#E6E1D6",
                        color: "#5F5145",
                        border: "1px solid #8C837C",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.meta}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-[1.9]"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F5145", wordBreak: "keep-all" }}
                  >
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={cta.href}
              className={`inline-flex items-center px-6 text-sm tracking-wide ${focusRing}`}
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#5C2A42",
                color: "#F0EEE9",
                fontWeight: 600,
                minHeight: 48,
              }}
            >
              {cta.label}
            </Link>
            {authState === "guest" && (
              <Link
                href="/auth/login?next=%2Fmuol%2Fperformer"
                className={`inline-flex items-center px-5 text-sm ${focusRing}`}
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#0B5563",
                  border: "1px solid #8C837C",
                  minHeight: 48,
                }}
              >
                이미 계정이 있습니다
              </Link>
            )}
          </div>

          <p
            className="text-xs leading-relaxed mt-8"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F5145", wordBreak: "keep-all" }}
          >
            더 자세한 내용은{" "}
            <Link href="/muol/about#for-performer" className="underline" style={{ color: "#0B5563" }}>
              무대올림 소개
            </Link>
            와{" "}
            <Link href="/muol/faq" className="underline" style={{ color: "#0B5563" }}>
              자주 묻는 질문
            </Link>
            에 적어두었습니다. 막히는 곳이 있으시면{" "}
            <Link href="/muol/contact" className="underline" style={{ color: "#0B5563" }}>
              문의
            </Link>
            로 알려주십시오.
          </p>
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
              {/* 2026-09-10 — 배지가 "무조건 재승인"이라고만 알렸다. 이제 게시 중인 공연은
                  날짜·시간 같은 사실 정정이면 내려가지 않으므로, 그 사실을 먼저 말해준다. */}
              {editingId && (
                <span
                  className="text-xs px-2 py-1"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    color: myShows.find((s) => s.id === editingId)?.status === "approved" ? "#2F6B4F" : "#A63D2F",
                    backgroundColor: myShows.find((s) => s.id === editingId)?.status === "approved" ? "#D9E8DF" : "#EDD4D4",
                  }}
                >
                  {myShows.find((s) => s.id === editingId)?.status === "approved"
                    ? "일정·시간 정정은 게시된 채로 반영"
                    : "수정 후 관리자 검토를 거쳐 게시"}
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
                                  style={{ fontFamily: "var(--font-inter)", color: "#6B5C50" }}
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
                <p className="text-xs leading-relaxed mb-4" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}>
                  학교/학과 칸에 학교 이름을 치시면 <strong style={{ color: "#4A3B33" }}>{DEPARTMENT_COUNT}개 학과 명부</strong>에서 자동으로 찾아 보여드립니다.
                  목록에서 고르시면 표기가 통일되어 지역 관객이 더 쉽게 찾습니다. 목록에 없으면 그대로 적으셔도 됩니다.
                </p>

                {/* 학과 명부 자동완성 — 브라우저가 그리는 목록이라 자유 입력을 막지 않는다.
                    목록에 없는 동아리·극단·개인도 그대로 적을 수 있어야 하기 때문이다. */}
                <datalist id="dept-directory">
                  {DEPARTMENTS.map((d) => (
                    <option key={fullName(d)} value={fullName(d)} />
                  ))}
                </datalist>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "공연명 *", key: "title", required: true, span: "sm:col-span-2" },
                    { label: "영문 제목 (선택)", key: "subtitle", required: false },
                    // 2026-09-10 — 명부(lib/universities.ts) 기반 자동완성을 붙였다.
                    // 그전에는 자유 텍스트라 "동덕여대 공연예술학과"와 "동덕여자대학교 공연예술학과"가
                    // 별개 학과로 쌓였고, 그 정규화를 코드 주석이 사람 손에 넘기고 있었다.
                    // 필수로 올리지는 않는다 — 학과에 속하지 않은 동아리·극단·개인이 막히면 안 된다.
                    { label: "학교/학과 (권장)", key: "school_department", required: false, list: "dept-directory", placeholder: "학교 이름을 입력하면 목록이 뜹니다" },
                    // 공연 기간은 달력 입력(2026-08-03) — 자유 텍스트를 받으면 사이트 곳곳에서
                    // 종료 판정·리마인더·캘린더가 조용히 어긋난다.
                    { label: "공연 시작일 *", key: "schedule_start", required: true, type: "date" },
                    { label: "공연 종료일 *", key: "schedule_end", required: true, type: "date" },
                    { label: "공연 시간 (선택)", key: "show_time", required: false, placeholder: "평일 19:30 / 주말 15:00" },
                    { label: "러닝 타임 (선택)", key: "running_time", required: false, placeholder: "100분" },
                    { label: "관람 연령 (선택)", key: "age_rating", required: false, placeholder: "7세 이상" },
                  ].map((field) => {
                    // date 필드인데 예전 형식이라 달력이 못 읽는 값이면 텍스트로 폴백한다
                    const isDateField = field.type === "date";
                    const isLegacyText = isDateField && legacyDateFields[field.key as ScheduleFieldKey];
                    const useDatePicker = isDateField && !isLegacyText;
                    // 연도 오타(예: 1026년) 방어용 하한선. 지난 공연 아카이브 등록은 막지 않도록 1년 전까지 허용.
                    const dateMin = useDatePicker ? showDateInputMin() : undefined;
                    return (
                      <div key={field.key} className={field.span ?? ""}>
                        <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                          {field.label}
                        </label>
                        <input
                          type={useDatePicker ? "date" : "text"}
                          value={form[field.key as keyof typeof form]}
                          onChange={(e) => {
                            const value = e.target.value;
                            setForm({ ...form, [field.key]: value });
                            // 명부에 있는 학과를 고르면 지역을 대신 채워준다(이미 고른 지역은 건드리지 않는다 —
                            // 학과 소재지와 공연장 지역이 다를 수 있고, 여기서 묻는 것은 공연 지역이다).
                            if (field.key === "school_department" && !region) {
                              const matched = findByFullName(value);
                              if (matched) setRegion(matched.region);
                            }
                          }}
                          required={field.required}
                          list={field.list}
                          placeholder={field.placeholder}
                          min={dateMin}
                          className="w-full px-4 py-3 text-base outline-none"
                          style={inputStyle}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                        />
                        {isLegacyText && (
                          <p
                            className="mt-2 text-xs leading-relaxed"
                            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#A63D2F", wordBreak: "keep-all" }}
                          >
                            예전에 저장된 형식이라 달력으로 읽지 못했습니다. 형식을 확인해 주세요 —
                            2026-05-10처럼 적어주시거나{" "}
                            <button
                              type="button"
                              onClick={() => switchToDatePicker(field.key as ScheduleFieldKey)}
                              className={`underline ${OUTLINE_BTN_STATES}`}
                              style={{ color: "#0B5563" }}
                            >
                              달력에서 다시 고르기
                            </button>
                            를 눌러 주세요.
                          </p>
                        )}
                      </div>
                    );
                  })}
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
                      <span style={{ color: "#6B5C50" }}>예) <code>[카카오맵] 낙산공원 https://kko.to/abc</code></span>
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
                    {/* 2026-09-10 점검 — 필수에서 선택으로 내렸다. 세 가지가 겹쳐 있었다.
                        ① 캐스팅이 아직 안 정해진 워크샵·수업 공연은 등록 자체가 불가능했다
                           (공연 구분 선택지에 그 유형이 버젓이 있는데도).
                        ② 학교·포스터·주소·러닝타임은 전부 선택인데, 손이 가장 많이 가는 항목만 필수라
                           폼을 끝까지 채우기 전에 나가는 자리가 됐다.
                        ③ 등록자가 '본인이 아닌 사람들'의 실명을 필수로 적게 되어 있었고,
                           그 이름이 공개 페이지와 검색 결과에 그대로 실렸다. */}
                    <label className="block text-xs tracking-wider uppercase mb-2" style={labelStyle}>
                      출연진 (선택 · 쉼표로 구분)
                    </label>
                    <input
                      type="text"
                      value={form.cast_members}
                      onChange={(e) => setForm({ ...form, cast_members: e.target.value })}
                      placeholder="예: 홍길동(배역명), 김철수(배역명) — 나중에 채우셔도 됩니다"
                      className="w-full px-4 py-3 text-base outline-none"
                      style={inputStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#0B5563")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    />
                    <p className="text-xs mt-2" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F5145", wordBreak: "keep-all" }}>
                      본인의 동의를 받은 이름만 적어주십시오. 배역명만 쓰셔도 됩니다.
                    </p>
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
                ※{" "}
                {!editingId
                  ? "등록 후 관리자 검토를 거쳐 게시됩니다. (1~3일 소요)"
                  : myShows.find((s) => s.id === editingId)?.status === "approved"
                    ? "공연 일정·시간·러닝타임·정원처럼 사실을 바로잡는 수정은 게시된 상태 그대로 반영됩니다. 제목·소개·포스터·출연진처럼 내용이 바뀌면 다시 검토를 거칩니다. (1~3일 소요)"
                    : "수정한 공연은 다시 관리자 검토 후 게시됩니다. (1~3일 소요)"}
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
                        // 표시 포맷은 사이트 전체 공통 (읽지 못하는 예전 값은 원문 그대로 나온다)
                        formatShowPeriod(show.schedule_start, show.schedule_end, { weekday: false }),
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
