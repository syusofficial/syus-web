import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="pt-24 min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#F4EDE3" }}
    >
      <div className="text-center max-w-md">
        <p
          className="tracking-[0.5em] mb-8"
          style={{ fontFamily: "var(--font-cormorant)", color: "#6D3115", fontSize: "1rem" }}
        >
          4 0 4
        </p>

        <h1
          className="text-[4rem] md:text-[5rem] font-black leading-none tracking-tighter mb-6"
          style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#6D3115" }}
        >
          길을
          <br />
          잃었습니다
        </h1>

        <p
          className="text-sm leading-relaxed mb-10"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#9B9693" }}
        >
          찾으시는 페이지가 없거나,
          <br />
          주소가 변경되었을 수 있습니다.
        </p>

        <p
          className="text-xs italic mb-10"
          style={{ fontFamily: "var(--font-cormorant)", color: "#9B9693" }}
        >
          &ldquo;흘러가는 대로 다시 시작해보세요.&rdquo;
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-8 py-3 text-sm tracking-wider transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", backgroundColor: "#6D3115", color: "#F4EDE3" }}
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/contact"
            className="px-8 py-3 text-sm tracking-wider transition-colors"
            style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid #D4CFC9", color: "#1A1A1A" }}
          >
            문의하기
          </Link>
        </div>
      </div>
    </div>
  );
}
