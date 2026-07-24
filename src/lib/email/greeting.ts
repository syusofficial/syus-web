/**
 * 이메일 인사말용 이름 정제 헬퍼.
 *
 * 배경 (2026-07-24, 사장님 리포트)
 * - 사장님이 실제 수신한 메일에서 인사말이 "사유유사님, 안녕하세요."로 나온 사례를 발견.
 *   회사가 자기 회사 이름으로 스스로를 부르는 모양이 되어 명백한 문제였다.
 * - 7개 이메일 템플릿(welcome·reservation-confirmed·reservation-waitlisted·
 *   performer-approved·show-reminder·privacy-notice 그룹1/그룹2)과 이 값을 채워 넣는
 *   호출부(on-signup 훅, reservations 서버 액션, privacy-notice 배치 스크립트·cron)를
 *   전부 추적했지만, "이름이 없으면 회사명을 넣는다"는 fallback은 코드 어디에도 없었다.
 *   전부 `name?.trim()`으로 실제 값을 그대로 쓰거나, 값이 없으면 이름 없이 "안녕하세요."만
 *   출력했다.
 * - 즉 원인은 코드가 아니라 데이터였다: 그 계정의 profiles.name(또는 예약 시 직접 입력한
 *   guest_name) 값 자체가 문자열 "사유유사"였던 것으로 보인다. 로컬 .env.local에는
 *   SUPABASE_SERVICE_ROLE_KEY가 비어 있어(계정·키 발급은 운영자 전용 영역) 운영 DB 값을
 *   직접 조회해 원인을 100% 확정할 수는 없었지만, 코드 경로상 이 값 외에 다른 원인은
 *   찾을 수 없었다. 사장님 본인 계정의 이름(마이페이지)이 "사유유사"로 되어 있다면
 *   거기서 실제 이름으로 바꿔 주시는 것이 데이터 차원의 근본 해결이다.
 * - 데이터가 무엇이든 코드 쪽에서도 "회사·서비스 이름이 인사말에 그대로 들어가는" 패턴을
 *   원천 차단하도록 안전장치를 추가한다. 7개 템플릿에 흩어져 있던 동일한
 *   `trimmedName ? ... : "안녕하세요."` 로직도 이 파일 하나로 모아 중복을 없앤다.
 */

// 정확히 이 문자열들과 "같을 때"만 걸러낸다(부분 포함 매칭 X) — 실제 회원 이름에
// 우연히 이 글자가 들어간 경우(예: "김유사")까지 지워버리지 않기 위함.
const BRAND_NAMES = ["사유유사", "SYUS", "사유유사 SYUS", "무대올림", "시우스"];

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

const NORMALIZED_BRAND_NAMES = new Set(BRAND_NAMES.map(normalize));

/**
 * 이메일 인사말에 안전하게 쓸 수 있는 이름을 반환한다.
 * - 값이 없거나 공백뿐이면 null
 * - 회사·서비스 브랜드명과 (공백·대소문자 무시하고) 완전히 같으면 null
 * - 그 외에는 trim된 실제 값을 그대로 반환
 *
 * 호출부는 null일 때 "회원님" 등 일반 호칭으로 대체해야 한다(회사명으로 대체 금지).
 */
export function safeGreetingName(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  if (NORMALIZED_BRAND_NAMES.has(normalize(trimmed))) return null;
  return trimmed;
}
