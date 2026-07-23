import { getCurrentWindow } from "@tauri-apps/api/window";

// 네이티브 신호등(trafficLightPosition으로 화면 밖 이동) 대신 헤더 우상단에 직접 그리는 창 버튼
function WindowControls() {
  const win = getCurrentWindow();

  return (
    <div className="flex items-center gap-1 pointer-events-auto">
      <button
        onClick={() => win.minimize()}
        title="최소화"
        className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="2.5" y1="6" x2="9.5" y2="6" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={() => win.toggleMaximize()}
        title="최대화"
        className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" />
        </svg>
      </button>
      <button
        onClick={() => win.close()}
        title="닫기"
        className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-primary-foreground hover:bg-destructive"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <line x1="3" y1="3" x2="9" y2="9" strokeLinecap="round" />
          <line x1="9" y1="3" x2="3" y2="9" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export default WindowControls;
