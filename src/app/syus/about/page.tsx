import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "시우스란",
  description:
    "시우스(SYUS, system of young unbound society) — 매이지 않은 젊은 무대 공동체. 무대올림이 사람을 잇는다면, 시우스는 연기를 깊게 들여다봅니다.",
  alternates: { canonical: "https://syus.co.kr/syus/about" },
};

export default function SyusAboutPage() {
  return (
    <main
      style={{
        maxWidth: "44rem",
        margin: "0 auto",
        padding: "clamp(56px, 10vh, 120px) clamp(24px, 6vw, 48px) 120px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: "0.72rem",
          letterSpacing: "0.34em",
          textTransform: "uppercase",
          fontWeight: 600,
          color: "#6BB0C0",
          marginBottom: "24px",
        }}
      >
        About · 시우스 SYUS
      </p>

      <h1
        style={{
          fontFamily: "var(--font-noto-serif-kr)",
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          lineHeight: 1.18,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--color-syus-cream)",
          wordBreak: "keep-all",
          marginBottom: "20px",
        }}
      >
        매이지 않은 젊은
        <br />
        무대 공동체
      </h1>

      <p
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          fontSize: "1rem",
          letterSpacing: "0.06em",
          color: "#6BB0C0",
          marginBottom: "44px",
        }}
      >
        system of young unbound society
      </p>

      {[
        {
          h: "무대올림이 사람을 잇는다면, 시우스는 연기를 봅니다.",
          b: "무대올림은 흩어진 대학 무대를 모아 넓게 알립니다. 시우스는 그 곁에서, 연기라는 한 우물을 깊게 들여다봅니다. 같은 사유유사 아래 두 개의 결입니다.",
        },
        {
          h: "기록하고, 나누고, 머뭅니다.",
          b: "배우의 말과 장면, 연기의 고민, 무대를 본 뒤의 잔상을 글로 남깁니다. 빠르게 소비되고 지나가는 대신, 오래 곁에 두고 다시 꺼내봅니다.",
        },
        {
          h: "다채로움은 시끄러움이 아닙니다.",
          b: "시우스의 다채로움은 시간과 결의 풍부함이지, 자극의 다양함이 아닙니다. 소란스럽지 않게, 닿아야 할 사람에게 닿습니다.",
        },
      ].map((s) => (
        <section key={s.h} style={{ marginBottom: "40px", paddingTop: "28px", borderTop: "1px solid var(--color-syus-line)" }}>
          <h2
            style={{
              fontFamily: "var(--font-noto-serif-kr)",
              fontSize: "clamp(1.2rem, 2.4vw, 1.5rem)",
              fontWeight: 700,
              color: "var(--color-syus-cream)",
              wordBreak: "keep-all",
              marginBottom: "12px",
            }}
          >
            {s.h}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-noto-sans-kr)",
              fontSize: "1rem",
              lineHeight: 1.8,
              fontWeight: 300,
              color: "var(--color-syus-cream-dim)",
              wordBreak: "keep-all",
            }}
          >
            {s.b}
          </p>
        </section>
      ))}

      <div style={{ marginTop: "56px", display: "flex", flexWrap: "wrap", gap: "16px" }}>
        <Link
          href="/syus"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            fontSize: "0.9rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--color-syus-cream)",
            textDecoration: "none",
            borderBottom: "1px solid var(--color-syus-cream)",
            paddingBottom: "4px",
          }}
        >
          여섯 무대 둘러보기 →
        </Link>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            fontSize: "0.9rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            color: "var(--color-syus-cream-dim)",
            textDecoration: "none",
            borderBottom: "1px solid var(--color-syus-line)",
            paddingBottom: "4px",
          }}
        >
          사유유사 갈림길로
        </Link>
      </div>
    </main>
  );
}
