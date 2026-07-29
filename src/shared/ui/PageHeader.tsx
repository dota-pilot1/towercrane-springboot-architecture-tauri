import type { MouseEvent, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import WindowControls from "./WindowControls";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      "button, a, input, textarea, select, [contenteditable='true'], [data-no-drag]",
    )
  );
}

// 모든 페이지 공통 상단 헤더. 빈 영역은 창 드래그/더블클릭 최대화에 사용하고,
// 액션과 창 버튼은 data-no-drag로 네이티브 창 이동에서 분리한다.
function PageHeader({ children }: { children?: ReactNode }) {
  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (!isTauri || e.button !== 0 || isInteractive(e.target)) return;
    void getCurrentWindow().startDragging();
  };

  const handleDoubleClick = (e: MouseEvent<HTMLElement>) => {
    if (!isTauri || isInteractive(e.target)) return;
    void getCurrentWindow().toggleMaximize();
  };

  return (
    <header
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className="flex h-12 shrink-0 select-none items-center gap-2.5 border-b border-surface-border-soft bg-surface-raised px-4 shadow-sm"
    >
      {children}
      <div
        className="ml-auto flex shrink-0 items-center gap-2"
        data-no-drag
      >
        <span
          className="h-5 w-px bg-surface-border-soft"
          aria-hidden="true"
        />
        <WindowControls />
      </div>
    </header>
  );
}

export default PageHeader;
