"""
URL 정제 로직 단위 테스트 (Node 없이 Python으로 검증)
대상: src/lib/validators.ts — extractFirstUrl, normalizeUrl, KAKAO/NAVER 화이트리스트

원칙:
- 정규식·화이트리스트 상수는 validators.ts에서 직접 파싱해 가져온다 → 사양 미러 위험 차단
- 로직(보강 순서, endsWith 체크)은 TS와 동일하게 1:1 재현

회귀 시 (syus-web 루트에서):
    python scripts/test_validators.py
"""
from __future__ import annotations
import re
import sys
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
TS_PATH = ROOT / "src" / "lib" / "validators.ts"

# ───────── TS 파일에서 정규식·상수 추출 ─────────
src = TS_PATH.read_text(encoding="utf-8")

# extractFirstUrl 정규식: /https?:\/\/[^\s\])"'<>]+/i
# match() 인자 전체를 잡아 마지막 /i 앞까지 본문으로 사용
m = re.search(r"trimmed\.match\(\s*/(https\?.+?)/i\s*\)", src)
if not m:
    print("ERROR: validators.ts에서 extractFirstUrl 정규식을 찾지 못함")
    sys.exit(2)
URL_REGEX_TS = m.group(1)
# JS → Python 정규식 변환: \/ → /  (JS의 [^\s\])"'<>]+ 클래스는 Python에서도 동일 동작)
URL_REGEX_PY = URL_REGEX_TS.replace(r"\/", "/")
URL_RE = re.compile(URL_REGEX_PY, re.IGNORECASE)

def parse_host_array(name: str) -> list[str]:
    pat = re.search(rf'export const {name} = \[(.*?)\];', src)
    if not pat:
        raise RuntimeError(f"{name} 상수 못 찾음")
    return re.findall(r'"([^"]+)"', pat.group(1))

KAKAO_MAP_HOSTS = parse_host_array("KAKAO_MAP_HOSTS")
NAVER_MAP_HOSTS = parse_host_array("NAVER_MAP_HOSTS")

print(f"[메타] 추출 정규식 = {URL_REGEX_PY}")
print(f"[메타] KAKAO_MAP_HOSTS = {KAKAO_MAP_HOSTS}")
print(f"[메타] NAVER_MAP_HOSTS = {NAVER_MAP_HOSTS}\n")

# ───────── TS 로직 1:1 재현 ─────────
def extract_first_url(text):
    if text is None:
        return ""
    trimmed = str(text).strip()
    if not trimmed:
        return ""
    m = URL_RE.search(trimmed)
    return m.group(0) if m else trimmed

def normalize_url(text):
    if text is None:
        return ""
    trimmed = str(text).strip()
    if not trimmed:
        return ""
    extracted = extract_first_url(trimmed)
    if re.match(r"^https?://", extracted, re.IGNORECASE):
        return extracted
    return "https://" + extracted

def is_valid_url(url, allowed_hosts=None):
    if url is None or not str(url).strip():
        return True
    try:
        parsed = urlparse(str(url).strip())
    except Exception:
        return False
    if not parsed.scheme or not parsed.netloc:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    if allowed_hosts:
        host = parsed.hostname or ""
        matched = any(host == h or host.endswith("." + h) for h in allowed_hosts)
        if not matched:
            return False
    return True

# ───────── 테스트 ─────────
results = []
pass_count = 0
fail_count = 0

def check(name, input_val, actual, expected):
    global pass_count, fail_count
    ok = actual == expected
    if ok:
        pass_count += 1
    else:
        fail_count += 1
    results.append({"name": name, "input": repr(input_val), "actual": repr(actual), "expected": repr(expected), "ok": ok})
    mark = "PASS" if ok else "FAIL"
    print(f"{mark}  {name}")
    if not ok:
        print(f"      입력: {input_val!r}")
        print(f"      기대: {expected!r}")
        print(f"      실제: {actual!r}")

