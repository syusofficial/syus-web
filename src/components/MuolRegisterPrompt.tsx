"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 무대올림 — 두 문(門) 선택형 안내 카드
 * 2026-08-06 · 사장님 지시 → 디자인팀 C안 + 영업팀 카피 + 제작팀 코드검증 합본
 *
 * ■ 무엇을 푸는가
 *   최근 60일 방문 2,120회(관리자 제외) → 가입 페이지 도달 33회(1.6%) → 가입 14명.
 *   가입 페이지까지 가면 42%가 가입한다. 즉 폼이 아니라 "거기까지 가는 길"이 병목이다.
 *   승인 공연은 0건이고, shows 5행은 전부 반려된 예시자료다 — 외부 등록 시도가 한 건도 없다.
 *
 * ■ 왜 두 문인가
 *   이 카드는 성격이 다른 두 사람에게 말한다. 무대를 올릴 학과·공연팀과, 보러 온 관객·전공생.
 *   한 문장으로 둘 다 잡으려 하면 둘 다 놓친다. 그래서 1단계에서 자기 문을 고르게 하고
 *   2단계에서 그 사람에게만 할 말을 한다. (질문·선택 선행형 전환 5.64% vs 단일단계 4.62%)
 *
 * ■ 전체화면 모달이 아닌 이유 (되돌리지 말 것)
 *   2026-06-26 LoadingScreen 전체화면 오버레이가 안 사라져 사이트 전체 클릭이 먹통이 된
 *   사고가 있었다(회원탈퇴 버튼까지 막혔다). 여기서는 딤을 쓰지 않고 fixed 요소는 카드 하나뿐이라
 *   카드 밖 화면은 언제나 그대로 클릭된다.
 *   더불어 모바일 화면 점유를 30% 아래로 묶었다 — 구글 침입형 인터스티셜 페널티 회피선이다.
 *
 * ■ 등장·억제 규칙 (디자인팀 6-3 표)
 *   5초 바닥 → 7초 타이머 또는 40% 스크롤 / 세션당 1회 / 닫기 1회 14일 · 연속 2회 90일 /
 *   문 선택 후 이탈 30일 / 진행 180일 / 제외 경로 performer·auth
 *
 * ■ 로그인 상태별 (신뢰 사고 방지)
 *   비로그인 → 두 문 / 로그인 일반회원 → 공연팀 안내만(가입 권유 금지) / 공연자·관리자 → 노출 안 함
 *
 * ■ 문구는 전부 코드로 검증된 사실만 쓴다
 *   "새 공연 알림"은 구현이 없어 뺐고(marketing_opt_in을 읽는 코드 0줄),
 *   "좌석 확보"는 게스트도 되는 기능이라 회원 이득에서 뺐다.
 */

const MUTE_KEY = "muol_prompt_muted_until";
const DISMISS_COUNT_KEY = "muol_prompt_dismiss_count";
const SESSION_KEY = "muol_prompt_shown_session";

const DAY = 24 * 60 * 60 * 1000;
const MUTE_DISMISS_1 = 14 * DAY;
const MUTE_DISMISS_2 = 90 * DAY; // 두 번 연속 거절은 분명한 의사
const MUTE_CHOSE_DOOR = 30 * DAY; // 문은 골랐으나 진행 안 함
const MUTE_PROCEED = 180 * DAY;

const FLOOR_MS = 5000; // 이 전에는 어떤 트리거도 발화 금지
const TIMER_MS = 7000;
const SCROLL_RATIO = 0.4;

// 색 — 2026-08-03 위계 B안 (읽는 것=먹빛 / 누르는 것=청록 / 결심하는 것=자두)
const PAPER = "#F0EEE9";
const SURFACE = "#E6E1D6";
const BORDER = "#8C837C"; // 신규 파생 — 기존 #D4CFC1은 배경 대비 1.34:1로 미달이었다
const LINE = "#D4CFC1"; // 장식선(대비 면제)
const TEAL = "#0B5563";
const INK = "#2B211C";
const INK_2 = "#3A2E27";
const INK_3 = "#5F5145";
const DAMSON = "#5C2A42";

/** 공연팀 문을 위에 두는 경로 — 틀려도 손해 없다(두 문은 언제나 둘 다 보인다) */
const PERFORMER_FIRST = [
  "/muol/universities",
  "/muol/for-business",
  "/muol/faq",
  "/muol/about",
];

type Step = "gate" | "performer" | "audience";
type Viewer = "loading" | "guest" | "member" | "skip";

