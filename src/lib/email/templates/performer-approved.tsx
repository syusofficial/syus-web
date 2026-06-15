/**
 * 공연자 등록 승인 메일 — 관리자가 승인 처리 직후 1회 발송.
 *
 * 본문은 마케팅팀이 2026-06-08 잠근 초안(750자 3블록)을 그대로 옮긴 것이다.
 * 임의 수정 금지 — 카피 변경은 마케팅팀 요청 후 재배포.
 *
 * 디자인 토큰: welcome.tsx와 동일.
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Button, Heading } from "@react-email/components";
import { EmailFooter } from "./footer";

type Props = {
  name?: string | null;
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
  fontSize: "16px",
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
  color: "#274E9B",
  margin: "36px 0 16px",
  letterSpacing: "0.02em",
} as const;

const LINK_STYLE = {
  color: "#274E9B",
  textDecoration: "none",
} as const;

const CTA_WRAP = {
  textAlign: "center" as const,
  margin: "28px 0 8px",
} as const;

const CTA_BUTTON = {
  backgroundColor: "#D6E58F",
  color: "#4A3B33",
  fontFamily: FONT_FAMILY,
  fontSize: "14px",
  fontWeight: 600,
  padding: "14px 32px",
  textDecoration: "none",
  display: "inline-block",
  letterSpacing: "0.02em",
} as const;

const SIGNOFF = {
  ...PARAGRAPH,
  marginTop: "32px",
  color: "#6B5C50",
} as const;

const SIGNATURE = {
  ...PARAGRAPH,
  marginTop: "8px",
  color: "#274E9B",
  fontWeight: 500,
} as const;

export function PerformerApprovedEmail({ name }: Props) {
  const trimmedName = name?.trim();
  const greeting = trimmedName ? `${trimmedName}님, 안녕하세요.` : "안녕하세요.";
  const closingLine = trimmedName
    ? `${trimmedName}님의 무대가 한 사람의 주말이 되기를 바라며,`
    : "당신의 무대가 한 사람의 주말이 되기를 바라며,";

  return (
    <Html lang="ko">
      <Head />
      <Preview>공연자 등록이 승인되었습니다</Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={{ ...GREETING, fontSize: "18px", fontWeight: 600 }}>
            {greeting}
          </Heading>

          <Text style={PARAGRAPH}>
            사유유사가 운영하는 무대올림입니다.
            신청해 주신 공연자 등록이 승인되었습니다. 검토에 시간을 내어 주셔서 감사합니다.
          </Text>

          <Text style={SUBHEADING}>이제 하실 수 있는 일</Text>
          <Text style={PARAGRAPH}>
            오늘부터 공연자 페이지에서 직접 무대를 올리실 수 있습니다.
            {" "}
            <Link href="https://syus.co.kr/performer" style={LINK_STYLE}>syus.co.kr/performer</Link>
          </Text>
          <Text style={PARAGRAPH}>
            공연 등록은 폼 한 번으로 끝납니다. 등록해 주신 무대는 운영자가 24시간 안에
            한 번 더 살펴본 뒤 사이트와 카드뉴스 후보로 함께 흐릅니다.
            사진·줄거리·일정이 미리 정리되어 있으면 한 번에 마칠 수 있습니다.
          </Text>

          <Section style={CTA_WRAP}>
            <Button href="https://syus.co.kr/performer" style={CTA_BUTTON}>
              공연자 페이지로
            </Button>
          </Section>

          <Text style={SUBHEADING}>몇 가지 작은 약속</Text>
          <Text style={PARAGRAPH}>
            공연팀 게재료 없음 — 무대를 올리시는 쪽에서는 어떤 비용도 받지 않습니다.
            운영자 한 사람이 직접 받아 보는 메일함이 있습니다. 이 메일에 그대로 답장 주시면
            저(이혁호)에게 바로 닿습니다. 무대 정보·수정·삭제·문의 모두 같은 자리에서 받습니다.
          </Text>
          <Text style={PARAGRAPH}>
            원하시면 인스타그램{" "}
            <Link href="https://instagram.com/syus_official" style={LINK_STYLE}>@syus_official</Link>
            {" "}도 살펴봐 주십시오.
            무대 뒤의 배우 한 분 한 분을 짧은 카드뉴스로 옮겨 두고 있습니다.
          </Text>

          <Text style={SIGNOFF}>{closingLine}</Text>
          <Text style={SIGNOFF}>정중히 인사 드립니다.</Text>
          <Text style={SIGNATURE}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default PerformerApprovedEmail;
