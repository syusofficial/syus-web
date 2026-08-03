/**
 * 운영자 아침 요약 메일 — 매일 09:00 KST (사장님 업무 시작 직전) 1통.
 *
 * 트리거 (cron)
 * - /api/cron/admin-digest 가 매일 00:00 UTC(= 09:00 KST)에 실행
 * - 보낼 내용(처리 대기 or 어제 발생)이 하나도 없으면 아예 발송하지 않는다.
 *   빈 메일이 매일 오면 열어보지 않게 되고, 그러면 정작 중요한 날의 메일을 놓친다.
 *
 * 톤 — 다른 메일들과 다르다
 * - 이 메일의 수신자는 사장님 한 사람뿐인 내부 운영 메일이다. 사색적인 카피가 아니라
 *   "한눈에 숫자가 읽히는" 것이 목적. 감성 문장·인사말을 넣지 않는다.
 * - 0인 항목은 줄 자체를 만들지 않는다(=route에서 걸러 넘긴다). 눈이 숫자에만 가도록.
 *
 * 푸터
 * - 공통 EmailFooter(사업자 정보·수신거부 안내)를 쓰지 않는다. 그 푸터는 회원에게 나가는
 *   메일용이고, "답장하시면 운영자에게 전달됩니다"·"알림을 원치 않으시면" 문구가
 *   수신자 본인이 운영자인 이 메일에서는 의미가 없다. 대신 한 줄짜리 내부 표기만 둔다.
 *
 * 색
 * - 2026 트렌드 4색 잠금만 사용: Cloud Dancer #F0EEE9 / Transformative Teal #0B5563 /
 *   Silhouette #4A3B33 / Divine Damson #5C2A42 (+보조 #5A4A3E, 라인 #D4CFC1).
 *   폐기색(구 코발트·페일라임·노랑·브라운)은 한 곳도 쓰지 않는다.
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Button, Heading, Hr } from "../components";

export type DigestRow = {
  /** React key */
  key: string;
  /** 화면에 보이는 항목명 */
  label: string;
  /** 0인 항목은 route에서 걸러 넘긴다 */
  count: number;
  /** "건" | "명" 등 */
  unit: string;
  /** /admin 딥링크 (절대경로) */
  href: string;
};

type Props = {
  /** 어제 날짜 라벨 — 예 "8월 2일 (토)" */
  dateLabel: string;
  /** 지금 처리해야 하는 것 */
  pending: DigestRow[];
  /** 어제 하루 동안 새로 생긴 것 */
  yesterday: DigestRow[];
  /** 조회에 실패해 이번 메일에서 빠진 항목명 (있을 때만 하단에 한 줄로 알림) */
  failed?: string[];
};

const ADMIN_URL = "https://syus.co.kr/admin";

const FONT_FAMILY = "'Spoqa Han Sans Neo', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";
const NUM_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
  padding: "40px 36px",
  border: "1px solid #D4CFC1",
} as const;

const EYEBROW = {
  fontFamily: NUM_FAMILY,
  fontSize: "11px",
  letterSpacing: "0.24em",
  textTransform: "uppercase" as const,
  color: "#5A4A3E",
  margin: "0 0 6px",
} as const;

const TITLE = {
  fontFamily: FONT_FAMILY,
  fontSize: "20px",
  lineHeight: "1.5",
  fontWeight: 700,
  color: "#0B5563",
  margin: "0 0 28px",
} as const;

const GROUP_HEAD = {
  fontFamily: FONT_FAMILY,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "#0B5563",
  margin: "0 0 2px",
} as const;

const GROUP_HEAD_MUTED = {
  ...GROUP_HEAD,
  color: "#5A4A3E",
} as const;

const GROUP_WRAP = {
  margin: "0 0 28px",
} as const;

const ROW_TABLE = {
  borderBottom: "1px solid #D4CFC1",
} as const;

const ROW_LABEL_CELL = {
  padding: "12px 0",
  textAlign: "left" as const,
  verticalAlign: "middle" as const,
} as const;

const ROW_COUNT_CELL = {
  padding: "12px 0",
  textAlign: "right" as const,
  verticalAlign: "middle" as const,
  whiteSpace: "nowrap" as const,
} as const;

const ROW_LINK = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  color: "#4A3B33",
  textDecoration: "none",
} as const;

const ROW_COUNT = {
  fontFamily: NUM_FAMILY,
  fontSize: "20px",
  fontWeight: 700,
  color: "#0B5563",
} as const;

