"use client";

import { useState } from "react";

type ShareButtonProps = {
  url: string;
};

export default function ShareButton({ url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 구형 브라우저 fallback
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  return (
    <div>
      <p
        className="text-xs tracking-[0.2em] uppercase mb-3"
        style={{ fontFamily: "var(--font-inter)", color: "#5F584F" }}
      >
        Share
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="px-4 py-2 text-xs tracking-wide transition-colors"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          backgroundColor: copied ? "#3B5A6B" : "transparent",
          color: copied ? "#FBF8F1" : "#3B5A6B",
          border: `1px solid ${copied ? "#3B5A6B" : "#D8D3C9"}`,
        }}
        onMouseEnter={(e) => {
          if (copied) return;
          e.currentTarget.style.backgroundColor = "#3B5A6B";
          e.currentTarget.style.color = "#FBF8F1";
          e.currentTarget.style.borderColor = "#3B5A6B";
        }}
        onMouseLeave={(e) => {
          if (copied) return;
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#3B5A6B";
          e.currentTarget.style.borderColor = "#D8D3C9";
        }}
      >
        {copied ? "✓ 복사됨" : "링크 복사"}
      </button>
    </div>
  );
}
