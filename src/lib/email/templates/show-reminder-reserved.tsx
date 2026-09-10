/**
 * 좌석 신청자용 공연 D-3 / D-1 알림 메일 — 2026-09-10 신설.
 *
 * 왜 show-reminder.tsx와 따로 두는가
 * - 기존 show-reminder.tsx는 "찜(likes)한 공연" 전용 문구다("지난날 표시해 두신 공연들 가운데").
 *   좌석을 실제로 신청한 사람에게 그 문장을 그대로 보내면 사실과 어긋난다.
 *   신청자는 이미 자리를 잡아 둔 사람이라, 필요한 정보(신청 인원·신청번호·취소 경로)와
 *   해야 할 일(못 가게 되면 자리를 놓아 주기)이 다르다.
 * - 그래서 "신청이 하나라도 섞인 메일"은 이 템플릿이 맡고,
 *   찜만 있는 메일은 기존 show-reminder.tsx가 그대로 맡는다(기존 동작 변경 없음).
 *
 * 한 통에 신청 공연과 찜 공연이 섞일 수 있다(같은 사람이 둘 다 한 경우).
 * 카드마다 reserved / liked 플래그로 문구를 갈라 쓴다.
 *
 * 톤
 * - 마케팅팀 톤(사색·자기 낮춤). "놓치지 마세요"·"지금 바로" 금지.
 * - 관람료는 언급하지 않는다(무대올림 정책 — 금액 무단언).
 * - 발신 주체는 항상 사유유사 SYUS. 무대올림은 "사유유사가 운영하는 서비스"로만 등장한다.
 *
 * 대상
 * - 회원(로그인 계정) 신청자만. 게스트 신청은 이 경로로 발송하지 않는다(cron 라우트에서 컷).
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Button, Heading } from "../components";
import { formatShowDate } from "@/lib/showDate";
import { EmailFooter } from "./footer";
import { safeGreetingName } from "../greeting";

type ReminderShow = {
  id: string;
  title: string;
  venue?: string | null;
  schedule_start?: string | null;
  /** 기존 템플릿과 같은 형태로 받아 두되 아직 본문에 렌더하지 않는다(메일 용량·이미지 차단 고려). */
  poster_url?: string | null;
  /** 1 또는 3 (며칠 남았는지) */
  daysLeft: 1 | 3;
  /** 이 공연에 확정(confirmed) 좌석 신청이 있는가 */
  reserved: boolean;
  /** 이 공연을 찜해 두었는가 */
  liked: boolean;
  /** 신청 인원 합계(같은 공연에 여러 건이면 합산). reserved일 때만 의미 있음 */
  partySize?: number | null;
  /**
   * 신청번호. 같은 공연에 신청이 두 건 이상이면 하나만 적어 오해를 만들지 않도록 null로 둔다
   * (그 경우 본문은 신청번호 대신 마이페이지에서 확인하도록 안내한다).
   */
  reservationCode?: string | null;
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

/** 신청 카드는 왼쪽에 Teal 선을 하나 더 둬서 찜 카드와 눈으로 구분되게 한다. */
const CARD_WRAP_RESERVED = {
  ...CARD_WRAP,
  borderLeft: "3px solid #0B5563",
} as const;

const CARD_LABEL = {
  fontFamily: FONT_FAMILY,
  fontSize: "11px",
  letterSpacing: "0.2em",
  color: "#0B5563",
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
  color: "#5A4A3E",
  margin: "0 0 4px",
} as const;

const CARD_SEAT = {
  ...CARD_META,
  color: "#0B5563",
  fontWeight: 600,
} as const;

