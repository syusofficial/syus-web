import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "(주)사유유사의 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div
      className="pt-24 min-h-screen px-6 md:px-12 lg:px-20 py-16"
      style={{ backgroundColor: "#F4EDE3" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
          >
            Privacy Policy
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
          >
            개인정보처리방침
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}>
            시행일: 2026년 4월 25일
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
          <p>
            (주)사유유사(이하 &ldquo;회사&rdquo;)는 이용자의 개인정보를 소중하게 생각하며,
            「개인정보 보호법」 및 관계 법령이 정한 바를 준수하고 있습니다.
          </p>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제1조 (개인정보의 처리 목적)
            </h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>회원 가입 및 관리: 회원 식별, 본인 확인, 서비스 이용에 따른 본인확인</li>
              <li>서비스 제공: 공연 정보 열람, 공연 등록(공연자), 마이페이지 기능 제공</li>
              <li>고충 처리: 민원인의 신원 확인, 문의사항 확인 및 처리결과 통보</li>
              <li>서비스 개선: 이용 통계 분석 (Google Analytics)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제2조 (처리하는 개인정보 항목)
            </h2>
            <div className="space-y-3">
              <div>
                <p className="font-semibold mb-1">1. 회원가입 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>필수: 이메일, 이름, 비밀번호(암호화 저장)</li>
                  <li>자동 수집: IP 주소, 접속 로그, 쿠키, 브라우저 정보</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">2. 공연 등록(공연자) 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>공연명, 포스터 이미지, 공연장 정보, 주소, 공연 기간, 출연진 등</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">3. 문의 시 수집 항목</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>이름, 이메일, 문의 내용</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제3조 (개인정보의 처리 및 보유기간)
            </h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>회원 가입 및 관리: 회원 탈퇴 시까지</li>
              <li>공연 정보: 공연자가 삭제 요청 시 또는 회원 탈퇴 시까지</li>
              <li>문의 기록: 접수 후 3년 (소비자분쟁 해결기준에 따름)</li>
              <li>관련 법령에 의한 보존의무가 있는 경우 해당 기간까지 보관합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제4조 (개인정보의 제3자 제공)
            </h2>
            <p>
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다.
            </p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제5조 (개인정보 처리의 위탁)
            </h2>
            <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #D4CFC9" }}>
                    <th className="text-left py-2 pr-4" style={{ color: "#9B9693" }}>수탁자</th>
                    <th className="text-left py-2 pr-4" style={{ color: "#9B9693" }}>위탁 업무</th>
                    <th className="text-left py-2" style={{ color: "#9B9693" }}>국가</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Supabase Inc.", "데이터베이스 및 인증", "미국"],
                    ["Vercel Inc.",   "웹 서비스 호스팅",       "미국"],
                    ["Google LLC",    "웹 트래픽 분석 (GA4)",    "미국"],
                  ].map((row) => (
                    <tr key={row[0]} style={{ borderBottom: "1px solid #E8DDD0" }}>
                      {row.map((c, i) => <td key={i} className="py-2 pr-4">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제6조 (정보주체의 권리·의무)
            </h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>개인정보 열람 요구</li>
              <li>오류가 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ol>
            <p className="mt-3">
              권리 행사는 이메일(<a href="mailto:syusflux@gmail.com" style={{ color: "#6D3115" }}>syusflux@gmail.com</a>)을 통해 하실 수 있으며,
              회사는 지체없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제7조 (개인정보의 파기)
            </h2>
            <p>
              회사는 개인정보 보유기간 경과 또는 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
              전자적 파일 형태는 복구가 불가능한 방법으로 영구 삭제하며, 출력물 형태는 분쇄 또는 소각하여 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제8조 (개인정보의 안전성 확보조치)
            </h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>비밀번호 암호화 저장 (bcrypt)</li>
              <li>모든 통신 구간 HTTPS 암호화 (TLS)</li>
              <li>접근 권한 분리 (RLS) 및 최소 권한 원칙 적용</li>
              <li>Content Security Policy 등 보안 헤더 설정</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제9조 (개인정보 보호책임자)
            </h2>
            <div className="p-5" style={{ backgroundColor: "#E8DDD0" }}>
              <div className="grid grid-cols-[80px_1fr] gap-2 text-xs">
                <span style={{ color: "#9B9693" }}>성명</span><span>이혁호 (대표)</span>
                <span style={{ color: "#9B9693" }}>직책</span><span>(주)사유유사 대표이사</span>
                <span style={{ color: "#9B9693" }}>연락처</span><span>syusflux@gmail.com</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제10조 (쿠키의 운용 및 거부)
            </h2>
            <p>
              회사는 로그인 상태 유지 및 이용자의 서비스 이용 편의 증진을 위해 쿠키를 사용합니다.
              이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 등 일부 서비스 이용에 제한이 발생할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}>
              제11조 (변경 고지)
            </h2>
            <p>
              본 방침의 내용이 추가·변경되는 경우, 변경사항의 시행 7일 전에 본 페이지를 통해 고지합니다.
            </p>
          </section>

          <div className="pt-8 text-center" style={{ borderTop: "1px solid #D4CFC9" }}>
            <Link href="/" className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#6D3115" }}>
              ← 홈으로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
