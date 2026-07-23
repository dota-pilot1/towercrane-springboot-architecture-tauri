import { CircleAlert, CircleCheck, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./button";
import type { useAppUpdate } from "../lib/useAppUpdate";

// 프로필 페이지의 "앱 업데이트" 카드 — 상태 확인 버튼 + 새 버전 발견 시 진행률 바.
// AppShell 레일의 업데이트 배지와 같은 useAppUpdate 인스턴스를 공유해 상태가 항상 일치한다.
export function AppUpdateCard({ appUpdate }: { appUpdate: ReturnType<typeof useAppUpdate> }) {
  const { state, busy, hasUpdate } = appUpdate;

  return (
    <section className="rounded-xl border border-surface-border-soft bg-surface-raised p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-text-primary">앱 업데이트</span>
            <span className="text-[12px] text-text-secondary tabular-nums">
              현재 버전 {state.currentVersion ? `v${state.currentVersion}` : "-"}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => void appUpdate.checkForUpdate()}
            className="shrink-0 gap-1.5"
          >
            {state.status === "checking" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {state.status === "checking" ? "확인 중" : "업데이트 확인"}
          </Button>
        </div>

        {state.status === "uptodate" && (
          <div className="flex items-center gap-1.5 text-[12px] text-text-secondary">
            <CircleCheck className="size-3.5 text-brand-primary" />
            최신 버전을 사용 중입니다.
          </div>
        )}

        {state.status === "error" && (
          <div className="flex items-center gap-1.5 text-[12px] text-destructive">
            <CircleAlert className="size-3.5" />
            {state.message || "업데이트를 확인하지 못했습니다."}
          </div>
        )}

        {hasUpdate && (
          <div className="flex flex-col gap-2 rounded-lg border border-brand-border bg-brand-glass p-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-text-primary">
                새 버전 v{state.availableVersion}
              </span>
              <span className="text-[11px] text-text-secondary">설치 후 앱이 재시작됩니다.</span>
            </div>
            {state.notes && (
              <p className="text-[12px] text-text-secondary whitespace-pre-line">{state.notes}</p>
            )}
            {state.status === "downloading" && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            )}
            <Button
              size="sm"
              disabled={busy && state.status !== "downloading"}
              onClick={() => void appUpdate.installUpdate()}
              className="self-start gap-1.5"
            >
              {state.status === "downloading" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              {state.status === "downloading" ? `다운로드 ${state.progress}%` : "지금 업데이트"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
