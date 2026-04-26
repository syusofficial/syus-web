import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/auth/callback", "/auth/onboarding", "/mypage", "/performer"],
      },
    ],
    sitemap: "https://syus.co.kr/sitemap.xml",
    host: "https://syus.co.kr",
  };
}
