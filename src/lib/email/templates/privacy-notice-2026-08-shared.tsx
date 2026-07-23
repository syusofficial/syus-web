/**
 * Anthropic 위탁·국외이전 통지 — 그룹 1(기존 회원)·그룹 2(신규 가입자) 템플릿 공유 스타일·컴포넌트.
 *
 * 근거: output/legal/2026-07-20_anthropic_통지_신규가입자_포함_결정.md §5-2
 *   "그룹 1 템플릿과 본문 데이터 블록(수탁자 정보 등)은 공유 컴포넌트로 분리해 이중 관리 방지 권장"
 *
 * 두 그룹의 문구 차이(도입부·소제목 1곳·맨 아래 법적 근거 문구)는 각 템플릿 파일에 그대로 두고,
 * 그 외 100% 동일해야 하는 부분(위탁 정보 박스, 색상 토큰, 문의처 스타일 등)만 여기 모은다.
 * 위탁 정보(수탁자·이전 항목 등)가 바뀌면 이 파일 하나만 고치면 두 템플릿에 함께 반영된다.
 *
 * 디자인 토큰 (2026-06-15 색상 잠금 반영, syus_color_and_copy_lock 기준)
 * - 배경: #F0EEE9 (Cloud Dancer) / 카드 배경: #FFFFFF
 * - 제목·링크·CTA: #0B5563 (Transformative Teal)
 * - 본문 텍스트: #4A3B33 (Silhouette)
 * - 위탁 정보 박스 라벨(포인트, 3% 비중): #5C2A42 (Divine Damson)
 */
import type { ReactNode } from "react";
import { Text } from "../components";

export const FONT_FAMILY =
  "'Spoqa Han Sans Neo', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif";

export const BODY = {
  backgroundColor: "#F0EEE9",
  fontFamily: FONT_FAMILY,
  margin: 0,
  padding: "32px 0",
} as const;

export const CONTAINER = {
  backgroundColor: "#FFFFFF",
  maxWidth: "560px",
  margin: "0 auto",
  padding: "48px 40px",
  border: "1px solid #EDE6D5",
} as const;

export const GREETING = {
  fontFamily: FONT_FAMILY,
  fontSize: "16px",
  lineHeight: "1.8",
  color: "#4A3B33",
  margin: "0 0 24px",
} as const;

export const PARAGRAPH = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  lineHeight: "1.9",
  color: "#4A3B33",
  margin: "0 0 16px",
} as const;

export const SUBHEADING = {
  fontFamily: FONT_FAMILY,
  fontSize: "15px",
  fontWeight: 600,
  color: "#0B5563",
  margin: "36px 0 16px",
  letterSpacing: "0.02em",
} as const;

export const LINK_STYLE = {
  color: "#0B5563",
  textDecoration: "none",
} as const;

export const INFO_BOX = {
  margin: "20px 0",
  padding: "22px 24px",
  backgroundColor: "#F0EEE9",
  border: "1px solid #EDE6D5",
} as const;

export const INFO_LABEL = {
  fontFamily: FONT_FAMILY,
  fontSize: "11px",
  letterSpacing: "0.1em",
  color: "#5C2A42",
  fontWeight: 700,
  margin: "0 0 12px",
} as const;

export const INFO_ROW = {
  fontFamily: FONT_FAMILY,
  fontSize: "13.5px",
  lineHeight: "1.9",
  color: "#4A3B33",
  margin: "0 0 6px",
} as const;

export const INFO_ROW_LABEL = {
  color: "#5A4A3E",
} as const;

export const CTA_WRAP = {
  textAlign: "center" as const,
  margin: "28px 0 8px",
} as const;

export const CTA_BUTTON = {
  backgroundColor: "#0B5563",
  color: "#FFFFFF",
  fontFamily: FONT_FAMILY,
  fontSize: "14px",
  fontWeight: 600,
  padding: "14px 32px",
  textDecoration: "none",
  display: "inline-block",
  letterSpacing: "0.02em",
} as const;

export const HR_STYLE = {
  borderColor: "#EDE6D5",
  margin: "28px 0",
} as const;

export const CONTACT_LABEL = {
  fontFamily: FONT_FAMILY,
  fontSize: "13.5px",
  lineHeight: "1.9",
  color: "#4A3B33",
  margin: "0 0 4px",
} as const;

export const LEGAL_NOTE = {
  fontFamily: FONT_FAMILY,
  fontSize: "12.5px",
  lineHeight: "1.8",
  color: "#5A4A3E",
  margin: "20px 0 0",
} as const;

export const SIGNATURE = {
  ...PARAGRAPH,
  marginTop: "28px",
  color: "#0B5563",
  fontWeight: 500,
} as const;

export const SIGNOFF = {
  ...PARAGRAPH,
  marginTop: "8px",
  color: "#5A4A3E",
} as const;

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Text style={INFO_ROW}>
      <span style={INFO_ROW_LABEL}>{label}</span> · {children}
    </Text>
  );
}
