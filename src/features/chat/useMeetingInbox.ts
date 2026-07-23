import { useEffect, useRef } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { getToken } from "../../shared/api/client";
import {
  getUnreadCounts,
  markRoomRead,
  meetingSocketUrl,
  type InboxEvent,
} from "./api";
import { containsMention } from "./mention";
import { useUnreadStore } from "./unread-store";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";

// 알림 권한 1회 확인 (실패는 조용히 무시 — 브라우저 dev 등 Tauri 밖)
let notifyReady: Promise<boolean> | null = null;
function ensureNotifyPermission(): Promise<boolean> {
  if (!notifyReady) {
    notifyReady = (async () => {
      try {
        if (await isPermissionGranted()) return true;
        return (await requestPermission()) === "granted";
      } catch {
        return false;
      }
    })();
  }
  return notifyReady;
}

async function notify(title: string, body: string) {
  if (!useAppSettingsStore.getState().notificationsEnabled) return;
  if (!(await ensureNotifyPermission())) return;
  try {
    sendNotification({ title, body: body.slice(0, 120) });
  } catch {
    // Tauri 밖 환경 무시
  }
}

/**
 * 앱 전역 인박스 — AppShell에서 1회 마운트.
 * - 별도 WS로 MEETING_INBOX(모든 내 방의 새 메시지)를 수신해 unread 스토어 갱신
 * - 마운트/재연결 시 서버 안읽음 카운트로 동기화
 * - 보고 있지 않은 방 메시지 → 배지 + (비포커스 또는 멘션이면) 네이티브 알림
 * - 연결 끊기면 3초 후 재연결
 */
export function useMeetingInbox(myUserId: string, myName: string) {
  const myUserIdRef = useRef(myUserId);
  const myNameRef = useRef(myName);
  myUserIdRef.current = myUserId;
  myNameRef.current = myName;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let disposed = false;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const syncCounts = () => {
      getUnreadCounts(token)
        .then((list) => {
          if (!disposed) useUnreadStore.getState().setAll(list);
        })
        .catch(() => {
          /* 다음 동기화 때 복구 */
        });
    };

    const connect = () => {
      if (disposed) return;
      ws = new WebSocket(meetingSocketUrl(token));

      ws.onopen = syncCounts; // 끊겨 있던 동안 놓친 메시지 보정

      ws.onmessage = (ev) => {
        let msg: { type: string; data?: unknown };
        try {
          msg = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (msg.type !== "MEETING_INBOX") return;
        const data = msg.data as InboxEvent;
        const m = data.message;
        if (m.senderId === myUserIdRef.current) return; // 내가 보낸 건 무시

        const store = useUnreadStore.getState();
        const isMention = containsMention(m.content, myNameRef.current);
        const viewing =
          store.activeRoomId === m.roomId && document.hasFocus();

        if (viewing) {
          // 보고 있는 방 — 읽음 커서만 전진
          markRoomRead(token, m.roomId).catch(() => {});
          return;
        }

        store.bump(m.roomId, data.roomType, isMention);

        // 알림: 멘션은 항상, 일반 메시지는 창이 비포커스일 때만
        if (isMention || !document.hasFocus()) {
          const title =
            data.roomType === "DM"
              ? m.senderName
              : `#${data.roomName} — ${m.senderName}`;
          const body = isMention
            ? `📣 ${m.content || "(이미지)"}`
            : m.content || "(이미지)";
          void notify(title, body);
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);
}
