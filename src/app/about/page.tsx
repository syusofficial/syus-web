import type { Metadata } from "next";
import Link from "next/link";
import { buildBreadcrumbList } from "@/lib/structuredData";

export const metadata: Metadata = {
  title: "무대올림 · 소개",
  description:
    "무대올림은 대학 무대예술 공연을 올리고, 지역 관객이 무료 좌석을 예약하는 플랫폼입니다. 연극·뮤지컬·무용·발레·국악·음악·전통연희. 운영: 사유유사 SYUS.",
  openGraph: {
    title: "무대올림 · 소개",
    description:
      "대학 무대예술 공연을 올리고, 지역 관객이 무료 좌석을 예약하는 플랫폼.",
  },
};

export default function AboutPage() {
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "소개" },
  ]);

  return (
    <div className="pt-24 min-h-screen" style={{ backgroundColor: "#FBF8F1" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* ── Hero ── */}
      <section
        className="px-6 md:px-12 lg:px-20 pt-16 md:pt-20 pb-24 md:pb-32 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top left, #5C7C8E 0%, #3B5A6B 35%, #202833 100%)",
          color: "#FBF8F1",
        }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.4em] uppercase mb-10"
            style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
          >
            About 무대올림
          </p>
          <h1
            className="text-[3rem] sm:text-[4rem] md:text-[5rem] leading-[1.05] font-black tracking-tighter mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#FBF8F1",
              wordBreak: "keep-all",
              textWrap: "balance",
            }}
          >
            오늘,
            <br />
            어느 대학의
            <br />
            <span style={{ color: "#C8D96F" }}>막</span>이 오른다.
          </h1>
          <p
            className="text-lg md:text-xl leading-relaxed max-w-2xl"
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              color: "#FBF8F1",
              opacity: 0.9,
              wordBreak: "keep-all",
            }}
          >
            무대올림은 대학 무대예술 공연을 올리고,
            <br />
            지역 관객이 무료 좌석을 예약하는 곳입니다.
          </p>

          <div
            className="mt-14 pt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2"
            style={{ borderTop: "1px solid rgba(248, 249, 252, 0.25)" }}
          >
            <span
              className="text-sm tracking-[0.15em]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#FBF8F1", opacity: 0.75 }}
            >
              연극 · 뮤지컬 · 무용 · 발레
            </span>
            <span
              className="text-sm tracking-[0.15em]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#FBF8F1", opacity: 0.75 }}
            >
              국악 · 음악 · 전통연희
            </span>
          </div>
        </div>
      </section>

      {/* ── 01. 이름의 의미 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
          >
            01. The Name
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-12"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
          >
            이름의 의미
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 md:gap-10 items-start">
            <p
              className="text-sm tracking-[0.2em]"
              style={{ fontFamily: "var(--font-inter)", color: "#3B5A6B", fontWeight: 600 }}
            >
              무대올림
            </p>
            <div
              className="text-base leading-[1.9]"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A" }}
            >
              <p className="mb-3">
                <strong style={{ color: "#3B5A6B" }}>“무대를 올린다”</strong> — 공연계에서 무대가
                열린다는 바로 그 말.
              </p>
              <p className="mb-3">
                줄임말이 아니라 그 자체로 완결된 표현이라, 처음 듣는 사람도 어떤 공간인지 단번에
                압니다.
              </p>
              <p className="mb-3">
                ‘무대’ 한 글자가 연극·뮤지컬·무용·발레·국악·음악·전통연희까지 모두 품습니다.
              </p>
              <p
                className="pt-3 italic"
                style={{ borderTop: "1px solid #D8D3C9", color: "#7A746C" }}
              >
                공연자에게는 “내 무대가 올라간다.”
                <br />
                관객에게는 “오늘 무대가 올라간다 — 볼 게 생긴다.”
                <br />
                양쪽이 같은 말을 다르게 듣는 자리.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 02. 무엇을 하는가 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#3B5A6B", color: "#FBF8F1" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
          >
            02. What We Do
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-14"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1" }}
          >
            세 가지 동사
          </h2>

          <div className="space-y-12">
            {[
              {
                num: "01",
                title: "올린다",
                body: [
                  "학생 공연자가 무대를 등록하면,",
                  "운영자가 한 번 더 정성스레 다듬어 공연 페이지로 올립니다.",
                  "자동화는 정보 전달까지. 마무리 손은 사람이 잡습니다.",
                ],
              },
              {
                num: "02",
                title: "발견한다",
                body: [
                  "지역 × 시기 × 장르 — 세 축으로 좁혀 찾습니다.",
                  "‘이번 주말 우리 동네 대학에서 뭐 하지’에 답하는 자리.",
                  "전국·상업·대형 중심의 기존 플랫폼이 비운 자리.",
                ],
              },
              {
                num: "03",
                title: "예약한다",
                body: [
                  "대학 공연은 대부분 무료. 그래서 ‘티켓 판매’가 아니라 ‘무료 좌석 확보’입니다.",
                  "관객도 학생 공연자도 끝까지 무료.",
                  "돈은 후원자와 광고주에게서 옵니다.",
                ],
              },
            ].map((item) => (
              <div
                key={item.num}
                className="grid grid-cols-[56px_1fr] gap-6 md:gap-10 items-start pt-8"
                style={{ borderTop: "1px solid rgba(248, 249, 252, 0.2)" }}
              >
                <span
                  className="text-3xl md:text-4xl leading-none"
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    color: "#C8D96F",
                    opacity: 0.85,
                  }}
                >
                  {item.num}
                </span>
                <div>
                  <h3
                    className="text-xl md:text-2xl font-semibold mb-4"
                    style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-base leading-[1.9]"
                    style={{
                      fontFamily: "var(--font-noto-sans-kr)",
                      color: "#FBF8F1",
                      opacity: 0.85,
                      wordBreak: "keep-all",
                    }}
                  >
                    {item.body.map((line, idx) => (
                      <span key={idx}>
                        {line}
                        {idx < item.body.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03. 어떻게 다른가 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
          >
            03. What Makes Us Different
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-6"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
          >
            우리만의 자리
          </h2>
          <p
            className="text-base leading-relaxed mb-14 max-w-3xl"
            style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#7A746C", wordBreak: "keep-all" }}
          >
            큰 플랫폼들이 전국·대형·상업 공연 중심으로 운영하는 동안, 대학 무대는 매번 첫 회를 끝으로
            잊혀집니다. 무대올림은 그 자리를 정확히 들어갑니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                tag: "지역",
                title: "이번 주말, 우리 동네",
                body: "전국 검색이 아니라 지역 축. 경기 남부 주민이 경기 남부 대학 무대를 본다.",
              },
              {
                tag: "무료",
                title: "끝까지 무료",
                body: "관객·학생 공연자 모두 무료 좌석 예약. 결제도 정산도 환불 부담도 없습니다.",
              },
              {
                tag: "기록",
                title: "학생의 포트폴리오",
                body: "출연·연출·제작 크레딧이 그대로 남아 다음 무대로 가는 다리가 됩니다.",
              },
            ].map((c) => (
              <div
                key={c.tag}
                className="p-6"
                style={{ backgroundColor: "#F0EBE0", borderTop: "3px solid #C8D96F" }}
              >
                <p
                  className="text-xs tracking-[0.25em] uppercase mb-3"
                  style={{ fontFamily: "var(--font-inter)", color: "#3B5A6B", fontWeight: 600 }}
                >
                  {c.tag}
                </p>
                <h3
                  className="text-lg font-semibold mb-3"
                  style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#1A1A1A" }}
                >
                  {c.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontFamily: "var(--font-noto-sans-kr)",
                    color: "#1A1A1A",
                    opacity: 0.75,
                    wordBreak: "keep-all",
                  }}
                >
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04. 누구와 함께 ── */}
      <section
        className="px-6 md:px-12 lg:px-20 py-24"
        style={{ backgroundColor: "#202833", color: "#FBF8F1" }}
      >
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
          >
            04. With
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-14"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#FBF8F1" }}
          >
            누구와 함께하는가
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
            <div>
              <p
                className="text-sm tracking-[0.25em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", opacity: 0.85 }}
              >
                무대를 만드는 사람
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#FBF8F1",
                  opacity: 0.85,
                  wordBreak: "keep-all",
                }}
              >
                대학에서 무대를 올리는 연극·뮤지컬·무용·발레·국악·음악·전통연희 동아리, 학과, 졸업 워크샵.
                <br />
                막을 올리는 모든 젊은 예술가가 무대올림의 동료입니다.
              </p>
            </div>
            <div>
              <p
                className="text-sm tracking-[0.25em] uppercase mb-4"
                style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", opacity: 0.85 }}
              >
                무대를 만나는 사람
              </p>
              <p
                className="text-base leading-[1.9]"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  color: "#FBF8F1",
                  opacity: 0.85,
                  wordBreak: "keep-all",
                }}
              >
                젊은 무대의 에너지와 열정을 직접 느껴보고 싶은 관객.
                <br />
                주말 문화생활을 가까운 곳에서 찾고 싶은 지역민.
                <br />
                다음 세대 배우의 처음을 지켜보고 싶은 모든 이.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 05. 운영 ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ fontFamily: "var(--font-inter)", color: "#7A746C" }}
          >
            05. Who Runs This
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold mb-10"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3B5A6B" }}
          >
            운영
          </h2>

          <div
            className="p-8 md:p-10"
            style={{ backgroundColor: "#F0EBE0", borderLeft: "4px solid #3B5A6B" }}
          >
            <p
              className="text-sm tracking-[0.25em] uppercase mb-4"
              style={{ fontFamily: "var(--font-inter)", color: "#3B5A6B", fontWeight: 600 }}
            >
              사유유사 SYUS
            </p>
            <p
              className="text-base leading-[1.9] mb-4"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#1A1A1A", wordBreak: "keep-all" }}
            >
              무대올림은 <strong>사유유사(思惟流沙 · System of Young Unbound Society, SYUS)</strong>
              라는 개인사업자가 운영합니다.
              <br />
              사업자등록·계약·법무의 얼굴은 사유유사이고, 관객·공연자와 만나는 서비스의 얼굴은
              무대올림입니다.
            </p>
            <p
              className="text-sm leading-relaxed italic"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                color: "#7A746C",
                wordBreak: "keep-all",
              }}
            >
              사유유사 — 깊게 머물고, 가볍게 흐르며 젊은 무대 위에 쌓이는 사고의 결.
              <br />
              그 결을 ‘무대올림’이라는 이름으로 풉니다.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 md:px-12 lg:px-20 py-24" style={{ backgroundColor: "#202833" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "var(--font-inter)", color: "#C8D96F", fontWeight: 600 }}
          >
            Stay With Us
          </p>
          <p
            className="text-xl md:text-2xl leading-relaxed mb-10"
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              color: "#FBF8F1",
              wordBreak: "keep-all",
              textWrap: "balance",
            }}
          >
            당신의 무대를, 누군가의 주말로.
            <br />
            <span style={{ opacity: 0.65, fontSize: "0.85em" }}>
              누군가의 주말을, 당신의 무대로.
            </span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/shows"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                backgroundColor: "#C8D96F",
                color: "#202833",
                fontWeight: 600,
              }}
            >
              공연 보기
            </Link>
            <Link
              href="/auth/signup"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{
                fontFamily: "var(--font-noto-sans-kr)",
                border: "1px solid rgba(248, 249, 252, 0.45)",
                color: "#FBF8F1",
              }}
            >
              무대 올리기
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 text-sm tracking-wider transition-colors"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "rgba(248,249,252,0.7)" }}
            >
              문의하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
