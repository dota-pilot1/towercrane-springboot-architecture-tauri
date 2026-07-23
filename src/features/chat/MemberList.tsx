import type { MeetingMember } from "./api";
import { avatarColor } from "../../shared/lib/avatar-color";

type Props = {
  members: MeetingMember[];
  loading: boolean;
  error: string | null;
};

function MemberRow({ member }: { member: MeetingMember }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100">
      <div className="relative shrink-0">
        <span
          className={
            "w-8 h-8 flex items-center justify-center text-[13px] font-bold text-white rounded-full " +
            (member.online ? "" : "opacity-50")
          }
          style={{ backgroundColor: avatarColor(member.id) }}
        >
          {member.name.charAt(0)}
        </span>
        {/* 온라인 점 */}
        <span
          className={
            "absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white " +
            (member.online ? "bg-emerald-500" : "bg-slate-300")
          }
        />
      </div>
      <span
        className={
          "flex-1 min-w-0 truncate text-[13px] " +
          (member.online ? "font-medium text-slate-700" : "text-slate-400")
        }
      >
        {member.name}
      </span>
      {member.role === "admin" && (
        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded">
          관리자
        </span>
      )}
    </div>
  );
}

function Section({ label, members }: { label: string; members: MeetingMember[] }) {
  if (members.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="px-2 mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label} — {members.length}
      </div>
      {members.map((m) => (
        <MemberRow key={m.id} member={m} />
      ))}
    </div>
  );
}

function MemberList({ members, loading, error }: Props) {
  const online = members.filter((m) => m.online);
  const offline = members.filter((m) => !m.online);

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3">
      {error && <div className="px-2 py-2 text-xs text-red-600">{error}</div>}
      {loading && members.length === 0 ? (
        <div className="px-2 py-2 text-[13px] text-slate-400">불러오는 중…</div>
      ) : (
        <>
          <Section label="온라인" members={online} />
          <Section label="오프라인" members={offline} />
        </>
      )}
    </div>
  );
}

export default MemberList;
