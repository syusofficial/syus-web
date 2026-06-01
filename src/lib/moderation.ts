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
// 비방·모욕·차별·성적 표현·악성 댓글 패턴.

const KOREAN_BAD_WORDS = [
  // 욕설 기본
  "씨발", "씨봘", "ㅅㅂ", "시발", "시바", "썅", "쌍", "개새끼", "개색기", "개색끼",
  "병신", "븅신", "빙신", "ㅂㅅ", "지랄", "ㅈㄹ", "닥쳐", "꺼져",
  "좆", "좃", "ㅈ같", "ㅈ나", "졸라", "존나",
  "엿먹", "엿같", "빡친다", "빡쳐",
  // 모욕·비방
  "쓰레기", "쓰래기", "한심", "찌질", "찐따", "또라이", "정신병자", "미친놈", "미친년", "ㅁㅊ",
  "역겹", "역겨", "구역질", "토나",
  // 차별·혐오
  "장애인", "꼴페미", "한남", "김치녀", "맘충", "급식충",
  // 성적
  "보지", "자지", "젖탱", "야해", "야동",
  // 모욕 + 영문 변형
  "ㅄ", "ㅗ", "fxxk", "fck",
];

/**
 * 1차 — 한국어 사전 매칭
 * 공백·특수문자 무시 정규화 후 비교.
 */
export type DictResult = {
  matched: string[];
  hit: boolean;
};

export function checkKoreanBadWords(text: string): DictResult {
  // 공백·점·하이픈·언더바·*제거. 한글 자모 노출도 그대로 검사.
  const normalized = text.replace(/[\s.\-_*~`]/g, "");
  const lower = normalized.toLowerCase();
  const matched: string[] = [];

  for (const word of KOREAN_BAD_WORDS) {
    if (lower.includes(word.toLowerCase())) {
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
