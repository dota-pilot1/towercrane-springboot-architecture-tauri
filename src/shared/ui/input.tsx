import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

// shadcn 스타일 Input. 색상은 프로젝트 semantic 토큰(@theme 등록값)에 연결.
export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm text-text-primary",
          "placeholder:text-text-muted shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:bg-surface-raised focus-visible:border-brand-border focus-visible:ring-2 focus-visible:ring-brand-border/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
