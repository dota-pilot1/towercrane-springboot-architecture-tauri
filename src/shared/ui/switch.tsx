import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

// shadcn 스타일 Switch. 기존 SettingsPage 내부의 ToggleSwitch는 thumb에 top-0.5만 있고
// left 기준값이 없어서(absolute인데 left/right 미지정) 브라우저에 따라 static 위치에 눌러붙어
// 초록 알약 안에서 흰 동그라미가 안 보이는 것처럼 렌더링됐다 — flex 트랙 + translate로 재작성.
export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand-primary" : "bg-surface-strong",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-surface-raised shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";
