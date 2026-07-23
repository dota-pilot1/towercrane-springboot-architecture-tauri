import { create } from "zustand";
import type { RoomUnread } from "./api";

type RoomCount = { unread: number; mentions: number; roomType: string };

type UnreadState = {
  counts: Record<string, RoomCount>;
  // 채팅 화면에서 현재 보고 있는 방 — 이 방의 새 메시지는 즉시 읽음 처리
  activeRoomId: string | null;
  setAll: (list: RoomUnread[]) => void;
  bump: (roomId: string, roomType: string, isMention: boolean) => void;
  clearRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string | null) => void;
};

export const useUnreadStore = create<UnreadState>((set) => ({
  counts: {},
  activeRoomId: null,
  setAll: (list) =>
    set({
      counts: Object.fromEntries(
        list.map((r) => [
          r.roomId,
          { unread: r.unread, mentions: r.mentions, roomType: r.roomType },
        ]),
      ),
    }),
  bump: (roomId, roomType, isMention) =>
    set((state) => {
      const prev = state.counts[roomId] ?? { unread: 0, mentions: 0, roomType };
      return {
        counts: {
          ...state.counts,
          [roomId]: {
            roomType,
            unread: prev.unread + 1,
            mentions: prev.mentions + (isMention ? 1 : 0),
          },
        },
      };
    }),
  clearRoom: (roomId) =>
    set((state) => {
      if (!state.counts[roomId]) return state;
      const next = { ...state.counts };
      delete next[roomId];
      return { counts: next };
    }),
  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),
}));

// 레일 배지용 합계 — DM(메신저 아이콘)과 채널(채팅 아이콘) 분리
export function sumUnread(
  counts: Record<string, RoomCount>,
  kind: "dm" | "channel",
): { unread: number; mentions: number } {
  let unread = 0;
  let mentions = 0;
  for (const c of Object.values(counts)) {
    const isDm = c.roomType === "DM";
    if ((kind === "dm") !== isDm) continue;
    unread += c.unread;
    mentions += c.mentions;
  }
  return { unread, mentions };
}
