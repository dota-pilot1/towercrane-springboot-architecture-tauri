import type { MouseEvent } from "react";
import { GripVertical } from "lucide-react";

// 컬럼(1·2차 주제) 사이에 놓는 드래그 리사이즈 손잡이.
// onMouseDown 은 useColumnResize 훅이 돌려주는 핸들러를 그대로 넘긴다.
export function ColumnResizeHandle({
  onMouseDown,
  title = "너비 조절",
}: {
  onMouseDown: (e: MouseEvent) => void;
  title?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title={title}
      onMouseDown={onMouseDown}
      className="group relative z-10 mx-1 flex w-3 shrink-0 cursor-col-resize select-none items-center justify-center"
    >
      <span className="h-full w-px bg-surface-border-soft transition-colors group-hover:bg-brand-border" />
      <span className="absolute grid h-9 w-4 place-items-center rounded-full border border-surface-border-soft bg-surface-raised text-text-muted opacity-0 shadow-sm transition-all group-hover:opacity-100 group-hover:border-brand-border group-hover:text-brand-primary">
        <GripVertical className="size-3" />
      </span>
    </div>
  );
}

export default ColumnResizeHandle;
