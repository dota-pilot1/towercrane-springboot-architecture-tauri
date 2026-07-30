import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../lib/utils";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** 작은 사이즈(리스트 인라인용) */
  size?: "sm" | "md";
  /** 부모 폭을 가득 채움(폼 필드용) */
  block?: boolean;
  selectClassName?: string;
};

// 공통 셀렉트 — 네이티브 꺽쇠를 숨기고(appearance-none) 일정한 위치의 커스텀 꺽쇠를 그린다.
function Select({
  size = "md",
  block = false,
  className,
  selectClassName,
  children,
  ...props
}: Props) {
  const sizeCls = size === "sm" ? "h-9 text-[12px]" : "h-10 text-sm";
  return (
    <div className={cn(block ? "relative block w-full" : "relative inline-block", className)}>
      <select
        {...props}
        className={cn(
          block && "w-full",
          "appearance-none rounded-md border border-surface-border-soft bg-surface-muted px-3 pr-8 font-semibold text-text-primary shadow-sm outline-none transition-colors focus:border-brand-border focus:bg-surface-raised focus:ring-2 focus:ring-brand-border/40 disabled:cursor-not-allowed disabled:opacity-50",
          sizeCls,
          selectClassName,
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">
        <ChevronDown className="size-3" />
      </span>
    </div>
  );
}

export default Select;
