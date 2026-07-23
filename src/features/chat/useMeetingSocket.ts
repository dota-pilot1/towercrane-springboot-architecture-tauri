import { useEffect, useRef } from "react";
import { getToken } from "../../shared/api/client";
import { meetingSocketUrl, type MeetingMessage } from "./api";

/**
 * meeting WebSocket 연결을 관리한다.
 * - 세션 동안 소켓 1개 유지
 * - activeRoomId가 바뀌면 해당 토픽 구독/해제
 * - activeRoom으로 들어온 MEETING_MESSAGE를 onMessage로 전달
 */
export function useMeetingSocket(
  activeRoomId: string | null,
  onMessage: (message: MeetingMessage) => void,
  onCleared?: () => void,
  onPinned?: (message: MeetingMessage) => void,
  onReaction?: (message: MeetingMessage) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onClearedRef = useRef(onCleared);
  const onPinnedRef = useRef(onPinned);
  const onReactionRef = useRef(onReaction);
  const activeRoomRef = useRef<string | null>(activeRoomId);
  onMessageRef.current = onMessage;
  onClearedRef.current = onCleared;
  onPinnedRef.current = onPinned;
  onReactionRef.current = onReaction;

  // 연결 (1회)
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new WebSocket(meetingSocketUrl(token));
    socketRef.current = ws;

    ws.onmessage = (ev) => {
      let msg: { type: string; data?: unknown };
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.type === "MEETING_MESSAGE") {
        const data = msg.data as MeetingMessage;
        if (data.roomId === activeRoomRef.current) {
          onMessageRef.current(data);
        }
      } else if (msg.type === "MEETING_MESSAGES_CLEARED") {
        const data = msg.data as { roomId: string } | undefined;
        if (data?.roomId === activeRoomRef.current) {
          onClearedRef.current?.();
        }
      } else if (msg.type === "MEETING_MESSAGE_PINNED") {
        const data = msg.data as MeetingMessage;
        if (data.roomId === activeRoomRef.current) {
          onPinnedRef.current?.(data);
        }
      } else if (msg.type === "MEETING_MESSAGE_REACTION") {
        const data = msg.data as MeetingMessage;
        if (data.roomId === activeRoomRef.current) {
          onReactionRef.current?.(data);
        }
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, []);

  // 방 구독 전환
  useEffect(() => {
    activeRoomRef.current = activeRoomId;
    const ws = socketRef.current;
    if (!activeRoomId || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({ type: "SUBSCRIBE", topic: `meeting/${activeRoomId}` }));
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "UNSUBSCRIBE", topic: `meeting/${activeRoomId}` }));
      }
    };
  }, [activeRoomId]);
}
