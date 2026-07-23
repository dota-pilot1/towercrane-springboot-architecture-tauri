import { useEffect, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Users } from "lucide-react";
import { getToken } from "../../shared/api/client";
import {
  clearChannelMessages,
  getPinnedMessages,
  getRoomMessages,
  markRoomRead,
  messageImageUrl,
  messageReactions,
  sendMeetingMessage,
  setMessagePinned,
  toggleReaction,
  uploadChatImage,
  type MeetingMember,
  type MeetingMessage,
  type MeetingRoom,
} from "./api";
import { useMeetingSocket } from "./useMeetingSocket";
import { avatarColor } from "../../shared/lib/avatar-color";
import { activeMentionQuery, splitMentions } from "./mention";
import { useUnreadStore } from "./unread-store";
import MessageSearch from "./MessageSearch";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";

type Props = {
  room: MeetingRoom;
  currentUserId: string;
  currentUserName: string;
  onLeave: () => void;
  canClear?: boolean;
  membersShown?: boolean;
  onToggleMembers?: () => void;
  // @멘션 자동완성 후보 (없으면 자동완성 비활성)
  members?: MeetingMember[];
  // 검색 결과에서 다른 방으로 점프 (채팅 모듈에서 주입)
  onJumpToRoom?: (roomId: string) => void;
};

// 멘션 하이라이트 렌더 — 내 멘션은 노란 배경, 남 멘션은 브랜드색
function MentionText({
  content,
  myName,
  inverted = false,
}: {
  content: string;
  myName: string;
  inverted?: boolean; // 내 말풍선(초록 배경) 안에서는 색 반전
}) {
  const parts = splitMentions(content, myName);
  return (
    <>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.text}</span>
        ) : (
          <span
            key={i}
            className={
              p.me
                ? "rounded px-0.5 font-bold bg-amber-200 text-amber-900"
                : inverted
                  ? "font-bold underline"
                  : "font-semibold text-emerald-600"
            }
          >
            {p.text}
          </span>
        ),
      )}
    </>
  );
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "✅", "👀"];

function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  h = h % 12 || 12;
  return `${ampm} ${h}:${m}`;
}

function LeaveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function PinIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14l-1.5-2.5V8a2 2 0 0 0-2-2h-1l-.5-2h-3l-.5 2h-1a2 2 0 0 0-2 2v6.5L5 17Z" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SmileIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function ChatView({
  room,
  currentUserId,
  currentUserName,
  onLeave,
  canClear = false,
  membersShown = false,
  onToggleMembers,
  members = [],
  onJumpToRoom,
}: Props) {
  const isDm = room.roomType === "DM";
  const subtitle = isDm ? (room.dmCounterpart?.email ?? "1:1 대화") : (room.description ?? "채널");
  // 채널이면 항상 툴바 노출(멤버 토글·비우기 자리)
  const showToolbar = !isDm;

  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinned, setPinned] = useState<MeetingMessage[]>([]);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLInputElement | null>(null);

  // @멘션 자동완성 상태
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionCandidates =
    mentionQuery === null
      ? []
      : members
          .filter((mb) => mb.id !== currentUserId)
          .filter((mb) =>
            mb.name.toLowerCase().includes(mentionQuery.toLowerCase()),
          )
          .slice(0, 6);

  const appendMessage = (m: MeetingMessage) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  // 이 방을 "보고 있는 방"으로 등록 + 읽음 커서 전진 + 배지 제거
  useEffect(() => {
    const store = useUnreadStore.getState();
    store.setActiveRoom(room.id);
    store.clearRoom(room.id);
    const token = getToken();
    if (token) markRoomRead(token, room.id).catch(() => {});
    return () => {
      useUnreadStore.getState().setActiveRoom(null);
    };
  }, [room.id]);

  // 활성 방에 새 메시지 수신 → 읽음 커서도 함께 전진
  const handleIncoming = (m: MeetingMessage) => {
    appendMessage(m);
    if (m.senderId !== currentUserId) {
      const token = getToken();
      if (token) markRoomRead(token, room.id).catch(() => {});
      useUnreadStore.getState().clearRoom(room.id);
    }
  };

  // 갱신된 메시지를 목록·고정 목록에 반영 (리액션 등)
  const updateMessage = (m: MeetingMessage) => {
    setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
    setPinned((prev) => prev.map((x) => (x.id === m.id ? m : x)));
  };

  // pin 상태 변화를 메시지 목록·고정 목록 양쪽에 반영
  const applyPinned = (m: MeetingMessage) => {
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: m.pinned } : x)));
    setPinned((prev) => {
      const rest = prev.filter((x) => x.id !== m.id);
      return m.pinned ? [m, ...rest] : rest;
    });
  };

  useMeetingSocket(room.id, handleIncoming, () => setMessages([]), applyPinned, updateMessage);

  async function handleToggleReaction(m: MeetingMessage, emoji: string) {
    setReactionPickerFor(null);
    const token = getToken();
    if (!token) return;
    try {
      const updated = await toggleReaction(token, room.id, m.id, emoji);
      updateMessage(updated);
    } catch {
      // 실패 시 무시 (서버 상태 유지)
    }
  }

  async function handleTogglePin(m: MeetingMessage) {
    const token = getToken();
    if (!token) return;
    // 낙관적 반영
    applyPinned({ ...m, pinned: !m.pinned });
    try {
      const updated = await setMessagePinned(token, room.id, m.id, !m.pinned);
      applyPinned(updated);
    } catch {
      applyPinned(m); // 롤백
    }
  }

  async function handleClear() {
    const token = getToken();
    if (!token || clearing) return;
    setClearing(true);
    try {
      await clearChannelMessages(token, room.id);
      setMessages([]);
      setClearConfirming(false);
    } catch {
      // 실패 시 그대로 둠
    } finally {
      setClearing(false);
    }
  }

  // 방 변경 시 메시지 + 고정 메시지 로드
  useEffect(() => {
    setConfirming(false);
    setClearConfirming(false);
    setPinOpen(false);
    const token = getToken();
    if (!token) return;
    setLoading(true);
    getRoomMessages(token, room.id)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
    if (!isDm) {
      getPinnedMessages(token, room.id)
        .then(setPinned)
        .catch(() => setPinned([]));
    } else {
      setPinned([]);
    }
  }, [room.id, isDm]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    const token = getToken();
    if (!token) return;
    setSending(true);
    try {
      const saved = await sendMeetingMessage(token, room.id, text);
      appendMessage(saved);
      setDraft("");
    } catch {
      // 전송 실패 시 입력 유지
    } finally {
      setSending(false);
    }
  }

  // 이미지 업로드 → S3 → 이미지 메시지 전송 (현재 draft는 캡션으로 함께 전송)
  async function handleImageUpload(file: File) {
    if (uploading || sending) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    const token = getToken();
    if (!token) return;
    setUploadError(null);
    setUploading(true);
    try {
      const imageUrl = await uploadChatImage(token, file);
      const saved = await sendMeetingMessage(token, room.id, draft.trim(), { imageUrl });
      appendMessage(saved);
      setDraft("");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "이미지 전송에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = ""; // 같은 파일 재선택 허용
  }

  // draft 변경 시 캐럿 직전의 @쿼리 감지 → 자동완성 후보 갱신
  function handleDraftChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setDraft(value);
    const caret = e.target.selectionStart ?? value.length;
    const q = activeMentionQuery(value, caret);
    setMentionQuery(members.length > 0 ? q : null);
    setMentionIndex(0);
  }

  // 자동완성 확정 — 캐럿 직전 "@쿼리"를 "@이름 "으로 치환
  function insertMention(name: string) {
    const el = draftRef.current;
    const caret = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret).replace(/@[^\s@]*$/, `@${name} `);
    const after = draft.slice(caret);
    setDraft(before + after);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  }

  function handleDraftKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionQuery === null || mentionCandidates.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionCandidates.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(mentionCandidates[mentionIndex].name);
    } else if (e.key === "Escape") {
      setMentionQuery(null);
    }
  }

  // 입력창에 이미지 붙여넣기(⌘V) 지원
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      handleImageUpload(file);
    }
  }

  // 이미지 파일을 대화 영역에 드래그앤드롭 (tauri dragDropEnabled=false → 웹뷰가 File 수신)
  function handleDragOver(e: React.DragEvent) {
    if (Array.from(e.dataTransfer.items).some((i) => i.kind === "file")) {
      e.preventDefault();
      if (!dragActive) setDragActive(true);
    }
  }
  function handleDragLeave(e: React.DragEvent) {
    // 자식으로 이동하는 경우는 무시 (영역 완전히 벗어날 때만 해제)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragActive(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) handleImageUpload(file);
  }

  // 리액션 칩 + 추가 피커 (DM·채널 공용)
  function renderReactions(m: MeetingMessage, align: "start" | "end" = "start") {
    const reactions = messageReactions(m.payload, currentUserId);
    const pickerOpen = reactionPickerFor === m.id;
    return (
      <div
        className={
          "relative mt-1 flex flex-wrap items-center gap-1 " +
          (align === "end" ? "justify-end" : "")
        }
      >
        {reactions.map((r) => (
          <Button
            key={r.emoji}
            variant="secondary"
            onClick={() => handleToggleReaction(m, r.emoji)}
            className={
              "flex items-center gap-1 px-1.5 h-6 rounded-full text-[12px] font-normal " +
              (r.mine
                ? "border-brand-border bg-brand-glass text-brand-primary hover:bg-brand-glass"
                : "border-surface-border bg-surface-muted text-text-secondary")
            }
          >
            <span>{r.emoji}</span>
            <span className="font-semibold tabular-nums">{r.count}</span>
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm-icon"
          onClick={() => setReactionPickerFor(pickerOpen ? null : m.id)}
          title="리액션 추가"
          aria-label="리액션 추가"
          className="w-6 h-6 rounded-full border-surface-border bg-surface-raised text-text-muted hover:text-brand-primary hover:bg-surface-muted"
        >
          <SmileIcon />
        </Button>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setReactionPickerFor(null)} />
            <div
              className={
                "absolute bottom-7 z-30 flex gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg " +
                (align === "end" ? "right-0" : "left-0")
              }
            >
              {REACTION_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => handleToggleReaction(m, e)}
                  className="w-8 h-8 flex items-center justify-center text-[18px] rounded-lg hover:bg-surface-muted"
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader>
        <span className="w-[30px] h-[30px] flex items-center justify-center text-[14px] font-bold text-text-on-brand bg-brand-primary rounded-[9px]">
          {isDm ? room.name.charAt(0) : "#"}
        </span>
        <div className="flex flex-col leading-tight">
          <strong className="text-[14px] text-text-primary">{room.name}</strong>
          <span className="text-[11px] text-text-muted">{subtitle}</span>
        </div>

        {/* 대화방 나가기 — DM 전용. 채널 나가기는 2단계(멤버십)에서. 1차 클릭 → 취소/나가기 확인 */}
        <div data-actions className="ml-3 flex items-center gap-1.5">
          {!isDm ? null : confirming ? (
            <>
              <span className="text-[12px] text-text-secondary">나가시겠어요?</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
                className="px-2.5 h-7 rounded-md text-[12px] font-semibold text-text-secondary hover:bg-surface-strong"
              >
                취소
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onLeave}
                title="양쪽 모두에서 대화가 삭제됩니다"
                className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-semibold text-text-on-brand bg-destructive border-destructive hover:bg-destructive hover:brightness-110"
              >
                <LeaveIcon />
                나가기
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setConfirming(true)}
              title="대화방 나가기 (양쪽 모두 삭제)"
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[12px] font-semibold text-text-muted hover:text-destructive hover:bg-danger-glass"
            >
              <LeaveIcon />
              나가기
            </Button>
          )}
        </div>
      </PageHeader>

      {/* 디스코드식 얇은 채널 툴바 — [고정][비우기][멤버] 순. 윈도우 버튼과 안 겹치게 별도 줄. */}
      {showToolbar && (
        <div className="relative h-9 shrink-0 flex items-center justify-end gap-1.5 px-4 bg-white border-b border-slate-200">
          {/* 메시지 검색 */}
          <Button
            variant="ghost"
            onClick={() => setSearchOpen((v) => !v)}
            title="메시지 검색"
            aria-label="메시지 검색"
            className={
              "flex items-center gap-1 px-2 h-6 rounded-md text-[12px] font-medium " +
              (searchOpen
                ? "text-brand-primary bg-brand-glass hover:bg-brand-glass"
                : "text-text-muted hover:text-text-secondary")
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            검색
          </Button>

          {/* 고정 메시지 (휴지통 왼쪽) */}
          <Button
            variant="ghost"
            onClick={() => setPinOpen((v) => !v)}
            title="고정된 메시지"
            aria-label="고정된 메시지"
            className={
              "flex items-center gap-1 px-2 h-6 rounded-md text-[12px] font-medium " +
              (pinOpen
                ? "text-brand-primary bg-brand-glass hover:bg-brand-glass"
                : "text-text-muted hover:text-text-secondary")
            }
          >
            <PinIcon />
            {pinned.length > 0 && <span className="font-semibold">{pinned.length}</span>}
          </Button>

          {/* 비우기 (admin) */}
          {canClear &&
            (clearConfirming ? (
              <>
                <span className="text-[12px] text-text-secondary">이 채널 메시지를 모두 비울까요?</span>
                <Button
                  variant="ghost"
                  onClick={() => setClearConfirming(false)}
                  disabled={clearing}
                  className="px-2.5 h-6 rounded-md text-[12px] font-semibold text-text-secondary"
                >
                  취소
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClear}
                  disabled={clearing}
                  title="채널의 모든 메시지가 삭제됩니다"
                  className="flex items-center gap-1 px-2.5 h-6 rounded-md text-[12px] font-semibold text-text-on-brand bg-destructive border-destructive hover:bg-destructive hover:brightness-110"
                >
                  <TrashIcon />
                  {clearing ? "비우는 중…" : "비우기"}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setClearConfirming(true)}
                title="채널 메시지 비우기 (관리자)"
                aria-label="채널 메시지 비우기"
                className="flex items-center gap-1 px-2 h-6 rounded-md text-[12px] font-medium text-text-muted hover:text-destructive hover:bg-danger-glass"
              >
                <TrashIcon />
                비우기
              </Button>
            ))}

          {/* 멤버 토글 (휴지통 오른쪽, 맨 끝) */}
          {onToggleMembers && (
            <Button
              variant="ghost"
              size="sm-icon"
              onClick={onToggleMembers}
              title={membersShown ? "멤버 목록 숨기기" : "멤버 목록 보기"}
              aria-label="멤버 목록 토글"
              className={
                "flex items-center justify-center w-8 h-6 rounded-md " +
                (membersShown
                  ? "text-text-on-brand bg-brand-primary hover:bg-brand-primary hover:brightness-110"
                  : "text-text-muted hover:text-text-secondary")
              }
            >
              <Users className="size-4" strokeWidth={2.4} />
            </Button>
          )}

          {/* 검색 팝오버 */}
          {searchOpen && (
            <MessageSearch
              roomId={room.id}
              roomName={room.name}
              currentUserName={currentUserName}
              onClose={() => setSearchOpen(false)}
              onJumpToRoom={onJumpToRoom}
            />
          )}

          {/* 고정 메시지 팝오버 */}
          {pinOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setPinOpen(false)} />
              <div className="absolute right-3 top-9 z-30 w-[320px] max-h-[380px] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                <div className="sticky top-0 px-3 py-2 text-[12px] font-bold text-slate-500 bg-white border-b border-slate-100">
                  고정된 메시지 {pinned.length}
                </div>
                {pinned.length === 0 ? (
                  <div className="px-3 py-5 text-[13px] text-slate-400 text-center">
                    고정된 메시지가 없습니다.
                    <br />
                    메시지에 마우스를 올려 📌 로 고정하세요.
                  </div>
                ) : (
                  pinned.map((p) => (
                    <div key={p.id} className="flex gap-2 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50">
                      <span
                        className="w-7 h-7 shrink-0 flex items-center justify-center text-[12px] font-bold text-white rounded-full"
                        style={{ backgroundColor: avatarColor(p.senderId) }}
                      >
                        {p.senderName.charAt(0)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-semibold text-slate-900 truncate">
                            {p.senderName}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatTime(p.createdAt)}
                          </span>
                        </div>
                        {p.content && (
                          <div className="text-[13px] text-slate-600 break-words whitespace-pre-wrap">
                            <MentionText content={p.content} myName={currentUserName} />
                          </div>
                        )}
                        {messageImageUrl(p.payload) && (
                          <img
                            src={messageImageUrl(p.payload) as string}
                            alt="첨부 이미지"
                            onClick={() => openUrl(messageImageUrl(p.payload) as string)}
                            className="mt-1 max-h-24 max-w-[160px] rounded-md border border-slate-200 object-cover cursor-zoom-in"
                          />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleTogglePin(p)}
                        title="고정 해제"
                        aria-label="고정 해제"
                        className="shrink-0 w-6 h-6 rounded text-text-muted hover:text-destructive hover:bg-danger-glass"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={
          "relative flex-1 overflow-y-auto " +
          (isDm ? "p-[18px] flex flex-col gap-3" : "py-2.5")
        }
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/80 text-sm font-semibold text-emerald-600">
            여기에 이미지를 놓아 업로드
          </div>
        )}
        {loading ? (
          <div className={isDm ? "m-auto text-[13px] text-slate-400" : "px-4 py-6 text-[13px] text-slate-400"}>
            불러오는 중…
          </div>
        ) : messages.length === 0 ? (
          <div className={isDm ? "m-auto text-[13px] text-slate-400" : "px-4 py-6 text-[13px] text-slate-400"}>
            첫 메시지를 보내보세요.
          </div>
        ) : isDm ? (
          // DM: 카톡식 말풍선 (내 메시지 오른쪽)
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            const img = messageImageUrl(m.payload);
            return (
              <div
                key={m.id}
                className={
                  "flex flex-col max-w-[70%] " +
                  (mine ? "self-end items-end" : "self-start items-start")
                }
              >
                {!mine && (
                  <span className="mb-0.5 text-[11px] text-slate-400">{m.senderName}</span>
                )}
                {img && (
                  <img
                    src={img}
                    alt="첨부 이미지"
                    onClick={() => openUrl(img)}
                    className="max-w-[240px] max-h-[280px] mb-1 rounded-2xl border border-slate-200 object-cover cursor-zoom-in"
                  />
                )}
                {m.content && (
                  <div
                    className={
                      "px-3.5 py-2.5 text-sm leading-snug rounded-2xl whitespace-pre-wrap break-words " +
                      (mine
                        ? "bg-emerald-500 text-white rounded-br-sm"
                        : "bg-white border border-slate-200 rounded-bl-sm")
                    }
                  >
                    <MentionText content={m.content} myName={currentUserName} inverted={mine} />
                  </div>
                )}
                {renderReactions(m, mine ? "end" : "start")}
                <span className="mt-1 text-[10px] text-slate-400">{formatTime(m.createdAt)}</span>
              </div>
            );
          })
        ) : (
          // 채널: 왼쪽 정렬, 메시지마다 아바타+이름+시간 (그룹핑 없음)
          messages.map((m) => {
            const img = messageImageUrl(m.payload);
            return (
              <div
                key={m.id}
                className={
                  "group relative flex gap-3 px-4 mt-2 pt-2 pb-1 " +
                  (m.pinned ? "bg-amber-50 hover:bg-amber-100/70" : "hover:bg-slate-100")
                }
              >
                <div className="w-9 shrink-0 flex justify-center">
                  <span
                    className="w-9 h-9 flex items-center justify-center text-[14px] font-bold text-white rounded-full"
                    style={{ backgroundColor: avatarColor(m.senderId) }}
                  >
                    {m.senderName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {m.pinned && (
                    <div className="flex items-center gap-1 mb-0.5 text-[10px] font-semibold text-amber-600">
                      <PinIcon size={11} />
                      고정됨
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-900">{m.senderName}</span>
                    <span className="text-[11px] text-slate-400">{formatTime(m.createdAt)}</span>
                  </div>
                  {m.content && (
                    <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                      <MentionText content={m.content} myName={currentUserName} />
                    </div>
                  )}
                  {img && (
                    <img
                      src={img}
                      alt="첨부 이미지"
                      onClick={() => openUrl(img)}
                      className="max-w-[320px] max-h-[360px] mt-1 rounded-lg border border-slate-200 object-cover cursor-zoom-in"
                    />
                  )}
                  {renderReactions(m, "start")}
                </div>

                {/* hover 액션 — 고정/해제 (행 오른쪽, 세로 중앙) */}
                <button
                  onClick={() => handleTogglePin(m)}
                  title={m.pinned ? "고정 해제" : "메시지 고정"}
                  aria-label={m.pinned ? "고정 해제" : "메시지 고정"}
                  className={
                    "absolute right-4 top-1.5 w-7 h-7 flex items-center justify-center bg-surface-raised border border-surface-border-soft rounded-md shadow-sm transition-opacity " +
                    (m.pinned
                      ? "text-amber-500 opacity-100"
                      : "text-text-muted opacity-0 group-hover:opacity-100 hover:text-brand-primary")
                  }
                >
                  <PinIcon size={14} />
                </button>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="bg-white border-t border-slate-200">
        {uploadError && (
          <div className="px-4 pt-2 text-[12px] text-red-600">{uploadError}</div>
        )}
        <form onSubmit={handleSend} className="relative flex items-center gap-2 px-4 py-3">
          {/* @멘션 자동완성 팝업 */}
          {mentionQuery !== null && mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-16 mb-1 z-30 w-[240px] py-1 bg-white border border-slate-200 rounded-xl shadow-lg">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400">멤버 멘션</div>
              {mentionCandidates.map((mb, i) => (
                <Button
                  key={mb.id}
                  variant="ghost"
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // input blur 방지
                    insertMention(mb.name);
                  }}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={
                    "w-full flex items-center gap-2 px-3 py-1.5 text-left justify-start h-auto font-normal rounded-none " +
                    (i === mentionIndex ? "bg-brand-glass hover:bg-brand-glass" : "")
                  }
                >
                  <span
                    className="w-6 h-6 shrink-0 flex items-center justify-center text-[11px] font-bold text-white rounded-full"
                    style={{ backgroundColor: avatarColor(mb.id) }}
                  >
                    {mb.name.charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-slate-800">
                    {mb.name}
                  </span>
                  {mb.online && <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-500" />}
                </Button>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending}
            title="이미지 첨부"
            aria-label="이미지 첨부"
            className="shrink-0 w-10 h-10 rounded-[10px] text-text-muted hover:text-brand-primary hover:bg-surface-muted"
          >
            <ClipIcon />
          </Button>
          <input
            ref={draftRef}
            placeholder={uploading ? "이미지 업로드 중…" : "메시지를 입력하세요 (@로 멘션)"}
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleDraftKeyDown}
            onBlur={() => setMentionQuery(null)}
            onPaste={handlePaste}
            disabled={uploading}
            className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-100 border border-transparent rounded-[10px] outline-none focus:border-emerald-500 focus:bg-white disabled:opacity-60"
          />
          <Button
            type="submit"
            disabled={!draft.trim() || sending || uploading}
            className="px-[18px] py-2.5 text-sm rounded-[10px]"
          >
            전송
          </Button>
        </form>
      </div>
    </>
  );
}

export default ChatView;
