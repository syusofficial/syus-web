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
import { josa } from "../josa";

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
  margin: "0 0 28px",
  wordBreak: "keep-all",
} as const;

/* 2026-09-10 사장님 지시 — 문단 가독성 손질.
 * 메일은 대부분 폰에서 열린다. 그전에는 한 문단에 문장이 서넛씩 붙어 있어 화면에서
 * 예닐곱 줄짜리 덩어리가 됐고, 어디서 숨을 쉬어야 할지 눈이 잡지 못했다.
 * 두 가지를 바꿨다 — (1) 문단을 의미 단위로 쪼갰고 (2) 줄·문단 간격을 넓혔다.
 *   lineHeight 1.9 → 2.0  : 한글은 받침이 있어 라틴 문자보다 줄 간격이 더 필요하다
 *   문단 간격 16 → 22px   : 글자 크기(15px)보다 넉넉해야 문단이 문단으로 읽힌다
 *   wordBreak: keep-all   : 한글 단어가 줄 끝에서 쪼개지지 않게 (지원하는 클라이언트에서만 적용, 무해) */
const PARAGRAPH = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  lineHeight: "2.0",
  color: "#4A3B33",
  margin: "0 0 22px",
  wordBreak: "keep-all",
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

/* 맺음말 두 줄("무대가 잘 흘러가기를 바라며," / "정중히 인사 드립니다.")은 한 호흡이다.
 * 그전에는 두 줄 다 본문 문단과 같은 아래 여백을 받아 서로 48px씩 떨어져 따로 놀았다.
 * 줄 사이는 좁히고, 본문과의 거리는 첫 줄에만 준다. */
const SIGNOFF = {
  ...PARAGRAPH,
  margin: "0 0 4px",
  color: "#5A4A3E",
} as const;

const SIGNOFF_FIRST = {
  ...SIGNOFF,
  marginTop: "40px",
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
      <Preview>{`「${showTitle}」${josa(showTitle, "이")} 무대올림에 게시되었습니다`}</Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={GREETING}>{greeting}</Heading>

          {/* 소식을 먼저, 인사는 그다음 줄에. 한 덩어리로 붙여 놓으면 가장 중요한
              "걸렸습니다"가 문장들 사이에 묻힌다. */}
          <Text style={PARAGRAPH}>
            사유유사가 운영하는 무대올림입니다.
            보내 주신 「{showTitle}」{josa(showTitle, "이")} 검토를 마치고 오늘부터 사이트에 걸렸습니다.
          </Text>

          <Text style={PARAGRAPH}>
            무대를 맡겨 주셔서 감사합니다.
          </Text>

          <Text style={SUBHEADING}>공연 주소</Text>
          <Section style={URL_BOX}>
            <Text style={URL_LABEL}>이 공연이 걸린 자리</Text>
            <Text style={URL_TEXT}>
              <Link href={showUrl} style={LINK_STYLE}>{showUrl}</Link>
            </Text>
          </Section>
          {/* "올려도 된다 / 허락 필요 없다"가 한 묶음, "그러면 이런 일이 따라온다"가 다음 묶음. */}
          <Text style={PARAGRAPH}>
            이 주소를 학과 SNS나 단체 대화방에 그대로 올리셔도 됩니다.
            저희에게 미리 알리실 것도, 허락을 받으실 것도 없습니다.
          </Text>

          <Text style={PARAGRAPH}>
            주소 하나만 옮겨 두시면 포스터와 일정, 장소가 함께 따라갑니다.
          </Text>

          <Section style={CTA_WRAP}>
            <Button href={showUrl} style={CTA_BUTTON}>
              공연 페이지 열어 보기
            </Button>
          </Section>

          <Text style={SUBHEADING}>바뀐 것이 생기면</Text>
          {/* "고칠 수 있다"(방법)와 "고쳐도 안 내려간다"(안심)는 다른 이야기라 문단을 나눈다.
              뒤엣것이 공연팀이 가장 걱정하는 대목이므로 혼자 서 있는 편이 눈에 걸린다. */}
          <Text style={PARAGRAPH}>
            공연 시간이나 날짜가 바뀌면{" "}
            <Link href="https://syus.co.kr/muol/performer" style={LINK_STYLE}>공연자 페이지</Link>
            에서 직접 고치실 수 있습니다.
          </Text>

          <Text style={PARAGRAPH}>
            날짜와 시간처럼 사실을 바로잡는 수정은 게시가 그대로 유지된 채 반영됩니다.
            공연이 코앞이라도 마음 놓고 고쳐 주십시오.
          </Text>

          <Text style={PARAGRAPH}>
            그 밖에 물으실 것이 있으면 이 메일에 그대로 답장 주시면 됩니다.
            운영자 한 사람이 직접 받아 보는 메일함으로 곧장 닿습니다.
          </Text>

          <Text style={SIGNOFF_FIRST}>무대가 잘 흘러가기를 바라며,</Text>
          <Text style={SIGNOFF}>정중히 인사 드립니다.</Text>
          <Text style={SIGNATURE}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default ShowApprovedEmail;
