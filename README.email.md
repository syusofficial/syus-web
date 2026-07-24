# 이메일 발송 시스템 가동 가이드

> 사장님 직접 액션 가이드 — 한 번만 세팅하면 이후엔 자동 발송됩니다.
> 작성: 제작팀 · 2026-06-08

---

## 무엇이 자동화됐나

1. **회원가입 환영 메일** — 가입자가 컨펌 메일의 링크를 클릭한 직후, `welcome` 템플릿이 1회 발송됩니다.
2. **공연자 승인 메일** — 관리자 페이지에서 "승인" 버튼을 누르면 DB 갱신과 동시에 `performer-approved` 템플릿이 1회 발송됩니다.

발신: `사유유사 SYUS <no-reply@syus.co.kr>` (인스타그램과 동일하게 발신 명의는 항상 사유유사 — 2026-07-24)
회신: `syusflux@gmail.com` (사장님 Gmail로 직행)

---

## 사장님이 직접 해야 할 일 (한 번만)

### 1. 의존성 설치

프로젝트 폴더에서:

```bash
npm install
```

새 패키지(`resend`, `@react-email/components`)가 잠겨 들어갑니다.

### 2. Resend 가입 · 도메인 인증

1. https://resend.com 가입 (Google 계정 가능)
2. 좌측 메뉴 **Domains → Add Domain → `syus.co.kr`** 입력
3. 안내되는 DNS 레코드(SPF/DKIM/Return-Path 3~4개)를 도메인 등록업체(가비아 등)에서 추가
4. 인증 완료(보통 10분~수시간) → "Verified" 표시 확인
5. 좌측 **API Keys → Create API Key → Full Access** 1개 발급 → 키 복사

> 인증 전이라도 Resend의 `onboarding@resend.dev` 발신지로 테스트는 가능합니다.
> 운영 발신지(`no-reply@syus.co.kr`)를 쓰려면 인증이 필요합니다.

### 3. 환경변수 입력

`.env.local` (로컬 테스트용) 과 **Vercel 대시보드 → Settings → Environment Variables** 양쪽에 모두 입력합니다.

| 키 | 값 |
|---|---|
| `RESEND_API_KEY` | (Resend에서 발급받은 키) |
| `RESEND_FROM` | `사유유사 SYUS <no-reply@syus.co.kr>` |
| `RESEND_REPLY_TO` | `syusflux@gmail.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | (Supabase → Project Settings → API → service_role secret 키) |
| `SYUS_WEBHOOK_SECRET` | 사장님이 임의로 만든 긴 랜덤 문자열 (예: 64자 영숫자) |

> `SYUS_WEBHOOK_SECRET`은 외부에 노출되면 안 됩니다. 무작위 생성기 권장:
> https://www.random.org/strings/?num=1&len=40&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain

Vercel에 입력한 뒤 **Redeploy** 한 번 눌러 주세요.

### 4. profiles 테이블에 멱등성 컬럼 추가 (선택, 권장)

Supabase 대시보드 **SQL Editor**에서 1회 실행:

```sql
alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;
```

이 컬럼이 있으면 같은 사용자에게 환영 메일이 두 번 가는 일을 DB 레벨에서 막아 줍니다.
없어도 동작은 하지만, Vercel 인스턴스가 새로 뜰 때마다 재발송될 위험이 약간 있습니다.

### 5. Supabase Database Webhook 등록 (회원가입 환영 메일용)

Supabase 대시보드 **Database → Webhooks → Create a new hook** 클릭:

| 필드 | 값 |
|---|---|
| Name | `syus_on_signup_welcome` |
| Table | `auth.users` |
| Events | `Insert`, `Update` (둘 다 체크) |
| Type | HTTP Request |
| Method | `POST` |
| URL | `https://syus.co.kr/api/hooks/on-signup` |
| HTTP Headers | `x-syus-webhook-secret: (4번에서 정한 SYUS_WEBHOOK_SECRET 값)` |
| HTTP Params | (비워둠) |

> auth 스키마 webhook을 만들려면 Supabase 프로젝트 설정에서 "Enable webhooks on auth schema"를 켜야 할 수 있습니다.
> 만약 그래도 auth.users에 직접 거는 게 막힌다면, 대안: public.profiles에 트리거를 걸어 INSERT 시 호출하도록 바꿀 수 있습니다. (현재 코드는 두 케이스 모두 호환 — record.email/id만 있으면 동작)

### 6. 동작 확인

1. 본인 다른 이메일로 회원가입 시도
2. 컨펌 메일이 도착 → 링크 클릭 → 컨펌 완료
3. 잠시 뒤(수 초~수십 초) "사유유사 무대올림에 오신 것을 환영합니다" 메일이 도착하면 성공
4. 받은 메일에 그대로 답장 → `syusflux@gmail.com`으로 들어오는지 확인

문제가 생기면 Vercel **Logs → Functions** 에서 `/api/hooks/on-signup` 로그를 확인하세요. 어디서 막혔는지 한눈에 보입니다.

---

## 보안 약속

- `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SYUS_WEBHOOK_SECRET`은 **절대 코드에 직접 넣지 않습니다.** 환경변수에만 보관됩니다.
- `.env.local`은 git에 커밋되지 않습니다(`.gitignore`에서 `.env*` 차단).
- service role 키는 서버 사이드 코드에서만 import 됩니다.

---

## 정리 — 사장님이 누를 버튼만 한눈에

- [ ] `npm install`
- [ ] resend.com 가입 + `syus.co.kr` 도메인 인증
- [ ] Resend API 키 발급 → `RESEND_API_KEY`에 입력
- [ ] Supabase service_role 키 → `SUPABASE_SERVICE_ROLE_KEY`에 입력
- [ ] 랜덤 문자열 생성 → `SYUS_WEBHOOK_SECRET`에 입력
- [ ] Vercel 환경변수 5종 모두 등록 → Redeploy
- [ ] Supabase SQL Editor에서 `welcome_email_sent_at` 컬럼 추가 (1줄)
- [ ] Supabase Webhook `syus_on_signup_welcome` 등록
- [ ] 테스트 가입 → 메일 도착 확인

여기까지가 사장님 손이 필요한 전부입니다. 이후로는 한 줄도 손대지 않으셔도 가입·승인 메일이 자동으로 나갑니다.
