/**
 * 관심 공연 알림 메일 — 사용자가 좋아요한 공연이 D-3 / D-1 시점에 도달했을 때 발송.
 *
 * 트리거 (cron)
 * - 매일 03:00 KST, /api/cron/show-reminders 가 실행
 * - likes ⨝ shows (status='approved') 조인하여
 *   schedule_start - now() 가 3일·1일 경계에 닿는 항목을 수집
 * - 사용자 단위로 묶어 한 통의 메일에 다중 공연 카드 형태로 발송
 *
 * 톤
 * - 마케팅팀 톤(사색·자기 낮춤). "놓치지 마세요"·"지금 바로" 금지.
 * - 본문은 한 문장으로 짧게. 카드 1~3개. CTA는 메일 1통당 1개.
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Button, Heading } from "@react-email/components";
import { EmailFooter } from "./footer";

type ReminderShow = {
  id: string;
  title: string;
  venue?: string | null;
  schedule_start?: string | null;
  poster_url?: string | null;
  /** 1 또는 3 (며칠 남았는지) */
  daysLeft: 1 | 3;
};

type Props = {
  name?: string | null;
  shows: ReminderShow[];
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
  lineHeight: "1.8",
  color: "#4A3B33",
  fontWeight: 600,
  margin: "0 0 24px",
} as const;

const PARAGRAPH = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  lineHeight: "1.9",
  color: "#4A3B33",
  margin: "0 0 16px",
} as const;

const CARD_WRAP = {
  margin: "20px 0",
  padding: "20px",
  backgroundColor: "#F0EEE9",
  border: "1px solid #EDE6D5",
} as const;

const CARD_LABEL = {
  fontFamily: FONT_FAMILY,
  fontSize: "11px",
  letterSpacing: "0.2em",
  color: "#274E9B",
  margin: "0 0 8px",
  fontWeight: 600,
} as const;

const CARD_TITLE = {
  fontFamily: FONT_FAMILY,
  fontSize: "16px",
  fontWeight: 500,
  lineHeight: "1.5",
  color: "#4A3B33",
  margin: "0 0 10px",
} as const;

const CARD_META = {
  fontFamily: FONT_FAMILY,
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#6B5C50",
  margin: "0 0 4px",
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

const LINK_STYLE = {
  color: "#274E9B",
  textDecoration: "none",
} as const;

function formatYmdWeek(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const week = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${week})`;
}

export function ShowReminderEmail({ name, shows }: Props) {
  const trimmedName = name?.trim();
  const greeting = trimmedName ? `${trimmedName}님,` : "안녕하세요,";

  // 가장 임박한 공연을 기준으로 메일 제목·미리보기 결정
  const sorted = [...shows].sort((a, b) => a.daysLeft - b.daysLeft);
  const closest = sorted[0];
  const closestLabel =
    closest?.daysLeft === 1 ? "내일" : closest?.daysLeft === 3 ? "사흘 뒤" : "곧";

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        {closest ? `${closestLabel}, ${closest.title}의 막이 오릅니다` : "관심 공연 안내"}
      </Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={GREETING}>
            {greeting}
          </Heading>

          <Text style={PARAGRAPH}>
            지난날 표시해 두신 공연들 가운데, 막이 가까이 와 있는 무대를 두어 가지 모아 보내드립니다.
          </Text>

          {sorted.map((s) => {
            const labelText = s.daysLeft === 1 ? "내일 막이 오릅니다" : "사흘 뒤 막이 오릅니다";
            const dateText = formatYmdWeek(s.schedule_start);
            const showHref = `https://syus.co.kr/shows/${s.id}`;
            return (
              <Section key={s.id} style={CARD_WRAP}>
                <Text style={CARD_LABEL}>{labelText}</Text>
                <Text style={CARD_TITLE}>
                  <Link href={showHref} style={{ ...LINK_STYLE, color: "#4A3B33" }}>
                    {s.title}
                  </Link>
                </Text>
                {dateText ? <Text style={CARD_META}>일시 · {dateText}</Text> : null}
                {s.venue ? <Text style={CARD_META}>장소 · {s.venue}</Text> : null}
                <Text style={{ ...CARD_META, marginTop: 10 }}>
                  <Link href={showHref} style={LINK_STYLE}>공연 자세히 보기 →</Link>
                </Text>
              </Section>
            );
          })}

          <Section style={CTA_WRAP}>
            <Button href="https://syus.co.kr/mypage" style={CTA_BUTTON}>
              내 관심 공연 보기
            </Button>
          </Section>

          <Text style={PARAGRAPH}>
            막이 끝나고 나면, 잠깐 머문 자리에 짧은 후기 한 줄을 남겨 두실 수 있습니다.
            다음 사람에게 닿게 됩니다.
          </Text>

          <Text style={SIGNATURE}>깊이 머물고, 가볍게 흘려보내겠습니다.</Text>
          <Text style={SIGNOFF}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default ShowReminderEmail;
