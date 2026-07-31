import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  Clock3,
  MessageSquareText,
  NotebookPen,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { getToken } from "../../shared/api/client";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { useColumnResize } from "../../shared/lib/useColumnResize";
import { Button } from "../../shared/ui/button";
import { ColumnResizeHandle } from "../../shared/ui/ColumnResizeHandle";
import { Input } from "../../shared/ui/input";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import PageHeader from "../../shared/ui/PageHeader";
import Select from "../../shared/ui/Select";
import { toast } from "../../shared/ui/Toast";
import {
  createDiscussionNote,
  createDiscussionNoteComment,
  deleteDiscussionNote,
  deleteDiscussionNoteComment,
  getDiscussionNote,
  listDiscussionNotes,
  updateDiscussionNote,
  updateDiscussionNoteComment,
  type DiscussionNoteComment,
  type DiscussionNoteCommentKind,
  type DiscussionNoteDetail,
  type DiscussionNotePriority,
  type DiscussionNoteStatus,
  type DiscussionNoteSummary,
} from "../../features/discussion-note/api";

const STATUS_OPTIONS: Array<{
  value: DiscussionNoteStatus;
  label: string;
  icon: typeof Clock3;
}> = [
  { value: "OPEN", label: "열림", icon: Clock3 },
  { value: "DISCUSSING", label: "논의중", icon: MessageSquareText },
  { value: "DECIDED", label: "결정됨", icon: CheckCircle2 },
  { value: "ON_HOLD", label: "보류", icon: PauseCircle },
  { value: "CLOSED", label: "닫힘", icon: XCircle },
];

const PRIORITY_OPTIONS: Array<{ value: DiscussionNotePriority; label: string }> =
  [
    { value: "LOW", label: "낮음" },
    { value: "MEDIUM", label: "보통" },
    { value: "HIGH", label: "높음" },
  ];

const statusLabels = Object.fromEntries(
  STATUS_OPTIONS.map((item) => [item.value, item.label]),
) as Record<DiscussionNoteStatus, string>;

const priorityLabels = Object.fromEntries(
  PRIORITY_OPTIONS.map((item) => [item.value, item.label]),
) as Record<DiscussionNotePriority, string>;

const COMMENT_KIND_OPTIONS: Array<{
  value: DiscussionNoteCommentKind;
  label: string;
  helper: string;
}> = [
  {
    value: "OPINION",
    label: "의견 제시",
    helper: "주장, 제안, 근거",
  },
  {
    value: "COUNTER",
    label: "반론",
    helper: "위험, 반대 근거, 대안",
  },
];

const commentKindLabels = Object.fromEntries(
  COMMENT_KIND_OPTIONS.map((item) => [item.value, item.label]),
) as Record<DiscussionNoteCommentKind, string>;

const discussionKindTones: Record<
  DiscussionNoteCommentKind,
  {
    card: CSSProperties;
    label: CSSProperties;
    soft: CSSProperties;
  }
> = {
  OPINION: {
    card: {
      background: "color-mix(in srgb, oklch(0.78 0.08 235) 18%, var(--card))",
      borderColor:
        "color-mix(in srgb, oklch(0.58 0.13 235) 42%, var(--border))",
    },
    label: {
      background:
        "color-mix(in srgb, oklch(0.78 0.08 235) 28%, var(--card))",
      borderColor:
        "color-mix(in srgb, oklch(0.58 0.13 235) 50%, var(--border))",
      color: "var(--foreground)",
    },
    soft: {
      background:
        "color-mix(in srgb, oklch(0.78 0.08 235) 12%, var(--card))",
      borderColor:
        "color-mix(in srgb, oklch(0.58 0.13 235) 34%, var(--border))",
    },
  },
  COUNTER: {
    card: {
      background: "color-mix(in srgb, oklch(0.86 0.12 75) 18%, var(--card))",
      borderColor:
        "color-mix(in srgb, oklch(0.72 0.16 55) 52%, var(--border))",
    },
    label: {
      background:
        "color-mix(in srgb, oklch(0.86 0.12 75) 32%, var(--card))",
      borderColor:
        "color-mix(in srgb, oklch(0.72 0.16 55) 58%, var(--border))",
      color: "var(--foreground)",
    },
    soft: {
      background:
        "color-mix(in srgb, oklch(0.86 0.12 75) 13%, var(--card))",
      borderColor:
        "color-mix(in srgb, oklch(0.72 0.16 55) 38%, var(--border))",
    },
  },
};

