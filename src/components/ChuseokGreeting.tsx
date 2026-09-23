"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { isChuseokWindow, CHUSEOK_HOLIDAY_LABEL } from "@/lib/chuseok";

/**
 * 추석 인사 팝업 — 2026-09-22 사장님 지시 · 디자인팀 + 운영팀
 *
 * ■ 무엇을 하는가
 *   연휴 동안 문의·등록 승인 답변이 늦어진다는 사실을 먼저 알린다.
 *   답이 늦는 것보다, 늦는 줄 모르고 기다리는 쪽이 신뢰를 깎는다.
 *   파는 말은 넣지 않았다 — 명절 인사에 영업이 섞이면 인사가 아니게 된다.
 *
 * ■ 왜 가운데 모달인가 (2026-09-22 사장님 결정)
 *   처음에는 우하단 배너로 만들었으나, 기관·기업 사이트에서 흔히 보는
 *   「일주일간 열지 않기 / 닫기」가 달린 레이어 팝업으로 바꿔달라는 지시를 받았다.
 *   화면을 덮는 팝업은 구글이 모바일 검색 순위를 깎는 침입형 인터스티셜에 해당한다는
 *   점을 보고드렸고, 사흘짜리 한시 팝업이라는 전제로 사장님이 결정하셨다.
 *   연휴가 지나면 기간이 끝나 저절로 사라지므로 노출도 그 사흘에 그친다.
 *
 * ■ 딤을 쓰되 갇히지 않게 (사고 두 번을 겪고 세운 방어선)
 *   2026-06-26 LoadingScreen 전체화면 오버레이가 사라지지 않아 사이트 전체 클릭이
 *   먹통이 된 적이 있다(회원탈퇴 버튼까지 막혔다). 그래서 여기서는
 *   · 닫는 길을 셋 둔다 — 버튼 / 딤(바깥) 클릭 / ESC
 *   · 딤은 visible일 때만 DOM에 존재한다(조건부 렌더 — 남아서 클릭을 먹을 수 없다)
 *   · body 스크롤 잠금은 반드시 cleanup에서 되돌린다
 *   · 한 방문에 한 번만 뜬다(닫으면 닫힌 채로 둔다)
 *
 * ■ 사진
 *   FLUX로 지은 「커튼 너머 한국의 가을밤 — 한옥·억새·보름달」.
 *   AI 생성물이므로 팝업 안에 표시한다(AI기본법 §31 생성물 표시 의무). 지우지 말 것.
 */

const MUTE_KEY = "chuseok_2026_muted_until";
const SESSION_KEY = "chuseok_2026_shown_session";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const OPEN_DELAY = 600; // 착지 직후 — 기관 사이트 팝업의 관행을 따른다

// 색 — config/brand-config.md §4 / globals.css 토큰과 같은 값
const PAPER = "#F0EEE9";
const BORDER = "#8C837C"; // = --c-line-strong · 배경 대비 3.20:1 (WCAG 1.4.11)
const LINE = "#D9D3C7";
const TEAL = "#0B5563";
const INK = "#2B211C";
const INK_2 = "#3A2E27";
const INK_3 = "#5F5145";

/** 가입·로그인·관리자 화면에서는 말 걸지 않는다 — 하던 일을 끊지 않기 위해서다. */
const SUPPRESSED = ["/auth", "/admin"];

function readMutedUntil(): number {
  try {
    return Number(localStorage.getItem(MUTE_KEY) || 0);
  } catch {
    return 0;
  }
}