const CTA_WRAP = {
  textAlign: "center" as const,
  margin: "32px 0 8px",
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

const SIGNATURE = {
  ...PARAGRAPH,
  marginTop: "32px",
  color: "#0B5563",
  fontWeight: 500,
} as const;

const SIGNOFF = {
  ...PARAGRAPH,
  marginTop: "8px",
  color: "#5A4A3E",
} as const;

const LINK_STYLE = {
  color: "#0B5563",
  textDecoration: "none",
} as const;

const MYPAGE_URL = "https://syus.co.kr/mypage";

/** 날짜는 @/lib/showDate 하나만 쓴다(직접 파싱 금지 — showDate.ts 주석 참고). */
function formatYmdWeek(iso?: string | null): string {
  return formatShowDate(iso, { weekday: true });
}

export function ShowReminderReservedEmail({ name, shows }: Props) {
  const trimmedName = safeGreetingName(name);
  const greeting = trimmedName ? `${trimmedName}님,` : "회원님,";

  // 가장 임박한 공연을 기준으로 미리보기 문구 결정. 같은 날이면 신청한 쪽을 앞세운다.
  const sorted = [...shows].sort((a, b) => {
    if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
    return Number(b.reserved) - Number(a.reserved);
  });
  const closest = sorted[0];
  const closestLabel = closest?.daysLeft === 1 ? "내일" : closest?.daysLeft === 3 ? "사흘 뒤" : "곧";
  const reservedCount = shows.filter((s) => s.reserved).length;

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        {closest ? `${closestLabel}, ${closest.title}의 막이 오릅니다` : "좌석 신청하신 공연 안내"}
      </Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={GREETING}>
            {greeting}
          </Heading>

          <Text style={PARAGRAPH}>
            사유유사가 운영하는 무대올림에 남겨 두신 좌석 신청입니다.
            막이 가까워져, 잊지 않으시도록 한 번 더 적어 보냅니다.
          </Text>

          {sorted.map((s) => {
            const labelText = s.daysLeft === 1 ? "내일 막이 오릅니다" : "사흘 뒤 막이 오릅니다";
            const dateText = formatYmdWeek(s.schedule_start);
            const showHref = `https://syus.co.kr/muol/shows/${s.id}`;
            const partySize = s.partySize && s.partySize > 0 ? s.partySize : null;

            return (
              <Section key={s.id} style={s.reserved ? CARD_WRAP_RESERVED : CARD_WRAP}>
                <Text style={CARD_LABEL}>{labelText}</Text>
                <Text style={CARD_TITLE}>
                  <Link href={showHref} style={{ ...LINK_STYLE, color: "#4A3B33" }}>
                    {s.title}
                  </Link>
                </Text>
                {dateText ? <Text style={CARD_META}>일시 · {dateText}</Text> : null}
                {s.venue ? <Text style={CARD_META}>장소 · {s.venue}</Text> : null}

                {s.reserved ? (
                  <Text style={CARD_SEAT}>
                    좌석 신청 완료
                    {partySize ? ` · ${partySize}명` : ""}
                    {s.reservationCode ? ` · 신청번호 ${s.reservationCode}` : ""}
                  </Text>
                ) : (
                  <Text style={CARD_META}>표시해 두신 공연입니다.</Text>
                )}
                {s.reserved && !s.reservationCode ? (
                  <Text style={CARD_META}>
                    이 공연에 신청하신 내역이 여러 건입니다 —{" "}
                    <Link href={MYPAGE_URL} style={LINK_STYLE}>마이페이지</Link>에서 확인하실 수 있습니다.
                  </Text>
                ) : null}

                <Text style={{ ...CARD_META, marginTop: 10 }}>
                  <Link href={showHref} style={LINK_STYLE}>공연 자세히 보기 →</Link>
                </Text>
              </Section>
            );
          })}

          {reservedCount > 0 ? (
            <Text style={PARAGRAPH}>
              혹시 걸음이 어려워지셨다면, 미리 신청을 거두어 주시면 그 자리가 기다리던 다음 분께 갑니다.
              마이페이지에서 신청번호 없이 바로 하실 수 있고, 위약금이나 불이익은 없습니다.
              학생 공연팀에게는 비어 있는 좌석 하나가 꽤 오래 남습니다.
            </Text>
          ) : null}

          <Section style={CTA_WRAP}>
            <Button href={MYPAGE_URL} style={CTA_BUTTON}>
              내 신청 내역 보기
            </Button>
          </Section>

          <Text style={PARAGRAPH}>
            막이 끝나고 나면, 잠깐 머문 자리에 짧은 후기 한 줄을 남겨 두실 수 있습니다.
            다음 사람에게 닿게 됩니다.
          </Text>

          <Text style={SIGNATURE}>두루 생각하여, 이를 무대 위에서 흘려보내겠습니다.</Text>
          <Text style={SIGNOFF}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default ShowReminderReservedEmail;
