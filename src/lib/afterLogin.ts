import type { useRouter } from "next/navigation";

/**
 * 로그인(또는 가입 마무리)이 끝난 뒤 다음 화면으로 넘어가기 — 2026-11-04
 *
 * 되돌리지 말 것. 이전엔 각 화면이 `router.push(dest); router.refresh();` 직후 버튼을 원래대로 돌려놨다.
 * 운영 사이트 실측(가입 직후 첫 로그인): 로그인 성공 0.5초 만에 메뉴는 「로그아웃」으로 바뀌는데
 * 버튼은 「로그인」으로 돌아오고 화면은 1.2초 더 로그인 페이지에 머물렀다. refresh가 화면 안 링크들의
 * 미리 불러오기를 한꺼번에 다시 쏘아 이동 요청과 겹쳤기 때문이고, 폰 회선에선 이 구간이 수 초로 늘어
 * 「멈춘 화면」으로 보였다(2026-11-04 사장님 목격).
 * - refresh를 부르지 않는다. 목적지는 로그인 쿠키를 실은 새 요청으로 그려지므로 필요 없다.
 * - push 대신 replace — 뒤로 가기로 로그인 화면에 돌아오지 않게.
 * - 호출한 화면은 버튼을 「처리 중」으로 둔 채 화면이 바뀌기를 기다린다(버튼을 되돌리지 않는다).
 * - 8초가 지나도 같은 화면이면 주소창 이동으로 한 번 더 — 어떤 경우에도 로그인 화면에 갇히지 않게.
 */
export function goAfterLogin(router: ReturnType<typeof useRouter>, dest: string) {
  const from = window.location.pathname + window.location.search;
  router.replace(dest);
  setTimeout(() => {
    if (window.location.pathname + window.location.search === from) window.location.assign(dest);
  }, 8000);
}
