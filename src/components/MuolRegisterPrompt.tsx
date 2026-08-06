"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 무대올림 — 공연 등록 유도 카드 (2026-08-06 사장님 지시)
 *
 * ■ 왜 만들었나
 *   최근 2개월 방문 1,670회인데 승인 공연이 0건이다. 8/3에 빈 화면 안내를
 *   4곳에 깔았지만 그건 "이미 목록까지 내려온 사람"에게만 보인다. 영업 메일을
 *   받고 들어온 학과 관계자는 첫 화면만 보고 나가는 경우가 더 많으므로,
 *   화면 어디에 있든 한 번은 등록 경로를 만나게 한다.
 *
 * ■ 전체화면 모달로 만들지 않은 이유 (중요 — 되돌리지 말 것)
 *   2026-06-26 LoadingScreen이 전체화면 오버레이로 깔린 채 사라지지 않아
 *   사이트 전체 클릭이 먹통이 된 사고가 있었다(회원탈퇴 버튼까지 막혔다).
 *   그래서 이 컴포넌트는 딤(어두운 막)을 절대 쓰지 않고, fixed 요소는
 *   카드 하나뿐이다. 카드 밖 화면은 언제나 그대로 클릭된다.
 *   또 방문자 다수는 등록할 일이 없는 관객이다. 그들의 화면을 가로막지 않는 것이
 *   등록 한 건보다 중요하다.
 *
 * ■ 노출 규칙
 *   - /muol/* 안에서만. 등록 화면(/muol/performer*)에서는 뜨지 않는다
 *     (이미 등록하러 온 사람에게 등록하라고 권하는 꼴이 된다)
 *   - 7초 체류 또는 35% 스크롤 중 먼저 오는 쪽에 등장. 진입 즉시는 띄우지 않는다
 *     — 화면을 보기도 전에 권유부터 받으면 그 자체가 광고로 읽힌다
 *   - 닫으면 14일, 등록 화면으로 넘어가면 180일 동안 다시 뜨지 않는다
 *
 * ■ 색 (2026-08-03 색 위계 B안)
 *   읽는 것=먹빛 / 누르는 것=청록 / 결심하는 것=자두.
 *   "무대 올리기"는 결심이므로 자두(#5C2A42), 부차 동작은 먹빛 텍스트 버튼.
 */

const STORAGE_KEY = "muol_register_prompt_muted_until";
const MUTE_DAYS_DISMISS = 14; // 닫았을 때
const MUTE_DAYS_ACCEPT = 180; // 등록 화면으로 넘어갔을 때
const DELAY_MS = 7000; // 체류 기준
const SCROLL_RATIO = 0.35; // 스크롤 기준

const PAPER = "#F0EEE9";
const TEAL = "#0B5563";
const INK = "#3A2E28"; // Silhouette을 짙게 뽑은 먹빛 — 읽는 것
const DAMSON = "#5C2A42"; // 결심하는 것
const LINE = "#D4CFC1";

function muteFor(days: number) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(STORAGE_KEY, String(until));
  } catch {
    /* 시크릿 모드 등 localStorage 차단 환경 — 억제만 못 할 뿐 동작에는 지장 없다 */
  }
}

function isMuted(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

export default function MuolRegisterPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // 등록 화면에서는 아예 동작하지 않는다.
  const suppressedByPath =
    !pathname?.startsWith("/muol") || pathname.startsWith("/muol/performer");

  const dismiss = useCallback(() => {
    setLeaving(true);
    muteFor(MUTE_DAYS_DISMISS);
    // 사라지는 동안 클릭을 막지 않도록 상태를 곧바로 내린다(애니메이션은 CSS가 마무리).
    window.setTimeout(() => setVisible(false), 200);
  }, []);

  const accept = useCallback(() => {
    muteFor(MUTE_DAYS_ACCEPT);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (suppressedByPath) return;
    if (visible) return; // 이미 떠 있으면 페이지를 옮겨도 타이머를 새로 걸지 않는다
    if (isMuted()) return;

    let done = false;

    // 스크롤 핸들러와 타이머가 서로를 참조하지 않도록, 해제는 전부 cleanup에 맡긴다.
    // done이 서면 두 경로 다 즉시 빠져나오므로 중복 호출은 일어나지 않는다.
    const show = () => {
      if (done) return;
      done = true;
      setVisible(true);
    };

    const onScroll = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if (window.scrollY / scrollable >= SCROLL_RATIO) show();
    };

    const timer = window.setTimeout(show, DELAY_MS);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [suppressedByPath, visible, pathname]);

  // ESC로 닫기 — 키보드 사용자가 갇히지 않게.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  if (suppressedByPath || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="공연 등록 안내"
      className={[
        "fixed z-40",
        // 모바일: 화면 아래 가로로 눕힌 카드 / PC: 오른쪽 아래 구석
        "left-3 right-3 bottom-3",
        "sm:left-auto sm:right-6 sm:bottom-6 sm:w-[22rem]",
        "rounded-lg shadow-lg",
        leaving ? "muol-prompt-out" : "muol-prompt-in",
      ].join(" ")}
      style={{
        backgroundColor: PAPER,
        border: `1px solid ${LINE}`,
        boxShadow: "0 8px 28px rgba(58, 46, 40, 0.16)",
      }}
    >
      <div className="p-5 pr-10">
        <p
          className="text-[10px] tracking-[0.28em] uppercase mb-2"
          style={{ fontFamily: "var(--font-inter)", color: TEAL }}
        >
          For Performers
        </p>

        <h2
          className="text-base font-bold mb-2"
          style={{ fontFamily: "var(--font-noto-serif-kr)", color: INK }}
        >
          올릴 무대가 있으신가요
        </h2>

        <p className="text-[13px] leading-relaxed mb-4" style={{ color: INK }}>
          대학 무대예술 공연이라면 게재료 없이 올릴 수 있습니다. 관객이 미리
          좌석을 잡아둘 수 있도록, 자리를 열어두시면 됩니다.
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/muol/performer"
            onClick={accept}
            className="inline-flex items-center px-4 py-2 rounded text-[13px] font-bold transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: DAMSON, color: PAPER, outlineColor: DAMSON }}
          >
            무대 올리기 →
          </Link>

          <button
            type="button"
            onClick={dismiss}
            className="text-[13px] underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: INK, outlineColor: TEAL }}
          >
            다음에
          </button>
        </div>
      </div>

      {/* 닫기 — 위 "다음에"와 같은 동작이지만, 카드 우상단 X를 먼저 찾는 사람이 많다 */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: INK, outlineColor: TEAL }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M1 1L13 13M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
