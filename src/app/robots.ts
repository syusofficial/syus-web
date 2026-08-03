import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // 2026-08-03 수정 — /muol/performer 아래에 성격이 다른 두 종류가 섞여 있다.
        //   /muol/performer                  공연자 대시보드 (비공개)
        //   /muol/performer/reservations/…   예약자 명단 (비공개)
        //   /muol/performer/<uuid>           공개 공연자 프로필 ← 학과 영업의 설득 카드
        // 예전엔 "/muol/performer" 하나만 막았는데 robots는 접두어 매칭이라
        // 공개 프로필까지 통째로 막혀 있었다.
        // robots 표준(가장 긴 규칙이 이기고, 길이가 같으면 allow가 이긴다)에 맞춰
        // "/muol/performer/" 를 열고, 대시보드 본문과 예약자 명단만 다시 닫는다.
        //   /muol/performer              → disallow(가장 김) → 계속 차단 ✔
        //   /muol/performer/<uuid>       → allow "/muol/performer/" 가 가장 김 → 크롤 허용 ✔
        //   /muol/performer/reservations → disallow "/muol/performer/reservations" 가 가장 김 → 차단 ✔
        allow: ["/", "/muol/performer/"],
        disallow: [
          "/admin",
          "/api/",
          "/auth/callback",
          "/auth/onboarding",
          "/mypage",
          "/muol/performer",
          "/muol/performer/reservations",
          // 3층 구조 재편(2026-06-30) 때 누락된 시우스 쪽 비공개 화면 — 위 /admin·/mypage와 같은 성격
          "/syus/admin",
          "/syus/mypage",
        ],
      },
    ],
    sitemap: "https://syus.co.kr/sitemap.xml",
    host: "https://syus.co.kr",
  };
}
