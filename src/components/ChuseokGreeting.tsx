"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isChuseokWindow, CHUSEOK_HOLIDAY_LABEL } from "@/lib/chuseok";

/**
 * 추석 인사 팝업 — 2026-09-22 사장님 지시 · 디자인팀 + 제작팀
 * 2026-09-23 재디자인 시공: 기관·기업 공지 모달 규격(KRDS)으로 골격 교체.
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
 * ■ 왜 네이티브 <dialog> 인가 (2026-09-23 디자인팀 판단 · 채택)
 *   손으로 짠 Tab 루프는 `button, a[href]`만 훑어 input을 놓쳤다 —
 *   이번에 체크박스가 들어오면서 바로 새는 자리가 됐을 것이다.
 *   showModal()은 top layer 승격 + 문서 나머지를 inert로 만든다.
 *   포커스 가두기 · ESC · backdrop이 전부 브라우저 몫이 되어 우리가 짤 코드가 줄고,
 *   무엇보다 아래 사고 방어가 「우리가 지키는 규칙」에서 「구조」로 바뀐다.
 *
 * ■ 딤을 쓰되 갇히지 않게 (사고 세 번을 겪고 세운 방어선)
 *   2026-06-26 LoadingScreen 전체화면 오버레이가 사라지지 않아 사이트 전체 클릭이
 *   먹통이 된 적이 있다(회원탈퇴 버튼까지 막혔다). 그래서 여기서는
 *   · 닫는 길을 넷 둔다 — X / 「닫기」 / 바깥 클릭 / ESC
 *   · 닫히면 <dialog>가 top layer에서 빠지고 UA 스타일시트가 display:none을 건다
 *   · 그 위에 조건부 렌더(!visible → null)를 한 겹 더 둔다 — DOM에서 아예 사라진다
 *   · body 스크롤 잠금은 반드시 cleanup에서 되돌린다
 *   · 한 방문에 한 번만 뜬다(닫으면 닫힌 채로 둔다 — 아래 등장 판단 effect 주석 참조)
 *
 * ■ 사진
 *   FLUX로 지은 「커튼 너머 한국의 가을밤 — 한옥·억새·보름달」.
 *   AI 생성물이므로 팝업 안에 표시한다(AI기본법 §31 생성물 표시 의무). 지우지 말 것.
 */

