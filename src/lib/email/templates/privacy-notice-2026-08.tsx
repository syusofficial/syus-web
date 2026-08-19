/**
 * 개인정보처리방침 변경 개별 통지 — Anthropic PBC 위탁·국외이전 추가 (2026-08-02 시행).
 *
 * 근거: output/legal/2026-07-20_anthropic_위탁_통지_최종결정.md (법무팀 최종 결정, §4)
 * 본문은 그 문서 §4의 승인된 문구를 그대로 옮긴 것이다. 법적 통지문이므로
 * 임의 수정 금지 — 문구 변경은 법무팀 재검토 후 반영.
 *
 * 발송 대상: 가입일이 2026-08-02 이전인 회원 전체(탈퇴·이메일 미인증 제외) — 1회성 배치.
 * 발송 스크립트: scripts/privacy-notice-20260802/send.ts
 *
 * 그룹 2(2026-08-02 이후 가입자)용 템플릿은 privacy-notice-2026-08-new-signup.tsx —
 * 공유 스타일·컴포넌트(위탁 정보 박스 등)는 privacy-notice-2026-08-shared.tsx 로 분리했다
 * (출처: output/legal/2026-07-20_anthropic_통지_신규가입자_포함_결정.md §5-2).
 *
 * 디자인 토큰 (2026-06-15 색상 잠금 반영, syus_color_and_copy_lock 기준)
 * - 배경: #F0EEE9 (Cloud Dancer)
 * - 카드 배경: #FFFFFF
 * - 제목·링크·CTA: #0B5563 (Transformative Teal) — welcome.tsx 등 구 템플릿의
 *   #274E9B(구 코발트, 폐기됨)를 쓰지 않는다. 이 파일이 새 잠금 기준을 따르는
 *   첫 이메일 템플릿이며, 기존 템플릿 정합성 맞추기는 이번 작업 범위 밖이다.
 * - 본문 텍스트: #4A3B33 (Silhouette)
 * - 위탁 정보 박스 라벨(포인트, 3% 비중): #5C2A42 (Divine Damson)
 * - 광고형 어휘 없음 — 법적 통지문이므로 사색적 톤보다 명확성 우선(사장님 요청사항 반영)
 */
import { Html, Head, Preview, Body, Container, Section, Text, Link, Button, Heading, Hr } from "../components";
import { EmailFooter } from "./footer";
import { safeGreetingName } from "../greeting";
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

export function PrivacyNotice20260802Email({ name }: Props) {
  const trimmedName = safeGreetingName(name);
  const greeting = trimmedName ? `${trimmedName}님, 안녕하세요.` : "회원님, 안녕하세요.";

  return (
    <Html lang="ko">
      <Head />
      <Preview>
        2026년 8월 2일부터 개인정보처리방침이 바뀝니다. 창작 독백 이용 시 정보가 국외(미국)로 위탁·이전됩니다.
      </Preview>
      <Body style={BODY}>
        <Container style={CONTAINER}>
          <Heading as="h1" style={{ ...GREETING, fontSize: "18px", fontWeight: 600 }}>
            {greeting}
          </Heading>

          <Text style={PARAGRAPH}>
            사유유사(SYUS)가 운영하는 무대올림·시우스(syus.co.kr)의
            개인정보처리방침이 2026년 8월 2일부터 아래 내용으로 바뀝니다.
          </Text>
          <Text style={PARAGRAPH}>
            「개인정보 보호법」에 따라 이용자 권리에 영향을 줄 수 있는 변경 사항을
            회원가입 시 등록하신 이메일 주소로 개별 안내드립니다.
          </Text>

          <Text style={SUBHEADING}>무엇이 바뀌나요</Text>
          <Text style={PARAGRAPH}>
            창작 독백(회원의 요청에 맞춰 AI가 새로운 대사를 지어드리는 기능)을
            새로 시작하면서, 이 기능을 이용하실 때 입력하신 정보를
            아래 업체에 위탁하여 처리하며, 이 과정에서 정보가 국외로 이전됩니다.
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
            수집 항목과, 공연 좌석 신청(예약) 관련 수집 항목·보유 기간이 함께 개정에
            반영되었습니다. 전체 조항은 아래 링크에서 그대로 확인하실 수 있습니다.
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
            이 안내는 「개인정보 보호법」 제26조·제28조의8 및 저희 개인정보처리방침
            제12조에 따른 개별 통지입니다.
          </Text>

          <Text style={SIGNATURE}>두루 생각하여, 이를 무대 위에서 흘려보내겠습니다.</Text>
          <Text style={SIGNOFF}>사유유사 SYUS · 이혁호 드림</Text>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

export default PrivacyNotice20260802Email;
