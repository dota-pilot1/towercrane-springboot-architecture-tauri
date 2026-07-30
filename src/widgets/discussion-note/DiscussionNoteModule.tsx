import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type TextareaHTMLAttributes,
} from "react";
import {
  CheckCircle2,
  Clock3,
  MessageSquareText,
  NotebookPen,
  PauseCircle,
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

function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={
        "w-full rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted shadow-sm outline-none transition-colors focus:border-brand-border focus:bg-surface-raised focus:ring-2 focus:ring-brand-border/40 disabled:cursor-not-allowed disabled:opacity-50 " +
        className
      }
      {...props}
    />
  );
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const listWidth = useAppSettingsStore((state) => state.discussionNoteListWidth);
  const setListWidth = useAppSettingsStore(
    (state) => state.setDiscussionNoteListWidth,
  );
  const commentWidth = useAppSettingsStore(
    (state) => state.discussionNoteCommentWidth,
  );
  const setCommentWidth = useAppSettingsStore(
    (state) => state.setDiscussionNoteCommentWidth,
  );
  const startListResize = useColumnResize(listWidth, setListWidth, {
    min: 320,
    max: 640,
  });
  const startCommentResize = useColumnResize(commentWidth, setCommentWidth, {
    min: 340,
    max: 720,
    direction: "reverse",
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
      await loadNotes(updated.id);
      toast.success("의사결정 노트를 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote() {
    const token = getToken();
    if (!token || !detail) return;
    if (!window.confirm("이 의사결정 노트를 삭제할까요?")) return;

    try {
      await deleteDiscussionNote(token, detail.id);
      setDetail(null);
      setSelectedId(null);
      await loadNotes(null);
      toast.success("의사결정 노트를 삭제했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  }

  async function handleCreateComment(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    const content = newComment.trim();
    if (!token || !detail || !content) return;

    try {
      await createDiscussionNoteComment(token, detail.id, content);
      setNewComment("");
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
    const content = editingCommentContent.trim();
    if (!token || !detail || !content) return;

    try {
      await updateDiscussionNoteComment(token, commentId, content);
      setEditingCommentId(null);
      setEditingCommentContent("");
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
                    onClick={() => setSelectedId(note.id)}
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
                  상세와 댓글이 오른쪽에 표시됩니다.
                </p>
              </div>
            </div>
          ) : detailLoading || !detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
              상세를 불러오는 중입니다.
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSave}
                className="border-b border-surface-border-soft bg-surface-muted p-3"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_130px_108px_auto_auto] gap-2">
                  <Input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    disabled={!detail.canEdit}
                    className="font-bold"
                  />
                  <Select
                    block
                    value={draftStatus}
                    onChange={(event) =>
                      setDraftStatus(event.target.value as DiscussionNoteStatus)
                    }
                    disabled={!detail.canEdit}
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
                      setDraftPriority(
                        event.target.value as DiscussionNotePriority,
                      )
                    }
                    disabled={!detail.canEdit}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" disabled={!dirty || saving}>
                    <Save className="size-4" />
                    저장
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    tone="danger"
                    disabled={!detail.canDelete}
                    onClick={() => void handleDeleteNote()}
                  >
                    <Trash2 className="size-4" />
                    삭제
                  </Button>
                </div>
              </form>

              <div className="flex min-h-0 flex-1">
                <section className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-text-muted">
                      논의 내용
                    </span>
                    <Textarea
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      disabled={!detail.canEdit}
                      placeholder="논의 배경, 선택지, 쟁점을 정리하세요."
                      className="min-h-[260px] resize-y leading-6"
                    />
                  </label>
                  <label className="mt-3 grid gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-text-muted">
                      결정 요약
                    </span>
                    <Textarea
                      value={draftDecisionSummary}
                      onChange={(event) =>
                        setDraftDecisionSummary(event.target.value)
                      }
                      disabled={!detail.canEdit}
                      placeholder="합의된 결론과 후속 액션을 남기세요."
                      className="min-h-[340px] resize-y leading-6"
                    />
                  </label>
                </section>

                <ColumnResizeHandle onMouseDown={startCommentResize} />

                <aside
                  style={{ width: commentWidth }}
                  className="flex min-h-0 shrink-0 flex-col border-l border-surface-border-soft bg-surface-raised"
                >
                  <div className="border-b border-surface-border-soft px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-text-primary">
                        댓글 {detail.comments.length}
                      </span>
                      <span className="text-[11px] font-semibold text-text-muted">
                        {formatTime(detail.lastCommentAt)}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                    {detail.comments.length === 0 ? (
                      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3 text-sm text-text-muted">
                        아직 댓글이 없습니다.
                      </div>
                    ) : null}
                    {detail.comments.map((item) => {
                      const editing = item.id === editingCommentId;
                      return (
                        <article
                          key={item.id}
                          className="rounded-md border border-surface-border-soft bg-background p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-text-primary">
                                {item.createdByName}
                              </p>
                              <p className="text-[11px] text-text-muted">
                                {formatTime(item.createdAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {item.canEdit ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingCommentId(item.id);
                                    setEditingCommentContent(item.content);
                                  }}
                                >
                                  수정
                                </Button>
                              ) : null}
                              {item.canDelete ? (
                                <Button
                                  size="sm-icon"
                                  tone="danger"
                                  title="댓글 삭제"
                                  aria-label="댓글 삭제"
                                  onClick={() => void handleDeleteComment(item.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          {editing ? (
                            <div className="mt-2 grid gap-2">
                              <Textarea
                                value={editingCommentContent}
                                onChange={(event) =>
                                  setEditingCommentContent(event.target.value)
                                }
                                className="min-h-20 resize-y"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentContent("");
                                  }}
                                >
                                  취소
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => void handleUpdateComment(item.id)}
                                >
                                  저장
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                              {item.content}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={handleCreateComment}
                    className="border-t border-surface-border-soft p-3"
                  >
                    <Textarea
                      value={newComment}
                      onChange={(event) => setNewComment(event.target.value)}
                      placeholder="댓글을 입력하세요."
                      className="min-h-20 resize-none"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button type="submit" disabled={!newComment.trim()}>
                        <Send className="size-4" />
                        댓글
                      </Button>
                    </div>
                  </form>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function NoteListItem({
  note,
  active,
  onClick,
}: {
  note: DiscussionNoteSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full flex-col gap-2 rounded-md border p-3 text-left transition " +
        (active
          ? "border-brand-border bg-brand-glass"
          : "border-transparent hover:border-surface-border-soft hover:bg-surface-muted")
      }
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 text-sm font-black text-text-primary">
          {note.title}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">
          <StatusIcon status={note.status} />
          {statusLabels[note.status]}
        </span>
      </span>
      <span className="line-clamp-2 text-xs leading-5 text-text-secondary">
        {note.decisionSummary.trim() || "결정 요약이 비어 있습니다."}
      </span>
      <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-text-muted">
        <span>{priorityLabels[note.priority]}</span>
        <span>{note.commentCount}댓글</span>
        <span>{formatTime(note.lastCommentAt ?? note.updatedAt)}</span>
      </span>
    </button>
  );
}

export default DiscussionNoteModule;
