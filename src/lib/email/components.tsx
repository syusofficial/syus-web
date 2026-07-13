/**
 * 사내 경량 이메일 컴포넌트 모음.
 *
 * `@react-email/components`(0.0.x~1.0.x, 그 아래 개별 패키지 전부 포함)가
 * 2026-04 이후 npm에서 "Package no longer supported"로 전량 지원 종료됐다.
 * (npm이 안내하는 후속 경로는 `react-email` 통합 패키지(v6)지만, 그 패키지는
 * 이메일 미리보기 CLI용 무거운 개발 의존성(esbuild·chokidar·socket.io·
 * tailwindcss·prismjs·marked)까지 한 묶음으로 끌고 들어와 서버리스 프로덕션
 * 함수 번들에 넣기엔 부적합하다고 판단했다.)
 *
 * 실제로 쓰는 태그는 11개뿐이라, 원본 `@react-email/*` 각 패키지의 렌더링
 * 로직(Outlook 호환 테이블 래핑, 버튼 MSO 패딩 보정, Preview 프리헤더 트릭 등)을
 * 그대로 가져와 외부 의존성 없는 순수 React 컴포넌트로 옮겨 둔 것이다.
 *
 * 발송 자체는 여전히 `resend` 패키지가 내부적으로 쓰는 `@react-email/render`가
 * 렌더링한다(그 패키지는 deprecated 아님 — resend 자신의 의존성으로 계속 유지된다.
 * 우리는 그 패키지를 직접 import하지 않는다).
 *
 * 새 태그가 필요해지면 여기에 추가한다. 외부 이메일 컴포넌트 패키지를
 * 다시 설치하지 않는다.
 */
import type { CSSProperties, ReactNode } from "react";

type Props<T = object> = T & {
  style?: CSSProperties;
  children?: ReactNode;
};

export function Html({ children, lang = "ko", dir = "ltr" }: Props<{ lang?: string; dir?: string }>) {
  return (
    <html lang={lang} dir={dir}>
      {children}
    </html>
  );
}

export function Head({ children }: { children?: ReactNode }) {
  return (
    <head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="x-apple-disable-message-reformatting" />
      {children}
    </head>
  );
}

const PREVIEW_MAX_LENGTH = 150;
// Gmail 등은 본문 앞 100~150자를 미리보기로 끌어온다. Preview 텍스트가 짧으면
// 그 뒤에 이어지는 실제 본문 글자가 미리보기에 섞여 나오므로, 보이지 않는
// 공백 문자를 채워 넣어 150자를 맞춘다(react-email의 Preview 컴포넌트와 동일 기법).
const INVISIBLE_PAD = " ‌​‍‎‏﻿";

export function Preview({ children = "" }: { children?: ReactNode }) {
  const raw = Array.isArray(children) ? children.join("") : String(children);
  const text = raw.slice(0, PREVIEW_MAX_LENGTH);
  const padCount = PREVIEW_MAX_LENGTH - text.length;
  return (
    <div style={{ display: "none", overflow: "hidden", lineHeight: "1px", opacity: 0, maxHeight: 0, maxWidth: 0 }}>
      {text}
      {padCount > 0 ? <div>{INVISIBLE_PAD.repeat(padCount)}</div> : null}
    </div>
  );
}

export function Body({ children, style }: Props) {
  // 배경색만 <body>에 남기고 실제 여백·패딩은 안쪽 <td>로 옮긴다.
  // Outlook 등 일부 클라이언트가 <body>에 준 margin/padding을 무시하는 문제 회피.
  const bodyStyle: CSSProperties = {
    background: style?.background,
    backgroundColor: style?.backgroundColor,
    margin: style?.margin !== undefined ? 0 : undefined,
    padding: style?.padding !== undefined ? 0 : undefined,
  };
  return (
    <body style={bodyStyle}>
      <table border={0} width="100%" cellPadding={0} cellSpacing={0} role="presentation" align="center">
        <tbody>
          <tr>
            <td style={style}>{children}</td>
          </tr>
        </tbody>
      </table>
    </body>
  );
}

export function Container({ children, style }: Props) {
  return (
    <table
      align="center"
      width="100%"
      border={0}
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ maxWidth: "37.5em", ...style }}
    >
      <tbody>
        <tr style={{ width: "100%" }}>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function Section({ children, style }: Props) {
  return (
    <table align="center" width="100%" border={0} cellPadding={0} cellSpacing={0} role="presentation" style={style}>
      <tbody>
        <tr>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function Text({ children, style }: Props) {
  return (
    <p style={{ fontSize: "14px", lineHeight: "24px", marginTop: "16px", marginBottom: "16px", ...style }}>
      {children}
    </p>
  );
}

export function Link({ children, href, style, target = "_blank" }: Props<{ href?: string; target?: string }>) {
  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      style={{ color: "#067df7", textDecoration: "none", ...style }}
    >
      {children}
    </a>
  );
}

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function Heading({ as: Tag = "h1", children, style }: Props<{ as?: HeadingTag }>) {
  return <Tag style={style}>{children}</Tag>;
}

export function Hr({ style }: Props) {
  return <hr style={{ width: "100%", border: "none", borderTop: "1px solid #eaeaea", ...style }} />;
}

// --- 버튼: Outlook(mso)에서도 좌우 패딩이 무너지지 않도록 하는 보정 계산 ---
// (원본 @react-email/button 로직을 그대로 옮김)
function parsePaddingPx(value: CSSProperties["padding"]): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const match = /^([\d.]+)px$/.exec(value.trim());
  return match ? Number.parseFloat(match[1]) : 0;
}

function msoFontWidthAndSpaceCount(expectedWidth: number): [width: number, spaces: number] {
  if (expectedWidth === 0) return [0, 0];
  let spaceCount = 0;
  const requiredFontWidth = () => (spaceCount > 0 ? expectedWidth / spaceCount / 2 : Number.POSITIVE_INFINITY);
  while (requiredFontWidth() > 5) spaceCount++;
  return [requiredFontWidth(), spaceCount];
}

export function Button({ children, href, style, target = "_blank" }: Props<{ href?: string; target?: string }>) {
  const paddingLeft = parsePaddingPx(style?.paddingLeft ?? style?.padding);
  const paddingRight = parsePaddingPx(style?.paddingRight ?? style?.padding);
  const [plWidth, plSpaces] = msoFontWidthAndSpaceCount(paddingLeft);
  const [prWidth, prSpaces] = msoFontWidthAndSpaceCount(paddingRight);

  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      style={{ lineHeight: "100%", textDecoration: "none", display: "inline-block", maxWidth: "100%", ...style }}
    >
      <span
        dangerouslySetInnerHTML={{
          __html: `<!--[if mso]><i style="mso-font-width:${plWidth * 100}%" hidden>${"&#8202;".repeat(plSpaces)}</i><![endif]-->`,
        }}
      />
      <span style={{ maxWidth: "100%", display: "inline-block", lineHeight: "120%" }}>{children}</span>
      <span
        dangerouslySetInnerHTML={{
          __html: `<!--[if mso]><i style="mso-font-width:${prWidth * 100}%" hidden>${"&#8202;".repeat(prSpaces)}&#8203;</i><![endif]-->`,
        }}
      />
    </a>
  );
}
