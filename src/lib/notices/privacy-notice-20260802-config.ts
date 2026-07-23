/**
 * 신규 가입자 자동 통지에 쓸 "제목·템플릿"만 모아둔 설정 파일.
 *
 * 배경 — 2026-08-02 시행 개인정보처리방침 개정(Anthropic PBC 위탁·국외이전 추가) 통지는
 * 두 갈래로 나간다.
 *   1) 기존 가입 회원 전체(가입일 < 2026-08-02) — 1회성 배치 (scripts/privacy-notice-20260802/send.ts, 수동 실행)
 *   2) 가입일 ≥ 2026-08-02인 회원 — 이 파일 + api/cron/privacy-notice-20260802 가 매일 자동 처리
 *
 * 2026-07-22 법무팀이 신규 가입자 전용 문구를 확정했다
 * (output/legal/2026-07-20_anthropic_통지_신규가입자_포함_결정.md §4). 이 파일이 그 결정을
 * 코드에 반영하는 유일한 접점이다 — 문구가 다시 바뀌면 이 파일과
 * privacy-notice-2026-08-new-signup.tsx 만 고치면 된다. 자동화 파이프라인(쿼리·cron·플래그)은
 * 건드릴 필요가 없다.
 *
 * 주의 — 이 설정은 "가입일 ≥ 2026-08-02"인 사람에게만 적용된다. 가입일이 그보다 빠른
 * 사람(그룹 1)은 이 템플릿을 받으면 안 된다 — 문구가 "이미 적용 중"이라는 안내형인데,
 * 그룹 1은 아직 시행 전 방침으로 가입했으므로 사실과 어긋난다. 가입일 분기는
 * api/cron/privacy-notice-20260802/route.ts 가 담당한다.
 */
import { NewSignupPrivacyNotice20260802Email } from "@/lib/email/templates/privacy-notice-2026-08-new-signup";

export const NEW_SIGNUP_NOTICE_SUBJECT = "[사유유사] 개인정보 위탁·국외이전 안내 (창작 독백 기능)";

/** 가입일 ≥ 2026-08-02 회원에게 보낼 이메일 컴포넌트. */
export const NewSignupPrivacyNoticeEmail = NewSignupPrivacyNotice20260802Email;