function readMutedUntil(): number {
  try {
    const raw = window.localStorage.getItem(MUTE_KEY);
    const until = Number(raw);
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
}

function mute(ms: number) {
  try {
    window.localStorage.setItem(MUTE_KEY, String(Date.now() + ms));
  } catch {
    /* 시크릿 모드 등 — 억제만 못 걸릴 뿐 동작에는 지장 없다 */
  }
}

export default function MuolRegisterPrompt() {
  const pathname = usePathname();
  const [viewer, setViewer] = useState<Viewer>("loading");
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [step, setStep] = useState<Step>("gate");

  // 등록 화면과 인증 화면에서는 아예 동작하지 않는다.
  const suppressedByPath =
    !pathname?.startsWith("/muol") ||
    pathname.startsWith("/muol/performer") ||
    pathname.startsWith("/auth");

  // 가입·로그인 후 보던 자리로 정확히 돌아오게 한다.
  // 이게 없으면 "이어보기"가 거짓말이 되고, 보던 공연을 잃은 사람은 돌아오지 않는다.
  const nextParam = useMemo(
    () => encodeURIComponent(pathname || "/muol"),
    [pathname]
  );

  const performerFirst = useMemo(
    () => PERFORMER_FIRST.some((p) => pathname?.startsWith(p)),
    [pathname]
  );

  /** 공연자 문의 착지점 — 로그인 상태에 따라 최단 경로로 보낸다.
   *  비로그인을 곧장 /muol/performer로 보내면 로그인 벽을 만난다(승인 공연 0건의 유력한 원인). */
  const performerHref =
    viewer === "guest"
      ? `/auth/signup?next=${encodeURIComponent("/mypage")}`
      : "/mypage";

  const close = useCallback((muteMs: number, countsAsDismissal: boolean) => {
    setLeaving(true);
    if (countsAsDismissal) {
      let count = 0;
      try {
        count = Number(window.localStorage.getItem(DISMISS_COUNT_KEY)) || 0;
        count += 1;
        window.localStorage.setItem(DISMISS_COUNT_KEY, String(count));
      } catch {
        /* 무시 */
      }
      mute(count >= 2 ? MUTE_DISMISS_2 : muteMs);
    } else {
      mute(muteMs);
    }
    window.setTimeout(() => setVisible(false), 200);
  }, []);

  /** 닫기 — 1회 14일, 연속 2회 90일 */
  const dismiss = useCallback(() => close(MUTE_DISMISS_1, true), [close]);

  /** 등록·가입으로 실제 진행 — 180일. 거절이 아니므로 연속 카운터를 지운다. */
  const proceed = useCallback(() => {
    try {
      window.localStorage.removeItem(DISMISS_COUNT_KEY);
    } catch {
      /* 무시 */
    }
    mute(MUTE_PROCEED);
    setVisible(false);
  }, []);

  /** 문은 골랐다 = 관심은 보였다. 그 상태로 이탈하면 30일. */
  const chooseDoor = useCallback((next: Step) => {
    setStep(next);
    mute(MUTE_CHOSE_DOOR);
  }, []);

  // 로그인 상태 판별 — 이미 가입한 회원에게 가입을 권하는 사고를 막는다.
  useEffect(() => {
    if (suppressedByPath) return;
    let alive = true;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!alive) return;
        if (!user) {
          setViewer("guest");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!alive) return;
        // 공연자·관리자는 이미 등록할 수 있다 → 이 카드가 할 말이 없다.
        if (profile?.role === "performer" || profile?.role === "admin") {
          setViewer("skip");
        } else {
          setViewer("member");
        }
      } catch {
        // 조회 실패 시엔 아무것도 권하지 않는 쪽이 안전하다.
        if (alive) setViewer("skip");
      }
    })();

    return () => {
      alive = false;
    };
  }, [suppressedByPath]);

  // 등장 판단
  useEffect(() => {
    if (suppressedByPath) return;
    if (viewer === "loading" || viewer === "skip") return;
    if (visible) return;

    // 세션당 1회 — 페이지를 옮겨도 다시 뜨지 않는다.
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* 무시 */
    }
    if (Date.now() < readMutedUntil()) return;

    // 로그인 회원은 문을 고를 필요가 없다 — 공연팀 안내로 바로 연다.
    if (viewer === "member") setStep("performer");

    const mountedAt = Date.now();
    let done = false;

    const show = () => {
      if (done) return;
      if (Date.now() - mountedAt < FLOOR_MS) return; // 5초 바닥
      done = true;
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* 무시 */
      }
      setVisible(true);
    };

    const onScroll = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if (window.scrollY / scrollable >= SCROLL_RATIO) show();
    };

    const timer = window.setTimeout(show, TIMER_MS);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [suppressedByPath, viewer, visible]);

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

  const labelCls = "text-[10px] tracking-[0.28em] uppercase";
  const backBtn = (
    <button
      type="button"
      onClick={() => setStep("gate")}
      className="text-[12px] underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ color: INK_3, outlineColor: TEAL }}
    >
      ← 다시
    </button>
  );

  return (
    <div
      role="dialog"
      aria-label="무대올림 안내"
      className={[
        "fixed z-40",
        "left-3 right-3 bottom-3",
        "sm:left-auto sm:right-6 sm:bottom-6 sm:w-[23rem]",
        "rounded-lg",
        leaving ? "muol-prompt-out" : "muol-prompt-in",
      ].join(" ")}
      style={{
        backgroundColor: PAPER,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 8px 28px rgba(43, 33, 28, 0.18)",
      }}
    >
      {/* ── 1단계 · 두 문 ── */}
      {step === "gate" && (
        <div className="p-5 pr-10">
          <p className={`${labelCls} mb-3`} style={{ color: TEAL, fontFamily: "var(--font-inter)" }}>
            무대올림
          </p>
          <h2
            className="text-[15px] font-bold mb-3.5"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: INK }}
          >
            어느 쪽 이야기를 드리면 좋을까요
          </h2>

          <div className="flex flex-col gap-2">
            {(performerFirst
              ? (["performer", "audience"] as const)
              : (["audience", "performer"] as const)
            ).map((door) => (
              <button
                key={door}
                type="button"
                onClick={() => chooseDoor(door)}
                className="text-left px-4 py-3 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  border: `1px solid ${BORDER}`,
                  backgroundColor: "transparent",
                  outlineColor: TEAL,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = SURFACE)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span
                  className="block text-[14px] font-bold"
                  style={{ fontFamily: "var(--font-noto-serif-kr)", color: INK_2 }}
                >
                  {door === "performer" ? "올릴 무대가 있습니다" : "볼 무대를 찾고 있습니다"}
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: INK_3 }}>
                  {door === "performer" ? "공연팀 · 학과 · 학생회" : "관객 · 전공생"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 2단계-A · 공연팀 ── */}
      {step === "performer" && (
        <div className="p-5 pr-10">
          <p className={`${labelCls} mb-2`} style={{ color: TEAL, fontFamily: "var(--font-inter)" }}>
            For Performers
          </p>
          <h2
            className="text-[15px] font-bold mb-2"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: INK }}
          >
            무대는 끝나도 기록은 남습니다
          </h2>
          <p className="text-[13px] leading-relaxed mb-3" style={{ color: INK_2 }}>
            대학 무대예술이라면 게재료 없이 올릴 수 있습니다.
          </p>

          {/* 등록이 세 걸음이라는 사실을 숨기지 않는다.
              기대를 미리 맞춰주면 도중 이탈이 오히려 줄어든다. */}
          <div
            className="flex items-center gap-1.5 text-[10.5px] mb-4 pb-3.5"
            style={{ color: INK_3, borderBottom: `1px solid ${LINE}` }}
          >
            <span style={{ color: TEAL, fontWeight: 700 }}>①</span> 가입
            <span style={{ color: LINE }}>─</span>
            <span style={{ color: TEAL, fontWeight: 700 }}>②</span> 공연자 신청
            <span style={{ color: LINE }}>─</span>
            <span style={{ color: TEAL, fontWeight: 700 }}>③</span> 확인 후 등록
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={performerHref}
              onClick={proceed}
              className="inline-flex items-center px-4 py-2 rounded text-[13px] font-bold transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: DAMSON, color: PAPER, outlineColor: DAMSON }}
            >
              무대 올리기 →
            </Link>
            {viewer === "guest" ? backBtn : null}
          </div>
        </div>
      )}

      {/* ── 2단계-B · 관객 · 전공생 ── */}
      {step === "audience" && (
        <div className="p-5 pr-10">
          <p className={`${labelCls} mb-2`} style={{ color: TEAL, fontFamily: "var(--font-inter)" }}>
            For Audience
          </p>
          <h2
            className="text-[15px] font-bold mb-3"
            style={{ fontFamily: "var(--font-noto-serif-kr)", color: INK }}
          >
            놓친 무대가 아깝다면
          </h2>

          {/* 찜 → 알림 → 후기. 따로 노는 혜택 목록이 아니라 관람 한 번의 흐름이다.
              셋 다 로그인해야만 되는 기능임을 코드로 확인했다. */}
          <ul className="mb-4 space-y-1.5">
            {[
              "마음에 든 무대 찜해두기",
              "사흘 전 · 하루 전 알림 받기",
              "별점과 한 줄 후기 남기기",
            ].map((t) => (
              <li key={t} className="text-[12.5px] leading-relaxed flex gap-2" style={{ color: INK_2 }}>
                <span aria-hidden="true" style={{ color: TEAL }}>✓</span>
                {t}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3.5">
            <Link
              href={`/auth/signup?next=${nextParam}`}
              onClick={proceed}
              className="inline-flex items-center px-4 py-2 rounded text-[13px] font-bold transition-transform duration-150 hover:opacity-85 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: DAMSON, color: PAPER, outlineColor: DAMSON }}
            >
              가입하고 이어보기
            </Link>
            <Link
              href={`/auth/login?next=${nextParam}`}
              onClick={proceed}
              className="text-[12px] underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: TEAL, outlineColor: TEAL }}
            >
              로그인
            </Link>
            {backBtn}
          </div>
        </div>
      )}

      {/* 닫기 — 44×44px 터치 타깃 */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="absolute top-1.5 right-1.5 w-11 h-11 flex items-center justify-center rounded transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: INK_3, outlineColor: TEAL }}
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
