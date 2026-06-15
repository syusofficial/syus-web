/**
 * 회원가입 환영 메일 — Supabase Auth 이메일 컨펌 완료 직후 1회 발송.
 *
 * 본문은 마케팅팀이 2026-06-08 잠근 초안(1,050자 4블록)을 그대로 옮긴 것이다.
 * 임의 수정 금지 — 카피 변경은 마케팅팀 요청 후 재배포.
 *
 * 디자인 토큰 (color_lock 룰 반영)
 * - 본문 배경(외곽): #F0EEE9 (크림)
 * - 카드 배경: #FFFFFF
 * - 제목·강조: #274E9B (코발트)
 * - 본문 텍스트: #4A3B33
 * - 부가 텍스트: #6B5C50
 * - CTA 버튼: #D6E58F (페일라임) — 메일 1통당 1개만
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

const LIST_ITEM = {
  fontFamily: FONT_FAMILY,
  fontSize: "14px",
  lineHeight: "1.8",
  color: "#4A3B33",
  margin: "0 0 14px",
  paddingLeft: "0",
} as const;

const LIST_DESC = {
  fontFamily: FONT_FAMILY,
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#6B5C50",
  margin: "4px 0 0",
} as const;

const LINK_STYLE = {
  color: "#274E9B",
  textDecoration: "none",
} as const;

const CTA_WRAP = {
  textAlign: "center" as const,
  margin: "32px 0 8px",
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

const SIGNATURE = {
  ...PARAGRAPH,
  marginTop: "32px",
  color: "#274E9B",
  fontWeight: 500,
} as const;

const SIGNOFF = {
  ...PARAGRAPH,
  marginTop: "8px",
  color: "#6B5C50",
} as const;

export function WelcomeEmail({ name }: Props) {
  const trimmedName = name?.trim();
  const greeting = trimmedName ? `${trimmedName}님, 안녕하세요.` : "안녕하세요.";

  return (
    <Html lang="ko">
      <Head />
      <Preview>사유유사가 운영하는 무대올림에 오신 것을 환영합니다</Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={{ ...GREETING, fontSize: "18px", fontWeight: 600 }}>
            {greeting}
          </Heading>

          <Text style={PARAGRAPH}>
            사유유사가 운영하는 무대올림에 오신 것을 환영합니다.
          </Text>
          <Text style={PARAGRAPH}>
            오늘, 어느 대학의 막이 오릅니다. 그 막을 같이 지켜봐 주실 한 분이 늘었다는 사실이
            저희에게는 작지 않은 일입니다.
          </Text>

          <Text style={SUBHEADING}>무대올림이 무엇을 하는 곳인가</Text>
          <Text style={PARAGRAPH}>
            무대올림은 한국 대학과 청년 무대의 공연 정보를 모아 두는 작은 통로입니다.
            흩어지는 무대를 모아 남기고, 거장과 신진을 같은 흐름 위에 놓고,
            시끄럽지 않은 방식으로 닿아야 할 사람에게 닿게 하려 합니다.
          </Text>

          <Text style={SUBHEADING}>다음으로 해보실 수 있는 것</Text>

          <Section>
            <Text style={LIST_ITEM}>
              <strong style={{ color: "#274E9B" }}>공연 둘러보기</strong>
              {" · "}
              <Link href="https://syus.co.kr/shows" style={LINK_STYLE}>syus.co.kr/shows</Link>
            </Text>
            <Text style={LIST_DESC}>
              이번 주, 다음 주 막이 오르는 무대를 살펴보실 수 있습니다.
            </Text>
          </Section>

          <Section style={{ marginTop: "20px" }}>
            <Text style={LIST_ITEM}>
              <strong style={{ color: "#274E9B" }}>공연자 신청</strong>
              {" · "}
              <Link href="https://syus.co.kr/performer/apply" style={LINK_STYLE}>syus.co.kr/performer/apply</Link>
            </Text>
            <Text style={LIST_DESC}>
              직접 무대를 올리시는 분이라면, 공연자 권한을 신청해 두실 수 있습니다.
              검토는 24시간 안에 마치고 따로 안내드립니다.
            </Text>
          </Section>

          <Section style={{ marginTop: "20px" }}>
            <Text style={LIST_ITEM}>
              <strong style={{ color: "#274E9B" }}>인스타그램</strong>
              {" · "}
              <Link href="https://instagram.com/syus_official" style={LINK_STYLE}>@syus_official</Link>
            </Text>
            <Text style={LIST_DESC}>
              무대 뒤의 배우 인터뷰와 짧은 기록을 이어 가고 있습니다.
              팔로우해 두시면 카드뉴스 한 장으로 먼저 만나보실 수 있습니다.
            </Text>
          </Section>

          <Section style={CTA_WRAP}>
            <Button href="https://syus.co.kr/shows" style={CTA_BUTTON}>
              공연 둘러보기
            </Button>
          </Section>

          <Text style={SUBHEADING}>함께 자라는 마음으로</Text>
          <Text style={PARAGRAPH}>
            무대올림은 아직 신생 서비스입니다.
            공연자·학과로부터 등록·게재 수수료를 받지 않으며, 광고·구독·제휴로 운영됩니다.
            부족한 부분이 보이시면 이 메일에 그대로 답장 주십시오.
            운영자 한 사람이 직접 받아 읽고, 직접 답합니다.
          </Text>

          <Text style={SIGNATURE}>깊이 머물고, 가볍게 흘려보내겠습니다.</Text>
          <Text style={SIGNOFF}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
