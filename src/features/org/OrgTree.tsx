import { useState } from "react";
import { Button } from "../../shared/ui/button";
import { avatarColor } from "../../shared/lib/avatar-color";
import type { OrgMember, OrgNode } from "./api";

type Props = {
  nodes: OrgNode[];
  loading: boolean;
  error: string | null;
  onSelectMember?: (member: OrgMember) => void;
};

function MemberRow({
  member,
  onSelect,
}: {
  member: OrgMember;
  onSelect?: (m: OrgMember) => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => onSelect?.(member)}
      title="클릭해서 대화 시작"
      className="w-full flex items-center gap-2 py-1 px-2 rounded-md text-left select-none justify-start"
    >
      <span
        className="w-6 h-6 shrink-0 flex items-center justify-center text-[11px] font-bold text-white rounded-full"
        style={{ backgroundColor: avatarColor(member.id) }}
      >
        {member.name.charAt(0)}
      </span>
      <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
        <span className="text-[12.5px] font-semibold text-text-primary truncate">{member.name}</span>
        {member.position && (
          <span className="text-[11px] text-text-muted truncate">{member.position}</span>
        )}
      </span>
    </Button>
  );
}

function DeptNode({
  node,
  depth,
  onSelectMember,
}: {
  node: OrgNode;
  depth: number;
  onSelectMember?: (m: OrgMember) => void;
}) {
  const [open, setOpen] = useState(true);
  const count =
    node.members.length +
    node.children.reduce((sum, c) => sum + c.members.length, 0);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1 px-2 rounded-md text-left hover:bg-surface-muted transition-colors"
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={
            "shrink-0 text-text-muted transition-transform duration-150 " +
            (open ? "rotate-90" : "")
          }
        >
          <path d="M3 1.5 L7 5 L3 8.5 Z" />
        </svg>
        <span className="flex-1 min-w-0 text-[12.5px] font-bold text-text-primary truncate">
          {node.name}
        </span>
        <span className="shrink-0 min-w-[18px] px-1 py-px text-center text-[10px] font-semibold text-text-muted bg-surface-muted rounded">
          {count}
        </span>
      </button>

      <div
        className={
          "grid overflow-hidden transition-all duration-200 ease-in-out " +
          (open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
        }
      >
        <div className="min-h-0">
          <div className="ml-[9px] pl-2.5 border-l border-surface-border-soft">
            {node.children.map((child) => (
              <DeptNode
                key={child.id}
                node={child}
                depth={depth + 1}
                onSelectMember={onSelectMember}
              />
            ))}
            {node.members.map((m) => (
              <MemberRow key={m.id} member={m} onSelect={onSelectMember} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgTree({ nodes, loading, error, onSelectMember }: Props) {
  if (loading) {
    return <div className="px-3 py-4 text-[13px] text-text-muted">불러오는 중…</div>;
  }
  if (error) {
    return <div className="px-3 py-4 text-[13px] text-destructive">{error}</div>;
  }
  if (nodes.length === 0) {
    return <div className="px-3 py-4 text-[13px] text-text-muted">조직도가 비어 있습니다.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      {nodes.map((node) => (
        <DeptNode key={node.id} node={node} depth={0} onSelectMember={onSelectMember} />
      ))}
    </div>
  );
}

export default OrgTree;
