import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  FileText,
  FolderTree,
  GripVertical,
  Layers,
  Plus,
  X,
} from "lucide-react";
import * as archNoteApi from "../../features/arch-note/api";
import * as devHistoryApi from "../../features/dev-history/api";
import * as ideaNoteApi from "../../features/idea-note/api";
import * as planningDesignApi from "../../features/planning-design/api";
import * as projectCodeReviewApi from "../../features/project-code-review/api";
import { getToken } from "../../shared/api/client";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/input";
import { toast } from "../../shared/ui/Toast";

type Workspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  orderIdx: number;
};

type WorkspaceSummary = {
  categoryCount: number;
  sectionCount: number;
  itemCount: number;
};

type WorkspaceApi = {
  listWorkspaces: (token: string) => Promise<Workspace[]>;
  createWorkspace: (
    token: string,
    body: { title: string; description?: string | null },
  ) => Promise<Workspace>;
  updateWorkspace: (
    token: string,
    id: string,
    body: { title?: string; description?: string | null },
  ) => Promise<Workspace>;
  deleteWorkspace: (token: string, id: string) => Promise<void>;
  getWorkspaceSummary: (
    token: string,
    id: string,
  ) => Promise<WorkspaceSummary>;
  reorderWorkspaces: (
    token: string,
    workspaceIds: string[],
  ) => Promise<void>;
};

type WorkspaceDomainId =
  | "arch-note"
  | "planning-design"
  | "dev-history"
  | "idea-note"
  | "project-code-review";

const WORKSPACE_DOMAINS: Array<{
  id: WorkspaceDomainId;
  label: string;
  itemLabel: string;
  api: WorkspaceApi;
}> = [
  {
    id: "arch-note",
    label: "아키텍처 노트",
    itemLabel: "노트",
    api: archNoteApi,
  },
  {
    id: "planning-design",
    label: "기획·설계",
    itemLabel: "문서",
    api: planningDesignApi,
  },
  {
    id: "dev-history",
    label: "개발 일지",
    itemLabel: "일지",
    api: devHistoryApi,
  },
  {
    id: "idea-note",
    label: "아이디어 노트",
    itemLabel: "노트",
    api: ideaNoteApi,
  },
  {
    id: "project-code-review",
    label: "프로젝트 코드리뷰",
    itemLabel: "리뷰 노트",
    api: projectCodeReviewApi,
  },
];

