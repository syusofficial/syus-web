/**
 * Resend 클라이언트 싱글톤.
 *
 * RESEND_API_KEY가 비어 있으면 null을 반환한다. (로컬·프리뷰 환경에서
 * 키가 없어도 빌드가 깨지지 않도록 하기 위함.) 실제 발송 헬퍼는 null인 경우
 * 콘솔 경고만 남기고 silent fail 한다.
 */
import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
