import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  ListChecks,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Save,
  SquarePen,
  TrendingUp,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import type { User } from "../../entities/user";
import {
  archiveTasks,
  createTaskChecklist,
  createTaskComment,
  createWorkspaceTask,
  getTaskDetail,
  listTaskActivity,
  listTaskChecklists,
  listTaskComments,
  listTaskWorkspaces,
  listWorkspaceTasks,
  toggleTaskChecklist,
  updateTask,
  updateTaskPriority,
  updateTaskStatus,
  type Task,
  type TaskActivityLog,
  type TaskChecklist,
  type TaskComment,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  type TaskWorkspace,
} from "../../features/task-management/api";
import { getToken } from "../../shared/api/client";
import { cn } from "../../shared/lib/utils";
import PageHeader from "../../shared/ui/PageHeader";
import Select from "../../shared/ui/Select";
import { toast } from "../../shared/ui/Toast";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/input";
import {
  LexicalEditor,
  MermaidPreview,
} from "../../shared/ui/lexical/lexical-editor";

type Props = {
  user: User;
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  REVIEW: "리뷰",
  DONE: "완료",
  HOLD: "보류",
};

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  URGENT: "긴급",
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  FEATURE: "기능",
  BUG: "버그",
  DOCS: "문서",
  DESIGN: "디자인",
  REFACTOR: "리팩터링",
  QA: "QA",
  CHORE: "기타",
};

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "HOLD"];
const PRIORITY_ORDER: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPE_ORDER: TaskType[] = ["FEATURE", "BUG", "DOCS", "DESIGN", "REFACTOR", "QA", "CHORE"];

const taskKeys = {
  all: ["task-management"] as const,
  workspaces: ["task-management", "workspaces"] as const,
  tasks: (workspaceId: string | null, filters: TaskFilters) =>
    ["task-management", "workspaces", workspaceId, "tasks", filters] as const,
  detail: (taskId: string | null) => ["task-management", "detail", taskId] as const,
  checklists: (taskId: string | null) =>
    ["task-management", "detail", taskId, "checklists"] as const,
  comments: (taskId: string | null) =>
    ["task-management", "detail", taskId, "comments"] as const,
  activity: (taskId: string | null) =>
    ["task-management", "detail", taskId, "activity"] as const,
};

function getProgress(workspace: TaskWorkspace) {
  if (workspace.taskCount === 0) return 0;
  return Math.round(
    ((workspace.taskCount - workspace.openTaskCount) / workspace.taskCount) * 100,
  );
}

function formatDate(value?: string | null) {
  if (!value) return "기한 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function isLexicalJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed?.root?.children);
  } catch {
    return false;
  }
}

