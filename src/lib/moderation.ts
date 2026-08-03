/**
 * 무대올림 후기 자동 검열 (2026-06-02)
 *
 * 2단 검열:
 *  1) 한국어 욕설/비방 사전 — 즉시 차단 (status='blocked')
 *  2) OpenAI Moderation API — 의심글 보류 (status='hidden', 관리자 검토)
 *
 * 사장님 결정: A 사전 + C OpenAI Moderation 2단
 * 환경변수: OPENAI_API_KEY (없으면 1단만 작동, 2단 통과 처리)
 */

// ─── 1단: 한국어 욕설/비방/모욕 사전 ─────────────────────────────────
// 대표 단어 + 자주 쓰이는 우회 변형. 운영자가 admin에서 신고 누적 단어 추가 가능.
//
// 2026-08-03 정비 — 1단은 '문맥과 무관하게 명백한 것'만 잡는다.
//   1단에 걸리면 후기가 DB에 저장조차 안 되고 "정책 위배"만 뜨므로(사용자는 이유를 모른 채 이탈),
//   정상적인 연극 비평에 쓰일 수 있는 말은 사전에서 뺐다. 뉘앙스 판단은 2단(OpenAI)에 맡긴다.
//   뺀 말: 장애인(장애인 좌석·장애인 역할) / 쌍(쌍둥이·한 쌍) / 쓰레기·쓰래기(쓰레기통·"쓰레기 같은 인물")
//          한심·미친놈·또라이·정신병자(배역 묘사) / 야해(의상 비평) / 졸라(졸라매다)
//          보지("보지 못했다") / 자지("자지 않고") / 꺼져("조명이 꺼져" — 극장 상용어)
//          시바(시바견) / 역겹·역겨·구역질·토나(정상 비평 어휘) / 한남(한남대학교·한남동 → "한남충"으로 좁힘)

// 사전 A — 문맥과 무관하게 차단. 공백·특수문자를 지운 뒤 부분 일치로 검사(띄어쓰기 우회 차단).
const HARD_BAD_WORDS = [
  // 욕설 기본
  "씨발", "씨봘", "ㅅㅂ", "썅", "개새끼", "개색기", "개색끼",
  "병신", "븅신", "빙신", "ㅂㅅ", "지랄", "ㅈㄹ",
  "좆", "좃", "ㅈ같", "ㅈ나", "존나",
  "엿먹", "엿같", "빡친다", "빡쳐",
  // 모욕·비방
  "찌질", "찐따", "미친년", "ㅁㅊ",
  // 차별·혐오
  "꼴페미", "한남충", "김치녀", "맘충", "급식충",
  // 성적
  "젖탱", "야동",
  // 모욕 + 영문 변형
  "ㅄ", "ㅗ", "fxxk", "fck",
];

// 사전 B — 일반 어휘의 일부로도 등장하는 말. 원문(띄어쓰기 살린 상태) 기준으로 보고,
//   앞이나 뒤에 한글이 더 붙어 있으면 다른 단어로 간주해 통과시킨다.
//   예) "시발점"·"닥쳐온다" → 통과 / "시발!"·"아 시발" → 차단
const BOUNDED_BAD_WORDS = ["시발", "닥쳐"];

// 한글 음절 + 자모 (앞뒤 인접 문자 판정용)
const HANGUL_CHAR = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

/** 사전 B 판정 — 앞뒤가 한글로 이어지지 않는 자리에서 등장할 때만 적중 */
function hasBoundedWord(text: string, word: string): boolean {
  let from = 0;
  for (;;) {
    const i = text.indexOf(word, from);
    if (i < 0) return false;
    const before = text[i - 1];
    const after = text[i + word.length];
    const glued = (before && HANGUL_CHAR.test(before)) || (after && HANGUL_CHAR.test(after));
    if (!glued) return true;
    from = i + 1;
  }
}

/**
 * 1차 — 한국어 사전 매칭
 * 사전 A는 공백·특수문자 무시 정규화 후, 사전 B는 원문 기준으로 비교.
 */
export type DictResult = {
  matched: string[];
  hit: boolean;
};

export function checkKoreanBadWords(text: string): DictResult {
  // 공백·점·하이픈·언더바·*제거. 한글 자모 노출도 그대로 검사.
  const normalized = text.replace(/[\s.\-_*~`]/g, "");
  const lower = normalized.toLowerCase();
  const raw = text.toLowerCase();
  const matched: string[] = [];

  for (const word of HARD_BAD_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      matched.push(word);
    }
  }

  for (const word of BOUNDED_BAD_WORDS) {
    if (hasBoundedWord(raw, word.toLowerCase())) {
      matched.push(word);
    }
  }

  return { matched, hit: matched.length > 0 };
}

// ─── 2단: OpenAI Moderation API ────────────────────────────────────────
// 무료 (omni-moderation-latest)
// 응답: { results: [{ flagged, categories, category_scores }] }

export type ModerationResult = {
  flagged: boolean;
  maxScore: number;
  categories: Record<string, boolean>;
  rawError?: string;
};

const MODERATION_URL = "https://api.openai.com/v1/moderations";

export async function checkOpenAIModeration(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // API 키 없으면 통과 (1단 사전만 작동)
    return { flagged: false, maxScore: 0, categories: {} };
  }

  try {
    const res = await fetch(MODERATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[moderation] OpenAI Moderation 호출 실패:", err);
      return { flagged: false, maxScore: 0, categories: {}, rawError: err };
    }

    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) {
      return { flagged: false, maxScore: 0, categories: {} };
    }

    const scores = (result.category_scores ?? {}) as Record<string, number>;
    const maxScore = Math.max(0, ...Object.values(scores));

    return {
      flagged: Boolean(result.flagged),
      maxScore,
      categories: (result.categories ?? {}) as Record<string, boolean>,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[moderation] OpenAI Moderation 예외:", msg);
    return { flagged: false, maxScore: 0, categories: {}, rawError: msg };
  }
}

// ─── 통합: 후기 본문 → 최종 status 결정 ───────────────────────────────

export type FinalStatus = "blocked" | "hidden" | "public";

export type ModerationOutcome = {
  status: FinalStatus;
  dict: DictResult;
  api: ModerationResult;
  source: "dict" | "openai" | "both" | "clean";
};

/**
 * 검열 흐름:
 *  1) 사전 매칭 → blocked (즉시 차단, 사용자에게 정책 위반 안내)
 *  2) Moderation API 호출
 *     - flagged=true 또는 maxScore ≥ 0.8 → hidden (운영자 검토 큐)
 *     - 통과 → public (즉시 공개)
 */
export async function moderateReview(body: string): Promise<ModerationOutcome> {
  const dict = checkKoreanBadWords(body);
  if (dict.hit) {
    return {
      status: "blocked",
      dict,
      api: { flagged: false, maxScore: 0, categories: {} },
      source: "dict",
    };
  }

  const api = await checkOpenAIModeration(body);
  if (api.flagged || api.maxScore >= 0.8) {
    return { status: "hidden", dict, api, source: "openai" };
  }

  return { status: "public", dict, api, source: "clean" };
}
