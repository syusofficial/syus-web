/**
 * 개인정보 위탁·국외이전 안내 — 신규 가입자용 (그룹 2, 2026-08-02 이후 가입).
 *
 * 근거: output/legal/2026-07-20_anthropic_통지_신규가입자_포함_결정.md §4 (법무팀 최종 결정)
 * 본문은 그 문서 §4의 승인된 문구를 그대로 옮긴 것이다. 법적 통지문이므로
 * 임의 수정 금지 — 문구 변경은 법무팀 재검토 후 반영.
 *
 * privacy-notice-2026-08.tsx(그룹 1, 기존 회원용)와의 차이는 딱 3곳뿐이다.
 *   1) 도입부 — "변경 예고"(미래형)가 아니라 "가입 시점부터 이미 적용 중"(안내형)
 *   2) 소제목 — "무엇이 바뀌나요" → "어떤 내용인가요"
 *   3) 맨 아래 법적 근거 문구 — 개인정보처리방침 제12조(변경 통지 조항) 인용 삭제,
 *      "다시 안내드립니다" 톤으로 조정
 * 위탁 정보 박스·거부 방법·문의처는 그룹 1과 100% 동일 — 사실관계가 다를 이유가 없다.
 *
 * 발송 대상: 가입일이 2026-08-02 이후인 회원 — 가입 시점마다 1회, 무기한 반복 트리거.
 * 발송 경로: src/app/api/cron/privacy-notice-20260802/route.ts (매일 자동, 가입일로 분기)
 *
 * 디자인 토큰은 privacy-notice-2026-08.tsx와 동일 (2026-06-15 색상 잠금 기준).
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Button, Heading, Hr } from "../components";
import { EmailFooter } from "./footer";
import {
  BODY,
  CONTAINER,
  GREETING,
  PARAGRAPH,
  SUBHEADING,
  LINK_STYLE,
  INFO_BOX,
  INFO_LABEL,
  InfoRow,
  CTA_WRAP,
  CTA_BUTTON,
  HR_STYLE,
  CONTACT_LABEL,
  LEGAL_NOTE,
  SIGNATURE,
  SIGNOFF,
} from "./privacy-notice-2026-08-shared";

type Props = {
  name?: string | null;
};

export function NewSignupPrivacyNotice20260802Email({ name }: Props) {
  const trimmedName = name?.trim();
  const greeting = trimmedName ? `${trimmedName}님, 안녕하세요.` : "안녕하세요.";

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        무대올림·시우스 창작 독백 기능은 입력하신 정보를 Anthropic(미국)에 위탁·이전해 처리합니다.
      </Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={{ ...GREETING, fontSize: "18px", fontWeight: 600 }}>
            {greeting}
          </Heading>

          <Text style={PARAGRAPH}>
            사유유사(SYUS)가 운영하는 무대올림·시우스(syus.co.kr)에
            가입해주셔서 감사합니다.
          </Text>
          <Text style={PARAGRAPH}>
            최근 가입하신 회원님께도 안내드립니다. 가입하신 시점부터
            적용되는 개인정보처리방침에는 아래와 같은 위탁·국외이전 사항이
            포함되어 있습니다. 창작 독백 기능을 이용하시기 전에 미리
            안내드리며, 이 기능을 이용하지 않으시면 해당 정보는 국외로
            전달되지 않습니다.
          </Text>

          <Text style={SUBHEADING}>어떤 내용인가요</Text>
          <Text style={PARAGRAPH}>
            창작 독백(회원의 요청에 맞춰 AI가 새로운 대사를 지어드리는 기능)을
            이용하실 때 입력하신 정보를 아래 업체에 위탁하여 처리하며,
            이 과정에서 정보가 국외로 이전됩니다.
          </Text>

          <Section style={INFO_BOX}>
            <Text style={INFO_LABEL}>국외이전 안내</Text>
            <InfoRow label="위탁받는 곳(수탁자)">Anthropic PBC</InfoRow>
            <InfoRow label="위탁받는 곳의 소재 국가">미국</InfoRow>
            <InfoRow label="위탁하는 업무 내용">창작 독백 생성 (AI 모델 API, Claude)</InfoRow>
            <InfoRow label="이전되는 정보">
              독백 요청 시 입력하신 정보(인물 유형·감정·상황·길이·톤·용도·성별·연령대(선택)·
              서고 공개 동의 여부) 및 생성된 대사 본문
            </InfoRow>
            <InfoRow label="이전 시기·방법">독백 생성을 요청하실 때마다, TLS 암호화 전송</InfoRow>
            <InfoRow label="보유 기간">회원 탈퇴 시까지</InfoRow>
          </Section>

          <Text style={PARAGRAPH}>
            이 외에도 시우스 커뮤니티(견해글·자유 게시판·관람 후기 등) 이용에 관한
            수집 항목과, 공연 좌석 신청(예약) 관련 수집 항목·보유 기간이 개인정보처리방침에
            반영되어 있습니다. 전체 조항은 아래 링크에서 그대로 확인하실 수 있습니다.
          </Text>

          <Section style={CTA_WRAP}>
            <Button href="https://syus.co.kr/privacy" style={CTA_BUTTON}>
              개인정보처리방침 전문 보기
            </Button>
          </Section>

          <Text style={SUBHEADING}>국외 이전을 원하지 않으신다면</Text>
          <Text style={PARAGRAPH}>
            창작 독백 기능을 이용하지 않으시면 이 정보는 Anthropic으로
            전달되지 않습니다. 다른 서비스(공연 정보 열람, 후기 작성, 시우스
            커뮤니티 이용 등)는 이 기능과 무관하게 그대로 이용하실 수 있습니다.
            국외 이전 관련 문의나 정보 삭제를 원하시면 아래 문의처로
            언제든 연락 주십시오.
          </Text>

          <Hr style={HR_STYLE} />

          <Text style={SUBHEADING}>문의처</Text>
          <Text style={CONTACT_LABEL}>개인정보 보호 담당자: 운영자 이혁호</Text>
          <Text style={CONTACT_LABEL}>
            이메일: <Link href="mailto:syusflux@gmail.com" style={LINK_STYLE}>syusflux@gmail.com</Link>
          </Text>
          <Text style={{ ...CONTACT_LABEL, color: "#5A4A3E", fontStyle: "italic" as const }}>
            (이 메일에 그대로 답장하셔도 운영자에게 곧장 전달됩니다)
          </Text>

          <Text style={LEGAL_NOTE}>
            이 안내는 「개인정보 보호법」 제26조·제28조의8에 따라 공개된
            개인정보처리방침 내용을 이용자님의 이해를 돕기 위해 다시
            안내드리는 것입니다.
          </Text>

          <Text style={SIGNATURE}>깊이 머물고, 가볍게 흘려보내겠습니다.</Text>
          <Text style={SIGNOFF}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default NewSignupPrivacyNotice20260802Email;
