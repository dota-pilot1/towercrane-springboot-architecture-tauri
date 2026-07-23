import type { SelectHTMLAttributes } from "react";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** 작은 사이즈(리스트 인라인용) */
  size?: "sm" | "md";
  /** 부모 폭을 가득 채움(폼 필드용) */
  block?: boolean;
};

// 공통 셀렉트 — 네이티브 꺽쇠를 숨기고(appearance-none) 일정한 위치의 커스텀 꺽쇠를 그린다.
function Select({ size = "md", block = false, className = "", children, ...props }: Props) {
  const sizeCls = size === "sm" ? "py-1.5 text-[12px]" : "py-2.5 text-[14px]";
  return (
    <div className={(block ? "relative block w-full" : "relative inline-block") + " " + className}>
      <select
        {...props}
        className={
          (block ? "w-full " : "") +
          "appearance-none rounded-lg border border-surface-border-soft bg-surface-muted pl-3 pr-8 text-text-primary outline-none transition-colors focus:border-brand-border focus:bg-surface-raised " +
          sizeCls
        }
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  );
}

export default Select;
