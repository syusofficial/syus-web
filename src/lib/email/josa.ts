/**
 * 조사 자동 선택 — 앞말의 받침에 따라 "이/가", "을/를", "은/는", "과/와"를 고른다.
 *
 * 2026-09-10 신설. 승인·반려 메일을 실제로 렌더해 보다가 발견했다.
 * 공연 제목은 매번 다른데 조사가 고정이라 이렇게 나가고 있었다.
 *   「빈 의자」이 검토를 마치고 …   (받침이 없으니 "가"여야 한다)
 *   「빈 의자」을 살펴보았습니다     (받침이 없으니 "를"이어야 한다)
 * 「햄릿」처럼 받침으로 끝나는 제목에서는 맞고 그 외에는 틀리는, 절반만 맞는 문장이었다.
 *
 * 판정 방법 — 한글 음절은 유니코드에서 (초성×21 + 중성)×28 + 종성 순서로 배열돼 있어,
 * (코드 - 0xAC00) % 28 이 0이면 받침이 없다.
 *
 * 한글이 아닌 글자로 끝나는 제목(영문·숫자·기호)도 들어온다. 그때는:
 *   · 숫자   — 읽는 소리로 판정한다(1=일, 2=이 …). "「Act 2」가" 처럼 소리대로 맞춘다.
 *   · 영문   — 받침처럼 소리 나는 자음(l, m, n, ng, r 등)으로 끝나면 받침 있음으로 본다.
 *   · 그 외  — 받침 없음으로 본다(괄호·물음표 등으로 끝나는 제목).
 * 어차피 완벽할 수 없는 판정이라, 애매하면 "받침 없음"으로 기울여 둔다 —
 * "「Q」가"가 "「Q」이"보다 덜 어색하기 때문이다.
 */

/** 숫자를 한국어로 읽었을 때 받침으로 끝나는가 — 0(영) 1(일) 3(삼) 6(육) 7(칠) 8(팔) */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  "0": true,  // 영
  "1": true,  // 일
  "2": false, // 이
  "3": true,  // 삼
  "4": false, // 사
  "5": false, // 오
  "6": true,  // 육
  "7": true,  // 칠
  "8": true,  // 팔
  "9": false, // 구
};

/** 영문으로 끝나는 말을 한국어로 읽었을 때 받침으로 끝나는가
 *  (Hotel=호텔 · Album=앨범 · Carmen=카르멘 → 받침 있음)
 *
 *  r 은 false 로 둔다. 낱자 R 하나만 보면 "아르"라 받침이 있지만, 단어 끝의 r 은
 *  거의 "-러/-어"로 읽힌다 — Gabler=가블러, Lear=리어, Sailor=세일러.
 *  「Hedda Gabler」는 "가블러가"이지 "가블러이"가 아니다. 낱자로 끝나는 제목보다
 *  단어로 끝나는 제목이 훨씬 흔하므로 흔한 쪽에 맞춘다. */
const ALPHA_HAS_FINAL: Record<string, boolean> = {
  l: true, m: true, n: true, r: false,
  b: false, c: false, d: false, e: false, f: false, g: false, h: false,
  i: false, j: false, k: false, o: false, p: false, q: false, s: false,
  t: false, u: false, v: false, w: false, x: false, y: false, z: false,
  a: false,
};

/** 앞말이 받침으로 끝나는지 판정한다. 끝의 따옴표·괄호·공백은 벗겨내고 본다. */
export function hasFinalConsonant(word: string | null | undefined): boolean {
  if (!word) return false;
  // 「」·따옴표·괄호·공백처럼 소리 나지 않는 기호는 걷어내고 마지막 '읽는 글자'를 찾는다
  const cleaned = word.replace(/[\s"'”’」』）\)\]}』.!?…·~-]+$/u, "");
  const last = cleaned.at(-1);
  if (!last) return false;

  const code = last.charCodeAt(0);
  // 한글 음절 영역
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(last)) return DIGIT_HAS_FINAL[last] ?? false;
  if (/[a-zA-Z]/.test(last)) return ALPHA_HAS_FINAL[last.toLowerCase()] ?? false;
  return false;
}

/** 앞말에 맞는 조사를 고른다. `josa("빈 의자", "이")` → "가" */
export function josa(word: string | null | undefined, pair: "이" | "을" | "은" | "과"): string {
  const withFinal = { 이: "이", 을: "을", 은: "은", 과: "과" } as const;
  const without = { 이: "가", 을: "를", 은: "는", 과: "와" } as const;
  return hasFinalConsonant(word) ? withFinal[pair] : without[pair];
}