export default function ChuseokGreeting() {
  const pathname = usePathname() || "/";
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  /**
   * 이번 방문에 이미 한 번 띄웠는가.
   * 아래 등장 판단 effect는 visible을 의존성으로 갖는다 — 닫아서 false가 되는 순간
   * effect가 다시 돌아 타이머를 새로 걸기 때문에, 이 표식이 없으면 닫아도 곧바로 되뜬다.
   * sessionStorage로는 막을 수 없다: 미리보기(?chuseok=preview)는 기록을 남기지 않고,
   * 저장소가 막힌 브라우저에서도 그 검사가 통째로 건너뛰어진다.
   */
  const openedRef = useRef(false);

  const suppressedByPath = SUPPRESSED.some((p) => pathname.startsWith(p));

  /** 그냥 닫기 — 이번 방문에만 조용해진다. */
  const close = useCallback(() => setVisible(false), []);

  /** 일주일간 열지 않기 — 분명한 의사이므로 저장해 둔다. */
  const muteForWeek = useCallback(() => {
    try {
      localStorage.setItem(MUTE_KEY, String(Date.now() + WEEK));
    } catch {
      /* 저장이 막혀도 닫히기는 해야 한다 */
    }
    setVisible(false);
  }, []);

  // 등장 판단
  useEffect(() => {
    if (suppressedByPath || visible || openedRef.current) return;

    // 미리보기 — ?chuseok=preview 를 붙이면 기간·억제를 건너뛰고 바로 뜬다.
    // 운영자가 연휴 전에(또는 지난 뒤에) 실물을 확인하기 위한 문이다.
    // 주소에 직접 붙여야만 열리므로 일반 방문자·검색엔진에는 영향이 없다.
    let preview = false;
    try {
      preview = new URLSearchParams(window.location.search).get("chuseok") === "preview";
    } catch {
      /* 무시 */
    }

    if (!preview && !isChuseokWindow()) return; // 기간 밖이면 아무 일도 하지 않는다

    if (!preview) {
      if (Date.now() < readMutedUntil()) return; // 「일주일간 열지 않기」를 누른 사람
      try {
        if (sessionStorage.getItem(SESSION_KEY)) return; // 한 방문에 한 번
      } catch {
        /* 저장소가 막힌 브라우저에서도 인사는 보여준다 */
      }
    }

    const timer = window.setTimeout(() => {
      openedRef.current = true; // 이 뒤로는 닫히면 닫힌 채로 둔다
      if (!preview) {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* 무시 */
        }
      }
      setVisible(true);
    }, OPEN_DELAY);

    return () => window.clearTimeout(timer);
  }, [suppressedByPath, visible]);

  // 열려 있는 동안 뒤 화면은 스크롤되지 않는다. 되돌리기는 cleanup이 보장한다.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  // ESC로 닫기 + 탭이 팝업 밖으로 새지 않게 가둔다(키보드 사용자가 길을 잃지 않도록).
  useEffect(() => {
    if (!visible) return;

    const card = cardRef.current;
    card?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !card) return;
      const items = card.querySelectorAll<HTMLElement>("button, a[href]");
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  if (suppressedByPath || !visible) return null;

  return (
    // 딤 — 바깥을 누르면 닫힌다. visible일 때만 존재하므로 남아서 클릭을 먹지 않는다.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 chuseok-dim"
      style={{ backgroundColor: "rgba(43, 33, 28, 0.62)" }}
      onClick={close}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chuseok-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] max-h-[86vh] overflow-y-auto rounded-lg chuseok-pop"
        style={{
          backgroundColor: PAPER,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 18px 50px rgba(23, 18, 15, 0.38)",
        }}
      >
        {/* 사진 — 커튼 너머 한국의 가을밤 */}
        <div className="relative h-[152px] w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/chuseok-2026-band.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center 52%",
            }}
            aria-hidden="true"
          />
          {/* AI 생성 표시 — 지우지 말 것(AI기본법 §31) */}
          <span
            className="absolute right-2.5 bottom-2 text-[10px] tracking-[0.04em] px-1.5 py-[1px] rounded"
            style={{ color: PAPER, backgroundColor: "rgba(23,18,15,0.55)" }}
          >
            AI 생성 이미지
          </span>
        </div>

        <div className="px-7 pt-6 pb-5">
          <p
            className="text-[11px] tracking-[0.28em] uppercase mb-3"
            style={{ color: TEAL, fontFamily: "var(--font-inter)" }}
          >
            한가위 · 2026
          </p>

          <h2
            id="chuseok-title"
            className="text-[20px] font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: INK }}
          >
            추석 잘 보내세요
          </h2>

          <p className="text-[14px] leading-relaxed mb-5" style={{ color: INK_2 }}>
            무대를 올리는 분에게도, 객석에 앉는 분에게도
            넉넉하고 편안한 한가위가 되기를 바랍니다.
          </p>

          {/* 실용 안내 — 이 팝업이 존재하는 이유. 늦는다는 말로 끝내지 않고 답변 약속까지 적는다. */}
          <div
            className="px-4 py-3.5 rounded text-[12.5px] leading-relaxed"
            style={{ color: INK_3, backgroundColor: "#E6E1D6" }}
          >
            <span style={{ color: TEAL, fontWeight: 700 }}>{CHUSEOK_HOLIDAY_LABEL}</span>
            {" "}문의와 공연 등록 승인 답변이 조금 늦어질 수 있습니다. 연휴가 끝나는 대로 하나씩 답변드리겠습니다.
          </div>

          <p className="mt-4 text-[11.5px]" style={{ color: INK_3 }}>
            사유유사 SYUS 드림
          </p>
        </div>

        {/* 바닥 줄 — 기관 사이트 팝업의 관행대로 「일주일간 열지 않기 / 닫기」 */}
        <div className="flex items-stretch" style={{ borderTop: `1px solid ${LINE}` }}>
          <button
            type="button"
            onClick={muteForWeek}
            className="flex-1 py-3.5 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            style={{ color: INK_3, outlineColor: TEAL, backgroundColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E6E1D6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            일주일간 열지 않기
          </button>
          <button
            type="button"
            data-autofocus
            onClick={close}
            className="flex-1 py-3.5 text-[13px] font-bold transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            style={{
              color: PAPER,
              backgroundColor: TEAL,
              outlineColor: TEAL,
              borderLeft: `1px solid ${LINE}`,
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
