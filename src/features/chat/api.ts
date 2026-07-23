import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { API_BASE, apiRequest } from "../../shared/api/client";

export type MeetingRoom = {
  id: string;
  name: string;
  roomType: string;
  description: string | null;
  orderIdx: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  dmCounterpart: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
  } | null;
};

export type MeetingWorkspace = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  orderIdx: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  channelCount: number;
  activeChannelCount: number;
};

// 채널 생성 시 고를 수 있는 종류 (서버 createMeetingRoomSchema와 동일, DM 제외)
export const CHANNEL_ROOM_TYPES = [
  "FREE",
  "ANNOUNCE",
  "QNA",
  "FEEDBACK",
  "ISSUE",
  "DECISION",
  "RESOURCE",
  "INTERNAL",
  "PROTOTYPE",
] as const;

export type ChannelRoomType = (typeof CHANNEL_ROOM_TYPES)[number];

export type MeetingMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  online: boolean;
};

export type MeetingMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  content: string;
  messageType: string;
  payload: unknown;
  pinned: boolean;
  createdAt: string;
};

export async function getRooms(token: string): Promise<MeetingRoom[]> {
  return apiRequest<MeetingRoom[]>("/meeting/rooms", {
    token,
    errorMessage: "대화 목록을 불러오지 못했습니다.",
  });
}

export async function startDm(token: string, otherUserId: string): Promise<MeetingRoom> {
  return apiRequest<MeetingRoom>("/meeting/dms", {
    method: "POST",
    body: { otherUserId },
    token,
    errorMessage: "대화를 시작하지 못했습니다.",
  });
}

export async function getRoomMessages(
  token: string,
  roomId: string,
  limit = 100,
): Promise<MeetingMessage[]> {
  return apiRequest<MeetingMessage[]>(
    `/meeting/rooms/${roomId}/messages?limit=${limit}`,
    { token, errorMessage: "메시지를 불러오지 못했습니다." },
  );
}

export async function sendMeetingMessage(
  token: string,
  roomId: string,
  content: string,
  payload?: Record<string, unknown> | null,
): Promise<MeetingMessage> {
  return apiRequest<MeetingMessage>(`/meeting/rooms/${roomId}/messages`, {
    method: "POST",
    body: payload ? { content, payload } : { content },
    token,
    errorMessage: "메시지 전송에 실패했습니다.",
  });
}

type PresignResult = { presignedUrl: string; publicUrl: string; key: string };

