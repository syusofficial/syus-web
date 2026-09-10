/**
 * 공연 게시(승인) 안내 메일 — 관리자가 공연을 승인한 직후 1회 발송. 2026-09-10 신설.
 *
 * 왜 필요했나
 *   그전까지 승인은 admin 페이지에서 shows.status만 바꾸는 한 줄이었다. 공연팀은
 *   자기 무대가 사이트에 걸렸는지 알려면 다시 로그인해 확인해야 했고, 결국
 *   "언제부터 홍보해도 되는지"를 아무도 알려 주지 않는 상태였다.
 *   그래서 이 메일의 핵심은 축하 인사가 아니라 **주소 한 줄**이다.
 *   공연팀이 그 주소를 학과 SNS·단체 대화방에 그대로 옮길 수 있어야 한다.
 *
 * 톤
 *   광고형 어휘 금지(주목·지금 바로·놓치지 마세요). 자기를 낮추는 정중함.
 *   관람료·가격에 대해서는 한 글자도 말하지 않는다(무대올림 관람료 무단언 정책).
 *
 * 디자인 토큰: performer-approved.tsx와 동일 — 배경 #F0EEE9 / 본문 먹빛 #4A3B33 /
 * 누르는 것·링크 청록 #0B5563 / 결심(CTA) 자두 #5C2A42.
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Button, Heading } from "../components";
import { EmailFooter } from "./footer";
import { safeGreetingName } from "../greeting";

type Props = {
  name?: string | null;
  showTitle: string;
  /** 공연 상세 주소를 만드는 데 쓴다 — https://syus.co.kr/muol/shows/{showId} */
  showId: string;
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

/** 주소를 눈에 띄게 — 이 메일에서 가장 중요한 한 줄이라 박스로 뽑는다. */
const URL_BOX = {
  backgroundColor: "#E6E1D6",
  padding: "20px 24px",
  margin: "20px 0 8px",
  fontFamily: FONT_FAMILY,
} as const;

const URL_LABEL = {
  fontFamily: FONT_FAMILY,
  fontSize: "12px",
  color: "#5A4A3E",
  margin: "0 0 6px",
  letterSpacing: "0.04em",
} as const;

const URL_TEXT = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  fontWeight: 600,
  color: "#0B5563",
  margin: 0,
  wordBreak: "break-all" as const,
} as const;

const LINK_STYLE = {
  color: "#0B5563",
  textDecoration: "none",
} as const;

const CTA_WRAP = {
  textAlign: "center" as const,
  margin: "28px 0 8px",
} as const;

const CTA_BUTTON = {
  backgroundColor: "#5C2A42",
  color: "#F0EEE9",
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
  color: "#5A4A3E",
} as const;

const SIGNATURE = {
  ...PARAGRAPH,
  marginTop: "8px",
  color: "#0B5563",
  fontWeight: 500,
} as const;

export function ShowApprovedEmail({ name, showTitle, showId }: Props) {
  const trimmedName = safeGreetingName(name);
  const greeting = trimmedName ? `${trimmedName}님, 안녕하세요.` : "회원님, 안녕하세요.";
  const showUrl = `https://syus.co.kr/muol/shows/${showId}`;

  return (
    <Html lang="ko">
      <Head />
      <Preview>{`「${showTitle}」이 무대올림에 게시되었습니다`}</Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={GREETING}>{greeting}</Heading>

          <Text style={PARAGRAPH}>
            사유유사가 운영하는 무대올림입니다.
            보내 주신 「{showTitle}」이 검토를 마치고 오늘부터 사이트에 걸렸습니다.
            무대를 맡겨 주셔서 감사합니다.
          </Text>

          <Text style={SUBHEADING}>공연 주소</Text>
          <Section style={URL_BOX}>
            <Text style={URL_LABEL}>이 공연이 걸린 자리</Text>
            <Text style={URL_TEXT}>
              <Link href={showUrl} style={LINK_STYLE}>{showUrl}</Link>
            </Text>
          </Section>
          <Text style={PARAGRAPH}>
            이 주소를 학과 SNS나 단체 대화방에 그대로 올리셔도 됩니다.
            저희에게 미리 알리실 것도, 허락을 받으실 것도 없습니다.
            주소 하나만 옮겨 두시면 포스터·일정·장소가 함께 따라갑니다.
          </Text>

          <Section style={CTA_WRAP}>
            <Button href={showUrl} style={CTA_BUTTON}>
              공연 페이지 열어 보기
            </Button>
          </Section>

          <Text style={SUBHEADING}>바뀐 것이 생기면</Text>
          <Text style={PARAGRAPH}>
            공연 시간이나 날짜가 바뀌면{" "}
            <Link href="https://syus.co.kr/muol/performer" style={LINK_STYLE}>공연자 페이지</Link>
            에서 직접 고치실 수 있습니다.
            날짜·시간처럼 사실을 정정하는 수정은 게시가 그대로 유지된 채 바로 반영되니,
            공연 직전이라도 마음 놓고 고쳐 주십시오.
          </Text>
          <Text style={PARAGRAPH}>
            그 밖에 물으실 것이 있으면 이 메일에 그대로 답장 주시면 됩니다.
            운영자 한 사람이 직접 받아 보는 메일함으로 곧장 닿습니다.
          </Text>

          <Text style={SIGNOFF}>무대가 잘 흘러가기를 바라며,</Text>
          <Text style={SIGNOFF}>정중히 인사 드립니다.</Text>
          <Text style={SIGNATURE}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default ShowApprovedEmail;
