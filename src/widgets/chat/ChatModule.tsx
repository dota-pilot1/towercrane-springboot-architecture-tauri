import { useEffect, useState } from "react";
import type { User } from "../../entities/user";
import { getToken } from "../../shared/api/client";
import {
  CHANNEL_ROOM_TYPES,
  createChannel,
  createWorkspace,
  getChannels,
  getRoomMembers,
  getWorkspaces,
  type ChannelRoomType,
  type MeetingMember,
  type MeetingRoom,
  type MeetingWorkspace,
} from "../../features/chat/api";
import ChannelList from "../../features/chat/ChannelList";
import ChatView from "../../features/chat/ChatView";
import MemberList from "../../features/chat/MemberList";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { CompactSelect } from "../../shared/ui/compact-select";

type Props = {
  user: User;
};

const ROOM_TYPE_LABELS: Record<ChannelRoomType, string> = {
  FREE: "자유",
  ANNOUNCE: "공지",
  QNA: "질문",
  FEEDBACK: "피드백",
  ISSUE: "이슈",
  DECISION: "결정",
  RESOURCE: "자료",
  INTERNAL: "내부",
  PROTOTYPE: "프로토타입",
};

function ChatModule({ user }: Props) {
  const canCreate = user.role === "admin";

  const [workspaces, setWorkspaces] = useState<MeetingWorkspace[]>([]);
  const [activeWsId, setActiveWsId] = useState<string | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);

  const [channels, setChannels] = useState<MeetingRoom[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creatingWs, setCreatingWs] = useState(false);

  const [members, setMembers] = useState<MeetingMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(true);

  const activeWs = workspaces.find((w) => w.id === activeWsId) ?? null;
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;

  // 워크스페이스 로드 (최초 1회)
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getWorkspaces(token)
      .then((list) => {
        setWorkspaces(list);
        setActiveWsId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch((err) =>
        setWsError(err instanceof Error ? err.message : "워크스페이스를 불러오지 못했습니다."),
      );
  }, []);

  // 활성 워크스페이스의 채널 로드
  useEffect(() => {
    if (!activeWsId) return;
    const token = getToken();
    if (!token) return;
    setChannelError(null);
    getChannels(token, activeWsId)
      .then((list) => {
        setChannels(list);
        setActiveChannelId((prev) =>
          prev && list.some((c) => c.id === prev) ? prev : (list[0]?.id ?? null),
        );
      })
      .catch((err) => {
        setChannels([]);
        setChannelError(err instanceof Error ? err.message : "채널을 불러오지 못했습니다.");
      });
  }, [activeWsId]);

  // 활성 채널의 멤버 명단 로드 (온라인 상태 포함)
  useEffect(() => {
    if (!activeChannelId) {
      setMembers([]);
      return;
    }
    const token = getToken();
    if (!token) return;
    setMembersLoading(true);
    setMembersError(null);
    getRoomMembers(token, activeChannelId)
      .then(setMembers)
      .catch((err) => {
        setMembers([]);
        setMembersError(err instanceof Error ? err.message : "멤버를 불러오지 못했습니다.");
      })
      .finally(() => setMembersLoading(false));
  }, [activeChannelId]);

  async function handleCreateWorkspace() {
    const token = getToken();
    if (!token || creatingWs) return;
    setCreatingWs(true);
    setWsError(null);
    try {
      const ws = await createWorkspace(token, { name: "일반" });
      setWorkspaces((prev) => [...prev, ws]);
      setActiveWsId(ws.id);
    } catch (err) {
      setWsError(err instanceof Error ? err.message : "워크스페이스를 만들지 못했습니다.");
    } finally {
      setCreatingWs(false);
    }
  }

  async function handleCreate(input: {
    name: string;
    description: string;
    roomType: ChannelRoomType;
  }) {
    const token = getToken();
    if (!token || !activeWsId) return;
    const created = await createChannel(token, activeWsId, {
      name: input.name,
      description: input.description.trim() || null,
      roomType: input.roomType,
    });
    setChannels((prev) => [...prev, created]);
    setActiveChannelId(created.id);
    setCreateOpen(false);
  }

  return (
    <div className="flex-1 flex overflow-hidden min-w-0">
      {/* Sidebar */}
      <aside className="w-[270px] shrink-0 flex flex-col bg-white border-r border-slate-200">
        {/* 워크스페이스 스위처 (헤더) */}
        <PageHeader>
          <Button
            variant="ghost"
            onClick={() => setWsMenuOpen((v) => !v)}
            disabled={workspaces.length === 0}
            className="flex items-center gap-1.5 min-w-0 max-w-full px-0 py-0 text-left disabled:cursor-default disabled:opacity-100 disabled:bg-transparent disabled:border-transparent disabled:shadow-none"
          >
            <span className="text-[14px] font-bold tracking-tight text-text-primary truncate">
              {activeWs?.name ?? "채팅"}
            </span>
            {workspaces.length > 1 && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={
                  "shrink-0 text-text-muted transition-transform " +
                  (wsMenuOpen ? "rotate-180" : "")
                }
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </Button>
        </PageHeader>

        {/* 워크스페이스 드롭다운 */}
        {wsMenuOpen && workspaces.length > 1 && (
          <div className="relative">
            <div className="absolute z-20 left-2 right-2 mt-1 py-1 bg-white border border-slate-200 rounded-xl shadow-lg">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setActiveWsId(w.id);
                    setWsMenuOpen(false);
                  }}
                  className={
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted " +
                    (w.id === activeWsId ? "text-brand-primary font-semibold" : "text-text-secondary")
                  }
                >
                  <span className="truncate">{w.name}</span>
                  <span className="shrink-0 text-[11px] text-text-muted">
                    {w.channelCount} 채널
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {wsError ? (
          <div className="px-3 py-4 text-[13px] text-red-600">{wsError}</div>
        ) : workspaces.length === 0 ? (
          <div className="px-3 py-4 flex flex-col gap-2.5 text-[13px] text-slate-400 leading-relaxed">
            <span>워크스페이스가 없습니다.</span>
            {canCreate ? (
              <Button
                onClick={handleCreateWorkspace}
                disabled={creatingWs}
                className="self-start rounded-lg px-3 py-2 text-[13px]"
              >
                {creatingWs ? "만드는 중…" : "기본 워크스페이스 만들기"}
              </Button>
            ) : (
              <span>관리자가 워크스페이스를 만들어야 합니다.</span>
            )}
          </div>
        ) : (
          <ChannelList
            channels={channels}
            activeChannelId={activeChannelId}
            error={channelError}
            canCreate={canCreate}
            onSelect={setActiveChannelId}
            onCreateClick={() => setCreateOpen(true)}
          />
        )}
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col bg-slate-50 min-w-0">
        {activeChannel ? (
          <ChatView
            room={activeChannel}
            currentUserId={user.id}
            currentUserName={user.name}
            onLeave={() => {}}
            canClear={canCreate}
            membersShown={showMembers}
            onToggleMembers={() => setShowMembers((v) => !v)}
            members={members}
            onJumpToRoom={setActiveChannelId}
          />
        ) : (
          <>
            <PageHeader />
            <div className="flex-1 flex items-center justify-center text-center text-[15px] text-slate-400 leading-relaxed px-6">
              {channels.length === 0
                ? "채널이 없습니다. 채널을 만들어 대화를 시작하세요."
                : "채널을 선택해 대화를 시작하세요."}
            </div>
          </>
        )}
      </main>

      {/* 오른쪽 멤버 패널 (채널 + 토글 ON) */}
      {activeChannel && showMembers && (
        <aside className="w-[240px] shrink-0 flex flex-col bg-white border-l border-slate-200">
          <PageHeader>
            <span className="text-[13px] font-bold text-slate-900">멤버</span>
            <span className="text-[12px] text-slate-400">{members.length}</span>
          </PageHeader>
          <MemberList members={members} loading={membersLoading} error={membersError} />
        </aside>
      )}

      {createOpen && (
        <CreateChannelModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

type CreateChannelModalProps = {
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    roomType: ChannelRoomType;
  }) => Promise<void>;
};

function CreateChannelModal({ onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roomType, setRoomType] = useState<ChannelRoomType>("FREE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), description, roomType });
    } catch (err) {
      setError(err instanceof Error ? err.message : "채널을 만들지 못했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/30 px-6"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-[360px] flex flex-col gap-3.5 p-6 bg-white rounded-2xl shadow-2xl"
      >
        <h2 className="text-base font-bold text-slate-900">채널 만들기</h2>

        <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
          <span>채널 이름</span>
          <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-emerald-500 focus-within:bg-white">
            <span className="text-slate-400 font-bold">#</span>
            <input
              autoFocus
              maxLength={60}
              placeholder="general"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 py-2.5 text-sm text-slate-900 bg-transparent outline-none"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
          <span>설명 (선택)</span>
          <input
            maxLength={200}
            placeholder="이 채널의 용도"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
          <span>종류</span>
          <CompactSelect
            value={roomType}
            onChange={(e) => setRoomType(e.target.value as ChannelRoomType)}
            wrapperClassName="w-full"
            className="h-[42px] rounded-xl text-sm"
          >
            {CHANNEL_ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {ROOM_TYPE_LABELS[t]}
              </option>
            ))}
          </CompactSelect>
        </label>

        {error && (
          <div className="px-3 py-2.5 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}

        <div className="mt-1 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || submitting}
            className="flex-1 rounded-xl py-2.5 text-sm"
          >
            {submitting ? "만드는 중…" : "만들기"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ChatModule;
