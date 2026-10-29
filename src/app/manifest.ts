import type { MetadataRoute } from "next";

/**
 * 웹 앱 매니페스트 — 2026-10-29 새 파비콘(사유유사 ㅅ·ㅇ v3)과 함께 신설.
 * 안드로이드 홈 화면·탭 전환 화면이 이 아이콘을 쓴다. 앱처럼 설치시키려는 게 아니라
 * 아이콘을 알려 주려는 것이므로 display는 기본(browser)으로 둔다.
 * maskable = 원·물방울 등 기기별 모양으로 잘려도 마크가 안전 영역(가장 먼 점 153/205) 안에 남는 판.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "사유유사 SYUS — 무대올림과 시우스",
    short_name: "사유유사",
    start_url: "/",
    display: "browser",
    background_color: "#F0EEE9",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
