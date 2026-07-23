import { useEffect, useRef, useState } from "react";
import { getToken } from "../../shared/api/client";
import { searchMessages, type MessageSearchResult } from "./api";
import { avatarColor } from "../../shared/lib/avatar-color";
import { splitMentions } from "./mention";
import { Button } from "../../shared/ui/button";

type Props = {
  roomId: string;
  roomName: string;
  currentUserName: string;
  onClose: () => void;
  onJumpToRoom?: (roomId: string) => void;
};

type Scope = "room" | "all";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// 채팅 툴바에서 여는 메시지 검색 팝오버 — 현재 채널/전체 스코프 + 내 멘션 필터
function MessageSearch({ roomId, roomName, currentUserName, onClose, onJumpToRoom }: Props) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("room");
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 입력 디바운스 검색 (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const token = getToken();
      if (!token) return;
      setLoading(true);
      searchMessages(token, q, scope === "room" ? roomId : undefined)
        .then((list) => {
          setResults(list);
          setSearched(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, scope, roomId]);

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-3 top-9 z-30 w-[380px] max-h-[440px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        {/* 검색 입력 + 스코프 */}
        <div className="p-2.5 flex flex-col gap-2 border-b border-slate-100">
          <input
            ref={inputRef}
            placeholder="메시지 검색…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-100 border border-transparent rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
          />
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              onClick={() => setScope("room")}
              className={
                "px-2 h-6 rounded-md text-[12px] font-semibold " +
                (scope === "room"
                  ? "bg-brand-glass text-brand-primary hover:bg-brand-glass"
                  : "text-text-secondary")
              }
            >
              #{roomName}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setScope("all")}
              className={
                "px-2 h-6 rounded-md text-[12px] font-semibold " +
                (scope === "all"
                  ? "bg-brand-glass text-brand-primary hover:bg-brand-glass"
                  : "text-text-secondary")
              }
            >
              전체
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setScope("all");
                setQuery(`@${currentUserName}`);
              }}
              title="나를 멘션한 메시지"
              className="ml-auto px-2 h-6 rounded-md text-[12px] font-semibold text-brand-primary hover:bg-brand-glass"
            >
              @내 멘션
            </Button>
          </div>
        </div>

        {/* 결과 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-6 text-[13px] text-slate-400 text-center">검색 중…</div>
          ) : !searched ? (
            <div className="px-3 py-6 text-[13px] text-slate-400 text-center">
              검색어를 입력하세요.
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-[13px] text-slate-400 text-center">
              결과가 없습니다.
            </div>
          ) : (
            results.map((r) => {
              const isCurrentRoom = r.roomId === roomId;
              const canJump = !isCurrentRoom && r.roomType !== "DM" && !!onJumpToRoom;
              return (
                <Button
                  key={r.id}
                  variant="ghost"
                  onClick={() => {
                    if (canJump) {
                      onJumpToRoom?.(r.roomId);
                      onClose();
                    }
                  }}
                  className={
                    "w-full flex gap-2 px-3 py-2.5 text-left justify-start h-auto font-normal rounded-none border-b border-surface-border-soft " +
                    (canJump ? "hover:bg-brand-glass cursor-pointer" : "cursor-default hover:bg-transparent")
                  }
                >
                  <span
                    className="w-7 h-7 shrink-0 flex items-center justify-center text-[12px] font-bold text-white rounded-full"
                    style={{ backgroundColor: avatarColor(r.senderId) }}
                  >
                    {r.senderName.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-slate-900 truncate">
                        {r.senderName}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {r.roomType === "DM" ? "DM" : `#${r.roomName}`} · {formatDate(r.createdAt)}
                      </span>
                    </div>
                    <div className="text-[13px] text-slate-600 break-words line-clamp-2">
                      {splitMentions(r.content, currentUserName).map((p, i) =>
                        p.type === "mention" && p.me ? (
                          <span key={i} className="rounded px-0.5 font-bold bg-amber-200 text-amber-900">
                            {p.text}
                          </span>
                        ) : (
                          <span key={i}>{p.text}</span>
                        ),
                      )}
                    </div>
                    {r.roomType === "DM" && !isCurrentRoom && (
                      <span className="text-[11px] text-slate-400">메신저 탭에서 확인</span>
                    )}
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default MessageSearch;