const ROW_UNIT = {
  fontFamily: FONT_FAMILY,
  fontSize: "13px",
  fontWeight: 400,
  color: "#5A4A3E",
  paddingLeft: "3px",
} as const;

const CTA_WRAP = {
  textAlign: "center" as const,
  margin: "8px 0 4px",
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

const NOTE = {
  fontFamily: FONT_FAMILY,
  fontSize: "12px",
  lineHeight: "1.7",
  color: "#5A4A3E",
  margin: "0 0 4px",
} as const;

const HR = { borderColor: "#D4CFC1", margin: "28px 0 16px" } as const;

/**
 * 메일 제목. 매일 같은 제목이면 안 열어보게 되므로 그날의 숫자를 그대로 제목에 싣는다.
 * 처리 대기가 있으면 언제나 그것부터 — 사장님이 제목만 보고 오늘 손댈 게 있는지 판단할 수 있게.
 *
 * 예) "처리 대기 3건 · 어제 신규 가입 2명"
 *     "어제 신규 공연 등록 1건 · 신규 후기 4건"
 *
 * route와 Preview 텍스트가 같은 문장을 쓰도록 여기 한 곳에서만 만든다.
 */
export function buildAdminDigestSubject(pending: DigestRow[], yesterday: DigestRow[]): string {
  const parts: string[] = [];

  const pendingTotal = pending.reduce((sum, r) => sum + r.count, 0);
  if (pendingTotal > 0) {
    parts.push(`처리 대기 ${pendingTotal}건`);
  }

  // 어제 항목은 많아야 2개까지만 제목에 — 모바일 제목 잘림 방지. "어제"는 한 번만 붙인다.
  const topYesterday = [...yesterday]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((r) => `${r.label} ${r.count}${r.unit}`);
  if (topYesterday.length > 0) {
    parts.push(`어제 ${topYesterday.join(" · ")}`);
  }

  if (parts.length === 0) return "무대올림 운영 요약";
  return parts.join(" · ");
}

function DigestGroup({ heading, rows, muted }: { heading: string; rows: DigestRow[]; muted?: boolean }) {
  if (rows.length === 0) return null;
  return (
    <Section style={GROUP_WRAP}>
      <Text style={muted ? GROUP_HEAD_MUTED : GROUP_HEAD}>{heading}</Text>
      {rows.map((r) => (
        <table
          key={r.key}
          width="100%"
          border={0}
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={ROW_TABLE}
        >
          <tbody>
            <tr>
              <td style={ROW_LABEL_CELL}>
                <Link href={r.href} style={ROW_LINK}>
                  {r.label}
                </Link>
              </td>
              <td style={ROW_COUNT_CELL}>
                <span style={ROW_COUNT}>{r.count}</span>
                <span style={ROW_UNIT}>{r.unit}</span>
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </Section>
  );
}

export function AdminDigestEmail({ dateLabel, pending, yesterday, failed }: Props) {
  const visiblePending = pending.filter((r) => r.count > 0);
  const visibleYesterday = yesterday.filter((r) => r.count > 0);
  const subject = buildAdminDigestSubject(visiblePending, visibleYesterday);

  return (
    <Html lang="ko">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Text style={EYEBROW}>Daily Digest</Text>
          {/* 제목에 어제 날짜를 쓰지 않는다 — "지금 처리 대기"는 오늘 기준, "새로 생긴 것"만
              어제 기준이라 한 날짜로 묶으면 오해를 준다. 날짜는 각 묶음 제목에 붙인다. */}
          <Heading as="h1" style={TITLE}>
            아침 운영 요약
          </Heading>

          <DigestGroup heading="지금 처리 대기" rows={visiblePending} />
          <DigestGroup heading={`어제(${dateLabel}) 새로 생긴 것`} rows={visibleYesterday} muted />

          <Section style={CTA_WRAP}>
            <Button href={ADMIN_URL} style={CTA_BUTTON}>
              관리자 페이지 열기
            </Button>
          </Section>

          <Hr style={HR} />

          {failed && failed.length > 0 ? (
            <Text style={NOTE}>
              조회에 실패해 이번 요약에서 빠진 항목: {failed.join(" · ")}
            </Text>
          ) : null}

          <Text style={NOTE}>
            사유유사 SYUS 내부 운영 알림 · 매일 09:00 발송 · 보고할 내용이 없는 날은 보내지 않습니다.
          </Text>
          <Text style={NOTE}>
            <Link href={ADMIN_URL} style={{ color: "#0B5563", textDecoration: "none" }}>
              syus.co.kr/admin
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AdminDigestEmail;
