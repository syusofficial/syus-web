import Link from "next/link";
import { COMPANY_ROWS } from "@/lib/company";

/**
 * 시우스 전용 푸터 — 흰 캔버스 톤(무대올림의 다크 푸터와 분리).
 * 법적/사업자 정보는 사유유사 SYUS(등록 상호) 그대로, 브랜딩·링크는 시우스.
 */

const STAGES = [
  { href: "/syus/proscenium", label: "주인장 견해글" },
  { href: "/syus/thrust", label: "연기 고민 QnA" },
  { href: "/syus/arena", label: "자유 커뮤니티" },
  { href: "/syus/blackbox", label: "관람의 잔상" },
  { href: "/syus/flex", label: "창작 독백 아카이브" },
  { href: "/syus/corridor", label: "책 서재" },
];

// 2026-08-03: 하드코딩 폐기 → 사업자 정보 단일 정본(@/lib/company) 참조.
// 여기 주소가 "경기 남양주시 진접읍 엠타워 E-35호"로 도로명·층·호가 빠진 축약형이라
// 메일 푸터에 적힌 주소와 서로 달랐다.
const BIZ = COMPANY_ROWS;

export default function SyusFooter() {
  return (
    <footer className="syf">
      <div className="syf-inner">
        <div className="syf-top">
          <div className="syf-brand">
            <span className="syf-mark" aria-hidden="true" />
            <p className="syf-name">시우스 <span>SYUS</span></p>
            <p className="syf-run">운영 · 사유유사 SYUS</p>
            <p className="syf-desc">연기를 기록하고, 고민을 나누고, 무대를 오래 들여다보는 커뮤니티. 손으로 짓는 예술, 연기를 곁에 둡니다.</p>
          </div>

          <nav className="syf-col">
            <p className="syf-col-h">여섯 무대</p>
            {STAGES.map((s) => (
              <Link key={s.href} href={s.href} className="syf-link">{s.label}</Link>
            ))}
          </nav>

          <nav className="syf-col">
            <p className="syf-col-h">둘러보기</p>
            <Link href="/syus/about" className="syf-link">시우스란</Link>
            <Link href="/syus/mypage" className="syf-link">내 시우스</Link>
            <Link href="/muol" className="syf-link">무대올림</Link>
            <Link href="/" className="syf-link">사유유사 갈림길</Link>
            <a href="https://www.instagram.com/syus_official" target="_blank" rel="noopener noreferrer" className="syf-link">Instagram @syus_official</a>
            <a href="https://pf.kakao.com/_xkPVTX" target="_blank" rel="noopener noreferrer" className="syf-link">카카오톡 채널</a>
          </nav>
        </div>

        <div className="syf-biz">
          {BIZ.map((b) => (
            <div key={b.label} className="syf-biz-row">
              <span className="syf-biz-label">{b.label}</span>
              <span className="syf-biz-value">{b.value}</span>
            </div>
          ))}
        </div>

        <div className="syf-bottom">
          <div className="syf-policy">
            <Link href="/terms" className="syf-policy-link">이용약관</Link>
            <Link href="/privacy" className="syf-policy-link is-strong">개인정보처리방침</Link>
          </div>
          <p className="syf-copy">© 2026 시우스 · 운영: 사유유사 SYUS. 깊이 머물고, 가볍게 흘려보냅니다.</p>
        </div>
      </div>

      <style>{`
        .syf { position: relative; margin-top: 80px; border-top: 1px solid #E7E1D6; background: rgba(252,251,249,0.6); }
        .syf-inner { max-width: 68rem; margin: 0 auto; padding: 56px clamp(24px, 5vw, 56px) 48px; }
        .syf-top { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: clamp(24px, 4vw, 56px); margin-bottom: 40px; }
        .syf-brand { max-width: 24rem; }
        .syf-mark { display: block; width: 128px; height: 52px; margin-bottom: 12px; background: url('/wm-syus-mark.png') no-repeat left center; background-size: contain; }
        .syf-name { font-family: var(--font-noto-serif-kr); font-size: 1.3rem; font-weight: 700; color: #241C18; }
        .syf-name span { font-family: var(--font-inter); font-size: 0.72rem; letter-spacing: 0.28em; color: #0B5563; margin-left: 6px; }
        .syf-run { font-family: var(--font-inter); font-size: 0.66rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 600; color: #A79E90; margin: 6px 0 14px; }
        .syf-desc { font-family: var(--font-noto-sans-kr); font-size: 0.9rem; line-height: 1.75; font-weight: 300; color: #5A4A3E; word-break: keep-all; }

        .syf-col { display: flex; flex-direction: column; gap: 10px; }
        .syf-col-h { font-family: var(--font-inter); font-size: 0.66rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 600; color: #A79E90; margin-bottom: 4px; }
        .syf-link { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; color: #4A3B33; text-decoration: none; transition: color 0.2s ease; }
        .syf-link:hover { color: #0B5563; }

        .syf-biz { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; padding: 24px 0; border-top: 1px solid #E7E1D6; }
        .syf-biz-row { display: flex; gap: 12px; }
        .syf-biz-label { flex: 0 0 96px; font-family: var(--font-noto-sans-kr); font-size: 0.76rem; color: #A79E90; }
        .syf-biz-value { font-family: var(--font-noto-sans-kr); font-size: 0.76rem; color: #5A4A3E; word-break: keep-all; }

        .syf-bottom { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding-top: 22px; border-top: 1px solid #E7E1D6; }
        .syf-policy { display: flex; gap: 18px; }
        .syf-policy-link { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; color: #8A7D6E; text-decoration: none; }
        .syf-policy-link.is-strong { color: #241C18; font-weight: 600; }
        .syf-policy-link:hover { color: #0B5563; }
        .syf-copy { font-family: var(--font-noto-sans-kr); font-size: 0.76rem; color: #A79E90; }

        @media (max-width: 760px) {
          .syf-top { grid-template-columns: 1fr; gap: 32px; }
          .syf-biz { grid-template-columns: 1fr; }
        }
      `}</style>
    </footer>
  );
}
