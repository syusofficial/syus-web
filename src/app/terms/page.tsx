import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "사유유사 SYUS 서비스 이용약관",
};

export default function TermsPage() {
  const sections = [
    {
      h: "제1조 (목적)",
      body: (
        <p>
          본 약관은 사유유사(이하 &ldquo;회사&rdquo;)가 운영하는 사이트 SYUS(syus.co.kr, 이하 &ldquo;서비스&rdquo;)에서
          제공하는 공연 정보 서비스의 이용조건 및 절차, 회원과 회사의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      ),
    },
    {
      h: "제2조 (용어의 정의)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>&ldquo;회원&rdquo;이란 서비스에 가입하여 서비스를 이용하는 자를 말합니다.</li>
          <li>&ldquo;공연자&rdquo;란 회원 중 공연자 신청을 통해 공연을 등록할 수 있는 권한을 부여받은 자를 말합니다.</li>
          <li>&ldquo;공연&rdquo;이란 공연자가 서비스에 등록한 연극, 뮤지컬, 무용, 발레, 국악, 음악, 전통연희 등의 무대예술 콘텐츠를 말합니다.</li>
          <li>&ldquo;관리자&rdquo;란 회사로부터 서비스 운영 권한을 부여받은 자를 말합니다.</li>
        </ol>
      ),
    },
    {
      h: "제3조 (약관의 게시 및 개정)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>회사는 본 약관을 서비스 내 별도 화면에 게시합니다.</li>
          <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
          <li>약관이 개정될 경우 회사는 시행일 7일 전부터 공지합니다. 다만 회원에게 불리한 개정의 경우 30일 전에 공지합니다.</li>
        </ol>
      ),
    },
    {
      h: "제4조 (회원가입)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>가입 희망자가 본 약관 및 개인정보처리방침에 동의하고 이메일 인증을 완료하면 회원가입이 완료됩니다.</li>
          <li>
            회사는 다음의 경우 가입을 거절하거나 사후에 취소할 수 있습니다.
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>타인의 명의를 도용한 경우</li>
              <li>허위 정보를 기재한 경우</li>
              <li>공공질서나 미풍양속에 반하는 경우</li>
              <li>이전에 회원자격 상실된 자가 재가입을 신청하는 경우</li>
            </ul>
          </li>
        </ol>
      ),
    },
    {
      h: "제5조 (회원 탈퇴 및 자격 상실)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>회원은 언제든지 탈퇴할 수 있으며, 탈퇴 요청은 이메일(syusflux@gmail.com)을 통해 접수합니다.</li>
          <li>탈퇴 시 회원이 등록한 공연 정보는 함께 삭제되며 복구되지 않습니다.</li>
          <li>회사는 회원이 본 약관을 중대하게 위반한 경우 회원자격을 상실시킬 수 있습니다.</li>
        </ol>
      ),
    },
    {
      h: "제6조 (공연자 권한 및 공연 등록)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>일반 회원은 마이페이지에서 공연자 신청을 통해 공연자 권한을 부여받을 수 있습니다.</li>
          <li>공연자가 등록한 공연은 관리자의 검토 후 게시되며, 관리자는 내용의 적절성을 판단할 권한을 가집니다.</li>
          <li>다음의 경우 공연 등록이 반려되거나 이미 게시된 공연이 삭제될 수 있습니다.
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>허위 또는 부정확한 정보</li>
              <li>타인의 저작권 등 지적재산권을 침해하는 콘텐츠</li>
              <li>공공질서·미풍양속에 반하는 콘텐츠</li>
              <li>기타 관련 법령에 위반되는 콘텐츠</li>
            </ul>
          </li>
        </ol>
      ),
    },
    {
      h: "제7조 (이용자의 의무)",
      body: (
        <>
          <p>회원은 다음의 행위를 하여서는 안 됩니다.</p>
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li>허위 정보 등록</li>
            <li>타인의 저작권 등 지적재산권 침해</li>
            <li>공공질서 및 미풍양속에 반하는 정보의 게시</li>
            <li>회사의 서비스 운영을 방해하는 행위</li>
            <li>타인을 기망하거나 피해를 끼치는 행위</li>
            <li>기타 관련 법령에 위반되는 행위</li>
          </ol>
        </>
      ),
    },
    {
      h: "제8조 (게시물의 저작권 및 관리)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>공연자가 등록한 공연 정보의 저작권은 공연자에게 귀속됩니다.</li>
          <li>공연자는 회사가 해당 공연 정보를 서비스 내에서 홍보·열람 목적으로 사용하는 것에 동의합니다.</li>
          <li>공연자는 본인이 등록한 공연 정보의 정확성과 합법성에 대해 책임을 집니다.</li>
          <li>타인의 저작권을 침해하는 게시물은 권리자의 통지에 따라 지체 없이 삭제됩니다.</li>
        </ol>
      ),
    },
    {
      h: "제9조 (서비스 제공 및 중단)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>회사는 회원에게 연중 24시간 서비스를 제공하기 위해 노력합니다.</li>
          <li>회사는 시스템 점검, 장애 등으로 서비스 제공을 일시 중지할 수 있으며, 이 경우 사전 공지를 원칙으로 합니다.</li>
          <li>회사는 서비스의 내용을 변경하거나 중단할 수 있으며, 중단 시 회원에게 사전 고지합니다.</li>
        </ol>
      ),
    },
    {
      h: "제10조 (책임의 제한)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한 서비스 제공 불가에 대해 책임을 지지 않습니다.</li>
          <li>회사는 공연자가 등록한 공연 정보의 정확성, 신뢰성에 대해 보증하지 않으며, 이로 인한 손해에 대해 책임을 지지 않습니다.</li>
          <li>회사는 이용자 상호간 또는 이용자와 제3자 간의 분쟁에 대해 개입할 의무가 없습니다.</li>
          <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대해 책임을 지지 않습니다.</li>
        </ol>
      ),
    },
    {
      h: "제11조 (후기 작성 정책)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>회원은 직접 관람한 공연에 한해 후기를 작성할 수 있으며, 한 공연당 하나의 후기를 작성할 수 있습니다(재제출 시 갱신됩니다).</li>
          <li>허위 사실 적시, 광고·홍보 목적의 게시물, 동일 내용의 중복 게시는 금지됩니다.</li>
          <li>후기 본문의 법적 책임은 작성자 본인에게 있으며, 회사는 정보통신망법 제44조의3에 따라 단순 매개자의 지위에 있습니다.</li>
        </ol>
      ),
    },
    {
      h: "제12조 (자동 필터링 및 게시물 관리)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>회사는 욕설·비방·차별 표현·성적 표현·개인정보 노출 등을 자동 필터링 시스템(한국어 사전 매칭 및 OpenAI Moderation API)으로 검출하여 사전 통지 없이 게시 차단·블라인드·삭제할 수 있습니다.</li>
          <li>자동 필터링을 통과한 게시물에 대해서도 부적절한 내용이 확인되면 회사는 사전 통지 없이 즉시 삭제할 수 있습니다.</li>
          <li>회원은 부적절한 게시물을 신고할 수 있으며, 회사는 신고 접수 후 24시간 내 검토합니다. 신고 3건 누적 시 게시물은 자동으로 블라인드 처리됩니다.</li>
        </ol>
      ),
    },
    {
      h: "제13조 (권리침해 신고 및 임시조치)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>본인의 권리(명예, 초상, 저작권 등)가 침해된 회원은 syusflux@gmail.com으로 신고할 수 있습니다.</li>
          <li>회사는 정보통신망법 제44조의2에 따라 권리침해 주장 게시물에 대해 30일간 임시조치(블라인드)할 수 있으며, 그 기간 동안 작성자의 이의제기를 받습니다.</li>
          <li>임시조치 결과는 신고인과 작성자에게 통지되며, 회사는 그 처리 과정을 기록·보존합니다.</li>
        </ol>
      ),
    },
    {
      h: "제14조 (계정 제재)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>본 약관을 반복·중대 위반한 회원의 후기 작성 권한은 사전 통지 없이 제한될 수 있습니다.</li>
          <li>제재 사유는 회원이 1:1 문의로 확인을 요청할 수 있으며, 회사는 합리적 범위 내에서 응답합니다.</li>
          <li>중대한 위법 행위(명예훼손·모욕·개인정보 노출 등)는 관련 법령에 따라 별도의 법적 조치 대상이 될 수 있습니다.</li>
        </ol>
      ),
    },
    {
      h: "제15조 (운영자 면책)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>회사는 회원이 작성한 게시물의 정확성·합법성·완전성에 대해 보증하지 않으며, 그로 인한 손해에 대해 책임지지 않습니다.</li>
          <li>회사는 정보통신망법 제44조의3에 따라 회원의 게시물에 대한 책임이 면제될 수 있으며, 권리침해 신고에 대한 임시조치·삭제 의무를 이행한 경우 책임 범위가 제한됩니다.</li>
        </ol>
      ),
    },
    {
      h: "제16조 (분쟁 해결)",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>본 약관의 해석 및 이용자와 회사 간의 분쟁에 대해서는 대한민국의 법률을 적용합니다.</li>
          <li>회사와 이용자 간에 발생한 소송은 민사소송법상 관할 법원을 따릅니다.</li>
        </ol>
      ),
    },
    {
      h: "부칙",
      body: (
        <ol className="list-decimal pl-5 space-y-1">
          <li>본 약관은 2026년 4월 25일부터 시행됩니다.</li>
          <li>2026년 6월 2일자 개정 — 공연 후기 기능 신설에 따라 제11조~제15조 추가 (변호사 검수 권고 — 시행 전 검토 필요).</li>
        </ol>
      ),
    },
  ];

  return (
    <div className="pt-24 md:pt-32 min-h-screen px-6 md:px-12 lg:px-20 py-16" style={{ backgroundColor: "#FBF8F1" }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
          >
            Terms of Service
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
          >
            이용약관
          </h1>
          <p className="text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C" }}>
            시행일: 2026년 4월 25일
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}>
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}>
                {s.h}
              </h2>
              {s.body}
            </section>
          ))}

          <div className="pt-8 text-center" style={{ borderTop: "1px solid #D8D3C9" }}>
            <Link href="/" className="text-xs tracking-[0.2em] uppercase" style={{ fontFamily: "var(--font-inter)", color: "#3B5A6B" }}>
              ← 홈으로
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
