import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";

export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "uptodate"
  | "available"
  | "downloading"
  | "error";

export type AppUpdateState = {
  status: AppUpdateStatus;
  currentVersion: string;
  availableVersion: string;
  notes: string;
  progress: number;
  message: string;
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "업데이트 확인에 실패했습니다.";

// falcon-listening-tauri의 useAppUpdate 패턴 — 상태 머신 + 다운로드 진행률을 노출해서
// window.confirm 대신 설정 화면에 진행률 바가 있는 업데이트 패널을 그릴 수 있게 한다.
// Tauri 밖(브라우저 dev) 환경에서는 check()가 실패하므로 status="error"로 조용히 남는다.
export function useAppUpdate() {
  const [state, setState] = useState<AppUpdateState>({
    status: "idle",
    currentVersion: "",
    availableVersion: "",
    notes: "",
    progress: 0,
    message: "",
  });
  const updateRef = useRef<Update | null>(null);
  const startupCheckedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getVersion()
      .then((version) => {
        if (!cancelled) setState((current) => ({ ...current, currentVersion: version }));
      })
      .catch(() => {
        /* Tauri 밖 환경은 조용히 무시 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkForUpdate = useCallback(async (options?: { silent?: boolean }) => {
    setState((current) => ({ ...current, status: "checking", message: "", progress: 0 }));
    try {
      const update = await check();
      updateRef.current = update;
      if (update) {
        setState((current) => ({
          ...current,
          status: "available",
          availableVersion: update.version,
          notes: update.body ?? "",
          message: "",
          progress: 0,
        }));
      } else {
        setState((current) => ({
          ...current,
          status: "uptodate",
          availableVersion: "",
          notes: "",
          message: "",
          progress: 0,
        }));
      }
    } catch (error) {
      updateRef.current = null;
      setState((current) => ({
        ...current,
        status: options?.silent ? "idle" : "error",
        message: options?.silent ? "" : toErrorMessage(error),
      }));
    }
  }, []);

  const checkOnceOnStartup = useCallback(() => {
    if (startupCheckedRef.current) return;
    startupCheckedRef.current = true;
    void checkForUpdate({ silent: true });
  }, [checkForUpdate]);

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setState((current) => ({ ...current, status: "downloading", message: "", progress: 0 }));
    try {
      let total = 0;
      let downloaded = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setState((current) => ({
              ...current,
              progress: Math.min(100, Math.round((downloaded / total) * 100)),
            }));
          }
        }
      });
      await relaunch();
    } catch (error) {
      setState((current) => ({ ...current, status: "error", message: toErrorMessage(error) }));
    }
  }, []);

  return {
    state,
    checkForUpdate,
    checkOnceOnStartup,
    installUpdate,
    busy: state.status === "checking" || state.status === "downloading",
    hasUpdate: state.status === "available" || state.status === "downloading",
  };
}
