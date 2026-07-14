"use client";

/**
 * 시우스 공용 이미지 첨부 트리거.
 *
 * 2026-07-14 (제작팀 — 사장님 지적): 이전엔 순수 `<input type="file">`만 폼에 그대로 노출돼
 * 있었다. 브라우저 기본 회색 버튼 + "선택된 파일 없음" 텍스트 수준이라 존재감이 없고,
 * 사용자가 표지·후기 이미지 첨부 자리를 그냥 지나치기 쉽다는 지적이었다.
 *
 * 실제 `<input>`은 화면에서 감추되(sr-only 방식 — display:none이 아니라 접근성 트리·키보드
 * 포커스는 유지) 클릭 가능한 라벨을 그 자리에 대신 세운다. 사각 배경 버튼(.syc-btn류, 붓칠
 * 스와치)은 폼 제출처럼 "확정 행동"에만 쓰는 톤이라, 첨부는 폼에 이미 있는 보조 CTA 계열인
 * .syc-btn-ghost(붓 밑줄)에 아이콘을 더해 확장했다 — 새 사각 배경을 만들지 않는다.
 *
 * 4상태:
 *  - hover: 붓 밑줄이 진해지고 두꺼워짐(.syc-btn-ghost 기본 동작)
 *  - focus: 키보드 포커스 시 실제 input(:focus-visible)을 감지해 인접 라벨에 아웃라인 표시
 *  - active: 살짝 눌리는 translateY
 *  - disabled: 흐려지고 클릭 불가(부모가 <input disabled>로 제어)
 *
 * 사용처: /syus/books/new(표지), /syus/reviews/new(이미지).
 */
export default function SyusFileInput({
  id,
  file,
  onChange,
  disabled,
  label = "이미지 선택",
  changeLabel = "이미지 변경",
  ariaLabel,
}: {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  changeLabel?: string;
  ariaLabel?: string;
}) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
      <input
        type="file"
        id={id}
        accept="image/*"
        disabled={disabled}
        className="syc-file-input"
        aria-label={ariaLabel ?? label}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <label htmlFor={id} className="syc-btn-ghost syc-file-trigger">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L3 19" />
        </svg>
        {file ? changeLabel : label}
      </label>
      {file && (
        <span className="syc-file-picked">
          {file.name}
          <button
            type="button"
            className="syc-file-remove"
            onClick={() => onChange(null)}
            aria-label="선택한 이미지 제거"
          >
            ×
          </button>
        </span>
      )}
    </span>
  );
}
