import type { NextConfig } from "next";

const SUPABASE_HOST = "mmosvdjautcliafinahd.supabase.co";

/** Content Security Policy - 사이트에서 로드·실행 가능한 리소스를 제한 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.clarity.ms https://c.clarity.ms https://scripts.clarity.ms;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://spoqa.github.io;
  font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://spoqa.github.io data:;
  img-src 'self' data: blob: https://${SUPABASE_HOST} https://placehold.co https://images.unsplash.com https://www.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms;
  connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms https://cdn.jsdelivr.net;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy",   value: ContentSecurityPolicy },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control",    value: "on" },
];

const nextConfig: NextConfig = {
  // 2026-06-30 3층 구조 재편: 무대올림이 루트(/)에서 /muol/* 아래로 이동.
  // 기존 외부 링크·검색 유입(102개 학과 아웃리치 등)이 끊기지 않도록 영구 리다이렉트(308).
  // ⚠ 루트 "/"는 게이트웨이가 되므로 절대 source에 넣지 않는다(리다이렉트 루프 방지).
  // :path* 는 부모 경로까지 매치(/shows, /shows/calendar, /shows/<id> 모두 커버), 쿼리스트링은 자동 보존.
  async redirects() {
    return [
      { source: "/shows/:path*", destination: "/muol/shows/:path*", permanent: true },
      { source: "/performer/:path*", destination: "/muol/performer/:path*", permanent: true },
      { source: "/archive", destination: "/muol/archive", permanent: true },
      { source: "/universities", destination: "/muol/universities", permanent: true },
      { source: "/about", destination: "/muol/about", permanent: true },
      { source: "/contact", destination: "/muol/contact", permanent: true },
      { source: "/for-business", destination: "/muol/for-business", permanent: true },
      { source: "/faq", destination: "/muol/faq", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
