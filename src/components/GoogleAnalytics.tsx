import Script from "next/script";

/**
 * Google Analytics 4 (GA4)
 * Vercel 환경변수 NEXT_PUBLIC_GA_ID가 「G-」로 시작하는 측정 ID일 때만 로드됩니다.
 * 예: G-XXXXXXXXXX
 *
 * 2026-10-12 안전장치: 이 칸에 사이트 주소(https://syus.co.kr)가 잘못 들어가
 * 라이브에 `gtag/js?id=https://syus.co.kr`가 실리고 수집이 0이던 사고가 있었다.
 * 형식이 맞지 않으면 엉터리 스크립트를 싣지 않고 아예 넣지 않는다.
 * (값이 인라인 스크립트 안에 그대로 들어가므로, 형식 검사는 주입 방지 역할도 한다.)
 */
const GA_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

export default function GoogleAnalytics() {
  const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();
  if (!GA_ID_PATTERN.test(GA_ID)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
