import Link from "next/link";
import { COMPANY, COMPANY_ROWS } from "@/lib/company";

/**
 * 게이트웨이(/) 전용 사업자 정보 띠 — 2026-08-19 신설.
 *
 * 왜 필요했나
 *   루트 "/"는 무대올림 푸터(components/Footer)를 pathname 가드로 숨기고,
 *   시우스 푸터는 /syus 레이아웃에만 있다. 그래서 **사이트의 첫 화면에만
 *   사업자 정보와 이용약관 링크가 통째로 없었다.**
 *   전자상거래법 §10①은 상호·대표자·주소·전화·이메일·사업자등록번호·이용약관과
 *   시행령 §10의 호스팅서비스 제공자 상호를 "초기화면"에 표시하도록 정한다.
 *
 * 설계
 *   두 개의 문(100svh)은 손대지 않는다. 문 아래에 얇은 띠로 덧붙여
 *   기존 게이트웨이 구도를 그대로 둔 채 표시 의무만 채운다.
 *   서버 컴포넌트 — 클라이언트 JS 0. 문구는 담백하게, 광고형 어휘 없음.
 *
 * 색 — 잠금 4색 위계
 *   바탕 Cloud Dancer #F0EEE9 / 읽는 것 Silhouette 계열 / 누르는 것 Teal #0B5563
 */
export default function LegalStrip() {
  return (
    <section className="gwl" aria-label="사업자 정보">
      <div className="gwl-inner">
        <p className="gwl-brand">
          사유유사 SYUS<span className="gwl-brand-sub">무대올림 · 시우스 운영</span>
        </p>

        <div className="gwl-rows">
          {COMPANY_ROWS.map((row) => (
            <span key={row.label} className="gwl-row">
              <span className="gwl-label">{row.label}</span>
              <span className="gwl-value">{row.value}</span>
            </span>
          ))}
        </div>

        <div className="gwl-bottom">
          <div className="gwl-policy">
            <Link href="/terms" className="gwl-link">이용약관</Link>
            <Link href="/privacy" className="gwl-link is-strong">개인정보처리방침</Link>
            <Link href="/muol/contact" className="gwl-link">1:1 문의</Link>
          </div>
          <p className="gwl-copy">© 2026 {COMPANY.name} SYUS. 두루 생각하여, 이를 무대 위에서 흘려보냅니다.</p>
        </div>
      </div>

      <style>{`
        .gwl { background: #F0EEE9; border-top: 1px solid #E0DBD0; }
        .gwl-inner { max-width: 68rem; margin: 0 auto; padding: 32px clamp(20px, 5vw, 56px) 36px; }

        .gwl-brand {
          font-family: var(--font-noto-serif-kr);
          font-size: 0.92rem;
          font-weight: 700;
          color: #4A3B33;
          margin-bottom: 14px;
        }
        .gwl-brand-sub {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.72rem;
          font-weight: 400;
          color: #8A7D6E;
          margin-left: 10px;
        }

        .gwl-rows { display: flex; flex-wrap: wrap; gap: 4px 20px; margin-bottom: 20px; }
        .gwl-row { display: inline-flex; gap: 7px; }
        .gwl-label { font-family: var(--font-noto-sans-kr); font-size: 0.74rem; color: #8A7D6E; }
        .gwl-value { font-family: var(--font-noto-sans-kr); font-size: 0.74rem; color: #5A4A3E; word-break: keep-all; }

        .gwl-bottom {
          display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
          gap: 12px; padding-top: 18px; border-top: 1px solid #E7E1D6;
        }
        .gwl-policy { display: flex; flex-wrap: wrap; gap: 18px; }
        .gwl-link {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.78rem;
          color: #5A4A3E;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .gwl-link.is-strong { color: #241C18; font-weight: 600; }
        .gwl-link:hover { color: #0B5563; }
        .gwl-link:focus-visible { outline: 2px solid #0B5563; outline-offset: 3px; border-radius: 2px; }
        .gwl-link:active { color: #5C2A42; }
        .gwl-copy { font-family: var(--font-noto-sans-kr); font-size: 0.72rem; color: #A79E90; }

        @media (max-width: 640px) {
          .gwl-rows { flex-direction: column; gap: 5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gwl-link { transition: none; }
        }
      `}</style>
    </section>
  );
}
