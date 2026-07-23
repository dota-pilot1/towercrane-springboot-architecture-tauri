import type { MeetingRoom } from "./api";
import { useUnreadStore } from "./unread-store";
import { Button } from "../../shared/ui/button";

type Props = {
  rooms: MeetingRoom[];
  activeRoomId: string | null;
  error: string | null;
  onSelect: (roomId: string) => void;
};

function RoomList({ rooms, activeRoomId, error, onSelect }: Props) {
  const counts = useUnreadStore((s) => s.counts);
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-2">
      {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}

      {rooms.length === 0 && !error && (
        <div className="px-3 py-4 text-[13px] text-slate-400 leading-relaxed">
          아직 대화가 없습니다.
          <br />
          조직도 탭에서 구성원을 클릭해 시작하세요.
        </div>
      )}

      {rooms.map((r) => {
        const count = r.id === activeRoomId ? undefined : counts[r.id];
        const unread = count?.unread ?? 0;
        return (
          <Button
            key={r.id}
            variant="ghost"
            onClick={() => onSelect(r.id)}
            className={
              "w-full flex items-center gap-2.5 p-2.5 rounded-[10px] text-left justify-start h-auto font-normal " +
              (r.id === activeRoomId ? "bg-brand-glass hover:bg-brand-glass" : "")
            }
          >
            <span className="w-[38px] h-[38px] shrink-0 flex items-center justify-center text-[15px] font-bold text-white bg-emerald-500 rounded-[11px]">
              {r.name.charAt(0)}
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span
                className={
                  "text-sm truncate " +
                  (unread > 0 ? "font-bold text-slate-900" : "font-semibold text-slate-900")
                }
              >
                {r.name}
              </span>
              <span className="text-xs text-slate-500 truncate">
                {r.dmCounterpart?.email ?? "1:1 대화"}
              </span>
            </span>
            {unread > 0 && (
              <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums bg-red-500 text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Button>
        );
      })}
    </nav>
  );
}

export default RoomList;
