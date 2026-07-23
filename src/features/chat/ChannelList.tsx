import type { MeetingRoom } from "./api";
import { useUnreadStore } from "./unread-store";
import { Button } from "../../shared/ui/button";

type Props = {
  channels: MeetingRoom[];
  activeChannelId: string | null;
  error: string | null;
  canCreate: boolean;
  onSelect: (channelId: string) => void;
  onCreateClick: () => void;
};

function ChannelList({
  channels,
  activeChannelId,
  error,
  canCreate,
  onSelect,
  onCreateClick,
}: Props) {
  const counts = useUnreadStore((s) => s.counts);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 섹션 헤더 + 채널 만들기 — 본문 채널 툴바(h-9 border-b)와 높이·보더 정렬 */}
      <div className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-slate-200">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          채널
        </span>
        {canCreate && (
          <Button
            variant="ghost"
            size="sm-icon"
            onClick={onCreateClick}
            title="채널 만들기"
            aria-label="채널 만들기"
            className="w-6 h-6 rounded-md text-text-muted hover:text-brand-primary hover:bg-brand-glass"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-2">
        {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}

        {channels.length === 0 && !error && (
          <div className="px-3 py-4 text-[13px] text-slate-400 leading-relaxed">
            아직 채널이 없습니다.
            {canCreate ? (
              <>
                <br />
                상단 ＋ 버튼으로 첫 채널을 만들어 보세요.
              </>
            ) : null}
          </div>
        )}

        {channels.map((c) => {
          const active = c.id === activeChannelId;
          const count = active ? undefined : counts[c.id];
          const hasUnread = !!count && count.unread > 0;
          const hasMention = !!count && count.mentions > 0;
          return (
            <Button
              key={c.id}
              variant="ghost"
              onClick={() => onSelect(c.id)}
              className={
                "w-full flex items-center gap-1.5 px-2.5 py-2 rounded-[8px] text-left justify-start h-auto font-normal " +
                (active ? "bg-brand-glass hover:bg-brand-glass" : "")
              }
            >
              <span
                className={
                  "text-[15px] font-bold leading-none " +
                  (active ? "text-emerald-600" : "text-slate-400")
                }
              >
                #
              </span>
              <span
                className={
                  "flex-1 min-w-0 truncate text-sm " +
                  (active
                    ? "font-semibold text-slate-900"
                    : hasUnread
                      ? "font-bold text-slate-900"
                      : "text-slate-600")
                }
              >
                {c.name}
              </span>
              {/* 안읽음 배지 — 멘션 포함이면 빨간 @배지, 아니면 회색 카운트 */}
              {hasUnread && (
                <span
                  className={
                    "shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums " +
                    (hasMention
                      ? "bg-red-500 text-white"
                      : "bg-slate-300 text-white")
                  }
                >
                  {hasMention ? `@${count.mentions}` : count.unread > 99 ? "99+" : count.unread}
                </span>
              )}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}

export default ChannelList;
