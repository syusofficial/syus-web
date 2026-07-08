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
        style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}
      >
        Share
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="px-4 py-2 text-xs tracking-wide transition-colors"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          backgroundColor: copied ? "#0B5563" : "transparent",
          color: copied ? "#F0EEE9" : "#0B5563",
          border: `1px solid ${copied ? "#0B5563" : "#D4CFC1"}`,
        }}
        onMouseEnter={(e) => {
          if (copied) return;
          e.currentTarget.style.backgroundColor = "#0B5563";
          e.currentTarget.style.color = "#F0EEE9";
          e.currentTarget.style.borderColor = "#0B5563";
        }}
        onMouseLeave={(e) => {
          if (copied) return;
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#0B5563";
          e.currentTarget.style.borderColor = "#D4CFC1";
        }}
      >
        {copied ? "✓ 복사됨" : "링크 복사"}
      </button>
    </div>
  );
}
