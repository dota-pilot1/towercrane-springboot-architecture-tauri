import type { MouseEvent, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

// 모든 페이지 공통 상단 헤더 — 높이/보더/드래그 영역을 한 곳에서 결정해 페이지 간 정렬·테마 드리프트 방지.
// 우상단 창 버튼(AppShell의 absolute 오버레이)을 가리지 않도록 내용은 왼쪽 정렬.
// titleBarStyle:overlay + hiddenTitle이라 드래그·더블클릭 최대화를 직접 구현해야 하는데, data-tauri-drag-region 속성은
// 네이티브 레벨에서 마우스 이벤트를 가로채서 브라우저 dblclick이 아예 안 잡히는 경우가 있었다.
// falcon 계열 앱들이 쓰는 방식대로 window.startDragging()을 mousedown에서 직접 호출하는 방식으로
// 교체 — 이러면 dblclick은 가로채이지 않고 정상적으로 남는다.
function PageHeader({ children }: { children?: ReactNode }) {
  const win = getCurrentWindow();

  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    void win.startDragging();
  };

  const handleDoubleClick = () => {
    void win.toggleMaximize();
  };

  return (
    <header
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className="flex items-center gap-2.5 px-4 h-12 shrink-0 bg-surface-raised border-b border-surface-border-soft shadow-sm select-none [&>*:not(button):not([data-actions])]:pointer-events-none"
    >
      {children}
    </header>
  );
}

export default PageHeader;
