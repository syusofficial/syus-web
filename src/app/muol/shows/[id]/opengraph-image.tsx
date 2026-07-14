import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "무대올림 공연 (운영: 사유유사 SYUS)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 공연 상세 페이지의 OpenGraph 이미지 자동 생성.
 * 카카오톡·인스타·X 등에 공유될 때 SYUS 톤의 카드 이미지가 표시됨.
 *
 * 1200x630 (Facebook/카카오톡 권장 OG 사이즈)
 */
export default async function Image({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: show } = await supabase
    .from("shows")
    .select("title, subtitle, performer_name, venue, region, genre, genre_custom, schedule_start, schedule_end, status")
    .eq("id", params.id)
    .single();

  // 공연 데이터 없거나 미승인 — 기본 무대올림 카드
  if (!show || show.status !== "approved") {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            background:
              "radial-gradient(ellipse at top left, #2C7384 0%, #0B5563 35%, #4A3B33 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "serif",
          }}
        >
          <div style={{ fontSize: 96, fontWeight: 700, color: "#F0EEE9", letterSpacing: -2 }}>
            무대올림
          </div>
          <div style={{ fontSize: 24, color: "#C99FB1" /* = var(--color-damson-light), OG는 satori 렌더라 리터럴 hex 고정 */, marginTop: 24, letterSpacing: 6 }}>
            운영 · 사유유사 SYUS
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const genreLabel = show.genre === "기타" && show.genre_custom ? show.genre_custom : show.genre;
  const dateRange = show.schedule_start && show.schedule_end && show.schedule_start !== show.schedule_end
    ? `${show.schedule_start} — ${show.schedule_end}`
    : (show.schedule_start ?? "");

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#F0EEE9",
          display: "flex",
          flexDirection: "column",
          padding: "70px 80px",
          fontFamily: "serif",
        }}
      >
        {/* 상단: 무대올림 워드마크 + 장르·지역 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* 미니 무대올림 마크: 두 구체 + 가로선 */}
            <svg width="60" height="42" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="6" y1="55" x2="94" y2="55" stroke="#0B5563" strokeWidth="5" />
              <circle cx="35" cy="32" r="14" stroke="#0B5563" strokeWidth="4.5" fill="none" />
              <circle cx="65" cy="32" r="14" stroke="#0B5563" strokeWidth="4.5" fill="none" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 24, color: "#0B5563", letterSpacing: 1, fontWeight: 700 }}>
                무대올림
              </span>
              <span style={{ fontSize: 13, color: "#5A4A3E", letterSpacing: 2, marginTop: 2 }}>
                운영 · 사유유사 SYUS
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {genreLabel && (
              <span
                style={{
                  fontSize: 18,
                  padding: "8px 18px",
                  background: "#0B5563",
                  color: "#F0EEE9",
                  letterSpacing: 1,
                }}
              >
                {genreLabel}
              </span>
            )}
            {show.region && (
              <span
                style={{
                  fontSize: 18,
                  padding: "8px 18px",
                  background: "transparent",
                  color: "#0B5563",
                  border: "1px solid #0B5563",
                  letterSpacing: 1,
                }}
              >
                {show.region}
              </span>
            )}
          </div>
        </div>

        {/* 중앙: 공연명 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: 30 }}>
          {show.subtitle && (
            <div style={{ fontSize: 22, color: "#5A4A3E", marginBottom: 18, fontStyle: "italic" }}>
              {show.subtitle}
            </div>
          )}
          <div
            style={{
              fontSize: show.title.length > 18 ? 64 : show.title.length > 12 ? 78 : 96,
              fontWeight: 700,
              color: "#0B5563",
              lineHeight: 1.1,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            {show.title}
          </div>
          {show.performer_name && (
            <div style={{ fontSize: 26, color: "#5A4A3E", marginTop: 20, letterSpacing: 1 }}>
              by {show.performer_name}
            </div>
          )}
        </div>

        {/* 하단: 일정·장소 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: "1px solid #D4CFC1",
            color: "#4A3B33",
            fontSize: 22,
          }}
        >
          <span>{dateRange}</span>
          <span style={{ color: "#0B5563" }}>{show.venue}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
