import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type TextareaHTMLAttributes,
} from "react";
import {
  FilePlus2,
  ListPlus,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { getToken } from "../../shared/api/client";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/input";
import PageHeader from "../../shared/ui/PageHeader";
import { toast } from "../../shared/ui/Toast";
import {
  createProjectBoard,
  createProjectBoardPost,
  deleteProjectBoard,
  deleteProjectBoardPost,
  getProjectBoardPost,
  listProjectBoardPosts,
  listProjectBoards,
  updateProjectBoard,
  updateProjectBoardPost,
  type ProjectBoard,
  type ProjectBoardPostDetail,
  type ProjectBoardPostSummary,
} from "../../features/project-board/api";

function formatTime(value: string | null) {
  if (!value) return "아직 글 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function ProjectBoardModule() {
  const [boards, setBoards] = useState<ProjectBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [posts, setPosts] = useState<ProjectBoardPostSummary[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<ProjectBoardPostDetail | null>(
    null,
  );
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [addingBoard, setAddingBoard] = useState(false);
  const [postSearch, setPostSearch] = useState("");
  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? null,
    [boards, selectedBoardId],
  );
  const boardDirty =
    !!selectedBoard &&
    (boardName !== selectedBoard.name ||
      boardDescription !== selectedBoard.description);
  const postDirty =
    !!postDetail &&
    (postTitle !== postDetail.title || postContent !== postDetail.content);

  async function loadBoards(preferredId?: string | null) {
    const token = getToken();
    if (!token) {
      setBoardsLoading(false);
      toast.error("로그인이 필요합니다.");
      return;
    }

    try {
      setBoardsLoading(true);
      const next = await listProjectBoards(token);
      setBoards(next);
      const nextSelected =
        preferredId && next.some((board) => board.id === preferredId)
          ? preferredId
          : selectedBoardId && next.some((board) => board.id === selectedBoardId)
            ? selectedBoardId
            : next[0]?.id ?? null;
      setSelectedBoardId(nextSelected);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "프로젝트 게시판을 불러오지 못했습니다.",
      );
    } finally {
      setBoardsLoading(false);
    }
  }

  async function loadPosts(boardId: string | null, preferredId?: string | null) {
    const token = getToken();
    if (!token || !boardId) {
      setPosts([]);
      setSelectedPostId(null);
      setPostDetail(null);
      return;
    }

    try {
      setPostsLoading(true);
      const next = await listProjectBoardPosts(token, boardId, {
        q: postSearch,
      });
      setPosts(next);
      const nextSelected =
        preferredId && next.some((post) => post.id === preferredId)
          ? preferredId
          : selectedPostId && next.some((post) => post.id === selectedPostId)
            ? selectedPostId
            : null;
      setSelectedPostId(nextSelected);
      if (!nextSelected) {
        setPostDetail(null);
        setPostTitle("");
        setPostContent("");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "게시글을 불러오지 못했습니다.",
      );
    } finally {
      setPostsLoading(false);
    }
  }

  async function loadPostDetail(postId: string | null) {
    const token = getToken();
    if (!token || !postId) return;

    try {
      setDetailLoading(true);
      const next = await getProjectBoardPost(token, postId);
      setPostDetail(next);
      setPostTitle(next.title);
      setPostContent(next.content);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "게시글 상세를 불러오지 못했습니다.",
      );
      setPostDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadBoards();
  }, []);

  useEffect(() => {
    setBoardName(selectedBoard?.name ?? "");
    setBoardDescription(selectedBoard?.description ?? "");
  }, [selectedBoard?.id, selectedBoard?.name, selectedBoard?.description]);

  useEffect(() => {
    void loadPosts(selectedBoardId);
  }, [selectedBoardId, postSearch]);

  useEffect(() => {
    void loadPostDetail(selectedPostId);
  }, [selectedPostId]);

  async function handleCreateBoard(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    const name = newBoardName.trim();
    if (!token || !name) return;

    try {
      const created = await createProjectBoard(token, {
        name,
        orderIdx: boards.length * 10,
      });
      setNewBoardName("");
      setAddingBoard(false);
      await loadBoards(created.id);
      toast.success("게시판을 만들었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "생성에 실패했습니다.");
    }
  }

  async function handleSaveBoard(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token || !selectedBoard || !boardName.trim()) return;

    try {
      setSavingBoard(true);
      await updateProjectBoard(token, selectedBoard.id, {
        name: boardName.trim(),
        description: boardDescription.trim(),
      });
      await loadBoards(selectedBoard.id);
      toast.success("게시판을 저장했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSavingBoard(false);
    }
  }

  async function handleDeleteBoard() {
    const token = getToken();
    if (!token || !selectedBoard) return;
    if (!window.confirm("이 게시판과 포함된 게시글을 삭제할까요?")) return;

    try {
      await deleteProjectBoard(token, selectedBoard.id);
      setSelectedBoardId(null);
      setSelectedPostId(null);
      setPostDetail(null);
      await loadBoards(null);
      toast.success("게시판을 삭제했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  }

  function startNewPost() {
    setSelectedPostId(null);
    setPostDetail(null);
    setPostTitle("");
    setPostContent("");
  }

  async function handleSavePost(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token || !selectedBoard || !postTitle.trim()) return;

    try {
      setSavingPost(true);
      const saved = postDetail
        ? await updateProjectBoardPost(token, postDetail.id, {
            title: postTitle.trim(),
            content: postContent,
          })
        : await createProjectBoardPost(token, selectedBoard.id, {
            title: postTitle.trim(),
            content: postContent,
          });
      setPostDetail(saved);
      setSelectedPostId(saved.id);
      await loadPosts(selectedBoard.id, saved.id);
      await loadBoards(selectedBoard.id);
      toast.success(postDetail ? "게시글을 저장했습니다." : "게시글을 만들었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSavingPost(false);
    }
  }

  async function handleDeletePost() {
    const token = getToken();
    if (!token || !selectedBoard || !postDetail) return;
    if (!window.confirm("이 게시글을 삭제할까요?")) return;

    try {
      await deleteProjectBoardPost(token, postDetail.id);
      startNewPost();
      await loadPosts(selectedBoard.id, null);
      await loadBoards(selectedBoard.id);
      toast.success("게시글을 삭제했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface-muted">
      <PageHeader>
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquareText className="size-4 text-brand-primary" />
          <span className="text-[14px] font-bold tracking-tight text-text-primary">
            프로젝트 논의
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm-icon"
          onClick={() => void loadBoards(selectedBoardId)}
          title="새로고침"
          aria-label="새로고침"
        >
          <RefreshCw className="size-4" />
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
        <div className="ui-panel flex min-h-[52px] shrink-0 items-center gap-2 overflow-x-auto px-3 py-2">
          {boardsLoading ? (
            <span className="text-sm text-text-muted">
              게시판을 불러오는 중입니다.
            </span>
          ) : boards.length === 0 ? (
            <span className="text-sm text-text-muted">
              첫 게시판을 만들어 프로젝트 논의를 시작하세요.
            </span>
          ) : (
            boards.map((board) => (
              <BoardTab
                key={board.id}
                board={board}
                active={board.id === selectedBoardId}
                onClick={() => setSelectedBoardId(board.id)}
              />
            ))
          )}

          {addingBoard ? (
            <form
              onSubmit={handleCreateBoard}
              className="flex min-w-[240px] shrink-0 items-center gap-2 rounded-md border border-brand-border bg-surface-raised px-2 py-1"
            >
              <Input
                autoFocus
                value={newBoardName}
                onChange={(event) => setNewBoardName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setAddingBoard(false);
                    setNewBoardName("");
                  }
                }}
                onBlur={() => {
                  if (!newBoardName.trim()) {
                    setAddingBoard(false);
                    setNewBoardName("");
                  }
                }}
                placeholder="게시판 이름"
                className="h-8"
              />
              <Button
                type="submit"
                size="sm-icon"
                tone="brand"
                disabled={!newBoardName.trim()}
                title="게시판 추가"
                aria-label="게시판 추가"
              >
                <Plus className="size-4" />
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-9 shrink-0 border border-dashed border-surface-border-soft px-3 text-text-secondary"
              onClick={() => setAddingBoard(true)}
              title="새 게시판"
            >
              <Plus className="size-4" />
              게시판
            </Button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 gap-1">
        <main className="ui-panel flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {!selectedBoard ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-md border border-surface-border-soft bg-surface-muted text-text-muted">
                  <ListPlus className="size-6" />
                </div>
                <p className="mt-3 text-[15px] font-bold text-text-primary">
                  게시판을 선택하거나 새로 만드세요.
                </p>
                <p className="mt-1 text-[13px] text-text-muted">
                  상단에서 게시판을 추가하거나 선택할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              <section className="flex min-h-0 w-[420px] shrink-0 flex-col border-r border-surface-border-soft bg-surface-raised">
                <form
                  onSubmit={handleSaveBoard}
                  className="border-b border-surface-border-soft p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-black uppercase text-text-muted">
                      게시판
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm-icon"
                        disabled={!selectedBoard.canEdit || !boardDirty || savingBoard}
                        title="게시판 저장"
                        aria-label="게시판 저장"
                      >
                        <Save className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm-icon"
                        tone="danger"
                        disabled={!selectedBoard.canDelete}
                        onClick={() => void handleDeleteBoard()}
                        title="게시판 삭제"
                        aria-label="게시판 삭제"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2">
                    <Input
                      value={boardName}
                      onChange={(event) => setBoardName(event.target.value)}
                      disabled={!selectedBoard.canEdit}
                      className="font-bold"
                    />
                    <Textarea
                      value={boardDescription}
                      onChange={(event) =>
                        setBoardDescription(event.target.value)
                      }
                      disabled={!selectedBoard.canEdit}
                      placeholder="게시판 설명"
                      className="min-h-20 resize-none"
                    />
                  </div>
                </form>

                <div className="border-b border-surface-border-soft p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-text-primary">
                      게시글 {posts.length}
                    </span>
                    <Button
                      size="sm"
                      tone="brand"
                      onClick={startNewPost}
                      title="새 게시글"
                    >
                      <FilePlus2 className="size-4" />
                      새 글
                    </Button>
                  </div>
                  <label className="relative mt-2 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
                    <Input
                      value={postSearch}
                      onChange={(event) => setPostSearch(event.target.value)}
                      placeholder="게시글 검색"
                      className="pl-9"
                    />
                  </label>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  {postsLoading ? (
                    <EmptyBox>게시글을 불러오는 중입니다.</EmptyBox>
                  ) : posts.length === 0 ? (
                    <EmptyBox>등록된 게시글이 없습니다.</EmptyBox>
                  ) : (
                    <div className="space-y-2">
                      {posts.map((post) => (
                        <PostListItem
                          key={post.id}
                          post={post}
                          active={post.id === selectedPostId}
                          onClick={() => setSelectedPostId(post.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                {detailLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-text-muted">
                    게시글 상세를 불러오는 중입니다.
                  </div>
                ) : (
                  <form onSubmit={handleSavePost} className="grid gap-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-black uppercase text-text-muted">
                          {postDetail ? "게시글 편집" : "새 게시글"}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-text-secondary">
                          {selectedBoard.name}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {postDetail ? (
                          <Button
                            type="button"
                            variant="secondary"
                            tone="danger"
                            disabled={!postDetail.canDelete}
                            onClick={() => void handleDeletePost()}
                          >
                            <Trash2 className="size-4" />
                            삭제
                          </Button>
                        ) : null}
                        <Button
                          type="submit"
                          disabled={
                            !postTitle.trim() ||
                            savingPost ||
                            (!!postDetail && (!postDirty || !postDetail.canEdit))
                          }
                        >
                          <Save className="size-4" />
                          {postDetail ? "저장" : "작성"}
                        </Button>
                      </div>
                    </div>

                    <Input
                      value={postTitle}
                      onChange={(event) => setPostTitle(event.target.value)}
                      disabled={!!postDetail && !postDetail.canEdit}
                      placeholder="게시글 제목"
                      className="h-12 text-[16px] font-bold"
                    />
                    <Textarea
                      value={postContent}
                      onChange={(event) => setPostContent(event.target.value)}
                      disabled={!!postDetail && !postDetail.canEdit}
                      placeholder="논의할 내용, 배경, 결정이 필요한 지점을 적으세요."
                      className="min-h-[520px] resize-y leading-6"
                    />
                  </form>
                )}
              </section>
            </>
          )}
        </main>
        </div>
      </div>
    </div>
  );
}

function EmptyBox({ children }: { children: string }) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3 text-sm text-text-muted">
      {children}
    </div>
  );
}

function BoardTab({
  board,
  active,
  onClick,
}: {
  board: ProjectBoard;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group flex h-9 max-w-[240px] shrink-0 items-center gap-2 rounded-md border px-3 text-left text-sm font-bold transition-colors " +
        (active
          ? "border-brand-border bg-brand-glass"
          : "border-surface-border-soft bg-surface-muted hover:bg-surface-raised")
      }
    >
      <MessageSquareText
        className={
          "size-4 shrink-0 " +
          (active ? "text-brand-primary" : "text-text-muted")
        }
      />
      <span className="min-w-0 truncate text-text-primary">{board.name}</span>
      <span className="shrink-0 rounded-md border border-surface-border-soft bg-surface-raised px-1.5 py-0.5 text-[11px] font-bold text-text-secondary">
        {board.postCount}
      </span>
    </button>
  );
}

function PostListItem({
  post,
  active,
  onClick,
}: {
  post: ProjectBoardPostSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-md border p-3 text-left transition-colors " +
        (active
          ? "border-brand-border bg-brand-glass"
          : "border-surface-border-soft bg-background hover:bg-surface-muted")
      }
    >
      <div className="flex items-start gap-2">
        {active ? (
          <Pencil className="mt-0.5 size-4 shrink-0 text-brand-primary" />
        ) : (
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-text-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-primary">
            {post.title}
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-text-muted">
            {post.content || "본문 없음"}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-text-muted">
            {post.createdByName} · {formatTime(post.updatedAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

export default ProjectBoardModule;
