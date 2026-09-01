/**
 * 공유 카드(OG 이미지) 정본 — 2026-09-01.
 *
 * 카카오톡·트위터 등에 링크를 붙였을 때 뜨는 미리보기 카드 이미지를 여기 한 곳에서 정한다.
 * 3층 구조(게이트웨이 / 무대올림 / 시우스)에 맞춰 카드도 3장이다.
 *
 * ── 왜 파일을 따로 뒀나 ──
 * 예전에는 같은 `/og-default.png` 6줄짜리 블록이 6개 파일에 복붙돼 있었다.
 * 그래서 카드를 한 번 바꾸려면 12군데를 고쳐야 했고, 실제로 점검에서 /terms 한 곳이
 * 통째로 누락된 적이 있다. 다음에 카드를 갈 때는 이 파일의 url 한 줄만 고치면 된다.
 *
 * ── Next.js 주의: openGraph·twitter는 '통째로 교체'된다 ──
 * 세그먼트(layout·page)가 openGraph 키를 선언하는 순간, 상위에서 물려받은 openGraph가
 * 부분 병합이 아니라 통째로 갈린다. 그래서 openGraph를 선언하는 파일은 images도 반드시
 * 자기가 다시 적어야 한다. 안 적으면 카드가 조용히 사라진다(실제로 for-business·
 * universities 두 곳이 그 상태였다 — 2026-09-01 확인·수정).
 *
 * ── 파일명에 -v2를 붙인 이유 ──
 * 카카오톡은 OG 이미지를 URL 기준으로 캐시한다. 기존 og-default.png를 덮어썼다면
 * 한동안 낡은 「막」 카드가 계속 나갔을 것이라 새 파일명으로 올렸다.
 *
 * ── public/og-default.png 는 왜 아직 남겨두나 ──
 * 코드에서 참조하는 곳은 이제 없다(2026-09-01 전수 확인). 그런데도 지우지 않은 이유는,
 * 지난 몇 달간 학과 영업 메일·인스타에 뿌린 링크들의 공유 카드가 아직 이 URL을 물고
 * 있을 수 있어서다. 일부 메신저는 이미지를 자기 서버에 복사하지 않고 원본 URL을 그대로
 * 불러오므로, 지금 지우면 그 카드들이 깨진 그림으로 바뀐다.
 * → 지워도 되는 시점: 새 카드가 각 플랫폼에 다시 수집된 뒤(대략 한두 달). 그때
 *   `grep -rn "og-default" src/ --include=*.tsx` 가 비어 있는지만 다시 확인하고 지우면 된다.
 *   (이 파일 자신의 설명 문구가 grep에 걸리므로 .tsx로 좁혀서 본다.)
 */

/** OG 카드 규격 — 3장 모두 1200×630 (카카오톡·트위터 권장비 1.91:1). */
const CARD_SIZE = { width: 1200, height: 630 } as const;

type OgCard = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

/** 게이트웨이(/) · 회사 소개(/company) — 사유유사 로고 + 두 문 안내. */
export const OG_GATEWAY: OgCard = {
  ...CARD_SIZE,
  url: "/og-gateway-v2.png",
  alt: "사유유사 SYUS — 무대올림 넓게 둘러보다, 시우스 깊게 머물다.",
};

/** 무대올림(/muol 계열) — 한글 로고타입 + 「오늘, 어느 대학의 막이 오른다.」 */
export const OG_MUOL: OgCard = {
  ...CARD_SIZE,
  url: "/og-muol-v2.png",
  alt: "무대올림 — 오늘, 어느 대학의 막이 오른다.",
};

/** 시우스(/syus 계열) — 어두운 바탕 + 「연기를 깊게 들여다보다」. */
export const OG_SYUS: OgCard = {
  ...CARD_SIZE,
  url: "/og-syus-v2.png",
  alt: "시우스 SYUS — 연기를 깊게 들여다보다.",
};