function formatTime(value: string | null) {
  if (!value) return "댓글 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusIcon({ status }: { status: DiscussionNoteStatus }) {
  const option = STATUS_OPTIONS.find((item) => item.value === status);
  const Icon = option?.icon ?? Clock3;
  return <Icon className="size-3.5" />;
}

function authorInitial(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
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

function textFromLexicalNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: unknown; children?: unknown };
  if (typeof record.text === "string") return record.text;
  if (!Array.isArray(record.children)) return "";
  return record.children
    .map((child) => textFromLexicalNode(child))
    .filter(Boolean)
    .join(" ");
}

function textFromLexicalJson(value: string) {
  try {
    const parsed = JSON.parse(value) as { root?: unknown };
    return textFromLexicalNode(parsed.root).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function richTextSummary(value: string) {
  return isLexicalJson(value) ? textFromLexicalJson(value) : value.trim();
}

function hasRichTextContent(value: string) {
  return richTextSummary(value).length > 0;
}

function DiscussionNoteModule() {
  const [notes, setNotes] = useState<DiscussionNoteSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DiscussionNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DiscussionNoteStatus | "">(
    "",
  );
  const [newTitle, setNewTitle] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStatus, setDraftStatus] = useState<DiscussionNoteStatus>("OPEN");
  const [draftPriority, setDraftPriority] =
    useState<DiscussionNotePriority>("MEDIUM");
  const [draftContent, setDraftContent] = useState("");
  const [draftDecisionSummary, setDraftDecisionSummary] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newCommentEditorKey, setNewCommentEditorKey] = useState(0);
  const [newCommentKind, setNewCommentKind] =
    useState<DiscussionNoteCommentKind>("OPINION");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [editingCommentKind, setEditingCommentKind] =
    useState<DiscussionNoteCommentKind>("OPINION");
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const listWidth = useAppSettingsStore((state) => state.discussionNoteListWidth);
  const setListWidth = useAppSettingsStore(
    (state) => state.setDiscussionNoteListWidth,
  );
  const startListResize = useColumnResize(listWidth, setListWidth, {
    min: 320,
    max: 640,
  });

  const params = useMemo(
    () => ({ q: search.trim(), status: statusFilter }),
    [search, statusFilter],
  );

  async function loadNotes(preferredId?: string | null) {
    const token = getToken();
    if (!token) {
      setLoading(false);
      toast.error("로그인이 필요합니다.");
      return;
    }
    try {
      setLoading(true);
      const next = await listDiscussionNotes(token, params);
      setNotes(next);
      const nextSelected =
        preferredId && next.some((item) => item.id === preferredId)
          ? preferredId
          : selectedId && next.some((item) => item.id === selectedId)
            ? selectedId
            : next[0]?.id ?? null;
      setSelectedId(nextSelected);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "의사결정 노트를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(noteId: string | null) {
    const token = getToken();
    if (!token || !noteId) {
      setDetail(null);
      return;
    }
    try {
      setDetailLoading(true);
      const next = await getDiscussionNote(token, noteId);
      setDetail(next);
      setDraftTitle(next.title);
      setDraftStatus(next.status);
      setDraftPriority(next.priority);
      setDraftContent(next.content);
      setDraftDecisionSummary(next.decisionSummary);
      setEditingCommentId(null);
      setEditingCommentContent("");
      setEditingCommentKind("OPINION");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "상세를 불러오지 못했습니다.",
      );
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, [params.q, params.status]);

  useEffect(() => {
    void loadDetail(selectedId);
  }, [selectedId]);

  const dirty =
    !!detail &&
    (draftTitle !== detail.title ||
      draftStatus !== detail.status ||
      draftPriority !== detail.priority ||
      draftContent !== detail.content ||
      draftDecisionSummary !== detail.decisionSummary);
  const opinionItems =
    detail?.comments.filter((item) => (item.kind ?? "OPINION") === "OPINION") ??
    [];
  const counterItems =
    detail?.comments.filter((item) => item.kind === "COUNTER") ?? [];

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    const title = newTitle.trim();
    if (!token || !title) return;

    try {
      const created = await createDiscussionNote(token, { title });
      setNewTitle("");
      await loadNotes(created.id);
      toast.success("의사결정 노트를 만들었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "생성에 실패했습니다.");
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token || !detail || !draftTitle.trim()) return;

    try {
      setSaving(true);
      const updated = await updateDiscussionNote(token, detail.id, {
        title: draftTitle.trim(),
        status: draftStatus,
        priority: draftPriority,
        content: draftContent,
        decisionSummary: draftDecisionSummary,
      });
      setDetail(updated);
      setEditingTopicId(null);
      await loadNotes(updated.id);
      toast.success("의사결정 노트를 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId = detail?.id ?? null) {
    const token = getToken();
    if (!token || !noteId) return;
    if (!window.confirm("이 의사결정 노트를 삭제할까요?")) return;

    try {
      await deleteDiscussionNote(token, noteId);
      if (selectedId === noteId) {
        setDetail(null);
        setSelectedId(null);
        setEditingTopicId(null);
      }
      await loadNotes(null);
      toast.success("의사결정 노트를 삭제했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  }

  async function handleCreateComment(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    const content = newComment;
    if (!token || !detail || !hasRichTextContent(content)) return;

    try {
      await createDiscussionNoteComment(token, detail.id, {
        content,
        kind: newCommentKind,
      });
      setNewComment("");
      setNewCommentEditorKey((value) => value + 1);
      await loadDetail(detail.id);
      await loadNotes(detail.id);
      toast.success("댓글을 추가했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "댓글 추가에 실패했습니다.",
      );
    }
  }

  async function handleUpdateComment(commentId: string) {
    const token = getToken();
    const content = editingCommentContent;
    if (!token || !detail || !hasRichTextContent(content)) return;

    try {
      await updateDiscussionNoteComment(token, commentId, {
        content,
        kind: editingCommentKind,
      });
      setEditingCommentId(null);
      setEditingCommentContent("");
      setEditingCommentKind("OPINION");
      await loadDetail(detail.id);
      await loadNotes(detail.id);
      toast.success("댓글을 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "댓글 저장에 실패했습니다.",
      );
    }
  }

  async function handleDeleteComment(commentId: string) {
    const token = getToken();
    if (!token || !detail) return;
    if (!window.confirm("이 댓글을 삭제할까요?")) return;

    try {
      await deleteDiscussionNoteComment(token, commentId);
      await loadDetail(detail.id);
      await loadNotes(detail.id);
      toast.success("댓글을 삭제했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "댓글 삭제에 실패했습니다.",
      );
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface-muted">
      <PageHeader>
        <div className="flex min-w-0 items-center gap-2">
          <NotebookPen className="size-4 text-brand-primary" />
          <span className="text-[14px] font-bold tracking-tight text-text-primary">
            의사결정 노트
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm-icon"
          onClick={() => void loadNotes(selectedId)}
          title="새로고침"
          aria-label="새로고침"
        >
          <RefreshCw className="size-4" />
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 gap-1 p-3">
        <aside
          style={{ width: listWidth }}
          className="ui-panel flex min-h-0 shrink-0 flex-col overflow-hidden"
        >
          <div className="border-b border-surface-border-soft bg-surface-muted p-3">
            <form onSubmit={handleCreate} className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="새 논의 제목"
              />
              <Button
                type="submit"
                size="icon"
                tone="brand"
                disabled={!newTitle.trim()}
                title="노트 추가"
                aria-label="노트 추가"
              >
                <Plus className="size-4" />
              </Button>
            </form>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_112px] gap-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="검색"
                  className="pl-9"
                />
              </label>
              <Select
                block
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as DiscussionNoteStatus | "")
                }
              >
                <option value="">전체</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3 text-sm text-text-muted">
                불러오는 중입니다.
              </div>
            ) : notes.length === 0 ? (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3 text-sm text-text-muted">
                등록된 논의가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    active={note.id === selectedId}
                    editing={note.id === editingTopicId}
                    draftTitle={draftTitle}
                    draftContent={draftContent}
                    draftStatus={draftStatus}
                    draftPriority={draftPriority}
                    saveDisabled={detail?.id !== note.id || !dirty || saving}
                    onClick={() => {
                      setSelectedId(note.id);
                      setEditingTopicId(null);
                    }}
                    onEdit={() => {
                      setSelectedId(note.id);
                      setDraftTitle(note.title);
                      setDraftContent(note.content);
                      setDraftDecisionSummary(note.decisionSummary);
                      setDraftStatus(note.status);
                      setDraftPriority(note.priority);
                      setEditingTopicId(note.id);
                    }}
                    onCancelEdit={() => setEditingTopicId(null)}
                    onSave={(event) => void handleSave(event)}
                    onDraftTitleChange={setDraftTitle}
                    onDraftContentChange={setDraftContent}
                    onDraftStatusChange={setDraftStatus}
                    onDraftPriorityChange={setDraftPriority}
                    onDelete={() => void handleDeleteNote(note.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <ColumnResizeHandle onMouseDown={startListResize} />

        <main className="ui-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-md border border-surface-border-soft bg-surface-muted text-text-muted">
                  <MessageSquareText className="size-6" />
                </div>
                <p className="mt-3 text-[15px] font-bold text-text-primary">
                  논의를 선택하거나 새로 만드세요.
                </p>
                <p className="mt-1 text-[13px] text-text-muted">
                  주제 카드를 고르면 오른쪽에서 의견과 반론을 이어갑니다.
                </p>
              </div>
            </div>
          ) : detailLoading || !detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
              상세를 불러오는 중입니다.
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-surface-border-soft bg-surface-muted px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black text-text-primary">
                      {detail.title}
                    </p>
                    <p className="mt-1 text-[12px] text-text-muted">
                      의견과 반론을 시간순으로 배치해 작성자와 흐름을 바로 봅니다.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-text-muted">
                    <span>{opinionItems.length} 의견</span>
                    <span>{counterItems.length} 반론</span>
                    <span>{formatTime(detail.lastCommentAt)}</span>
                  </div>
                </div>
              </div>

              <DebateTimeline
                items={detail.comments}
                opinionCount={opinionItems.length}
                counterCount={counterItems.length}
                editingCommentId={editingCommentId}
                editingCommentContent={editingCommentContent}
                editingCommentKind={editingCommentKind}
                onEdit={(item) => {
                  setEditingCommentId(item.id);
                  setEditingCommentContent(item.content);
                  setEditingCommentKind(item.kind ?? "OPINION");
                }}
                onDelete={(commentId) => void handleDeleteComment(commentId)}
                onEditingContentChange={setEditingCommentContent}
                onEditingKindChange={setEditingCommentKind}
                onCancelEdit={() => {
                  setEditingCommentId(null);
                  setEditingCommentContent("");
                  setEditingCommentKind("OPINION");
                }}
                onSaveEdit={(commentId) => void handleUpdateComment(commentId)}
              />

              <form
                onSubmit={handleCreateComment}
                className="border-t border-surface-border-soft bg-surface-raised p-3"
              >
                <div className="grid grid-cols-[320px_minmax(0,1fr)_auto] gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {COMMENT_KIND_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewCommentKind(option.value)}
                        style={
                          newCommentKind === option.value
                            ? discussionKindTones[option.value].label
                            : undefined
                        }
                        className={
                          "rounded-md border px-3 py-2 text-left transition-colors " +
                          (newCommentKind === option.value
                            ? "text-text-primary"
                            : "border-surface-border-soft bg-surface-muted hover:bg-surface-strong")
                        }
                      >
                        <span className="block text-[12px] font-black text-text-primary">
                          {option.label}
                        </span>
                        <span className="block truncate text-[10px] text-text-muted">
                          {option.helper}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="overflow-visible rounded-md border border-surface-border-soft bg-surface-raised">
                    <LexicalEditor
                      key={`new-comment:${newCommentEditorKey}`}
                      initialState={toLexicalInitialState(newComment)}
                      onChange={setNewComment}
                      placeholder={
                        newCommentKind === "COUNTER"
                          ? "반론이나 우려, 다른 대안을 적으세요."
                          : "의견, 제안, 근거를 적으세요."
                      }
                      minHeight="140px"
                      toolbarVariant="simple"
                    />
                  </div>
                  <Button type="submit" disabled={!hasRichTextContent(newComment)}>
                    <Send className="size-4" />
                    추가
                  </Button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function DebateTimeline({
  items,
  opinionCount,
  counterCount,
  editingCommentId,
  editingCommentContent,
  editingCommentKind,
  onEdit,
  onDelete,
  onEditingContentChange,
  onEditingKindChange,
  onCancelEdit,
  onSaveEdit,
}: {
  items: DiscussionNoteComment[];
  opinionCount: number;
  counterCount: number;
  editingCommentId: string | null;
  editingCommentContent: string;
  editingCommentKind: DiscussionNoteCommentKind;
  onEdit: (item: DiscussionNoteComment) => void;
  onDelete: (commentId: string) => void;
  onEditingContentChange: (content: string) => void;
  onEditingKindChange: (kind: DiscussionNoteCommentKind) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-2 border-b border-surface-border-soft bg-surface-raised">
        <div
          className="flex items-center justify-between gap-2 px-4 py-3"
          style={discussionKindTones.OPINION.soft}
        >
          <div>
            <h3 className="text-sm font-black text-text-primary">의견 제시</h3>
            <p className="mt-0.5 text-[11px] text-text-muted">
              주장, 제안, 근거
            </p>
          </div>
          <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-black text-text-secondary">
            {opinionCount}
          </span>
        </div>
        <div
          className="flex items-center justify-between gap-2 border-l border-surface-border-soft px-4 py-3"
          style={discussionKindTones.COUNTER.soft}
        >
          <div>
            <h3 className="text-sm font-black text-text-primary">반론</h3>
            <p className="mt-0.5 text-[11px] text-text-muted">
              위험, 반대 근거, 대안
            </p>
          </div>
          <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-black text-text-secondary">
            {counterCount}
          </span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto p-4 before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-surface-border-soft">
        {items.length === 0 ? (
          <div className="relative rounded-md border border-surface-border-soft bg-surface-muted p-4 text-sm text-text-muted">
            아직 등록된 토론 항목이 없습니다.
          </div>
        ) : null}
        <div className="relative space-y-4">
          {items.map((item, itemIndex) => {
            const counter = item.kind === "COUNTER";
            return (
              <div key={item.id} className="grid grid-cols-2 gap-8">
                <div>
                  {!counter ? (
                    <DebateCard
                      item={item}
                      index={itemIndex + 1}
                      editing={item.id === editingCommentId}
                      editingCommentContent={editingCommentContent}
                      editingCommentKind={editingCommentKind}
                      onEdit={() => onEdit(item)}
                      onDelete={() => onDelete(item.id)}
                      onEditingContentChange={onEditingContentChange}
                      onEditingKindChange={onEditingKindChange}
                      onCancelEdit={onCancelEdit}
                      onSaveEdit={() => onSaveEdit(item.id)}
                    />
                  ) : null}
                </div>
                <div>
                  {counter ? (
                    <DebateCard
                      item={item}
                      index={itemIndex + 1}
                      editing={item.id === editingCommentId}
                      editingCommentContent={editingCommentContent}
                      editingCommentKind={editingCommentKind}
                      onEdit={() => onEdit(item)}
                      onDelete={() => onDelete(item.id)}
                      onEditingContentChange={onEditingContentChange}
                      onEditingKindChange={onEditingKindChange}
                      onCancelEdit={onCancelEdit}
                      onSaveEdit={() => onSaveEdit(item.id)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DebateCard({
  item,
  index,
  editing,
  editingCommentContent,
  editingCommentKind,
  onEdit,
  onDelete,
  onEditingContentChange,
  onEditingKindChange,
  onCancelEdit,
  onSaveEdit,
}: {
  item: DiscussionNoteComment;
  index: number;
  editing: boolean;
  editingCommentContent: string;
  editingCommentKind: DiscussionNoteCommentKind;
  onEdit: () => void;
  onDelete: () => void;
  onEditingContentChange: (content: string) => void;
  onEditingKindChange: (kind: DiscussionNoteCommentKind) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  const kind = item.kind ?? "OPINION";
  const tone = discussionKindTones[kind];
  return (
    <article
      className="rounded-md border border-l-4 p-3 shadow-sm"
      style={tone.card}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full border text-[13px] font-black text-text-primary"
            style={tone.soft}
          >
            {authorInitial(item.createdByName)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex rounded-sm border px-2 py-0.5 text-[11px] font-black"
                style={tone.label}
              >
                {commentKindLabels[kind]}
              </span>
              <span className="text-[11px] font-black text-text-muted">
                #{index}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-black text-text-primary">
              {item.createdByName}
            </p>
            <p className="text-[11px] text-text-muted">
              {formatTime(item.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.canEdit ? (
            <Button
              variant="ghost"
              size="sm-icon"
              onClick={onEdit}
              title="수정"
              aria-label="수정"
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
          {item.canDelete ? (
            <Button
              size="sm-icon"
              tone="danger"
              title="토론 항목 삭제"
              aria-label="토론 항목 삭제"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-2 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            {COMMENT_KIND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onEditingKindChange(option.value)}
                style={
                  editingCommentKind === option.value
                    ? discussionKindTones[option.value].label
                    : undefined
                }
                className={
                  "rounded-md border px-3 py-2 text-left text-[12px] font-bold transition-colors " +
                  (editingCommentKind === option.value
                    ? "text-text-primary"
                    : "border-surface-border-soft bg-surface-muted text-text-secondary hover:bg-surface-strong")
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="overflow-visible rounded-md border border-surface-border-soft bg-surface-raised">
            <LexicalEditor
              key={`${item.id}:edit`}
              initialState={toLexicalInitialState(editingCommentContent)}
              onChange={onEditingContentChange}
              placeholder="의견, 제안, 근거를 적으세요."
              minHeight="160px"
              toolbarVariant="simple"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={onSaveEdit}
              disabled={!hasRichTextContent(editingCommentContent)}
            >
              저장
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 overflow-visible rounded-md border border-surface-border-soft bg-surface-raised">
          <LexicalEditor
            key={`${item.id}:read`}
            initialState={toLexicalInitialState(item.content)}
            onChange={() => {}}
            readOnly
            minHeight="80px"
          />
        </div>
      )}
    </article>
  );
}

function NoteListItem({
  note,
  active,
  editing,
  draftTitle,
  draftContent,
  draftStatus,
  draftPriority,
  saveDisabled,
  onClick,
  onEdit,
  onCancelEdit,
  onSave,
  onDraftTitleChange,
  onDraftContentChange,
  onDraftStatusChange,
  onDraftPriorityChange,
  onDelete,
}: {
  note: DiscussionNoteSummary;
  active: boolean;
  editing: boolean;
  draftTitle: string;
  draftContent: string;
  draftStatus: DiscussionNoteStatus;
  draftPriority: DiscussionNotePriority;
  saveDisabled: boolean;
  onClick: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onDraftTitleChange: (value: string) => void;
  onDraftContentChange: (value: string) => void;
  onDraftStatusChange: (value: DiscussionNoteStatus) => void;
  onDraftPriorityChange: (value: DiscussionNotePriority) => void;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <form
        onSubmit={onSave}
        className="grid gap-2 rounded-md border border-brand-border bg-brand-glass p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase text-text-muted">
            주제 수정
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm-icon"
              onClick={onCancelEdit}
              title="취소"
              aria-label="취소"
            >
              <XCircle className="size-4" />
            </Button>
            <Button
              type="submit"
              size="sm-icon"
              tone="brand"
              disabled={saveDisabled}
              title="저장"
              aria-label="저장"
            >
              <Save className="size-4" />
            </Button>
            {note.canDelete ? (
              <Button
                type="button"
                size="sm-icon"
                tone="danger"
                onClick={onDelete}
                title="삭제"
                aria-label="삭제"
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </span>
        </div>
        <Input
          value={draftTitle}
          onChange={(event) => onDraftTitleChange(event.target.value)}
          className="font-bold"
          placeholder="타이틀"
        />
        <div className="overflow-visible rounded-md border border-surface-border-soft bg-surface-raised">
          <LexicalEditor
            key={`${note.id}:topic-content`}
            initialState={toLexicalInitialState(draftContent)}
            onChange={onDraftContentChange}
            placeholder="논의 설명"
            minHeight="120px"
            toolbarVariant="simple"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            block
            value={draftStatus}
            onChange={(event) =>
              onDraftStatusChange(event.target.value as DiscussionNoteStatus)
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            block
            value={draftPriority}
            onChange={(event) =>
              onDraftPriorityChange(event.target.value as DiscussionNotePriority)
            }
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </form>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={
        "group flex w-full cursor-pointer flex-col overflow-hidden rounded-md border text-left transition " +
        (active
          ? "border-brand-border bg-brand-glass"
          : "border-transparent hover:border-surface-border-soft hover:bg-surface-muted")
      }
    >
      <span className="flex items-start justify-between gap-3 px-3 pb-2 pt-3">
        <span className="min-w-0 flex-1 text-sm font-black text-text-primary">
          {note.title}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {note.canEdit ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-surface-raised hover:text-brand-primary"
              title="수정"
              aria-label="수정"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
          {note.canDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="grid size-7 place-items-center rounded-md text-text-muted hover:bg-danger-glass hover:text-[var(--destructive)]"
              title="삭제"
              aria-label="삭제"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </span>
      </span>
      <span className="whitespace-pre-wrap break-words px-3 pb-3 text-xs leading-5 text-text-secondary">
        {richTextSummary(note.content) || "논의 설명이 비어 있습니다."}
      </span>
      <span className="flex items-center justify-between gap-2 border-t border-surface-border-soft px-3 py-2 text-[11px] font-semibold text-text-muted">
        <span className="inline-flex items-center gap-1">
          <StatusIcon status={note.status} />
          {statusLabels[note.status]}
        </span>
        <span>{note.commentCount}토론</span>
        <span>{priorityLabels[note.priority]}</span>
      </span>
    </div>
  );
}

export default DiscussionNoteModule;
