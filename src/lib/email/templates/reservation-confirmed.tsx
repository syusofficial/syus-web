/**
 * 좌석 신청 확정 메일 — submit_reservation RPC가 'confirmed'를 반환했을 때 발송.
 * 디자인 토큰: performer-approved.tsx와 동일.
 */
import { Html, Head, Preview, Body, Container, Section, Text, Heading } from "@react-email/components";
import { EmailFooter } from "./footer";

type Props = {
  name?: string | null;
  showTitle: string;
  code: string;
  partySize: number;
};

const FONT_FAMILY = "'Spoqa Han Sans Neo', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";

const BODY = { backgroundColor: "#F0EEE9", fontFamily: FONT_FAMILY, margin: 0, padding: "32px 0" } as const;
const CONTAINER = {
  backgroundColor: "#FFFFFF",
  maxWidth: "560px",
  margin: "0 auto",
  padding: "48px 40px",
  border: "1px solid #EDE6D5",
} as const;
const GREETING = { fontFamily: FONT_FAMILY, fontSize: "18px", fontWeight: 600, color: "#4A3B33", margin: "0 0 24px" } as const;
const PARAGRAPH = { fontFamily: FONT_FAMILY, fontSize: "15px", lineHeight: "1.9", color: "#4A3B33", margin: "0 0 16px" } as const;
const CODE_BOX = {
  backgroundColor: "#E6E1D6",
  padding: "20px 24px",
  margin: "24px 0",
  fontFamily: FONT_FAMILY,
} as const;
const CODE_LABEL = { fontSize: "12px", color: "#6B5C50", margin: "0 0 6px", letterSpacing: "0.04em" } as const;
const CODE_TEXT = { fontSize: "22px", fontWeight: 700, color: "#0B5563", margin: 0, letterSpacing: "0.02em" } as const;
const SIGNOFF = { ...PARAGRAPH, marginTop: "32px", color: "#6B5C50" } as const;

export function ReservationConfirmedEmail({ name, showTitle, code, partySize }: Props) {
  const trimmedName = name?.trim();
  const greeting = trimmedName ? `${trimmedName}님, 안녕하세요.` : "안녕하세요.";

  return (
    <Html lang="ko">
      <Head />
      <Preview>{`「${showTitle}」 좌석 신청이 확정되었습니다`}</Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={GREETING}>{greeting}</Heading>
          <Text style={PARAGRAPH}>
            무대올림입니다. 「{showTitle}」 좌석 신청이 확정되었습니다({partySize}명).
          </Text>
          <Section style={CODE_BOX}>
            <Text style={CODE_LABEL}>신청번호</Text>
            <Text style={CODE_TEXT}>{code}</Text>
          </Section>
          <Text style={PARAGRAPH}>
            이 신청은 좌석을 희망하신다는 접수이며, 실제 입장은 공연팀·학교 현장 안내를 따릅니다.
            취소는 신청번호와 연락처로 syus.co.kr/reservations 에서 직접 하실 수 있습니다.
          </Text>
          <Text style={SIGNOFF}>무대에서 뵙기를 바라며,</Text>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default ReservationConfirmedEmail;