# 1. PC 카카오
i = "https://map.kakao.com/?map_type=TYPE_MAP&itemId=12345"
check("1. PC 카카오 — normalize 그대로", i, normalize_url(i), i)
check("1b. PC 카카오 — 화이트리스트 통과", i, is_valid_url(normalize_url(i), KAKAO_MAP_HOSTS), True)

# 2. 모바일 카카오 단축
i = "https://kko.to/abc"
check("2. 모바일 카카오 단축", i, normalize_url(i), "https://kko.to/abc")
check("2b. 모바일 카카오 단축 — 화이트리스트 통과", i, is_valid_url(normalize_url(i), KAKAO_MAP_HOSTS), True)

# 3. 모바일 카카오 공유 텍스트
i = "[카카오맵] 낙산공원 https://kko.to/abc"
check("3. 모바일 카카오 공유 텍스트 → URL만 추출", i, normalize_url(i), "https://kko.to/abc")

# 4. PC 네이버
i = "https://map.naver.com/v5/entry/place/12345"
check("4. PC 네이버 — normalize 그대로", i, normalize_url(i), i)
check("4b. PC 네이버 — 화이트리스트 통과", i, is_valid_url(normalize_url(i), NAVER_MAP_HOSTS), True)

# 5. 모바일 네이버 단축
i = "https://naver.me/xyz"
check("5. 모바일 네이버 단축", i, normalize_url(i), "https://naver.me/xyz")
check("5b. 모바일 네이버 단축 — 화이트리스트 통과", i, is_valid_url(normalize_url(i), NAVER_MAP_HOSTS), True)

# 6. 모바일 네이버 공유 텍스트
i = "[네이버지도] 낙산공원 https://naver.me/xyz"
check("6. 모바일 네이버 공유 텍스트 → URL만 추출", i, normalize_url(i), "https://naver.me/xyz")

# 7. 프로토콜 누락
i = "place.map.kakao.com/123"
check("7. 프로토콜 누락 → https:// 자동 보강", i, normalize_url(i), "https://place.map.kakao.com/123")
check("7b. 보강 후 카카오 화이트리스트 통과", i, is_valid_url(normalize_url(i), KAKAO_MAP_HOSTS), True)

# 8. 빈/거부
check("8a. 빈 문자열", "", normalize_url(""), "")
check("8b. None (TS의 url?.trim()과 동치)", None, normalize_url(None), "")
evil = "https://evil.example.com/phish"
check("8c. 다른 도메인 — 카카오 화이트리스트 거부", evil, is_valid_url(evil, KAKAO_MAP_HOSTS), False)
check("8d. 다른 도메인 — 네이버 화이트리스트 거부", evil, is_valid_url(evil, NAVER_MAP_HOSTS), False)
check("8e. javascript: 스킴 거부", "javascript:alert(1)", is_valid_url("javascript:alert(1)"), False)

# 9. extractFirstUrl 보조
i = "[카카오맵] 낙산공원 https://kko.to/abc 좋아요"
check("9a. 공유 텍스트에서 URL만 추출", i, extract_first_url(i), "https://kko.to/abc")
i = "  그냥 텍스트  "
check("9b. URL 없는 텍스트는 trim 반환", i, extract_first_url(i), "그냥 텍스트")

print(f"\n=== 결과 ===\nPASS: {pass_count}\nFAIL: {fail_count}\n총: {pass_count + fail_count}")

# 보고서용 JSON 덤프
report_path = ROOT.parent / "문서들" / "Content_Report" / "output" / "production" / "_url_validator_test_results.json"
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps({"pass": pass_count, "fail": fail_count, "results": results, "regex": URL_REGEX_PY, "kakao": KAKAO_MAP_HOSTS, "naver": NAVER_MAP_HOSTS}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[저장] {report_path}")

sys.exit(0 if fail_count == 0 else 1)
