"use client";

import { useEffect, useState } from "react";

type ShareButtonProps = {
  title: string;
  description?: string;
  posterUrl?: string;
  url: string;
};

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (params: Record<string, unknown>) => void;
      };
    };
  }
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

export default function ShareButton({ title, description, posterUrl, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  // 카카오 SDK 로드 + 초기화 (한 번만)
  useEffect(() => {
    if (!KAKAO_JS_KEY) return;

    // 이미 로드된 경우
    if (window.Kakao?.isInitialized()) {
      setKakaoReady(true);
      return;
    }

    // 스크립트 중복 로드 방지
    const existing = document.querySelector(`script[src="${KAKAO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(KAKAO_JS_KEY);
        }
        setKakaoReady(true);
      });
      return;
    }

    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
      setKakaoReady(true);
    };
    document.head.appendChild(script);
  }, []);

  // 작품 소개를 너무 길지 않게 자르기
  const shareDescription = (description ?? "").trim().replace(/\s+/g, " ").slice(0, 110);

  const handleKakao = () => {
    if (!window.Kakao || !window.Kakao.isInitialized()) return;
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description: shareDescription || "사유유사 SYUS — 깊이 머물고, 가볍게 흘려보냅니다.",
        imageUrl: posterUrl ?? "https://syus.co.kr/opengraph-image",
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [
        {
          title: "공연 자세히 보기",
          link: { mobileWebUrl: url, webUrl: url },
        },
      ],
    });
  };

  const handleTwitter = () => {
    const tweetText = `${title} — 사유유사 SYUS`;
    const intent = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(tweetText)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — 매우 오래된 브라우저
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

  const buttonStyle: React.CSSProperties = {
    fontFamily: "var(--font-noto-sans-kr)",
    color: "#6D3115",
    border: "1px solid #D4CFC9",
    backgroundColor: "transparent",
    transition: "all 0.15s",
  };

  return (
    <div>
      <p
        className="text-xs tracking-[0.2em] uppercase mb-3"
        style={{ fontFamily: "var(--font-inter)", color: "#9B9693" }}
      >
        Share
      </p>
      <div className="flex flex-wrap gap-2">
        {KAKAO_JS_KEY && (
          <button
            type="button"
            onClick={handleKakao}
            disabled={!kakaoReady}
            className="px-4 py-2 text-xs tracking-wide"
            style={{
              ...buttonStyle,
              opacity: kakaoReady ? 1 : 0.5,
              cursor: kakaoReady ? "pointer" : "not-allowed",
            }}
            onMouseEnter={(e) => {
              if (!kakaoReady) return;
              e.currentTarget.style.backgroundColor = "#6D3115";
              e.currentTarget.style.color = "#F4EDE3";
              e.currentTarget.style.borderColor = "#6D3115";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#6D3115";
              e.currentTarget.style.borderColor = "#D4CFC9";
            }}
          >
            카카오톡 공유
          </button>
        )}
        <button
          type="button"
          onClick={handleTwitter}
          className="px-4 py-2 text-xs tracking-wide"
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#6D3115";
            e.currentTarget.style.color = "#F4EDE3";
            e.currentTarget.style.borderColor = "#6D3115";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#6D3115";
            e.currentTarget.style.borderColor = "#D4CFC9";
          }}
        >
          X 공유
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="px-4 py-2 text-xs tracking-wide"
          style={{
            ...buttonStyle,
            backgroundColor: copied ? "#6D3115" : "transparent",
            color: copied ? "#F4EDE3" : "#6D3115",
            borderColor: copied ? "#6D3115" : "#D4CFC9",
          }}
          onMouseEnter={(e) => {
            if (copied) return;
            e.currentTarget.style.backgroundColor = "#6D3115";
            e.currentTarget.style.color = "#F4EDE3";
            e.currentTarget.style.borderColor = "#6D3115";
          }}
          onMouseLeave={(e) => {
            if (copied) return;
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#6D3115";
            e.currentTarget.style.borderColor = "#D4CFC9";
          }}
        >
          {copied ? "✓ 복사됨" : "링크 복사"}
        </button>
      </div>
    </div>
  );
}
