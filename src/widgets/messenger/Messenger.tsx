import { useEffect, useState } from "react";
import { getToken } from "../../features/auth/api";
import type { User } from "../../entities/user";
import { getRooms, leaveRoom, startDm, type MeetingRoom } from "../../features/chat/api";
import RoomList from "../../features/chat/RoomList";
import ChatView from "../../features/chat/ChatView";
import { getOrgTree, type OrgMember, type OrgNode } from "../../features/org/api";
import OrgTree from "../../features/org/OrgTree";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";

type Props = {
  user: User;
};

function Messenger({ user }: Props) {
  const [tab, setTab] = useState<"chats" | "org">("chats");

  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [org, setOrg] = useState<OrgNode[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgLoaded, setOrgLoaded] = useState(false);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;

  // DM 방 목록 로드
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getRooms(token)
      .then((all) => setRooms(all.filter((r) => r.roomType === "DM")))
      .catch((err) =>
        setRoomsError(err instanceof Error ? err.message : "대화 목록을 불러오지 못했습니다."),
      );
  }, []);

  // 조직도 최초 진입 시 로드
  useEffect(() => {
    if (tab !== "org" || orgLoaded) return;
    const token = getToken();
    if (!token) return;
    setOrgLoading(true);
    setOrgError(null);
    getOrgTree(token)
      .then((tree) => {
        setOrg(tree);
        setOrgLoaded(true);
      })
      .catch((err) =>
        setOrgError(err instanceof Error ? err.message : "조직도를 불러오지 못했습니다."),
      )
      .finally(() => setOrgLoading(false));
  }, [tab, orgLoaded]);

  async function handleSelectMember(member: OrgMember) {
    // 본인 더블클릭 → "나와의 채팅"(메모) 허용
    const token = getToken();
    if (!token) return;
    try {
      const room = await startDm(token, member.id);
      setRooms((prev) => (prev.some((r) => r.id === room.id) ? prev : [room, ...prev]));
      setActiveRoomId(room.id);
      setTab("chats");
    } catch (err) {
      setRoomsError(err instanceof Error ? err.message : "대화를 시작하지 못했습니다.");
    }
  }

  async function handleLeaveRoom(roomId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await leaveRoom(token, roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setActiveRoomId((prev) => (prev === roomId ? null : prev));
    } catch (err) {
      setRoomsError(err instanceof Error ? err.message : "대화방을 나가지 못했습니다.");
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden min-w-0">
      {/* Sidebar */}
      <aside className="w-[270px] shrink-0 flex flex-col bg-white border-r border-slate-200">
        {/* 사이드바 헤더 (천장까지, 드래그 핸들) */}
        <PageHeader>
          <span className="text-[14px] font-bold tracking-tight text-text-primary">메신저</span>
        </PageHeader>

        {/* 탭 — underline 방식 */}
        <div className="flex px-3 border-b border-slate-200">
          {(
            [
              ["chats", "대화"],
              ["org", "조직도"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant="ghost"
              onClick={() => setTab(key)}
              className={
                "flex-1 rounded-none px-0 py-2.5 -mb-px text-[13px] font-semibold border-b-2 transition-colors hover:bg-transparent " +
                (tab === key
                  ? "border-brand-border text-brand-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary")
              }
            >
              {label}
            </Button>
          ))}
        </div>

        {tab === "chats" ? (
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            error={roomsError}
            onSelect={setActiveRoomId}
          />
        ) : (
          <OrgTree
            nodes={org}
            loading={orgLoading}
            error={orgError}
            onSelectMember={handleSelectMember}
          />
        )}
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col bg-slate-50">
        {activeRoom ? (
          <ChatView
            room={activeRoom}
            currentUserId={user.id}
            currentUserName={user.name}
            onLeave={() => handleLeaveRoom(activeRoom.id)}
          />
        ) : (
          <>
            {/* 빈 상태에도 공통 헤더 (창 버튼 영역과 정렬) */}
            <PageHeader />
            <div className="flex-1 flex items-center justify-center text-center text-[15px] text-slate-400 leading-relaxed px-6">
              대화를 선택하거나
              <br />
              조직도에서 구성원을 클릭해 메시지를 시작하세요.
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Messenger;