function plainTextToLexicalJson(value: string) {
  const lines = value.split(/\r?\n/);
  return JSON.stringify({
    root: {
      children: (lines.length > 0 ? lines : [""]).map((line) => ({
        children: line
          ? [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: line,
                type: "text",
                version: 1,
              },
            ]
          : [],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      })),
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

function toLexicalInitialState(value: string) {
  return isLexicalJson(value) ? value : plainTextToLexicalJson(value);
}

const MERMAID_PREFIX_PATTERN =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/i;

function isMermaidSource(source: string) {
  return MERMAID_PREFIX_PATTERN.test(source.trim());
}

function normalizeMermaidSource(value: string) {
  const trimmed = value.trim();
  const fencedMatch = /^```(?:mermaid|mmd)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fencedMatch?.[1] ?? trimmed).trim();
}

function contentInfoFromPlainText(value: string) {
  const lines = value.split(/\r?\n/);
  const kept: string[] = [];
  let hasMermaid = false;
  let insideMermaidFence = false;
  let insidePlainMermaidBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (insideMermaidFence) {
      if (trimmed.startsWith("```")) insideMermaidFence = false;
      continue;
    }
    if (insidePlainMermaidBlock) {
      if (!trimmed) insidePlainMermaidBlock = false;
      continue;
    }
    if (/^```(?:mermaid|mmd)\b/i.test(trimmed)) {
      hasMermaid = true;
      insideMermaidFence = true;
      continue;
    }
    if (isMermaidSource(trimmed)) {
      hasMermaid = true;
      insidePlainMermaidBlock = true;
      continue;
    }
    kept.push(line);
  }

  return {
    hasMermaid,
    summary: kept.join(" ").replace(/\s+/g, " ").trim(),
  };
}

function codeTextFromLexicalNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: unknown; children?: unknown };
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.children)) return "";
  return record.children
    .map((child) => codeTextFromLexicalNode(child))
    .filter(Boolean)
    .join("\n");
}

function lexicalNodeContainsMermaid(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const record = node as {
    children?: unknown;
    language?: unknown;
    text?: unknown;
    type?: unknown;
  };
  if (record.type === "code") {
    const language = typeof record.language === "string" ? record.language.toLowerCase() : "";
    const source = codeTextFromLexicalNode(node);
    if (language === "mermaid" || language === "mmd" || isMermaidSource(source)) {
      return true;
    }
  }
  return Array.isArray(record.children)
    ? record.children.some((child) => lexicalNodeContainsMermaid(child))
    : false;
}

function textFromLexicalNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as {
    children?: unknown;
    language?: unknown;
    text?: unknown;
    type?: unknown;
  };
  if (record.type === "code") {
    const language = typeof record.language === "string" ? record.language.toLowerCase() : "";
    const source = codeTextFromLexicalNode(node);
    if (language === "mermaid" || language === "mmd" || isMermaidSource(source)) {
      return "";
    }
    return source;
  }
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.children)) return "";
  return record.children
    .map((child) => textFromLexicalNode(child))
    .filter(Boolean)
    .join(" ");
}

function contentInfoFromLexicalJson(value: string) {
  try {
    const parsed = JSON.parse(value) as { root?: unknown };
    return {
      hasMermaid: lexicalNodeContainsMermaid(parsed.root),
      summary: textFromLexicalNode(parsed.root).replace(/\s+/g, " ").trim(),
    };
  } catch {
    return { hasMermaid: false, summary: "" };
  }
}

function taskContentInfo(value: string) {
  if (!isLexicalJson(value)) {
    return contentInfoFromPlainText(value);
  }
  return contentInfoFromLexicalJson(value);
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function TaskManagementModule({ user }: Props) {
  const queryClient = useQueryClient();
  const token = getToken();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const workspacesQuery = useQuery({
    queryKey: taskKeys.workspaces,
    queryFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return listTaskWorkspaces(token, { scope: "my", archived: false });
    },
    enabled: Boolean(token),
  });

  const workspaces = useMemo(
    () => [...(workspacesQuery.data ?? [])].sort((a, b) => a.orderIdx - b.orderIdx),
    [workspacesQuery.data],
  );

  useEffect(() => {
    if (selectedWorkspaceId || workspaces.length === 0) return;
    setSelectedWorkspaceId(workspaces[0].id);
  }, [selectedWorkspaceId, workspaces]);

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;

  const filters: TaskFilters = useMemo(
    () => ({
      archived: false,
      sort: "order",
      scope: "my",
      page: 1,
      pageSize: 80,
      q: query.trim() || undefined,
      status: status || undefined,
    }),
    [query, status],
  );

  const tasksQuery = useQuery({
    queryKey: taskKeys.tasks(selectedWorkspaceId, filters),
    queryFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      if (!selectedWorkspaceId) throw new Error("워크스페이스를 선택하세요.");
      return listWorkspaceTasks(token, selectedWorkspaceId, filters);
    },
    enabled: Boolean(token && selectedWorkspaceId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, nextStatus }: { taskId: string; nextStatus: TaskStatus }) => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return updateTaskStatus(token, taskId, nextStatus);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("업무 상태가 변경되었습니다.");
    },
    onError: (error) => toast.error(messageFromError(error, "상태 변경에 실패했습니다.")),
  });

  const priorityMutation = useMutation({
    mutationFn: ({
      taskId,
      nextPriority,
    }: {
      taskId: string;
      nextPriority: TaskPriority;
    }) => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return updateTaskPriority(token, taskId, nextPriority);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("업무 우선순위가 변경되었습니다.");
    },
    onError: (error) =>
      toast.error(messageFromError(error, "우선순위 변경에 실패했습니다.")),
  });

  const archiveMutation = useMutation({
    mutationFn: (taskId: string) => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return archiveTasks(token, [taskId]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      setDetailTaskId(null);
      toast.success("업무가 보관되었습니다.");
    },
    onError: (error) => toast.error(messageFromError(error, "업무 보관에 실패했습니다.")),
  });

  const tasks = tasksQuery.data?.items ?? [];
  const totalTasks = workspaces.reduce((sum, workspace) => sum + workspace.taskCount, 0);
  const totalOpen = workspaces.reduce((sum, workspace) => sum + workspace.openTaskCount, 0);
  const totalDone = Math.max(0, totalTasks - totalOpen);
  const progress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader>
        <span className="flex size-[26px] items-center justify-center rounded-lg border border-brand-border bg-brand-glass text-brand-primary">
          <CheckSquare className="size-4" />
        </span>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          업무 관리
        </span>
      </PageHeader>

      <div className="flex min-h-0 flex-1 bg-surface-muted">
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-surface-border-soft bg-surface-raised">
          <div className="space-y-4 border-b border-surface-border-soft p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-primary">
                My Task Workspaces
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-text-primary">
                내 업무 워크스페이스
              </h1>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {user.name}님이 담당하거나 개인으로 등록한 업무를 서버 API에서 가져옵니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MetricTile label="전체" value={totalTasks} />
              <MetricTile label="진행" value={totalOpen} />
              <MetricTile label="완료" value={totalDone} />
            </div>
            <div className="rounded-md border border-surface-border-soft bg-brand-glass px-3 py-2.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-text-secondary">완료율</span>
                <span className="inline-flex items-center gap-1 text-brand-primary">
                  <TrendingUp className="size-3" />
                  {progress}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {workspacesQuery.isLoading ? (
              <LoadingState label="워크스페이스 불러오는 중..." />
            ) : workspacesQuery.isError ? (
              <ErrorState
                message={messageFromError(
                  workspacesQuery.error,
                  "워크스페이스를 불러오지 못했습니다.",
                )}
                onRetry={() => void workspacesQuery.refetch()}
              />
            ) : workspaces.length === 0 ? (
              <EmptyState label="표시할 업무 워크스페이스가 없습니다." />
            ) : (
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <WorkspaceButton
                    key={workspace.id}
                    workspace={workspace}
                    active={workspace.id === selectedWorkspaceId}
                    onClick={() => setSelectedWorkspaceId(workspace.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-surface-border-soft bg-surface-raised px-5 py-4">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-text-muted">
                  Workspace
                </p>
                <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-text-primary">
                  {selectedWorkspace?.name ?? "워크스페이스 선택"}
                </h2>
                <p className="mt-1 line-clamp-1 text-sm text-text-secondary">
                  {selectedWorkspace?.description ?? "왼쪽에서 업무 워크스페이스를 선택하세요."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void workspacesQuery.refetch();
                    void tasksQuery.refetch();
                  }}
                  disabled={workspacesQuery.isFetching || tasksQuery.isFetching}
                  title="새로고침"
                >
                  <RefreshCw
                    className={cn(
                      "size-4",
                      (workspacesQuery.isFetching || tasksQuery.isFetching) &&
                        "animate-spin",
                    )}
                  />
                  새로고침
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  disabled={!selectedWorkspaceId}
                >
                  <Plus className="size-4" />
                  업무 추가
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="제목이나 내용 검색"
                />
              </div>
              <Select
                size="md"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus | "")}
              >
                <option value="">상태 전체</option>
                {STATUS_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {TASK_STATUS_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {tasksQuery.isLoading ? (
              <LoadingState label="업무 불러오는 중..." />
            ) : tasksQuery.isError ? (
              <ErrorState
                message={messageFromError(tasksQuery.error, "업무를 불러오지 못했습니다.")}
                onRetry={() => void tasksQuery.refetch()}
              />
            ) : !selectedWorkspace ? (
              <EmptyState label="워크스페이스를 선택하세요." />
            ) : tasks.length === 0 ? (
              <EmptyState label="조건에 맞는 내 업무가 없습니다." />
            ) : (
              <div className="grid gap-3 2xl:grid-cols-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onOpen={() => setDetailTaskId(task.id)}
                    onStatusChange={(nextStatus) =>
                      statusMutation.mutate({ taskId: task.id, nextStatus })
                    }
                    onPriorityChange={(nextPriority) =>
                      priorityMutation.mutate({ taskId: task.id, nextPriority })
                    }
                    onArchive={() => archiveMutation.mutate(task.id)}
                    busy={
                      statusMutation.isPending ||
                      priorityMutation.isPending ||
                      archiveMutation.isPending
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {createOpen && selectedWorkspace ? (
        <CreateTaskDialog
          workspace={selectedWorkspace}
          token={token}
          user={user}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void queryClient.invalidateQueries({ queryKey: taskKeys.all });
          }}
        />
      ) : null}

      {detailTaskId ? (
        <TaskDetailDrawer
          taskId={detailTaskId}
          token={token}
          onClose={() => setDetailTaskId(null)}
          onStatusChange={(nextStatus) =>
            statusMutation.mutate({ taskId: detailTaskId, nextStatus })
          }
          onPriorityChange={(nextPriority) =>
            priorityMutation.mutate({ taskId: detailTaskId, nextPriority })
          }
          busy={statusMutation.isPending || priorityMutation.isPending}
        />
      ) : null}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
      <div className="text-[11px] font-bold text-text-muted">{label}</div>
      <div className="mt-1 text-xl font-black leading-none text-text-primary">{value}</div>
    </div>
  );
}

function WorkspaceButton({
  workspace,
  active,
  onClick,
}: {
  workspace: TaskWorkspace;
  active: boolean;
  onClick: () => void;
}) {
  const progress = getProgress(workspace);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border p-3 text-left transition-colors",
        active
          ? "border-brand-border bg-brand-glass"
          : "border-surface-border-soft bg-surface-raised hover:border-brand-border hover:bg-surface-muted",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
          <CheckSquare className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-text-primary">
            {workspace.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            {workspace.description ?? "업무 워크스페이스"}
          </span>
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-black text-text-muted">
        <span>{workspace.taskCount}개 업무</span>
        <span>{workspace.openTaskCount}개 진행</span>
        <span>{progress}% 완료</span>
      </div>
      <div className="mt-3">
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function TaskCard({
  task,
  onOpen,
  onStatusChange,
  onPriorityChange,
  onArchive,
  busy,
}: {
  task: Task;
  onOpen: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onArchive: () => void;
  busy: boolean;
}) {
  const contentInfo = taskContentInfo(task.content);

  return (
    <article className="rounded-md border border-surface-border-soft bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{TASK_TYPE_LABELS[task.taskType]}</Badge>
            {task.scope === "PERSONAL" ? <Badge>개인</Badge> : null}
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-black leading-snug text-text-primary">
            {task.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onArchive}
          disabled={busy}
          title="보관"
          className="ui-icon-button size-8 shrink-0"
        >
          <Archive className="size-4" />
        </button>
      </div>

      {contentInfo.summary ? (
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-text-secondary">
          {contentInfo.summary}
        </p>
      ) : null}

      {contentInfo.hasMermaid ? (
        <div className="mt-2">
          <Badge>Mermaid 도식</Badge>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface-border-soft pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
          <Select
            size="sm"
            value={task.status}
            onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
            disabled={busy}
            selectClassName="h-7 rounded-md border-brand-border bg-brand-glass px-2 pr-7 text-[11px] font-black text-brand-primary shadow-none"
          >
            {STATUS_ORDER.map((item) => (
              <option key={item} value={item}>
                {TASK_STATUS_LABELS[item]}
              </option>
            ))}
          </Select>
          <Select
            size="sm"
            value={task.priority}
            onChange={(event) => onPriorityChange(event.target.value as TaskPriority)}
            disabled={busy}
            selectClassName="h-7 rounded-md border-surface-border-soft bg-surface-muted px-2 pr-7 text-[11px] font-black text-text-secondary shadow-none"
          >
            {PRIORITY_ORDER.map((item) => (
              <option key={item} value={item}>
                {TASK_PRIORITY_LABELS[item]}
              </option>
            ))}
          </Select>
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList className="size-3.5" />
            담당 {task.assigneeName ?? "미지정"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <SquarePen className="size-3.5" />
            {formatDate(task.dueDate)}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpen}
          className="ml-auto h-8"
        >
          상세 보기
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}

function TaskDetailDrawer({
  taskId,
  token,
  onClose,
  onStatusChange,
  onPriorityChange,
  busy,
}: {
  taskId: string;
  token: string | null;
  onClose: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  busy: boolean;
}) {
  const queryClient = useQueryClient();
  const [checklistText, setChecklistText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    content: "",
    acceptanceCriteria: "",
    plan: "",
    folderStructure: "",
    mmdContent: "",
    taskType: "FEATURE" as TaskType,
    dueDate: "",
  });

  const detailQuery = useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return getTaskDetail(token, taskId);
    },
    enabled: Boolean(token && taskId),
  });
  const checklistsQuery = useQuery({
    queryKey: taskKeys.checklists(taskId),
    queryFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return listTaskChecklists(token, taskId);
    },
    enabled: Boolean(token && taskId),
  });
  const commentsQuery = useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return listTaskComments(token, taskId);
    },
    enabled: Boolean(token && taskId),
  });
  const activityQuery = useQuery({
    queryKey: taskKeys.activity(taskId),
    queryFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return listTaskActivity(token, taskId);
    },
    enabled: Boolean(token && taskId),
  });

  const createChecklistMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return createTaskChecklist(token, taskId, checklistText.trim());
    },
    onSuccess: () => {
      setChecklistText("");
      void queryClient.invalidateQueries({ queryKey: taskKeys.checklists(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (error) =>
      toast.error(messageFromError(error, "체크리스트 추가에 실패했습니다.")),
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: (checklistId: string) => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return toggleTaskChecklist(token, taskId, checklistId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.checklists(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (error) =>
      toast.error(messageFromError(error, "체크리스트 변경에 실패했습니다.")),
  });

  const createCommentMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return createTaskComment(token, taskId, commentText.trim());
    },
    onSuccess: () => {
      setCommentText("");
      void queryClient.invalidateQueries({ queryKey: taskKeys.comments(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.activity(taskId) });
    },
    onError: (error) => toast.error(messageFromError(error, "댓글 등록에 실패했습니다.")),
  });

  const task = detailQuery.data;
  const checklists = checklistsQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const activities = activityQuery.data ?? [];
  const hasDesignInfo = Boolean(
    task &&
      (task.acceptanceCriteria.trim() ||
        task.plan.trim() ||
        task.folderStructure.trim() ||
        task.mmdContent.trim()),
  );

  function requestClose() {
    setClosing(true);
    window.setTimeout(onClose, 180);
  }

  useEffect(() => {
    if (!task || editing) return;
    setDraft({
      title: task.title,
      content: task.content,
      acceptanceCriteria: task.acceptanceCriteria,
      plan: task.plan,
      folderStructure: task.folderStructure,
      mmdContent: task.mmdContent,
      taskType: task.taskType,
      dueDate: toDateInputValue(task.dueDate),
    });
  }, [editing, task]);

  const updateTaskMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return updateTask(token, taskId, {
        title: draft.title.trim(),
        content: draft.content,
        acceptanceCriteria: draft.acceptanceCriteria,
        plan: draft.plan,
        folderStructure: draft.folderStructure,
        mmdContent: draft.mmdContent,
        taskType: draft.taskType,
        dueDate: draft.dueDate || null,
      });
    },
    onSuccess: () => {
      setEditing(false);
      toast.success("업무가 저장되었습니다.");
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.activity(taskId) });
    },
    onError: (error) => toast.error(messageFromError(error, "업무 저장에 실패했습니다.")),
  });

  const canSave = draft.title.trim().length > 0 && !updateTaskMutation.isPending;

  return (
    <div
      className={cn(
        "task-detail-backdrop fixed inset-0 z-[70] flex justify-end bg-[rgba(0,0,0,0.22)]",
        closing && "task-detail-backdrop-out",
      )}
    >
      <button
        type="button"
        aria-label="상세 닫기"
        className="min-w-0 flex-1 cursor-default"
        onClick={requestClose}
      />
      <aside
        className={cn(
          "task-detail-drawer flex h-full w-[min(1320px,calc(100vw-72px))] flex-col border-l border-surface-border bg-surface-raised shadow-2xl",
          closing && "task-detail-drawer-out",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-border-soft px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-primary">
              Task Detail
            </p>
            {editing ? (
              <Input
                value={draft.title}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                className="mt-2 h-11 text-lg font-black"
                placeholder="업무 제목"
              />
            ) : (
              <h2 className="mt-1 line-clamp-2 text-xl font-black leading-tight text-text-primary">
                {task?.title ?? "업무 상세"}
              </h2>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {task && editing ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setDraft({
                      title: task.title,
                      content: task.content,
                      acceptanceCriteria: task.acceptanceCriteria,
                      plan: task.plan,
                      folderStructure: task.folderStructure,
                      mmdContent: task.mmdContent,
                      taskType: task.taskType,
                      dueDate: toDateInputValue(task.dueDate),
                    });
                  }}
                  disabled={updateTaskMutation.isPending}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateTaskMutation.mutate()}
                  disabled={!canSave}
                >
                  {updateTaskMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  저장
                </Button>
              </>
            ) : task ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="전체 편집"
                aria-label="전체 편집"
                className="ui-icon-button size-9"
              >
                <SquarePen className="size-4" />
              </button>
            ) : null}
          </div>
          <button type="button" onClick={requestClose} className="ui-icon-button size-9 shrink-0">
            <X className="size-4" />
          </button>
        </div>

        {detailQuery.isLoading ? (
          <LoadingState label="업무 상세 불러오는 중..." />
        ) : detailQuery.isError ? (
          <div className="p-5">
            <ErrorState
              message={messageFromError(detailQuery.error, "업무 상세를 불러오지 못했습니다.")}
              onRetry={() => void detailQuery.refetch()}
            />
          </div>
        ) : task ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={task.status}
                onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
                disabled={busy}
                block
              >
                {STATUS_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {TASK_STATUS_LABELS[item]}
                  </option>
                ))}
              </Select>
              <Select
                value={task.priority}
                onChange={(event) =>
                  onPriorityChange(event.target.value as TaskPriority)
                }
                disabled={busy}
                block
              >
                {PRIORITY_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {TASK_PRIORITY_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>

            {editing ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-text-secondary">유형</span>
                  <Select
                    value={draft.taskType}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        taskType: event.target.value as TaskType,
                      }))
                    }
                    block
                  >
                    {TYPE_ORDER.map((item) => (
                      <option key={item} value={item}>
                        {TASK_TYPE_LABELS[item]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-text-secondary">기한</span>
                  <Input
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, dueDate: event.target.value }))
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoTile icon={<UserCircle className="size-4" />} label="담당" value={task.assigneeName ?? "미지정"} />
              <InfoTile icon={<ClipboardList className="size-4" />} label="유형" value={TASK_TYPE_LABELS[task.taskType]} />
              <InfoTile icon={<CalendarDays className="size-4" />} label="기한" value={formatDate(task.dueDate)} />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <DetailSection
                title="본문"
                icon={<ClipboardList className="size-4" />}
                className="xl:col-span-2"
                action={
                  editing ? null : (
                    <SectionEditButton label="본문 편집" onClick={() => setEditing(true)} />
                  )
                }
              >
                {editing ? (
                  <div className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised">
                    <LexicalEditor
                      key={`${task.id}:content:${editing}`}
                      initialState={toLexicalInitialState(draft.content)}
                      onChange={(value) =>
                        setDraft((prev) => ({ ...prev, content: value }))
                      }
                      placeholder="본문을 작성하세요..."
                      minHeight="260px"
                      toolbarVariant="full"
                    />
                  </div>
                ) : isLexicalJson(task.content) ? (
                  <div className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised">
                    <LexicalEditor
                      key={`${task.id}:content:read`}
                      initialState={task.content}
                      onChange={() => {}}
                      readOnly
                      minHeight="120px"
                    />
                  </div>
                ) : (
                  <TextBlock
                    value={task.content}
                    empty="본문을 편집에서 추가할 수 있습니다."
                  />
                )}
              </DetailSection>
              <DetailSection
                title="설계 정보"
                icon={<Activity className="size-4" />}
                className="xl:col-span-2"
                action={
                  editing ? null : (
                    <SectionEditButton label="설계 정보 편집" onClick={() => setEditing(true)} />
                  )
                }
              >
                {editing ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    <FieldEditor
                      title="완료 조건"
                      icon={<CheckCircle2 className="size-4" />}
                    >
                      <EditableTextarea
                        value={draft.acceptanceCriteria}
                        onChange={(value) =>
                          setDraft((prev) => ({
                            ...prev,
                            acceptanceCriteria: value,
                          }))
                        }
                        placeholder="완료 조건"
                      />
                    </FieldEditor>
                    <FieldEditor title="진행 계획" icon={<SquarePen className="size-4" />}>
                      <EditableTextarea
                        value={draft.plan}
                        onChange={(value) =>
                          setDraft((prev) => ({ ...prev, plan: value }))
                        }
                        placeholder="진행 계획"
                      />
                    </FieldEditor>
                    <FieldEditor
                      title="폴더 구조"
                      icon={<ClipboardList className="size-4" />}
                    >
                      <EditableTextarea
                        value={draft.folderStructure}
                        onChange={(value) =>
                          setDraft((prev) => ({ ...prev, folderStructure: value }))
                        }
                        placeholder="폴더 구조"
                        mono
                      />
                    </FieldEditor>
                    <FieldEditor title="Mermaid" icon={<Activity className="size-4" />}>
                      <EditableTextarea
                        value={draft.mmdContent}
                        onChange={(value) =>
                          setDraft((prev) => ({ ...prev, mmdContent: value }))
                        }
                        placeholder="Mermaid 내용"
                        mono
                      />
                    </FieldEditor>
                  </div>
                ) : hasDesignInfo ? (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {task.acceptanceCriteria.trim() ? (
                      <FieldPreview
                        title="완료 조건"
                        icon={<CheckCircle2 className="size-4" />}
                      >
                        <TextBlock value={task.acceptanceCriteria} empty="" />
                      </FieldPreview>
                    ) : null}
                    {task.plan.trim() ? (
                      <FieldPreview title="진행 계획" icon={<SquarePen className="size-4" />}>
                        <TextBlock value={task.plan} empty="" />
                      </FieldPreview>
                    ) : null}
                    {task.folderStructure.trim() ? (
                      <FieldPreview
                        title="폴더 구조"
                        icon={<ClipboardList className="size-4" />}
                      >
                        <CodeBlock value={task.folderStructure} empty="" />
                      </FieldPreview>
                    ) : null}
                    {task.mmdContent.trim() ? (
                      <FieldPreview title="Mermaid" icon={<Activity className="size-4" />}>
                        <MermaidFieldPreview value={task.mmdContent} />
                      </FieldPreview>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-muted">
                    <span>완료 조건, 진행 계획, 폴더 구조, Mermaid는 편집에서 추가할 수 있습니다.</span>
                  </div>
                )}
              </DetailSection>
              <ChecklistSection
                checklists={checklists}
                loading={checklistsQuery.isLoading}
                text={checklistText}
                onTextChange={setChecklistText}
                onCreate={() => {
                  if (!checklistText.trim()) return;
                  createChecklistMutation.mutate();
                }}
                onToggle={(id) => toggleChecklistMutation.mutate(id)}
                busy={createChecklistMutation.isPending || toggleChecklistMutation.isPending}
              />
              <CommentsSection
                comments={comments}
                loading={commentsQuery.isLoading}
                text={commentText}
                onTextChange={setCommentText}
                onCreate={() => {
                  if (!commentText.trim()) return;
                  createCommentMutation.mutate();
                }}
                busy={createCommentMutation.isPending}
              />
              <ActivitySection
                activities={activities}
                loading={activityQuery.isLoading}
                className="xl:col-span-2"
              />
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black text-text-primary">{value}</div>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  className,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-md border border-surface-border-soft bg-surface-raised",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-surface-border-soft px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-text-primary">
          <span className="text-brand-primary">{icon}</span>
          {title}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SectionEditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="ui-icon-button size-7 shrink-0"
    >
      <SquarePen className="size-3.5" />
    </button>
  );
}

function FieldEditor({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-surface-border-soft bg-surface-muted p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-text-secondary">
        <span className="text-brand-primary">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldPreview({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md border border-surface-border-soft bg-surface-muted">
      <div className="flex min-h-9 items-center gap-2 border-b border-surface-border-soft px-3 text-xs font-black text-text-secondary">
        <span className="text-brand-primary">{icon}</span>
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function TextBlock({ value, empty }: { value: string; empty: string }) {
  if (!value.trim()) {
    return <p className="text-sm font-semibold text-text-muted">{empty}</p>;
  }
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
      {value}
    </div>
  );
}

function CodeBlock({ value, empty }: { value: string; empty: string }) {
  if (!value.trim()) {
    return <p className="text-sm font-semibold text-text-muted">{empty}</p>;
  }
  return (
    <pre className="max-h-72 overflow-auto rounded-md border border-surface-border-soft bg-surface-muted p-3 text-xs leading-5 text-text-primary">
      <code>{value}</code>
    </pre>
  );
}

function MermaidFieldPreview({ value }: { value: string }) {
  const source = normalizeMermaidSource(value);
  if (!source) {
    return <p className="text-sm font-semibold text-text-muted">Mermaid 내용이 없습니다.</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised">
      <MermaidPreview block={{ id: `task-mermaid-${source.length}`, source }} index={0} />
    </div>
  );
}

function EditableTextarea({
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        "min-h-28 w-full resize-y rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm leading-6 text-text-primary shadow-sm outline-none transition-colors placeholder:text-text-muted focus:border-brand-border focus:bg-surface-raised focus:ring-2 focus:ring-brand-border/40",
        mono && "font-mono text-xs leading-5",
      )}
    />
  );
}

function ChecklistSection({
  checklists,
  loading,
  text,
  onTextChange,
  onCreate,
  onToggle,
  busy,
  className,
}: {
  checklists: TaskChecklist[];
  loading: boolean;
  text: string;
  onTextChange: (value: string) => void;
  onCreate: () => void;
  onToggle: (id: string) => void;
  busy: boolean;
  className?: string;
}) {
  return (
    <DetailSection
      title="체크리스트"
      icon={<ListChecks className="size-4" />}
      className={className}
    >
      <div className="space-y-2">
        {loading ? (
          <p className="text-sm font-semibold text-text-muted">체크리스트 불러오는 중...</p>
        ) : checklists.length === 0 ? (
          <p className="text-sm font-semibold text-text-muted">체크리스트가 없습니다.</p>
        ) : (
          checklists.map((item) => (
            <label
              key={item.id}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 text-sm font-semibold text-text-primary"
            >
              <input
                type="checkbox"
                checked={item.completed}
                disabled={busy}
                onChange={() => onToggle(item.id)}
                className="size-4 accent-[var(--primary)]"
              />
              <span className={cn(item.completed && "text-text-muted line-through")}>
                {item.content}
              </span>
            </label>
          ))
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="체크리스트 추가"
          onKeyDown={(event) => {
            if (event.key === "Enter") onCreate();
          }}
        />
        <Button size="sm" onClick={onCreate} disabled={!text.trim() || busy}>
          추가
        </Button>
      </div>
    </DetailSection>
  );
}

function CommentsSection({
  comments,
  loading,
  text,
  onTextChange,
  onCreate,
  busy,
  className,
}: {
  comments: TaskComment[];
  loading: boolean;
  text: string;
  onTextChange: (value: string) => void;
  onCreate: () => void;
  busy: boolean;
  className?: string;
}) {
  return (
    <DetailSection
      title="댓글"
      icon={<MessageSquareText className="size-4" />}
      className={className}
    >
      <div className="space-y-2">
        {loading ? (
          <p className="text-sm font-semibold text-text-muted">댓글 불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm font-semibold text-text-muted">댓글이 없습니다.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-text-muted">
                <span>{comment.userName ?? comment.userEmail ?? "사용자"}</span>
                <span>{formatDateTime(comment.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-text-primary">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 space-y-2">
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="댓글 입력"
          className="min-h-20 w-full rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition-colors placeholder:text-text-muted focus:border-brand-border focus:bg-surface-raised focus:ring-2 focus:ring-brand-border/40"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={onCreate} disabled={!text.trim() || busy}>
            댓글 등록
          </Button>
        </div>
      </div>
    </DetailSection>
  );
}

function ActivitySection({
  activities,
  loading,
  className,
}: {
  activities: TaskActivityLog[];
  loading: boolean;
  className?: string;
}) {
  return (
    <DetailSection
      title="활동"
      icon={<Activity className="size-4" />}
      className={className}
    >
      {loading ? (
        <p className="text-sm font-semibold text-text-muted">활동 불러오는 중...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm font-semibold text-text-muted">활동 기록이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {activities.slice(0, 12).map((activity) => (
            <div
              key={activity.id}
              className="flex items-start justify-between gap-3 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary">
                  {activity.message ?? activity.activityType}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-text-muted">
                  {activity.actorName ?? "시스템"}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-text-muted">
                {formatDateTime(activity.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </DetailSection>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-md border border-surface-border-soft bg-surface-muted px-2 text-[11px] font-black text-text-secondary">
      {children}
    </span>
  );
}

function CreateTaskDialog({
  workspace,
  token,
  user,
  onClose,
  onCreated,
}: {
  workspace: TaskWorkspace;
  token: string | null;
  user: User;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("FEATURE");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const createMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("로그인이 필요합니다.");
      return createWorkspaceTask(token, workspace.id, {
        title: title.trim(),
        content: content.trim(),
        taskType,
        priority,
        status: "TODO",
        scope: "PERSONAL",
        visibility: "PRIVATE",
        assigneeId: user.id,
        dueDate: dueDate || null,
      });
    },
    onSuccess: () => {
      toast.success("업무가 생성되었습니다.");
      onCreated();
    },
    onError: (error) => toast.error(messageFromError(error, "업무 생성에 실패했습니다.")),
  });

  const canSubmit = title.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || createMutation.isPending) return;
    createMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(0,0,0,0.4)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-[min(560px,100%)] rounded-md border border-surface-border bg-surface-raised p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-primary">
              {workspace.name}
            </p>
            <h2 className="mt-1 text-lg font-black text-text-primary">내 업무 추가</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-bold text-text-secondary">제목</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="해야 할 업무를 입력하세요"
              autoFocus
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-text-secondary">내용</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="필요한 설명을 적어두세요"
              className="min-h-28 w-full rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition-colors placeholder:text-text-muted focus:border-brand-border focus:bg-surface-raised focus:ring-2 focus:ring-brand-border/40"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-text-secondary">유형</span>
              <Select
                value={taskType}
                onChange={(event) => setTaskType(event.target.value as TaskType)}
                block
              >
                {TYPE_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {TASK_TYPE_LABELS[item]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-text-secondary">우선순위</span>
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                block
              >
                {PRIORITY_ORDER.map((item) => (
                  <option key={item} value={item}>
                    {TASK_PRIORITY_LABELS[item]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-text-secondary">기한</span>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={!canSubmit || createMutation.isPending}>
            {createMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            생성
          </Button>
        </div>
      </form>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center text-sm font-semibold text-text-muted">
      <LoaderCircle className="mr-2 size-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-raised p-6 text-center text-sm font-semibold text-text-muted">
      <ClipboardList className="mb-3 size-8" />
      {label}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-md border border-surface-border-soft bg-surface-raised p-5 text-center">
      <p className="text-sm font-bold text-text-primary">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" />
        다시 시도
      </Button>
    </div>
  );
}

export default TaskManagementModule;
