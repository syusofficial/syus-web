"use client";

/**
 * 관리자 공연 모달 2종 — 2026-09-10 신설.
 *
 *  ① AdminShowCreateModal  — 공연 대리 등록
 *  ② OrganizerReassignModal — 공연자(등록 계정) 변경
 *
 * ─ ① 왜 필요했나 ─────────────────────────────────────────────
 * 그전까지 사이트 전체에서 공연을 "만드는" 자리는 공연자 페이지 한 곳뿐이었다.
 * 그래서 미팅이나 메일로 포스터·일정을 이미 받아도, 상대를
 * "가입 → 공연자 신청 → 승인 대기 → 직접 등록"이라는 네 개의 문으로 되돌려
 * 보내야 했다. 그 사이에 대부분이 사라진다 — 영업이 등록으로 이어지지 않던
 * 직접 원인이다. 여기서 대신 올릴 수 있게 한다.
 *
 * 왜 필드가 적은가
 * shows 컬럼은 서른 개가 넘지만 이 폼은 최소 항목만 받는다. 대리 등록은 대화가
 * 끝난 직후 그 자리에서 넣는 자리라, 항목이 많으면 결국 "나중에 하자"가 되어
 * 지금과 똑같이 등록이 0건이 된다. 나머지(오시는 길·출연진·러닝타임·관람 연령·
 * 지도 링크·좌석 신청 설정)는 공연팀이 계정을 넘겨받아 공연자 페이지에서 채운다.
 *
 * ─ ② 왜 필요했나 ─────────────────────────────────────────────
 * 대리 등록한 공연은 일단 운영자 계정에 매여 있다. 나중에 그 학과가 가입하면
 * 자기 공연으로 넘겨받아 직접 고칠 수 있어야 한다. 넘기는 수단이 없으면 그 공연은
 * 영원히 운영자 계정에 남고, 사소한 수정까지 전부 사람 손을 거치게 된다.
 *
 * ─ 색 위계 (globals.css) ────────────────────────────────────
 * 읽는 것 먹빛 #2B211C·#3A2E27·#4A3B33 / 누르는 것 청록 #0B5563 /
 * 결심 자두 #5C2A42 / 배경 #F0EEE9·#E6E1D6.
 * 관람료·가격은 어떤 필드로도 받지 않는다(무대올림 관람료 무단언 정책).
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createShowAsAdmin } from "@/app/actions/shows";
import {
  GENRES,
  GENRE_DETAILS,
  GENRE_DETAIL_GROUPS,
  REGIONS_EXCLUDE_ALL,
  SHOW_CATEGORIES,
  hasGenreDetails,
} from "@/lib/constants";
import { showDateInputMin } from "@/lib/showDate";
import type { Show, Profile } from "@/types";

/** 장르 상세 선택지 — 그룹이 있으면 그룹으로, 없으면 평탄한 목록으로 */
function genreDetailOptions(genre: string): { group: string | null; items: readonly string[] }[] {
  if (!hasGenreDetails(genre)) return [];
  const groups = GENRE_DETAIL_GROUPS[genre];
  if (groups) {
    return Object.entries(groups).map(([label, items]) => ({ group: label, items }));
  }
  return [{ group: null, items: GENRE_DETAILS[genre] }];
}

const FIELD_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-noto-sans-kr)",
  backgroundColor: "#FFFFFF",
  color: "#3A2E27",
  border: "1px solid #D4CFC1",
};

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-inter)",
  color: "#5A4A3E",
};

const HELP_TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-noto-sans-kr)",
  color: "#5A4A3E",
  lineHeight: 1.7,
};

const ERROR_BOX_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-noto-sans-kr)",
  backgroundColor: "#EDD4D4",
  color: "#A63D2F",
  lineHeight: 1.7,
};

const OVERLAY_STYLE: React.CSSProperties = { backgroundColor: "rgba(26, 26, 26, 0.6)" };