// 파일 선택 → presign 발급 → S3 PUT 업로드 → 공개 URL 반환 (프로필 이미지와 동일 패턴)
export async function uploadChatImage(token: string, file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const presign = await apiRequest<PresignResult>("/upload/presign", {
    method: "POST",
    token,
    body: { filename: file.name, contentType },
    errorMessage: "이미지 업로드를 준비하지 못했습니다.",
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const putRes = await tauriFetch(presign.presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  return presign.publicUrl;
}

// 이모지 리액션 토글 → 갱신된 메시지 반환
export async function toggleReaction(
  token: string,
  roomId: string,
  messageId: string,
  emoji: string,
): Promise<MeetingMessage> {
  return apiRequest<MeetingMessage>(
    `/meeting/rooms/${roomId}/messages/${messageId}/reactions`,
    {
      method: "POST",
      body: { emoji },
      token,
      errorMessage: "리액션을 처리하지 못했습니다.",
    },
  );
}

export type MessageReaction = { emoji: string; count: number; mine: boolean };

// payload.reactions ({ emoji: [userId] }) → 렌더용 배열
export function messageReactions(payload: unknown, currentUserId: string): MessageReaction[] {
  if (!payload || typeof payload !== "object" || !("reactions" in payload)) return [];
  const raw = (payload as { reactions?: unknown }).reactions;
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, unknown>)
    .map(([emoji, users]) => {
      const arr = Array.isArray(users) ? (users as string[]) : [];
      return { emoji, count: arr.length, mine: arr.includes(currentUserId) };
    })
    .filter((r) => r.count > 0);
}

// 메시지 payload에서 이미지 URL 추출 (없으면 null)
export function messageImageUrl(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "imageUrl" in payload) {
    const url = (payload as { imageUrl?: unknown }).imageUrl;
    return typeof url === "string" ? url : null;
  }
  return null;
}

// 방(채널/DM) 멤버 명단 + 온라인 상태
export async function getRoomMembers(
  token: string,
  roomId: string,
): Promise<MeetingMember[]> {
  return apiRequest<MeetingMember[]>(`/meeting/rooms/${roomId}/members`, {
    token,
    errorMessage: "멤버를 불러오지 못했습니다.",
  });
}

// 메시지 고정/해제 (멤버 누구나) → 갱신된 메시지 반환
export async function setMessagePinned(
  token: string,
  roomId: string,
  messageId: string,
  pinned: boolean,
): Promise<MeetingMessage> {
  return apiRequest<MeetingMessage>(
    `/meeting/rooms/${roomId}/messages/${messageId}/pin`,
    {
      method: "POST",
      body: { pinned },
      token,
      errorMessage: "메시지를 고정하지 못했습니다.",
    },
  );
}

// 채널 고정 메시지 목록
export async function getPinnedMessages(
  token: string,
  roomId: string,
): Promise<MeetingMessage[]> {
  return apiRequest<MeetingMessage[]>(`/meeting/rooms/${roomId}/pins`, {
    token,
    errorMessage: "고정 메시지를 불러오지 못했습니다.",
  });
}

// 채널 메시지 전체 비우기 (admin 전용, 서버에서 권한 검증)
export async function clearChannelMessages(token: string, roomId: string): Promise<void> {
  await apiRequest(`/meeting/rooms/${roomId}/messages`, {
    method: "DELETE",
    token,
    errorMessage: "메시지를 비우지 못했습니다.",
  });
}

// DM 나가기: 방을 양쪽 모두에서 삭제(메시지 포함)
export async function leaveRoom(token: string, roomId: string): Promise<void> {
  await apiRequest(`/meeting/rooms/${roomId}/leave`, {
    method: "POST",
    token,
    errorMessage: "대화방을 나가지 못했습니다.",
  });
}

// --- 워크스페이스 / 채널 (그룹 채팅) ---

export async function getWorkspaces(token: string): Promise<MeetingWorkspace[]> {
  return apiRequest<MeetingWorkspace[]>("/meeting/workspaces", {
    token,
    errorMessage: "워크스페이스를 불러오지 못했습니다.",
  });
}

export async function createWorkspace(
  token: string,
  input: { name: string; description?: string | null },
): Promise<MeetingWorkspace> {
  return apiRequest<MeetingWorkspace>("/meeting/workspaces", {
    method: "POST",
    body: { name: input.name, description: input.description ?? null },
    token,
    errorMessage: "워크스페이스를 만들지 못했습니다.",
  });
}

// 워크스페이스의 채널 목록. 서버는 DM도 함께 내려주므로 그룹 채널만 남긴다.
export async function getChannels(
  token: string,
  workspaceId: string,
): Promise<MeetingRoom[]> {
  const rooms = await apiRequest<MeetingRoom[]>(
    `/meeting/workspaces/${workspaceId}/rooms`,
    { token, errorMessage: "채널을 불러오지 못했습니다." },
  );
  return rooms.filter((r) => r.roomType !== "DM");
}

export async function createChannel(
  token: string,
  workspaceId: string,
  input: { name: string; description?: string | null; roomType?: ChannelRoomType },
): Promise<MeetingRoom> {
  return apiRequest<MeetingRoom>(`/meeting/workspaces/${workspaceId}/rooms`, {
    method: "POST",
    body: {
      name: input.name,
      description: input.description ?? null,
      roomType: input.roomType ?? "FREE",
    },
    token,
    errorMessage: "채널을 만들지 못했습니다.",
  });
}

// --- 안읽음 / 검색 ---

export type RoomUnread = {
  roomId: string;
  roomType: string;
  unread: number;
  mentions: number;
};

// 접근 가능한 모든 방의 안읽음/멘션 수 (안읽음 있는 방만 내려옴)
export async function getUnreadCounts(token: string): Promise<RoomUnread[]> {
  return apiRequest<RoomUnread[]>("/meeting/unread-counts", {
    token,
    errorMessage: "안읽음 수를 불러오지 못했습니다.",
  });
}

// 방 읽음 처리 (읽음 커서를 지금으로 이동)
export async function markRoomRead(token: string, roomId: string): Promise<void> {
  await apiRequest(`/meeting/rooms/${roomId}/read`, {
    method: "POST",
    token,
    errorMessage: "읽음 처리에 실패했습니다.",
  });
}

export type MessageSearchResult = MeetingMessage & {
  roomName: string;
  roomType: string;
};

// 메시지 내용 검색 — roomId 지정 시 해당 방만
export async function searchMessages(
  token: string,
  q: string,
  roomId?: string,
  limit = 30,
): Promise<MessageSearchResult[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (roomId) params.set("roomId", roomId);
  return apiRequest<MessageSearchResult[]>(
    `/meeting/messages/search?${params.toString()}`,
    { token, errorMessage: "메시지 검색에 실패했습니다." },
  );
}

// 인박스(안읽음/알림) WS 이벤트 payload
export type InboxEvent = {
  message: MeetingMessage;
  roomType: string;
  roomName: string;
  workspaceId: string | null;
};

// WebSocket(실시간 수신)용 URL. http(s)://host/api → ws(s)://host/ws/meeting
export function meetingSocketUrl(token: string): string {
  const wsBase = API_BASE.replace(/^http/, "ws").replace(/\/api$/, "");
  return `${wsBase}/ws/meeting?token=${encodeURIComponent(token)}`;
}
