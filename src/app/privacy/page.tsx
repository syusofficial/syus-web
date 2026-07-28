import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "사유유사의 개인정보처리방침",
};

// 변경 고지 배너의 날짜 게이트(shouldShowBanner)가 매 요청마다 재평가되도록 1시간 단위 SSR 재실행
export const revalidate = 3600;

// ─── 변경 고지 배너 (7일 노출) ───────────────────────────────
// 시행일(2026-08-02) ~ 시행 +7일(2026-08-09) 동안만 노출.
// 종료일이 지나면 서버 컴포넌트 SSR 시점에 자동으로 사라짐.
// ⚠️ 2026-08-02는 잠정 시행일입니다. 위탁사 추가(Anthropic)가 제12조상 "중대한 영향" 변경에
// 해당하는지, 30일 전 고지·개별 이메일 통지가 필요한지는 변호사 확인이 필요합니다
// (근거: output/legal/2026-07-02_privacy_policy_syus_addendum_draft.md 제6조 항목).
// 실제 발행 시점에 맞춰 사장님이 이 날짜를 재조정해야 합니다.
const BANNER_START = "2026-08-02";
const BANNER_END = "2026-08-09";

function shouldShowBanner(now: Date): boolean {
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC 기준, 7일 윈도라 시차 영향 미미)
  return today >= BANNER_START && today <= BANNER_END;
}