/** 회원 목록 <option>에 쓸 표기 — 이름이 없으면 이메일, 그것도 없으면 id 앞자리 */
function optionLabel(m: Profile): string {
  const base = m.name || m.email || m.id.slice(0, 8);
  return m.email && m.name ? `${base} · ${m.email}` : base;
}

// ──────────────────────────────────────────────────────────────
// ① 공연 대리 등록
// ──────────────────────────────────────────────────────────────
export function AdminShowCreateModal({
  members,
  adminUserId,
  onClose,
  onCreated,
}: {
  members: Profile[];
  adminUserId: string | null;
  onClose: () => void;
  onCreated: (created: Show, message: string) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    performerName: "",
    genre: "",
    genreDetail: "",
    genreCustom: "",
    region: "",
    venue: "",
    venueAddress: "",
    scheduleStart: "",
    scheduleEnd: "",
    showCategory: "",
    schoolDepartment: "",
    showTime: "",
    description: "",
  });
  const [organizerId, setOrganizerId] = useState<string>(adminUserId ?? "");
  const [publishNow, setPublishNow] = useState(true);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const detailOptions = genreDetailOptions(form.genre);

  const submit = async () => {
    setError(null);
    setBusy(true);

    // 포스터는 선택 항목이지만, 올리다 실패하면 조용히 넘어가지 않고 멈춘다.
    // 포스터가 빠진 줄 모른 채 게시되면 목록에 빈 칸이 그대로 걸린다.
    let posterUrl: string | null = null;
    if (posterFile) {
      if (!adminUserId) {
        setError("로그인 정보를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
        setBusy(false);
        return;
      }
      const supabase = createClient();
      const ext = posterFile.name.split(".").pop();
      const filename = `${adminUserId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("posters")
        .upload(filename, posterFile, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setError(`포스터 업로드 중 오류가 발생했습니다: ${uploadError.message}`);
        setBusy(false);
        return;
      }
      posterUrl = supabase.storage.from("posters").getPublicUrl(filename).data.publicUrl;
    }

    const result = await createShowAsAdmin({
      title: form.title,
      performerName: form.performerName,
      genre: form.genre,
      genreDetail: form.genreDetail || null,
      genreCustom: form.genreCustom || null,
      region: form.region,
      venue: form.venue,
      venueAddress: form.venueAddress || null,
      scheduleStart: form.scheduleStart,
      scheduleEnd: form.scheduleEnd,
      organizerId,
      status: publishNow ? "approved" : "pending",
      showCategory: form.showCategory || null,
      schoolDepartment: form.schoolDepartment || null,
      showTime: form.showTime || null,
      description: form.description || null,
      posterUrl,
    });

    setBusy(false);
    if (!result.ok || !result.show) {
      setError(result.message);
      return;
    }
    onCreated(result.show, result.message);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={OVERLAY_STYLE}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#F0EEE9" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-lg transition-colors z-10"
          style={{ color: "#0B5563", backgroundColor: "#E6E1D6" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4CFC1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#E6E1D6"; }}
        >
          ✕
        </button>

        <div className="p-6 sm:p-10 space-y-6">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              Proxy Registration
            </p>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              공연 대리 등록
            </h2>
            <p className="text-xs" style={HELP_TEXT_STYLE}>
              받으신 정보만 채우시면 됩니다. 나머지 항목은 나중에 공연팀이 계정을 넘겨받아
              공연자 페이지에서 직접 채웁니다.
            </p>
          </div>

          {error && <div className="px-4 py-3 text-xs" style={ERROR_BOX_STYLE}>{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="sm:col-span-2 block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연명 *</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연자(단체)명 *</span>
              <input
                type="text"
                value={form.performerName}
                onChange={(e) => set("performerName", e.target.value)}
                placeholder="예: ○○대학교 연극학과 학생회"
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>대학·학과</span>
              <input
                type="text"
                value={form.schoolDepartment}
                onChange={(e) => set("schoolDepartment", e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>장르 *</span>
              <select
                value={form.genre}
                onChange={(e) => { set("genre", e.target.value); set("genreDetail", ""); }}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              >
                <option value="">선택</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>

            {detailOptions.length > 0 && (
              <label className="block">
                <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>상세 장르</span>
                <select
                  value={form.genreDetail}
                  onChange={(e) => set("genreDetail", e.target.value)}
                  className="w-full px-3 py-2 text-sm"
                  style={FIELD_STYLE}
                >
                  <option value="">선택 안 함</option>
                  {detailOptions.map(({ group, items }) =>
                    group ? (
                      <optgroup key={group} label={group}>
                        {items.map((d) => <option key={d} value={d}>{d}</option>)}
                      </optgroup>
                    ) : (
                      items.map((d) => <option key={d} value={d}>{d}</option>)
                    )
                  )}
                </select>
              </label>
            )}

            {form.genre === "기타" && (
              <label className="block">
                <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>장르 직접 입력 *</span>
                <input
                  type="text"
                  value={form.genreCustom}
                  onChange={(e) => set("genreCustom", e.target.value)}
                  className="w-full px-3 py-2 text-sm"
                  style={FIELD_STYLE}
                />
              </label>
            )}

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>지역 *</span>
              <select
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              >
                <option value="">선택</option>
                {REGIONS_EXCLUDE_ALL.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연 구분</span>
              <select
                value={form.showCategory}
                onChange={(e) => set("showCategory", e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              >
                <option value="">선택 안 함</option>
                {SHOW_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연장 *</span>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => set("venue", e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연장 주소</span>
              <input
                type="text"
                value={form.venueAddress}
                onChange={(e) => set("venueAddress", e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연 시작일 *</span>
              <input
                type="date"
                value={form.scheduleStart}
                min={showDateInputMin()}
                onChange={(e) => {
                  const next = e.target.value;
                  // 종료일이 비어 있으면 같은 날로 채워 준다 (하루짜리 공연이 대부분)
                  setForm((prev) => ({
                    ...prev,
                    scheduleStart: next,
                    scheduleEnd: prev.scheduleEnd || next,
                  }));
                }}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연 종료일 *</span>
              <input
                type="date"
                value={form.scheduleEnd}
                min={form.scheduleStart || showDateInputMin()}
                onChange={(e) => set("scheduleEnd", e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>공연 시간</span>
              <input
                type="text"
                value={form.showTime}
                onChange={(e) => set("showTime", e.target.value)}
                placeholder="예: 평일 19:30 / 주말 15:00"
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>

            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>포스터 이미지</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
                className="w-full px-3 py-2 text-xs"
                style={{ ...FIELD_STYLE, fontFamily: "var(--font-inter)" }}
              />
            </label>

            <label className="sm:col-span-2 block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>
                작품 소개 {publishNow ? "*" : ""}
              </span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={5}
                placeholder="받으신 소개 글을 그대로 붙여 넣으셔도 됩니다."
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              />
            </label>
          </div>

          {/* ── 등록자 · 게시 여부 ── */}
          <div className="pt-6 space-y-4" style={{ borderTop: "1px solid #D4CFC1" }}>
            <label className="block">
              <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>이 공연을 누구 이름으로 둘까요 *</span>
              <select
                value={organizerId}
                onChange={(e) => setOrganizerId(e.target.value)}
                className="w-full px-3 py-2 text-sm"
                style={FIELD_STYLE}
              >
                <option value="">선택</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {optionLabel(m)}{m.id === adminUserId ? " (운영자 본인)" : ""}
                  </option>
                ))}
              </select>
              <span className="block text-xs mt-1.5" style={HELP_TEXT_STYLE}>
                아직 그 학과 계정이 없다면 운영자 본인으로 두셔도 됩니다.
                나중에 가입하면 목록의 &lsquo;공연자 변경&rsquo;으로 넘겨줄 수 있습니다.
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="mt-0.5"
                style={{ accentColor: "#0B5563" }}
              />
              <span className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33", lineHeight: 1.7 }}>
                저장과 동시에 사이트에 게시합니다.
                <span className="block" style={{ color: "#5A4A3E" }}>
                  끄면 &lsquo;검토 대기&rsquo;로 저장됩니다. 작품 소개를 아직 못 받으셨다면 이쪽이 낫습니다.
                </span>
              </span>
            </label>
          </div>

          {/* ── 저장 ── */}
          <div className="pt-6 flex flex-col sm:flex-row gap-3" style={{ borderTop: "1px solid #D4CFC1" }}>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex-1 py-3 text-sm tracking-wider transition-opacity disabled:opacity-50"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#5C2A42", color: "#F0EEE9" }}
              onMouseEnter={(e) => { if (!busy) e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = busy ? "0.5" : "1"; }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px #F0EEE9, 0 0 0 4px #5C2A42"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {busy ? "저장하는 중…" : publishNow ? "등록하고 바로 게시" : "검토 대기로 저장"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-6 py-3 text-sm tracking-wider transition-colors disabled:opacity-50"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "transparent", color: "#5A4A3E", border: "1px solid #D4CFC1" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#E6E1D6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ② 공연자(등록 계정) 변경
// ──────────────────────────────────────────────────────────────
export function OrganizerReassignModal({
  show,
  members,
  currentLabel,
  onClose,
  onSubmit,
}: {
  show: Show;
  members: Profile[];
  currentLabel: string;
  onClose: () => void;
  onSubmit: (newOrganizerId: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needle = keyword.trim().toLowerCase();
  const filtered = needle
    ? members.filter((m) => `${m.name ?? ""} ${m.email ?? ""}`.toLowerCase().includes(needle))
    : members;

  const submit = async () => {
    if (!selected) {
      setError("넘겨받을 회원을 골라 주세요.");
      return;
    }
    setError(null);
    setBusy(true);
    const result = await onSubmit(selected);
    setBusy(false);
    // 성공 시 모달을 닫는 것은 부모(handleReassign)가 한다.
    if (!result.ok) setError(result.message);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={OVERLAY_STYLE}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#F0EEE9" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 space-y-5">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
              Reassign
            </p>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              공연자 변경
            </h2>
            <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
              「{show.title}」
            </p>
            <p className="text-xs mt-1" style={HELP_TEXT_STYLE}>지금 계정: {currentLabel}</p>
          </div>

          {error && <div className="px-4 py-3 text-xs" style={ERROR_BOX_STYLE}>{error}</div>}

          <label className="block">
            <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>회원 찾기</span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="이름 또는 이메일 일부"
              className="w-full px-3 py-2 text-sm"
              style={FIELD_STYLE}
            />
          </label>

          <label className="block">
            <span className="block text-xs mb-1.5" style={FIELD_LABEL_STYLE}>넘겨받을 회원 *</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              size={Math.min(Math.max(filtered.length, 3), 8)}
              className="w-full px-3 py-2 text-sm"
              style={FIELD_STYLE}
            >
              {filtered.map((m) => (
                <option key={m.id} value={m.id}>{optionLabel(m)}</option>
              ))}
            </select>
          </label>

          <p className="text-xs" style={HELP_TEXT_STYLE}>
            넘기면 그 계정의 공연자 페이지에 이 공연이 나타나고, 직접 수정할 수 있게 됩니다.
            공연자(단체)명과 게시 상태는 그대로 유지됩니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="flex-1 py-3 text-sm tracking-wider transition-opacity disabled:opacity-50"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#0B5563", color: "#F0EEE9" }}
              onMouseEnter={(e) => { if (!busy) e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = busy ? "0.5" : "1"; }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px #F0EEE9, 0 0 0 4px #0B5563"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {busy ? "넘기는 중…" : "이 회원에게 넘기기"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-6 py-3 text-sm tracking-wider transition-colors disabled:opacity-50"
              style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "transparent", color: "#5A4A3E", border: "1px solid #D4CFC1" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#E6E1D6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