const MUTE_KEY = "chuseok_2026_muted_until";
const SESSION_KEY = "chuseok_2026_shown_session";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const OPEN_DELAY = 600; // 착지 직후 — 기관 사이트 팝업의 관행을 따른다

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

  const dialogRef = useRef<HTMLDialogElement>(null);
  const muteRef = useRef<HTMLInputElement>(null);
  /** 누르기와 떼기가 둘 다 바깥일 때만 닫기 위한 표식 — 카드 안에서 드래그하다 밖에서 손을 떼면 닫히는 흔한 버그를 막는다. */
  const downOnBackdrop = useRef(false);
  /**
   * 이번 방문에 이미 한 번 띄웠는가.
   * sessionStorage로는 막을 수 없다: 미리보기(?chuseok=preview)는 기록을 남기지 않고,
   * 저장소가 막힌 브라우저에서도 그 검사가 통째로 건너뛰어진다.
   */
  const openedRef = useRef(false);

  const suppressedByPath = SUPPRESSED.some((p) => pathname.startsWith(p));

  // 등장 판단
  //
  // ⚠ 의존성에 visible을 넣지 않는다(2026-09-23). 넣으면 닫는 순간 effect가 다시 돌아
  //   타이머를 새로 걸고, openedRef 하나에만 기대어 재등장을 막게 된다 — 방어선이 하나뿐이다.
  //   빼두면 effect가 애초에 다시 돌지 않으므로 「닫았는데 되뜨는」 길이 두 겹으로 막힌다.
  //   (이 함정은 이미 한 번 겪은 자리다.)
  useEffect(() => {
    if (suppressedByPath || openedRef.current) return;

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
  }, [suppressedByPath]);

  /**
   * 열기·닫기 한 곳. showModal()이 top layer 승격 + 나머지 화면 inert + ESC를 맡는다.
   * 닫힘은 close 이벤트 하나로 모은다 — X · 「닫기」 · 바깥 클릭 · ESC가 전부 여기로 수렴한다.
   *
   * React의 onClose prop 대신 addEventListener를 쓴다. close 이벤트는 버블링하지 않아
   * 합성 이벤트 경로가 조용히 어긋나면 체크박스 저장과 언마운트가 통째로 죽는다 — 직접 단다.
   */
  useEffect(() => {
    if (!visible) return;
    const el = dialogRef.current;
    if (!el) return;

    // 바깥 클릭 닫기 — 지원 브라우저에서는 네이티브로. TS 타입에 없으므로 속성으로 넣는다.
    el.setAttribute("closedby", "any");
    if (!el.open) el.showModal();
    // 정적 콘텐츠 모달은 제목에 초점을 둔다(W3C APG) — autofocus 보조.
    el.querySelector<HTMLElement>("#chuseok-title")?.focus();

    const onClose = () => {
      if (muteRef.current?.checked) {
        try {
          localStorage.setItem(MUTE_KEY, String(Date.now() + WEEK));
        } catch {
          /* 저장이 막혀도 닫히기는 해야 한다 */
        }
      }
      setVisible(false); // 언마운트 → DOM에서 사라진다
    };
    el.addEventListener("close", onClose);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      el.removeEventListener("close", onClose); // 먼저 뗀다 — 아래 close()가 되돌아오지 않게
      document.body.style.overflow = prev; // 되돌리기는 cleanup이 보장한다
      if (el.open) el.close(); // 경로 이동 등으로 그냥 사라질 때 top layer에서 확실히 뺀다
    };
  }, [visible]);

  if (suppressedByPath || !visible) return null;

  const requestClose = () => dialogRef.current?.close();

  return (
    // role / aria-modal 은 붙이지 않는다 — <dialog> + showModal()에 암묵 적용된다(중복은 잡음).
    <dialog
      ref={dialogRef}
      className="chuseok-dialog"
      aria-labelledby="chuseok-title"
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === dialogRef.current;
      }}
      onClick={(e) => {
        // 누르기와 떼기가 둘 다 카드 바깥일 때만 닫는다.
        if (downOnBackdrop.current && e.target === dialogRef.current) requestClose();
      }}
    >
      <div className="cg-card">
        {/* 사진 — 커튼 너머 한국의 가을밤. 장식이므로 alt는 빈 문자열. */}
        <div className="cg-band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/chuseok-2026-band.jpg" alt="" />
          {/* AI 생성 표시 — 지우지 말 것(AI기본법 §31) */}
          <span className="cg-ai">AI 생성 이미지</span>
        </div>

        <div className="cg-scroll">
          <div className="cg-body">
            <p className="cg-over" style={{ fontFamily: "var(--font-inter)" }}>
              한가위 · 2026
            </p>

            <h2 id="chuseok-title" className="cg-title" tabIndex={-1} autoFocus>
              추석 잘 보내세요
            </h2>

            <p className="cg-lead">
              무대를 올리는 분에게도, 객석에 앉는 분에게도 넉넉하고 편안한 한가위가 되기를 바랍니다.
            </p>

            {/* 실용 안내 — 이 팝업이 존재하는 이유. 늦는다는 말로 끝내지 않고 답변 약속까지 적는다. */}
            <p className="cg-notice">
              <b>{CHUSEOK_HOLIDAY_LABEL}</b> 문의와 공연 등록 승인 답변이 조금 늦어질 수 있습니다.
              연휴가 끝나는 대로 하나씩 답변드리겠습니다.
            </p>

            <p className="cg-sign">사유유사 SYUS 드림</p>
          </div>
        </div>

        {/* 바닥 줄 — 국내 기관 팝업의 관행대로 「일주일간 열지 않기」 체크박스 + 「닫기」 버튼 */}
        <div className="cg-foot">
          <label className="cg-check" htmlFor="chuseok-mute">
            <input ref={muteRef} type="checkbox" id="chuseok-mute" />
            <span>일주일간 열지 않기</span>
          </label>
          <button type="button" className="cg-btn" onClick={requestClose}>
            닫기
          </button>
        </div>

        {/* 닫기(X)는 눈에는 맨 위, DOM에는 맨 아래 — 스크린리더가 인사말보다 「닫기」를 먼저 읽지 않게(KRDS) */}
        <button
          type="button"
          className="cg-close"
          onClick={requestClose}
          aria-label="추석 인사 닫기"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M2 2 L14 14 M14 2 L2 14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>
    </dialog>
  );
}
