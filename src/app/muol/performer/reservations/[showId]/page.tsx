"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageLoader from "@/components/PageLoader";
import type { Reservation, Show } from "@/types";

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: "확정", bg: "#D4EDD4", color: "#3A5E42" },
  waitlisted: { label: "대기", bg: "#E6E1D6", color: "#0B5563" },
  cancelled: { label: "취소됨", bg: "#EDD4D4", color: "#5A4A3E" },
};

/**
 * 공연자용 예약 현황 — 본인이 등록한 공연의 좌석 신청자(이름·연락처·인원)를
 * 실시간으로 확인하고 인쇄·CSV로 내보낼 수 있는 페이지.
 * RLS(supabase/syus_reservations_organizer_access.sql)로 organizer_id 본인만 조회 가능.
 */
export default function PerformerReservationsPage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = use(params);
  const [authState, setAuthState] = useState<"loading" | "denied" | "ready">("loading");
  const [show, setShow] = useState<Show | null>(null);
  const [rows, setRows] = useState<Reservation[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: showData } = await supabase.from("shows").select("*").eq("id", showId).maybeSingle();
    const { data: resData } = await supabase
      .from("syus_reservations")
      .select("*")
      .eq("show_id", showId)
      .order("created_at", { ascending: true });
    setShow((showData as Show) ?? null);
    setRows((resData as Reservation[]) ?? []);
  }, [showId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setAuthState("denied"); return; }

      const { data: showData } = await supabase.from("shows").select("*").eq("id", showId).maybeSingle();
      if (!showData) { setAuthState("denied"); return; }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      const isOwner = showData.organizer_id === data.user.id;
      const isAdmin = profile?.role === "admin";
      if (!isOwner && !isAdmin) { setAuthState("denied"); return; }

      await load();
      setAuthState("ready");
    });
  }, [showId, load]);

  // 실시간 반영 — 새 신청·취소가 즉시 화면에 반영
  useEffect(() => {
    if (authState !== "ready") return;
    const supabase = createClient();
    const channel = supabase
      .channel(`performer-reservations-${showId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "syus_reservations", filter: `show_id=eq.${showId}` },
        () => { load(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [authState, showId, load]);

  const handleToggleClosed = async () => {
    if (!show) return;
    const next = !show.reservation_closed;
    if (next && !window.confirm("예약을 마감(매진 처리)하시겠습니까?\n\n관객은 더 이상 좌석을 신청할 수 없게 됩니다.")) return;

    const supabase = createClient();
    const { error } = await supabase.from("shows").update({ reservation_closed: next }).eq("id", show.id);
    if (error) {
      alert("처리 중 오류가 발생했습니다.");
      return;
    }
    setShow({ ...show, reservation_closed: next });
  };

  const handleExportCsv = () => {
    const header = ["이름", "연락처", "인원수", "상태", "신청번호", "신청일시"];
    const lines = rows.map((r) => [
      r.guest_name ?? "",
      r.guest_contact ?? "",
      String(r.party_size),
      STATUS_LABEL[r.status]?.label ?? r.status,
      r.reservation_code,
      new Date(r.created_at).toLocaleString("ko-KR"),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `예약자명단_${show?.title ?? showId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authState === "loading") {
    return (
      <div className="pt-24 md:pt-36 min-h-screen" style={{ backgroundColor: "#F0EEE9" }}>
        <PageLoader />
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div className="pt-24 md:pt-36 min-h-screen text-center" style={{ backgroundColor: "#F0EEE9" }}>
        <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
          이 페이지는 해당 공연의 등록자만 볼 수 있습니다.
        </p>
        <Link href="/muol/performer" className="text-sm underline mt-4 inline-block" style={{ color: "#0B5563" }}>
          공연자 페이지로
        </Link>
      </div>
    );
  }

  const confirmedTotal = rows.filter((r) => r.status === "confirmed").reduce((sum, r) => sum + r.party_size, 0);
  const waitlistedTotal = rows.filter((r) => r.status === "waitlisted").reduce((sum, r) => sum + r.party_size, 0);

  return (
    <div className="pt-24 md:pt-36 pb-20 px-6 min-h-screen max-w-3xl mx-auto" style={{ backgroundColor: "#F0EEE9", fontFamily: "var(--font-noto-sans-kr)" }}>
      <Link href="/muol/performer" className="text-xs underline print:hidden" style={{ color: "#5A4A3E" }}>
        ← 공연자 페이지로
      </Link>

      <h1 className="text-xl font-bold mt-3 mb-1" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
        {show?.title ?? "공연"} — 예약 현황
      </h1>
      <p className="text-xs mb-1" style={{ color: "#5A4A3E" }}>
        확정 {confirmedTotal}명{show?.capacity ? ` / 정원 ${show.capacity}명` : " (정원 무제한)"}
        {waitlistedTotal > 0 && ` · 대기 ${waitlistedTotal}명`}
        {" · 새 신청은 실시간으로 반영됩니다"}
      </p>
      {show?.reservation_closed && (
        <p className="text-xs mb-6" style={{ color: "#A63D2F", fontWeight: 600 }}>
          🔒 예약이 수동으로 마감된 상태입니다 — 관객이 신규 신청을 할 수 없습니다.
        </p>
      )}

      <div className="flex gap-2 mb-6 print:hidden flex-wrap">
        <button
          onClick={handleExportCsv}
          disabled={rows.length === 0}
          className="px-4 py-2 text-xs tracking-wider"
          style={{ backgroundColor: "#0B5563", color: "#F0EEE9", fontWeight: 600 }}
        >
          CSV 다운로드
        </button>
        <button
          onClick={() => window.print()}
          disabled={rows.length === 0}
          className="px-4 py-2 text-xs tracking-wider"
          style={{ border: "1px solid #D4CFC1", color: "#4A3B33" }}
        >
          인쇄
        </button>
        <button
          onClick={handleToggleClosed}
          className="px-4 py-2 text-xs tracking-wider"
          style={
            show?.reservation_closed
              ? { backgroundColor: "#5A4A3E", color: "#F0EEE9" }
              : { border: "1px solid #A63D2F", color: "#A63D2F" }
          }
        >
          {show?.reservation_closed ? "예약 다시 열기" : "예약 마감하기"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-center py-16" style={{ color: "#5A4A3E" }}>
          아직 접수된 신청이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto" data-clarity-mask="True">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #D4CFC1" }}>
                {["이름", "연락처", "인원", "상태", "신청번호"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 text-xs tracking-wider" style={{ color: "#5A4A3E" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.confirmed;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #E6E1D6" }}>
                    <td className="py-2 px-2" style={{ color: "#4A3B33" }}>{r.guest_name ?? "-"}</td>
                    <td className="py-2 px-2" style={{ color: "#4A3B33" }}>{r.guest_contact ?? "-"}</td>
                    <td className="py-2 px-2" style={{ color: "#4A3B33" }}>{r.party_size}명</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs" style={{ color: "#5A4A3E" }}>{r.reservation_code}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