function WorkspaceManagementSettings() {
  const [domainId, setDomainId] =
    useState<WorkspaceDomainId>("arch-note");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const domain = useMemo(
    () =>
      WORKSPACE_DOMAINS.find((candidate) => candidate.id === domainId) ??
      WORKSPACE_DOMAINS[0],
    [domainId],
  );
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedId) ?? null;
  const isDirty =
    !!selectedWorkspace &&
    (draftTitle.trim() !== selectedWorkspace.title ||
      draftDescription.trim() !== (selectedWorkspace.description ?? ""));

  useEffect(() => {
    setSelectedId(null);
    setSummary(null);
    setAdding(false);
    setNewTitle("");
    void loadWorkspaces();
  }, [domainId]);

  useEffect(() => {
    if (!selectedWorkspace) {
      setDraftTitle("");
      setDraftDescription("");
      setSummary(null);
      return;
    }
    setDraftTitle(selectedWorkspace.title);
    setDraftDescription(selectedWorkspace.description ?? "");
  }, [selectedWorkspace?.id]);

  useEffect(() => {
    const token = getToken();
    if (!token || !selectedId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    setSummary(null);
    void domain.api
      .getWorkspaceSummary(token, selectedId)
      .then((nextSummary) => {
        if (!cancelled) setSummary(nextSummary);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "워크스페이스 현황을 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domain, selectedId]);

  async function loadWorkspaces() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const list = await domain.api.listWorkspaces(token);
      setWorkspaces(list);
      setSelectedId((current) =>
        current && list.some((workspace) => workspace.id === current)
          ? current
          : (list[0]?.id ?? null),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "워크스페이스를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createWorkspace() {
    const token = getToken();
    const title = newTitle.trim();
    if (!token || !title || creating) return;
    setCreating(true);
    try {
      const created = await domain.api.createWorkspace(token, { title });
      setWorkspaces((current) => [...current, created]);
      setSelectedId(created.id);
      setNewTitle("");
      setAdding(false);
      toast.success("워크스페이스를 추가했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "추가하지 못했습니다.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function saveWorkspace() {
    const token = getToken();
    const title = draftTitle.trim();
    if (!token || !selectedWorkspace || !title || !isDirty || saving) return;
    setSaving(true);
    try {
      const updated = await domain.api.updateWorkspace(
        token,
        selectedWorkspace.id,
        {
          title,
          description: draftDescription.trim() || null,
        },
      );
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === updated.id ? updated : workspace,
        ),
      );
      toast.success("워크스페이스를 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkspace() {
    const token = getToken();
    if (
      !token ||
      !selectedWorkspace ||
      deleteConfirmation !== selectedWorkspace.title ||
      deleting
    ) {
      return;
    }
    setDeleting(true);
    try {
      await domain.api.deleteWorkspace(token, selectedWorkspace.id);
      const remaining = workspaces.filter(
        (workspace) => workspace.id !== selectedWorkspace.id,
      );
      setWorkspaces(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setDeleteConfirmation("");
      setDeleteOpen(false);
      toast.success("워크스페이스를 삭제했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제하지 못했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const token = getToken();
    const { active, over } = event;
    if (!token || !over || active.id === over.id) return;
    const from = workspaces.findIndex((workspace) => workspace.id === active.id);
    const to = workspaces.findIndex((workspace) => workspace.id === over.id);
    if (from < 0 || to < 0) return;
    const previous = workspaces;
    const reordered = arrayMove(workspaces, from, to).map(
      (workspace, orderIdx) => ({ ...workspace, orderIdx }),
    );
    setWorkspaces(reordered);
    try {
      await domain.api.reorderWorkspaces(
        token,
        reordered.map((workspace) => workspace.id),
      );
    } catch (error) {
      setWorkspaces(previous);
      toast.error(
        error instanceof Error ? error.message : "순서를 변경하지 못했습니다.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-bold text-text-primary">
          워크스페이스 관리
        </h2>
        <p className="mt-1 text-[12px] leading-5 text-text-secondary">
          이름과 순서를 관리합니다. 삭제는 포함된 데이터 규모를 확인한 뒤
          실행할 수 있습니다.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="워크스페이스 종류"
        className="inline-flex rounded-lg bg-surface-strong p-1"
      >
        {WORKSPACE_DOMAINS.map((candidate) => {
          const active = candidate.id === domainId;
          return (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDomainId(candidate.id)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors ${
                active
                  ? "bg-surface-raised text-brand-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {candidate.label}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-[520px] overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-surface-border-soft bg-surface-muted lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-surface-border-soft px-4 py-3">
            <div>
              <strong className="block text-[13px] text-text-primary">
                워크스페이스
              </strong>
              <span className="text-[11px] text-text-muted">
                {workspaces.length}개
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={adding}
              title="워크스페이스 추가"
              aria-label="워크스페이스 추가"
              className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-brand-glass hover:text-brand-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={workspaces.map((workspace) => workspace.id)}
                strategy={verticalListSortingStrategy}
              >
                {workspaces.map((workspace) => (
                  <SortableWorkspaceRow
                    key={workspace.id}
                    workspace={workspace}
                    selected={workspace.id === selectedId}
                    onSelect={() => setSelectedId(workspace.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {adding && (
              <div className="flex items-center gap-2 border-b border-surface-border-soft bg-brand-glass px-3 py-2.5">
                <Layers className="size-4 shrink-0 text-brand-primary" />
                <input
                  autoFocus
                  value={newTitle}
                  readOnly={creating}
                  onChange={(event) => setNewTitle(event.target.value)}
                  onBlur={() => {
                    if (!newTitle.trim()) {
                      setAdding(false);
                      setNewTitle("");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing || creating) return;
                    if (event.key === "Enter" && newTitle.trim()) {
                      void createWorkspace();
                    }
                    if (event.key === "Escape") {
                      setAdding(false);
                      setNewTitle("");
                    }
                  }}
                  placeholder="워크스페이스 이름"
                  className="min-w-0 flex-1 rounded-md border border-brand-border bg-surface-raised px-2 py-1 text-[12px] text-text-primary outline-none"
                />
              </div>
            )}

            {!loading && workspaces.length === 0 && !adding && (
              <div className="px-4 py-10 text-center text-[12px] text-text-muted">
                워크스페이스가 없습니다.
              </div>
            )}
            {loading && (
              <div className="px-4 py-10 text-center text-[12px] text-text-muted">
                불러오는 중…
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 p-5 lg:p-6">
          {selectedWorkspace ? (
            <div className="mx-auto max-w-2xl space-y-6">
              <div>
                <h3 className="text-[15px] font-bold text-text-primary">
                  기본 정보
                </h3>
                <p className="mt-1 text-[11px] text-text-muted">
                  탭에 표시되는 이름과 설명을 변경합니다.
                </p>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-bold text-text-secondary">
                    이름
                  </span>
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    maxLength={80}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[12px] font-bold text-text-secondary">
                    설명
                  </span>
                  <textarea
                    value={draftDescription}
                    onChange={(event) =>
                      setDraftDescription(event.target.value)
                    }
                    maxLength={240}
                    rows={3}
                    placeholder="워크스페이스 설명을 입력하세요."
                    className="w-full resize-none rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-brand-border focus:bg-surface-raised focus:ring-2 focus:ring-brand-border/40"
                  />
                </label>
                <div className="flex justify-end">
                  <Button
                    onClick={saveWorkspace}
                    disabled={!isDirty || !draftTitle.trim() || saving}
                  >
                    {saving ? "저장 중…" : "변경사항 저장"}
                  </Button>
                </div>
              </div>

              <div className="border-t border-surface-border-soft pt-5">
                <h3 className="text-[13px] font-bold text-text-primary">
                  포함된 데이터
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <SummaryCard
                    icon={FolderTree}
                    label="1차 주제"
                    value={summary?.categoryCount}
                    loading={summaryLoading}
                  />
                  <SummaryCard
                    icon={Layers}
                    label="2차 주제"
                    value={summary?.sectionCount}
                    loading={summaryLoading}
                  />
                  <SummaryCard
                    icon={FileText}
                    label={domain.itemLabel}
                    value={summary?.itemCount}
                    loading={summaryLoading}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-danger-border bg-danger-glass p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[13px] font-bold text-destructive">
                      위험 영역
                    </h3>
                    <p className="mt-1 text-[11px] leading-5 text-text-secondary">
                      워크스페이스를 삭제하면 포함된 주제와 {domain.itemLabel}도
                      복구할 수 없습니다.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    tone="danger"
                    disabled={summaryLoading || !summary}
                    onClick={() => {
                      setDeleteConfirmation("");
                      setDeleteOpen(true);
                    }}
                    className="shrink-0 text-destructive hover:bg-danger-glass"
                    title={
                      summary
                        ? "워크스페이스 삭제"
                        : "포함된 데이터 확인 후 삭제할 수 있습니다."
                    }
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-72 flex-col items-center justify-center gap-2 text-center">
              <Layers className="size-9 text-text-muted" strokeWidth={1.5} />
              <p className="text-[13px] font-medium text-text-muted">
                관리할 워크스페이스를 선택하세요.
              </p>
            </div>
          )}
        </section>
      </div>

      {selectedWorkspace && (
        <DeleteWorkspaceDialog
          open={deleteOpen}
          workspace={selectedWorkspace}
          summary={summary}
          itemLabel={domain.itemLabel}
          confirmation={deleteConfirmation}
          deleting={deleting}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteConfirmation("");
          }}
          onConfirmationChange={setDeleteConfirmation}
          onDelete={() => void deleteWorkspace()}
        />
      )}
    </div>
  );
}

function SortableWorkspaceRow({
  workspace,
  selected,
  onSelect,
}: {
  workspace: Workspace;
  selected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={`flex items-center gap-2 border-b border-surface-border-soft px-3 py-2.5 ${
        selected ? "bg-brand-glass" : "hover:bg-surface-raised"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="드래그하여 순서 변경"
        className="grid size-6 shrink-0 cursor-grab place-items-center rounded text-text-muted hover:text-text-primary active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-0 flex-1 truncate text-left text-[12px] ${
          selected
            ? "font-bold text-brand-primary"
            : "font-medium text-text-secondary"
        }`}
      >
        {workspace.title}
      </button>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Layers;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-border-soft bg-surface-muted p-3">
      <Icon className="size-4 text-text-muted" />
      <span className="mt-2 block text-[11px] text-text-muted">{label}</span>
      <strong className="mt-0.5 block text-[18px] font-black tabular-nums text-text-primary">
        {loading ? "…" : (value ?? 0)}
      </strong>
    </div>
  );
}

function DeleteWorkspaceDialog({
  open,
  workspace,
  summary,
  itemLabel,
  confirmation,
  deleting,
  onOpenChange,
  onConfirmationChange,
  onDelete,
}: {
  open: boolean;
  workspace: Workspace;
  summary: WorkspaceSummary | null;
  itemLabel: string;
  confirmation: string;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmationChange: (value: string) => void;
  onDelete: () => void;
}) {
  const confirmed = confirmation === workspace.title;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 ui-overlay" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-raised p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-danger-glass text-destructive">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[16px] font-bold text-text-primary">
                워크스페이스 삭제
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[12px] leading-5 text-text-secondary">
                이 작업은 취소하거나 복구할 수 없습니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                className="grid size-8 shrink-0 place-items-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text-primary"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 rounded-lg border border-danger-border bg-danger-glass p-3 text-[12px] text-text-secondary">
            <strong className="block text-text-primary">{workspace.title}</strong>
            <span className="mt-1 block">
              1차 주제 {summary?.categoryCount ?? 0}개 · 2차 주제{" "}
              {summary?.sectionCount ?? 0}개 · {itemLabel}{" "}
              {summary?.itemCount ?? 0}개가 함께 삭제됩니다.
            </span>
          </div>

          <label className="mt-4 grid gap-1.5">
            <span className="text-[12px] font-medium text-text-secondary">
              확인하려면 아래에{" "}
              <strong className="text-text-primary">{workspace.title}</strong>
              을(를) 입력하세요.
            </span>
            <Input
              autoFocus
              value={confirmation}
              onChange={(event) =>
                onConfirmationChange(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter" && confirmed && !deleting) {
                  onDelete();
                }
              }}
            />
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">취소</Button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onDelete}
              disabled={!confirmed || deleting}
              className="rounded-md bg-destructive px-4 py-2 text-[13px] font-bold text-destructive-foreground transition-colors hover:brightness-110 disabled:pointer-events-none disabled:opacity-40"
            >
              {deleting ? "삭제 중…" : "영구 삭제"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default WorkspaceManagementSettings;