export default function PrivacyPage() {
  const showBanner = shouldShowBanner(new Date());

  return (
    <div
      className="pt-24 md:pt-36 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F0EEE9" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* 변경 고지 배너 — 2026-08-02 ~ 2026-08-09 */}
        {showBanner && (
          <div
            className="mb-8 p-4 md:p-5"
            style={{
              backgroundColor: "#FFE066",
              borderLeft: "4px solid #0B5563",
            }}
          >
            <p
              className="text-xs tracking-[0.25em] uppercase mb-2"
              style={{ fontFamily: "var(--font-inter)", color: "#0B5563" }}
            >
              Notice
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}
            >
              <strong>2026-08-02 개인정보처리방침이 v2.2로 개정되었습니다.</strong>
              <br />
              주요 변경: 시우스 커뮤니티(견해글·QnA·자유 게시판·관람 후기·창작 독백·책 서재) 서비스 제공 목적·수집 항목·보유 기간 추가 · 창작 독백 생성을 위한 위탁사 Anthropic PBC(미국) 추가 · 공연 좌석 신청(예약) 서비스 제공 목적·수집 항목(이름·연락처·인원수)·보유 기간(공연 종료 후 1개월) 추가.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-12">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
          >
            Privacy Policy
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}
          >
            개인정보처리방침
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E" }}>
            시행일: 2026-08-02 (v2.2) · 이전 시행일: 2026-06-15
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#4A3B33" }}>
          <p>
            사유유사(이하 &ldquo;회사&rdquo;)는 이용자의 개인정보를 소중하게 다루며,
            「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관계 법령이 정한 바를 준수합니다.
            회사는 본 처리방침을 통해 어떤 정보를, 어떤 목적으로, 얼마 동안 보관하는지 정직하게 알립니다.
          </p>

          {/* 제1조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제1조 (개인정보의 처리 목적)
            </h2>
            <p className="mb-2">
              회사는 다음의 목적을 위해 개인정보를 처리하며, 처리 목적이 변경될 경우 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>회원 가입 및 관리 — 회원 식별, 본인 확인, 부정 이용 방지</li>
              <li>서비스 제공 — 공연 정보 열람, 공연 등록, 후기 작성, 1:1 문의 응대</li>
              <li>서비스 개선 — 이용 통계 분석, 콘텐츠 품질 점검, 오류 진단</li>
              <li>마케팅 활용(선택) — 신규 콘텐츠·공연 소식 안내(동의 회원에 한정)</li>
              <li>커뮤니티 서비스 제공(시우스) — 견해글·연기 고민 QnA·자유 게시판·관람 후기·책 서재 게시물의 작성·열람, 신고 접수·처리, 창작 독백 요청·생성·전달</li>
            </ol>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제2조 (만 14세 미만 아동의 가입 제한)
            </h2>
            <p>
              회사는 만 14세 미만 아동의 회원 가입을 받지 않습니다. 회원 가입 시 이용자 본인이 만 14세 이상임을 직접 확인·동의하는 절차를 거치며,
              이 동의 없이는 가입이 완료되지 않습니다. 만 14세 미만 아동이 보호자의 동의 없이 가입한 사실이 확인되는 즉시 해당 계정과 수집된 개인정보를 지체 없이 파기합니다.
            </p>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제3조 (처리하는 개인정보 항목)
            </h2>
            <div className="space-y-3">
              <div>
                <p className="font-semibold mb-1">1. 회원가입 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>필수: 이메일, 이름, 비밀번호(bcrypt 단방향 암호화 저장), 만 14세 이상 확인(자기인증 동의)</li>
                  <li>동의 시점 기록: 이용약관·개인정보처리방침 동의 일시, 마케팅 수신 동의 여부</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">2. 소셜 로그인 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Google 로그인: 이메일, 이름, 프로필 이미지 URL, Google 식별자</li>
                  <li>Kakao 로그인: 이메일, 닉네임, 프로필 이미지 URL, Kakao 식별자</li>
                  <li>회사는 위 항목 중 서비스 제공에 필요한 최소한만 보관하며, 추가 항목 요청 시 별도 동의를 받습니다.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">3. 1:1 문의 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>필수: 이름, 이메일, 문의 유형, 문의 내용</li>
                  <li>선택: 연락처(전화번호)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">4. 공연 후기 작성 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>회원 닉네임(공개), 별점, 후기 본문, 작성 일시</li>
                  <li>자동 검열 로그: 매칭 단어·검열 점수(운영자만 열람, 외부 미공개)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">5. 공연 등록(공연자) 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>공연명, 포스터 이미지, 공연장 정보, 주소, 공연 기간, 출연진 등</li>
                  <li>등록자 회원 식별자</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">6. 자동 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>IP 주소, 접속 로그, 브라우저·디바이스 정보, 쿠키, 로컬스토리지(서비스 이용 편의용 키)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">7. 시우스 커뮤니티 게시물 작성 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>게시물 제목·본문·분류(견해글 질문, QnA 질문·답변, 자유 게시판, 관람 후기, 책 후기, 댓글)</li>
                  <li>관람 후기 첨부 이미지 및 이미지 출처(첨부 시 필수)</li>
                  <li>작성자 회원 식별자, 작성 일시</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">8. 신고 접수 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>신고자 회원 식별자, 신고 대상, 신고 사유(자유 기재), 접수 일시</li>
                  <li>신고 내용은 운영자만 열람하며 외부에 공개되지 않습니다.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">9. 창작 독백 요청 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>인물 유형, 감정·상황, 길이, 톤·장르, 용도(연습용/오디션용), 성별·연령대(선택)</li>
                  <li>서고 공개 동의 여부, 생성된 독백 본문, 요청·처리 일시</li>
                  <li>위 요청 정보는 독백 생성을 위해 AI 위탁업체(Anthropic PBC)에 전송됩니다. 자세한 내용은 제6조를 참고하세요.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">10. 공연 좌석 신청(예약) 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>필수: 이름, 연락처(전화번호 또는 이메일), 신청 인원수</li>
                  <li>회원 로그인 상태로 신청한 경우 회원 식별자가 함께 저장되어 마이페이지에서 신청 내역을 확인할 수 있습니다.</li>
                  <li>좌석 신청은 희망 접수이며, 실제 입장이 보장되는 것은 아닙니다. 신청 정보는 좌석 신청 확인·취소 목적으로만 이용되며, 공연팀·제3자에게 별도 제공되지 않습니다.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제4조 (개인정보의 처리 및 보유 기간)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #D4CFC1" }}>
                    <th className="text-left py-2 pr-4" style={{ color: "#5A4A3E" }}>구분</th>
                    <th className="text-left py-2 pr-4" style={{ color: "#5A4A3E" }}>보유 기간</th>
                    <th className="text-left py-2" style={{ color: "#5A4A3E" }}>근거</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["회원 가입 정보", "회원 탈퇴 시까지", "서비스 제공 목적 종료"],
                    ["1:1 문의 기록", "접수 후 3년", "소비자분쟁 해결기준"],
                    ["공연 정보", "공연자 삭제 요청 또는 회원 탈퇴 시까지", "서비스 제공 목적 종료"],
                    ["공연 후기", "탈퇴 시 닉네임 익명화('익명 관람객'), 본문 유지 / 본인 직접 삭제 시 즉시 완전 삭제", "사이트 신뢰도 보존(약관 동의 시 명시)"],
                    ["자동 검열 로그", "게시물 보유 기간과 동일", "분쟁·소명 자료"],
                    ["접속 로그·IP", "3개월", "「통신비밀보호법」 제15조의2"],
                    ["페이지뷰 통계", "90일", "서비스 개선 목적 종료"],
                    ["마케팅 수신 동의 회원 정보", "동의 철회 시 또는 회원 탈퇴 시까지", "—"],
                    ["시우스 게시물(견해글 질문·QnA·자유글·관람후기·책후기·댓글)", "본인 직접 삭제 또는 회원 탈퇴 시까지", "서비스 제공 목적 종료"],
                    ["신고 접수 기록", "처리 완료 후 1년", "분쟁·소명 자료"],
                    ["창작 독백 요청·생성 데이터", "회원 탈퇴 시까지(반려·미공개 요청은 처리 후 1년 뒤 별도 정리 검토)", "서비스 제공 목적 종료"],
                    ["공연 좌석 신청(예약) 정보", "해당 공연 종료 후 1개월", "서비스 제공 목적 종료·분쟁 대비 최소 보관"],
                  ].map((row) => (
                    <tr key={row[0]} style={{ borderBottom: "1px solid #E6E1D6" }}>
                      {row.map((c, i) => <td key={i} className="py-2 pr-4 align-top">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 제5조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제5조 (개인정보의 제3자 제공)
            </h2>
            <p>회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다음의 경우에 한해 예외로 합니다.</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>「개인정보 보호법」 제17조 제1항 제2호 등 법령에 특별한 규정이 있는 경우</li>
              <li>수사기관이 법령에 정해진 절차와 방법에 따라 요구하는 경우</li>
            </ol>
          </section>

          {/* 제6조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제6조 (개인정보 처리의 위탁 및 국외 이전)
            </h2>
            <p>
              회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있으며, 위탁 계약 시 「개인정보 보호법」 제26조에 따라 안전조치를 명시하고 있습니다.
              다음 표에 기재된 수탁자 중 일부는 국외에 서버를 두고 있으며, 회원가입·문의 접수 시 본 처리방침 동의로써 국외 이전에 대한 동의를 갈음합니다(「개인정보 보호법」 제28조의8).
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #D4CFC1" }}>
                    <th className="text-left py-2 pr-4" style={{ color: "#5A4A3E" }}>수탁자</th>
                    <th className="text-left py-2 pr-4" style={{ color: "#5A4A3E" }}>위탁 업무</th>
                    <th className="text-left py-2 pr-4" style={{ color: "#5A4A3E" }}>국가</th>
                    <th className="text-left py-2 pr-4" style={{ color: "#5A4A3E" }}>이전 방법·시점</th>
                    <th className="text-left py-2" style={{ color: "#5A4A3E" }}>보유 기간</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Supabase Inc.", "데이터베이스·인증·스토리지", "미국", "회원가입·서비스 이용 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                    ["Vercel Inc.", "웹 서비스 호스팅·서버리스 함수", "미국", "서비스 이용 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                    ["Google LLC", "웹 트래픽 분석(GA4), 로그인 인증(OAuth)", "미국", "서비스 이용 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                    ["Microsoft Corporation", "사용자 행동 분석(Clarity)", "미국", "서비스 이용 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                    ["Kakao Corp.", "로그인 인증(OAuth)", "대한민국", "로그인 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                    ["OpenAI, L.L.C.", "후기 자동 검열(Moderation API)", "미국", "후기 작성 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                    ["Resend, Inc.", "이메일 발송(가입 안내·답변 통지)", "미국", "이메일 발송 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                    ["Anthropic PBC", "창작 독백 생성(AI 모델 API, Claude)", "미국", "독백 요청 시 TLS 암호화 전송", "위탁 계약 종료 시까지"],
                  ].map((row) => (
                    <tr key={row[0]} style={{ borderBottom: "1px solid #E6E1D6" }}>
                      {row.map((c, i) => <td key={i} className="py-2 pr-4 align-top">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              이용자는 국외 이전에 동의하지 않을 권리가 있으며, 거부 시 일부 서비스(회원 가입·로그인·문의 접수·후기 작성·창작 독백 요청·이메일 통지) 이용이 제한될 수 있습니다.
            </p>
          </section>

          {/* 제7조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제7조 (정보주체와 법정대리인의 권리·의무 및 행사 방법)
            </h2>
            <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구 (법령상 보존 의무가 있는 정보는 제외)</li>
              <li>처리정지 요구</li>
              <li>마케팅 수신 동의 등 동의 철회</li>
            </ol>
            <p className="mt-3">
              권리 행사는 이메일(
              <a href="mailto:syusflux@gmail.com" style={{ color: "#0B5563" }}>syusflux@gmail.com</a>
              ), 1:1 문의(
              <Link href="/muol/contact" style={{ color: "#0B5563" }}>/contact</Link>
              ) 또는 마이페이지(
              <Link href="/mypage" style={{ color: "#0B5563" }}>/mypage</Link>
              )를 통해 하실 수 있으며, 회사는 지체 없이(영업일 기준 10일 이내) 조치합니다.
            </p>
            <div className="mt-4 p-4" style={{ backgroundColor: "#E6E1D6" }}>
              <p className="font-semibold mb-2">마케팅 수신 동의 철회 방법</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>마이페이지(/mypage) → 설정 → 마케팅 수신 옵션 토글로 즉시 철회</li>
                <li>회사로부터 받은 마케팅 이메일 본문 하단의 &ldquo;수신 거부&rdquo; 링크 클릭으로 즉시 철회</li>
              </ol>
              <p className="mt-2 text-xs" style={{ color: "#5A4A3E" }}>
                위 두 경로 중 어느 것을 이용하셔도 동일하게 즉시 처리되며, 별도 절차나 추가 인증이 필요하지 않습니다.
              </p>
            </div>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제8조 (개인정보의 파기 절차 및 방법)
            </h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>파기 절차 — 회사는 보유 기간이 경과하거나 처리 목적이 달성된 개인정보를 지체 없이 파기합니다. 다른 법령에 따라 보존 의무가 있는 경우 별도의 데이터베이스로 분리 보관 후 파기합니다.</li>
              <li>파기 방법 — 전자적 파일 형태는 복구 불가능한 방법(논리적·물리적 삭제)으로 영구 삭제하며, 출력물 형태는 분쇄 또는 소각하여 파기합니다.</li>
            </ol>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제9조 (개인정보의 안전성 확보 조치)
            </h2>
            <p>회사는 「개인정보 보호법」 제28조의2 및 동법 시행령 제30조에 따라 다음의 안전조치를 시행합니다.</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>관리적 조치 — 내부 관리 계획 수립, 접근 권한 분리(RLS), 최소 권한 원칙 적용</li>
              <li>기술적 조치 — 비밀번호 단방향 암호화(bcrypt), 모든 통신 구간 HTTPS/TLS 암호화, 데이터베이스 접근 통제, Content Security Policy 등 보안 헤더</li>
              <li>자동 세션 만료 — 회원 보안을 위해 마지막 활동으로부터 3시간 또는 로그인 후 12시간 경과 시 세션이 자동 종료됩니다.</li>
              <li>물리적 조치 — 클라우드 인프라(Supabase·Vercel)의 데이터센터 보안 정책 준수</li>
            </ol>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제10조 (개인정보 자동 수집 장치의 설치·운영 및 거부)
            </h2>
            <p>회사는 이용자 편의 증진과 서비스 개선을 위해 다음의 자동 수집 장치를 운영합니다.</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li><strong>쿠키·로컬스토리지</strong> — 로그인 상태 유지, 문의 쿨다운 등 서비스 제공에 필요한 최소 범위</li>
              <li><strong>GA4 (Google Analytics 4)</strong> — 페이지뷰·유입 경로 등 익명 통계</li>
              <li><strong>Microsoft Clarity</strong> — 사용자 행동 패턴(클릭·스크롤·세션 리플레이) 분석. 입력값은 마스킹되어 비밀번호·문의 내용 등 식별 가능한 텍스트는 수집되지 않습니다.</li>
              <li><strong>Realtime Presence</strong> — 현재 접속자 수 표시(개인 식별 정보 미수집)</li>
              <li><strong>페이지뷰 집계</strong> — 페이지별 조회 수 집계(90일 보유)</li>
            </ol>
            <p className="mt-3">
              이용자는 브라우저 설정에서 쿠키 저장을 거부하거나, Google Analytics Opt-out(
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: "#0B5563" }}>tools.google.com/dlpage/gaoptout</a>
              ), Microsoft Clarity 옵트아웃(
              <a href="https://clarity.microsoft.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#0B5563" }}>clarity.microsoft.com</a>
              ) 절차를 이용할 수 있습니다. 다만 이 경우 로그인 등 일부 서비스 이용에 제한이 발생할 수 있습니다.
            </p>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제11조 (개인정보 보호 담당자)
            </h2>
            <p>
              회사는 이용자의 개인정보 처리에 관한 업무를 총괄해서 책임지고, 처리 관련 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호 담당자를 지정하고 있습니다.
            </p>
            <div className="mt-3 p-5" style={{ backgroundColor: "#E6E1D6" }}>
              <div className="grid grid-cols-[110px_1fr] gap-2 text-xs">
                <span style={{ color: "#5A4A3E" }}>개인정보 보호 담당자</span><span>운영자 이혁호</span>
                <span style={{ color: "#5A4A3E" }}>사업자등록번호</span><span>168-05-03666</span>
                <span style={{ color: "#5A4A3E" }}>연락처</span><span>syusflux@gmail.com</span>
                <span style={{ color: "#5A4A3E" }}>담당 부서</span><span>사유유사 운영팀</span>
              </div>
            </div>
            <p className="mt-3">
              이용자는 회사의 서비스를 이용하면서 발생한 모든 개인정보 보호 관련 문의·불만 처리·피해 구제 등을 위 담당자에게 문의하실 수 있으며, 회사는 신속하고 충분한 답변을 드리겠습니다.
              기타 개인정보 침해에 대한 신고·상담이 필요한 경우 다음 기관에 문의하시기 바랍니다.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2 text-xs">
              <li>개인정보 침해신고센터 (privacy.kisa.or.kr / 국번 없이 118)</li>
              <li>개인정보 분쟁조정위원회 (kopico.go.kr / 1833-6972)</li>
              <li>대검찰청 사이버수사과 (spo.go.kr / 국번 없이 1301)</li>
              <li>경찰청 사이버수사국 (ecrm.cyber.go.kr / 국번 없이 182)</li>
            </ul>
          </section>

          {/* 제12조 */}
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#0B5563" }}>
              제12조 (처리방침의 변경)
            </h2>
            <p>
              본 처리방침의 내용이 추가·삭제·수정되는 경우, <strong>시행 7일 전부터 본 페이지를 통해 고지</strong>합니다.
              다만 수집 항목·이용 목적·제3자 제공·위탁 등 이용자 권리에 중대한 영향을 미치는 변경의 경우 <strong>시행 30일 전부터 고지</strong>하며, 회원 가입 시 동의한 이메일 주소로 개별 통지합니다.
            </p>
          </section>

          <p className="pt-2 text-xs" style={{ color: "#5A4A3E" }}>
            본 처리방침은 2026-08-02부터 시행됩니다. (이전 시행일: 2026-06-15)
          </p>

          <div className="pt-8 text-center" style={{ borderTop: "1px solid #D4CFC1" }}>
            <Link href="/" className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#0B5563" }}>
              ← 홈으로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
