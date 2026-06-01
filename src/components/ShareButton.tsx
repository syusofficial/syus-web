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
        style={{ fontFamily: "var(--font-inter)", color: "#6B7385" }}
      >
        Share
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="px-4 py-2 text-xs tracking-wide transition-colors"
        style={{
          fontFamily: "var(--font-noto-sans-kr)",
          backgroundColor: copied ? "#274E9B" : "transparent",
          color: copied ? "#F8F9FC" : "#274E9B",
          border: `1px solid ${copied ? "#274E9B" : "#C5CCD9"}`,
        }}
        onMouseEnter={(e) => {
          if (copied) return;
          e.currentTarget.style.backgroundColor = "#274E9B";
          e.currentTarget.style.color = "#F8F9FC";
          e.currentTarget.style.borderColor = "#274E9B";
        }}
        onMouseLeave={(e) => {
          if (copied) return;
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#274E9B";
          e.currentTarget.style.borderColor = "#C5CCD9";
        }}
      >
        {copied ? "✓ 복사됨" : "링크 복사"}
      </button>
    </div>
  );
}
