/**
 * 공연 반려 안내 메일 — 관리자가 사유를 적어 반려했을 때 1회 발송. 2026-09-10 신설.
 *
 * 발송 조건이 하나 있다: **사유가 비어 있으면 이 메일은 만들지 않는다.**
 *   "게시하지 못했습니다"만 적힌 메일은 받는 쪽에 아무 도움이 되지 않고,
 *   무엇을 고쳐야 다시 올릴 수 있는지 모르면 그 팀은 두 번 다시 등록하지 않는다.
 *   그래서 사유 한 줄이 이 메일의 존재 이유다(발송 판단은 app/actions/shows.ts).
 *
 * 톤
 *   반려는 거절이 아니라 "이번에는 이대로 걸지 못했다"는 보고에 가깝게 쓴다.
 *   책임을 상대에게 미루지 않고, 우리 쪽 오해 가능성을 먼저 열어 둔다.
 *   관람료·가격에 대해서는 한 글자도 말하지 않는다(무대올림 관람료 무단언 정책).
 *
 * 디자인 토큰: show-approved.tsx와 동일.
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Heading } from "../components";
import { EmailFooter } from "./footer";
import { safeGreetingName } from "../greeting";

type Props = {
  name?: string | null;
  showTitle: string;
  /** 관리자가 직접 적은 한 줄 사유. 비어 있으면 이 메일 자체를 보내지 않는다. */
  reason: string;
};

const FONT_FAMILY = "'Spoqa Han Sans Neo', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";

const BODY = {
  backgroundColor: "#F0EEE9",
  fontFamily: FONT_FAMILY,
  margin: 0,
  padding: "32px 0",
} as const;

const CONTAINER = {
  backgroundColor: "#FFFFFF",
  maxWidth: "560px",
  margin: "0 auto",
  padding: "48px 40px",
  border: "1px solid #EDE6D5",
} as const;

const GREETING = {
  fontFamily: FONT_FAMILY,
  fontSize: "18px",
  fontWeight: 600,
  lineHeight: "1.8",
  color: "#4A3B33",
  margin: "0 0 24px",
} as const;

const PARAGRAPH = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  lineHeight: "1.9",
  color: "#4A3B33",
  margin: "0 0 16px",
} as const;

const SUBHEADING = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  fontWeight: 600,
  color: "#0B5563",
  margin: "36px 0 16px",
  letterSpacing: "0.02em",
} as const;

/** 사유 박스 — 붉은 경고색 대신 본문과 같은 결의 바탕을 쓴다(질책이 아니라 안내다). */
const REASON_BOX = {
  backgroundColor: "#E6E1D6",
  borderLeft: "3px solid #5C2A42",
  padding: "20px 24px",
  margin: "20px 0 8px",
  fontFamily: FONT_FAMILY,
} as const;

const REASON_LABEL = {
  fontFamily: FONT_FAMILY,
  fontSize: "12px",
  color: "#5A4A3E",
  margin: "0 0 8px",
  letterSpacing: "0.04em",
} as const;

const REASON_TEXT = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  lineHeight: "1.9",
  color: "#3A2E27",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
} as const;

const LINK_STYLE = {
  color: "#0B5563",
  textDecoration: "none",
} as const;

const SIGNOFF = {
  ...PARAGRAPH,
  marginTop: "32px",
  color: "#5A4A3E",
} as const;

const SIGNATURE = {
  ...PARAGRAPH,
  marginTop: "8px",
  color: "#0B5563",
  fontWeight: 500,
} as const;

export function ShowRejectedEmail({ name, showTitle, reason }: Props) {
  const trimmedName = safeGreetingName(name);
  const greeting = trimmedName ? `${trimmedName}님, 안녕하세요.` : "회원님, 안녕하세요.";

  return (
    <Html lang="ko">
      <Head />
      <Preview>{`「${showTitle}」 등록을 이번에는 게시하지 못했습니다`}</Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={GREETING}>{greeting}</Heading>

          <Text style={PARAGRAPH}>
            사유유사가 운영하는 무대올림입니다.
            보내 주신 「{showTitle}」을 살펴보았습니다.
            아쉽게도 이번에는 이대로 사이트에 걸지 못했습니다.
            시간을 들여 등록해 주셨는데 이렇게 답을 드리게 되어 죄송합니다.
          </Text>

          <Text style={SUBHEADING}>이렇게 보았습니다</Text>
          <Section style={REASON_BOX}>
            <Text style={REASON_LABEL}>운영자 검토 의견</Text>
            <Text style={REASON_TEXT}>{reason}</Text>
          </Section>

          <Text style={SUBHEADING}>다시 올리시려면</Text>
          <Text style={PARAGRAPH}>
            <Link href="https://syus.co.kr/muol/performer" style={LINK_STYLE}>공연자 페이지</Link>
            의 &lsquo;등록한 공연&rsquo; 목록에서 해당 공연의 &lsquo;수정&rsquo;을 눌러 고쳐 주시면 됩니다.
            수정하신 내용은 자동으로 다시 검토 대기에 올라가며, 저희가 한 번 더 살펴봅니다.
            처음부터 다시 입력하실 필요는 없습니다.
          </Text>
          <Text style={PARAGRAPH}>
            저희가 놓쳤거나 잘못 이해한 부분이 있을 수도 있습니다.
            그렇게 보이신다면 이 메일에 그대로 답장 주십시오.
            운영자 한 사람이 직접 받아 보는 메일함으로 곧장 닿고, 다시 살펴보겠습니다.
          </Text>

          <Text style={SIGNOFF}>무대는 그대로 잘 올라가기를 바라며,</Text>
          <Text style={SIGNOFF}>정중히 인사 드립니다.</Text>
          <Text style={SIGNATURE}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default ShowRejectedEmail;
