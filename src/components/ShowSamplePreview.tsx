"use client";

import Image from "next/image";
import { formatShowPeriod } from "@/lib/showDate";

/**
 * 「올리시면, 이렇게 걸립니다」 — 공연 등록 안내 화면(/muol/performer)의 미리보기.
 *
 * 배경 — 2026-09-11 영업·마케팅·운영 3개 부서 합의로 들어온 자리다.
 *   승인 공연이 0건인 동안 공연 목록이 비어 있어서, 확인하러 들어온 학과 담당자가
 *   "여기는 아무도 안 쓴다"로 읽고 돌아간다(/muol/shows 478세션 중 92% 즉시 이탈, 실측).
 *   그렇다고 예시 공연을 목록에 승인 상태로 걸면
 *     (a) 관객이 존재하지 않는 공연에 좌석을 신청하고 확인 메일까지 받는다
 *     (b) rejected 라는 식별 표식이 사라져 나중에 안전하게 걷어낼 수 없다
 *     (c) 학과·재단·광고주에게는 실적 부풀리기로 읽힌다 — 한 번 들키면 관계가 복구되지 않는다
 *   그래서 예시는 목록이 아니라 **등록 안내 화면 안**에서만, 예시라고 밝히고 보여준다.
 *   담당자가 확인하고 싶은 "우리 공연이 걸리면 어떻게 보이나"는 이걸로 답이 된다.
 *
 * 되돌리지 말아야 할 선 3가지
 *   · 카드는 링크가 아니다 — 누를 곳이 없어야 실제 공연으로 오인되지 않는다.
 *   · "예시" 배지를 지우지 않는다.
 *   · 이 컴포넌트를 /muol/shows(공연 목록)에 가져다 쓰지 않는다. 목록은 진짜 공연만 싣는다.
 *
 * 포스터 3장은 운영자가 만든 예시자료이고 public/muol/samples/ 에 정적 파일로 둔다
 * (7.0MB PNG → 115KB webp). DB의 예시 공연 행(rejected 5건)을 지워도 이 화면은 깨지지 않는다.
 * 카드에 적는 날짜·장소는 포스터 안에 인쇄된 값과 똑같이 맞춘다 — 어긋나면 그게 더 이상하다.
 */

const SAMPLES = [
  {
    src: "/muol/samples/sample-play.webp",
    title: "빈 의자",
    genre: "연극",
    venue: "예술관 블랙박스 시어터",
    start: "2026-09-18",
    end: "2026-09-21",
  },
  {
    src: "/muol/samples/sample-musical.webp",
    title: "별을 삼킨 도시",
    genre: "뮤지컬",
    venue: "대학로 큰무대",
    start: "2026-10-02",
    end: "2026-10-05",
  },
  {
    src: "/muol/samples/sample-traditional.webp",
    title: "탈, 춤추다",
    genre: "전통연희",
    venue: "야외마당 특설무대",
    start: "2027-05-05",
    end: "2027-05-05",
  },
] as const;

export default function ShowSamplePreview() {
  return (
    <section className="mb-12" aria-labelledby="sample-preview-heading">
      <div className="pt-5 mb-5" style={{ borderTop: "1px solid #D4CFC1" }}>
        <h2
          id="sample-preview-heading"
          className="text-base md:text-lg font-bold mb-2"
          style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#3A2E27", wordBreak: "keep-all" }}
        >
          올리시면, 이렇게 걸립니다
        </h2>
        <p
          className="text-sm leading-[1.9]"
          style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5F5145", wordBreak: "keep-all" }}
        >
          아래 세 장은 화면을 보여드리려고 저희가 만들어 둔 예시입니다. 실제로 열리는 공연은 아닙니다.
          적어주신 내용이 이 형태로 걸립니다.
        </p>
      </div>

      {/* 모바일은 옆으로 넘겨 보고, PC는 세 장을 한눈에.
          카드가 화면 밖으로 잘려 보여야 "옆에 더 있다"가 손에 읽힌다(모바일 45% 폭). */}
      <ul className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:mx-0 md:px-0">
        {SAMPLES.map((s) => (
          <li key={s.title} className="min-w-[45%] md:min-w-0">
            {/* 실제 공연 카드(ShowCard)와 같은 3:4 판형·같은 조판.
                다른 점은 셋뿐 — 누를 수 없고, 좋아요가 없고, 예시 배지가 있다. */}
            <div className="relative aspect-[3/4] overflow-hidden mb-3" style={{ backgroundColor: "#E6E1D6" }}>
              <Image
                src={s.src}
                alt={`${s.genre} 예시 포스터 — ${s.title}`}
                fill
                sizes="(max-width: 768px) 45vw, 220px"
                className="object-cover"
              />
              <span
                className="absolute top-2 left-2 px-2 py-1"
                style={{
                  fontFamily: "var(--font-noto-sans-kr)",
                  fontSize: "0.66rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  backgroundColor: "rgba(74, 59, 51, 0.88)", // Silhouette
                  color: "#F0EEE9",
                  backdropFilter: "blur(4px)",
                }}
              >
                예시
              </span>
            </div>
            <div className="space-y-1">
              <p
                className="text-sm font-semibold leading-snug"
                style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#4A3B33", wordBreak: "keep-all" }}
              >
                {s.title}
              </p>
              <p className="text-xs" style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#5A4A3E", wordBreak: "keep-all" }}>
                {s.venue}
              </p>
              <p className="text-xs" style={{ fontFamily: "var(--font-inter)", color: "#5A4A3E" }}>
                {/* 목록과 같은 포맷 함수를 그대로 쓴다 — 표기가 다르면 미리보기가 아니다 */}
                {formatShowPeriod(s.start, s.end, { weekday: false })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
