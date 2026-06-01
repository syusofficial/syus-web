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
              "radial-gradient(ellipse at top left, #5C7C8E 0%, #3B5A6B 35%, #202833 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "serif",
          }}
        >
          <div style={{ fontSize: 96, fontWeight: 700, color: "#FBF8F1", letterSpacing: -2 }}>
            무대올림
          </div>
          <div style={{ fontSize: 24, color: "#C8D96F", marginTop: 24, letterSpacing: 6 }}>
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
          background: "#FBF8F1",
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
              <line x1="6" y1="55" x2="94" y2="55" stroke="#3B5A6B" strokeWidth="5" />
              <circle cx="35" cy="32" r="14" stroke="#3B5A6B" strokeWidth="4.5" fill="none" />
              <circle cx="65" cy="32" r="14" stroke="#3B5A6B" strokeWidth="4.5" fill="none" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 24, color: "#3B5A6B", letterSpacing: 1, fontWeight: 700 }}>
                무대올림
              </span>
              <span style={{ fontSize: 13, color: "#5F584F", letterSpacing: 2, marginTop: 2 }}>
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
                  background: "#3B5A6B",
                  color: "#FBF8F1",
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
                  color: "#3B5A6B",
                  border: "1px solid #3B5A6B",
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
            <div style={{ fontSize: 22, color: "#5F584F", marginBottom: 18, fontStyle: "italic" }}>
              {show.subtitle}
            </div>
          )}
          <div
            style={{
              fontSize: show.title.length > 18 ? 64 : show.title.length > 12 ? 78 : 96,
              fontWeight: 700,
              color: "#3B5A6B",
              lineHeight: 1.1,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            {show.title}
          </div>
          {show.performer_name && (
            <div style={{ fontSize: 26, color: "#5F584F", marginTop: 20, letterSpacing: 1 }}>
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
            borderTop: "1px solid #D8D3C9",
            color: "#1A1A1A",
            fontSize: 22,
          }}
        >
          <span>{dateRange}</span>
          <span style={{ color: "#3B5A6B" }}>{show.venue}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
