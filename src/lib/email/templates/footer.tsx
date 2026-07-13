/**
 * 공통 메일 푸터.
 *
 * 모든 트랜잭션 메일 하단에 동일하게 붙는다.
 * - 회사 정체: 사유유사 SYUS · 대표 이혁호 · 사업자등록번호
 * - 운영 채널: syus.co.kr / instagram.com/syus_official
 * - 답장 안내: 운영자에게 곧장 전달된다는 약속(replyTo가 사장님 Gmail로 설정됨)
 */
import { Hr, Section, Text, Link } from "../components";

const HR = { borderColor: "#E8E2D5", margin: "32px 0 20px" } as const;

const META_TEXT = {
  fontFamily: "'Spoqa Han Sans Neo', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif",
  fontSize: "12px",
  lineHeight: "1.8",
  color: "#6B6359",
  margin: "0 0 4px",
} as const;

const LINK_STYLE = {
  color: "#274E9B",
  textDecoration: "none",
} as const;

const REPLY_NOTE = {
  ...META_TEXT,
  marginTop: "16px",
  color: "#8A8278",
  fontStyle: "italic" as const,
} as const;

export function EmailFooter() {
  return (
    <Section>
      <Hr style={HR} />
      <Text style={META_TEXT}>사유유사 SYUS · 대표 이혁호</Text>
      <Text style={META_TEXT}>사업자등록번호 168-05-03666</Text>
      <Text style={META_TEXT}>
        경기도 남양주시 진접읍 해밀예당1로 220, 본동 7층 07호 E-35호(엠타워)
      </Text>
      <Text style={META_TEXT}>
        문의: <Link href="mailto:syusflux@gmail.com" style={LINK_STYLE}>syusflux@gmail.com</Link>
      </Text>
      <Text style={META_TEXT}>
        <Link href="https://syus.co.kr" style={LINK_STYLE}>syus.co.kr</Link>
        {" · "}
        <Link href="https://instagram.com/syus_official" style={LINK_STYLE}>instagram.com/syus_official</Link>
      </Text>
      <Text style={REPLY_NOTE}>
        이 메일에 그대로 답장하시면 운영자에게 곧장 전달됩니다.
      </Text>
      <Text style={REPLY_NOTE}>
        알림을 원치 않으시면{" "}
        <Link href="https://syus.co.kr/mypage" style={LINK_STYLE}>회원 설정 → 알림</Link>에서 변경 가능합니다.
      </Text>
    </Section>
  );
}
