import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RefreshCw } from "lucide-react";
import { getToken } from "../../shared/api/client";
import {
  createDocDocument,
  createDocFolder,
  deleteDocNode,
  getDocNode,
  getDocTree,
  reorderDocNodes,
  updateDocNode,
  uploadDocFile,
  type TeamDocNode,
} from "../../features/docs/api";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { toast } from "../../shared/ui/Toast";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function nodeIcon(node: TeamDocNode, open: boolean) {
  if (node.type === "FOLDER") return open ? "📂" : "📁";
  if (node.type === "DOC") return "📝";
  return "📎";
}

function nodeKindLabel(node: TeamDocNode) {
  if (node.type === "FOLDER") return "폴더";
  if (node.type === "DOC") return "문서";
  const name = node.fileName ?? node.title;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toUpperCase() : "";
  return ext && ext.length <= 5 ? ext : "파일";
}

function DocsModule() {
  const [nodes, setNodes] = useState<TeamDocNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<TeamDocNode | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<null | "FOLDER" | "DOC">(null);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewMode, setPreviewMode] = useState<"fit" | "full">("fit");
  const [folderView, setFolderView] = useState<"card" | "list">(() =>
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("docs.folderView")) === "list"
      ? "list"
      : "card",
  );
  const [dragOver, setDragOver] = useState(false);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    node: TeamDocNode;
    confirmDelete?: boolean;
  } | null>(null);
  const [dropHint, setDropHint] = useState<{
    id: string;
    kind: "into" | "before" | "after";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadParentRef = useRef<string | null>(null);
  const didInitExpand = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function loadTree() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    try {
      setNodes(await getDocTree(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문서를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTree();
  }, []);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  // 새 항목을 만들 위치: 폴더 선택 시 그 안, 문서/파일 선택 시 같은 폴더, 없으면 루트
  const targetParentId = selected
    ? selected.type === "FOLDER"
      ? selected.id
      : selected.parentId
    : null;

  // 선택 변경 시 삭제 확인 초기화
  useEffect(() => {
    setConfirmDelete(false);
  }, [selectedId]);

  // 생성 시작 시 대상 폴더를 펼쳐 인라인 입력이 보이게
  useEffect(() => {
    if (creating && targetParentId) {
      setExpanded((prev) =>
        prev.has(targetParentId) ? prev : new Set(prev).add(targetParentId),
      );
    }
  }, [creating, targetParentId]);

  // 최초 로드 시 최상위(1차) 폴더는 펼쳐둔다
  useEffect(() => {
    if (didInitExpand.current || nodes.length === 0) return;
    didInitExpand.current = true;
    setExpanded(
      new Set(
        nodes
          .filter((n) => n.parentId === null && n.type === "FOLDER")
          .map((n) => n.id),
      ),
    );
  }, [nodes]);

  // DOC 선택 시 본문 로드
  useEffect(() => {
    const token = getToken();
    if (!token || !selected || selected.type !== "DOC") {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getDocNode(token, selected.id)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setDraftTitle(d.title);
        setDraftContent(d.content ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, TeamDocNode[]>();
    for (const n of nodes) {
      const arr = map.get(n.parentId) ?? [];
      arr.push(n);
      map.set(n.parentId, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          a.orderIdx - b.orderIdx || a.createdAt.localeCompare(b.createdAt),
      );
    }
    return map;
  }, [nodes]);

  const nodeById = useMemo(() => {
    const map = new Map<string, TeamDocNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  function ancestorsOf(node: TeamDocNode): TeamDocNode[] {
    const chain: TeamDocNode[] = [];
    const guard = new Set<string>();
    let pid = node.parentId;
    while (pid && !guard.has(pid)) {
      guard.add(pid);
      const parent = nodeById.get(pid);
      if (!parent) break;
      chain.unshift(parent);
      pid = parent.parentId;
    }
    return chain;
  }

  function Breadcrumb({ node }: { node: TeamDocNode }) {
    const parent = node.parentId ? nodeById.get(node.parentId) : null;
    return (
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setSelectedId(node.parentId)}
          title={parent ? `${parent.title}(으)로` : "최상위로"}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-[15px] text-text-muted hover:border-brand-border hover:bg-brand-glass hover:text-brand-primary"
        >
          ←
        </button>
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-[12px] text-text-muted">
          <button
            onClick={() => setSelectedId(null)}
            className="hover:text-text-primary"
          >
            최상위
          </button>
          {ancestorsOf(node).map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <span>/</span>
              <button
                onClick={() => setSelectedId(a.id)}
                className="hover:text-brand-primary"
              >
                {a.title}
              </button>
            </span>
          ))}
          <span>/</span>
          <span className="font-bold text-slate-600">{node.title}</span>
        </div>
      </div>
    );
  }

  const visibleIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (parentId: string | null) => {
      for (const child of childrenOf.get(parentId) ?? []) {
        ids.push(child.id);
        if (child.type === "FOLDER" && expanded.has(child.id)) walk(child.id);
      }
    };
    walk(null);
    return ids;
  }, [childrenOf, expanded]);

  // 동작 판정.
  // - 폴더: 같은 레벨 순서변경만 (포함관계 변경 불가 → 다른 레벨 대상엔 null)
  // - 파일/문서: 폴더 위면 '안으로', 파일/문서 위면 위/아래 순서변경
  function kindFor(
    activeNode: TeamDocNode,
    overNode: TeamDocNode,
  ): "into" | "before" | "after" | null {
    const ai = visibleIds.indexOf(activeNode.id);
    const oi = visibleIds.indexOf(overNode.id);
    const beside = ai >= 0 && oi >= 0 && ai < oi ? "after" : "before";
    if (activeNode.type === "FOLDER") {
      return overNode.parentId === activeNode.parentId ? beside : null;
    }
    if (overNode.type === "FOLDER") return "into";
    return beside;
  }

  async function moveInto(node: TeamDocNode, newParentId: string | null) {
    const token = getToken();
    if (!token || newParentId === node.parentId || newParentId === node.id)
      return;
    try {
      await updateDocNode(token, node.id, { parentId: newParentId });
      if (newParentId) setExpanded((prev) => new Set(prev).add(newParentId));
      await loadTree();
      toast.success("이동했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이동하지 못했습니다.");
    }
  }

  // 표시된 삽입선 자리(over의 위/아래)로 active 를 넣는다. 다른 폴더면 부모 변경까지.
  async function placeBeside(
    active: TeamDocNode,
    over: TeamDocNode,
    before: boolean,
  ) {
    const token = getToken();
    if (!token) return;
    const parentId = over.parentId;
    try {
      if (active.parentId !== parentId) {
        await updateDocNode(token, active.id, { parentId });
      }
      const siblings = (childrenOf.get(parentId) ?? []).filter(
        (n) => n.id !== active.id,
      );
      const overIndex = siblings.findIndex((n) => n.id === over.id);
      if (overIndex < 0) return;
      const insertAt = before ? overIndex : overIndex + 1;
      const ordered = [
        ...siblings.slice(0, insertAt),
        active,
        ...siblings.slice(insertAt),
      ];
      await reorderDocNodes(
        token,
        parentId,
        ordered.map((n, i) => ({ id: n.id, orderIdx: i })),
      );
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
      await loadTree();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이동하지 못했습니다.");
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    const activeNode = nodeById.get(String(active.id));
    const overNode = over ? nodeById.get(String(over.id)) : null;
    if (!activeNode || !overNode || active.id === over?.id) {
      setDropHint(null);
      return;
    }
    const kind = kindFor(activeNode, overNode);
    setDropHint(kind ? { id: overNode.id, kind } : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const hint = dropHint;
    setDropHint(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeNode = nodeById.get(String(active.id));
    const overNode = nodeById.get(String(over.id));
    if (!activeNode || !overNode) return;
    const kind =
      hint && hint.id === overNode.id ? hint.kind : kindFor(activeNode, overNode);
    if (!kind) return;
    if (kind === "into") {
      void moveInto(activeNode, overNode.id);
      return;
    }
    void placeBeside(activeNode, overNode, kind === "before");
  }

  // 폴더 상세 뷰(카드/목록)에서 같은 폴더 안 항목 순서변경
  async function persistFolderOrder(parentId: string, orderedIds: string[]) {
    const token = getToken();
    if (!token) return;
    // 낙관적 반영 (childrenOf 가 orderIdx 로 정렬하므로 즉시 재배치됨)
    setNodes((prev) =>
      prev.map((n) => {
        if (n.parentId !== parentId) return n;
        const idx = orderedIds.indexOf(n.id);
        return idx >= 0 ? { ...n, orderIdx: idx } : n;
      }),
    );
    try {
      await reorderDocNodes(
        token,
        parentId,
        orderedIds.map((id, i) => ({ id, orderIdx: i })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "순서를 바꾸지 못했습니다.");
      await loadTree();
    }
  }

  function handleFolderDragEnd(event: DragEndEvent, siblingIds: string[]) {
    const { active, over } = event;
    if (!over || active.id === over.id || !selected) return;
    const from = siblingIds.indexOf(String(active.id));
    const to = siblingIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    void persistFolderOrder(selected.id, arrayMove(siblingIds, from, to));
  }

  function changeFolderView(mode: "card" | "list") {
    setFolderView(mode);
    try {
      localStorage.setItem("docs.folderView", mode);
    } catch {
      // ignore
    }
  }

  function onRowClick(node: TeamDocNode) {
    if (
      docDirty &&
      node.id !== selectedId &&
      !window.confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?")
    )
      return;
    setSelectedId(node.id);
    if (node.type === "FOLDER") {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  }

  async function handleCreate() {
    const token = getToken();
    const kind = creating;
    if (!token || !kind || !newName.trim()) return;
    const name = newName.trim();
    try {
      const created =
        kind === "FOLDER"
          ? await createDocFolder(token, targetParentId, name)
          : await createDocDocument(token, targetParentId, name);
      setCreating(null);
      setNewName("");
      if (targetParentId) {
        setExpanded((prev) => new Set(prev).add(targetParentId));
      }
      await loadTree();
      setSelectedId(created.id);
      toast.success(kind === "FOLDER" ? "폴더를 만들었습니다." : "문서를 만들었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "만들지 못했습니다.");
    }
  }

  async function handleUpload(files: FileList | null) {
    const token = getToken();
    if (!token || !files || files.length === 0 || uploading) return;
    const parentId = uploadParentRef.current ?? targetParentId;
    uploadParentRef.current = null;
    setUploading(true);
    try {
      let last: TeamDocNode | null = null;
      for (const file of Array.from(files)) {
        last = await uploadDocFile(token, parentId, file);
      }
      if (parentId) {
        setExpanded((prev) => new Set(prev).add(parentId));
      }
      await loadTree();
      if (last) setSelectedId(last.id);
      toast.success("파일을 업로드했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    const token = getToken();
    if (!token || !detail || saving || !draftTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await updateDocNode(token, detail.id, {
        title: draftTitle.trim(),
        content: draftContent,
      });
      setDetail(updated);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === updated.id
            ? { ...n, title: updated.title, updatedAt: updated.updatedAt }
            : n,
        ),
      );
      toast.success("저장했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(node: TeamDocNode) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteDocNode(token, node.id);
      if (selectedId === node.id) {
        setSelectedId(null);
        setDetail(null);
      }
      await loadTree();
      toast.success("삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  const docDirty =
    !!detail &&
    (draftTitle !== detail.title || draftContent !== (detail.content ?? ""));

  // Cmd+S / Ctrl+S 저장
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function renderCreateRow(depth: number): ReactNode {
    return (
      <div
        key="__create__"
        style={{ paddingLeft: depth * 14 + 8 }}
        className="flex items-center gap-1.5 py-1.5 pr-2 text-[13px]"
      >
        <span className="w-3 shrink-0" />
        <span className="shrink-0 text-[14px]">
          {creating === "FOLDER" ? "📁" : "📝"}
        </span>
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") {
              setCreating(null);
              setNewName("");
            }
          }}
          onBlur={() => {
            if (!newName.trim()) {
              setCreating(null);
              setNewName("");
            }
          }}
          placeholder={creating === "FOLDER" ? "새 폴더 이름" : "새 문서 제목"}
          className="min-w-0 flex-1 rounded-md border border-emerald-400 bg-white px-2 py-1 text-[13px] text-slate-800 outline-none"
        />
      </div>
    );
  }

  function renderTree(parentId: string | null, depth: number): ReactNode[] {
    const children = childrenOf.get(parentId) ?? [];
    const rows: ReactNode[] = [];
    for (const node of children) {
      const isOpen = expanded.has(node.id);
      const isFolder = node.type === "FOLDER";
      rows.push(
        <div key={node.id}>
          <SortableRow
            node={node}
            depth={depth}
            open={isOpen}
            selected={selectedId === node.id}
            hint={dropHint?.id === node.id ? dropHint.kind : null}
            count={node.type === "FOLDER" ? (childrenOf.get(node.id)?.length ?? 0) : 0}
            intoActive={dropHint?.kind === "into"}
            onClick={() => onRowClick(node)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, node });
            }}
          />
          {isFolder && (
            <div
              className={
                "grid overflow-hidden transition-all duration-200 ease-in-out " +
                (isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
              }
            >
              <div className="min-h-0">{renderTree(node.id, depth + 1)}</div>
            </div>
          )}
        </div>,
      );
    }
    if (creating && targetParentId === parentId) {
      rows.push(renderCreateRow(depth));
    }
    return rows;
  }

  const targetLabel = selected
    ? selected.type === "FOLDER"
      ? `'${selected.title}' 안에`
      : "같은 폴더에"
    : "최상위에";

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleUpload(e.dataTransfer.files);
      }}
    >
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-50 m-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/80">
          <span className="text-3xl">⬆️</span>
          <span className="text-[15px] font-bold text-emerald-700">
            여기에 놓으면 {targetLabel} 업로드
          </span>
        </div>
      ) : null}
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          문서
        </span>
        <Button
          variant="secondary"
          size="sm-icon"
          onClick={() => void loadTree()}
          title="새로고침"
        >
          <RefreshCw className="size-3.5" strokeWidth={2} />
        </Button>
      </PageHeader>

      <div className="flex-1 flex min-h-0">
        {/* 왼쪽: 트리 */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2.5">
            <Button
              variant="secondary"
              size="sm"
              className="h-auto flex-1 rounded-lg px-2 py-1.5 text-[12px]"
              onClick={() => {
                setCreating("FOLDER");
                setNewName("");
              }}
            >
              + 폴더
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-auto flex-1 rounded-lg px-2 py-1.5 text-[12px]"
              onClick={() => {
                setCreating("DOC");
                setNewName("");
              }}
            >
              + 문서
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="h-auto flex-1 rounded-lg px-2 py-1.5 text-[12px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "업로드 중…" : "⬆ 업로드"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {loading ? (
              <p className="px-3 py-4 text-[13px] text-slate-400">불러오는 중…</p>
            ) : nodes.length === 0 && !creating ? (
              <p className="px-3 py-4 text-[13px] text-slate-400">
                아직 문서가 없습니다. 폴더나 문서를 만들어보세요.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setDropHint(null)}
              >
                <SortableContext
                  items={visibleIds}
                  strategy={verticalListSortingStrategy}
                >
                  {renderTree(null, 0)}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </aside>

        {/* 오른쪽: 본문 */}
        <section className="min-w-0 flex-1 overflow-y-auto bg-slate-50">
          {error ? (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              {error}
            </div>
          ) : null}

          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="text-4xl">📄</span>
              <span className="text-[14px] text-slate-400">
                왼쪽에서 문서를 선택하거나 새로 만드세요.
              </span>
            </div>
          ) : selected.type === "DOC" ? (
            <div className="flex h-full flex-col">
              {/* 스크롤 영역 */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[1100px] px-8 py-6">
                  <Breadcrumb node={selected} />
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-1 text-[20px] font-black text-text-primary outline-none hover:border-surface-border-soft focus:border-brand-border focus:bg-surface-raised"
                    />
                    <DeleteButton
                      confirm={confirmDelete}
                      onClick={() => {
                        if (confirmDelete) handleDelete(selected);
                        else setConfirmDelete(true);
                      }}
                    />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-surface-border">
                    <LexicalEditor
                      key={selected.id}
                      initialState={draftContent}
                      onChange={setDraftContent}
                      placeholder="내용을 입력하세요..."
                      minHeight="calc(100dvh - 22rem)"
                    />
                  </div>
                </div>
              </div>
              {/* 하단 sticky 푸터 */}
              <div className="shrink-0 border-t border-surface-border-soft bg-surface-raised px-8 py-3">
                <div className="mx-auto flex max-w-[1100px] items-center justify-between">
                  <span className="text-[12px] text-text-muted">
                    {detail
                      ? `${detail.updatedByName ?? "-"} · ${formatTime(detail.updatedAt)} 수정`
                      : "불러오는 중…"}
                    {docDirty ? (
                      <span className="ml-2 text-brand-primary">· 미저장</span>
                    ) : null}
                  </span>
                  <Button
                    variant="primary"
                    className="rounded-lg px-5 py-2 text-[14px]"
                    onClick={handleSave}
                    disabled={!docDirty || saving || !draftTitle.trim()}
                  >
                    {saving ? "저장 중…" : "저장"}
                  </Button>
                </div>
              </div>
            </div>
          ) : selected.type === "FILE" ? (
            <div className="mx-auto w-full max-w-5xl px-8 py-7">
              <Breadcrumb node={selected} />
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 flex-1 truncate text-[18px] font-black text-slate-900">
                  {selected.title}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  {selected.contentType?.startsWith("image/") ? (
                    <div className="flex overflow-hidden rounded-lg border border-slate-200">
                      {(["fit", "full"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPreviewMode(mode)}
                          className={
                            "px-2.5 py-1 text-[12px] font-bold " +
                            (previewMode === mode
                              ? "bg-brand-primary text-text-on-brand"
                              : "bg-surface-raised text-text-muted hover:bg-surface-muted")
                          }
                        >
                          {mode === "fit" ? "축소" : "원본"}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <DeleteButton
                    confirm={confirmDelete}
                    onClick={() => {
                      if (confirmDelete) handleDelete(selected);
                      else setConfirmDelete(true);
                    }}
                  />
                </div>
              </div>
              {selected.contentType?.startsWith("image/") ? (
                <div className="flex justify-center">
                  <div
                    className={
                      "rounded-xl border border-slate-200 bg-white p-3 " +
                      (previewMode === "full" ? "w-full" : "")
                    }
                  >
                    <img
                      src={selected.fileUrl ?? ""}
                      alt={selected.title}
                      className={
                        "rounded-lg object-contain " +
                        (previewMode === "fit"
                          ? "max-h-[60vh] max-w-full"
                          : "max-h-[80vh] w-full")
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[22px]">
                    📄
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-slate-700">
                    {selected.fileName}
                  </span>
                </div>
              )}
              <p className="mt-3 text-[12px] text-slate-400">
                {selected.createdByName ?? "-"} · {formatTime(selected.createdAt)} 업로드
              </p>
            </div>
          ) : (
            // FOLDER
            <div className="mx-auto w-full max-w-3xl px-8 py-7">
              <Breadcrumb node={selected} />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[24px]">
                    📂
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[19px] font-black text-slate-900">
                      {selected.title}
                    </h2>
                    <p className="text-[12px] text-slate-400">
                      항목 {(childrenOf.get(selected.id) ?? []).length}개
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex h-7 overflow-hidden rounded-lg border border-surface-border-soft">
                    {(["card", "list"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => changeFolderView(mode)}
                        title={mode === "card" ? "카드형" : "목록형"}
                        className={
                          "px-2.5 text-[12px] font-bold " +
                          (folderView === mode
                            ? "bg-brand-primary text-text-on-brand"
                            : "bg-surface-raised text-text-muted hover:bg-surface-muted")
                        }
                      >
                        {mode === "card" ? "▦ 카드" : "☰ 목록"}
                      </button>
                    ))}
                  </div>
                  <DeleteButton
                    confirm={confirmDelete}
                    label="폴더 삭제"
                    onClick={() => {
                      if (confirmDelete) handleDelete(selected);
                      else setConfirmDelete(true);
                    }}
                  />
                </div>
              </div>
              {(() => {
                const folderChildren = childrenOf.get(selected.id) ?? [];
                if (folderChildren.length === 0) {
                  return (
                    <div className="flex flex-col items-center gap-1 py-14 text-center">
                      <span className="text-3xl opacity-60">🗂️</span>
                      <p className="text-[13px] text-slate-400">
                        빈 폴더입니다. 이 폴더를 우클릭해 추가하세요.
                      </p>
                    </div>
                  );
                }
                const childIds = folderChildren.map((c) => c.id);
                const countOf = (child: TeamDocNode) =>
                  child.type === "FOLDER"
                    ? (childrenOf.get(child.id)?.length ?? 0)
                    : 0;
                const openMenu = (e: ReactMouseEvent, child: TeamDocNode) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, node: child });
                };
                return (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleFolderDragEnd(e, childIds)}
                  >
                    <SortableContext
                      items={childIds}
                      strategy={
                        folderView === "card"
                          ? rectSortingStrategy
                          : verticalListSortingStrategy
                      }
                    >
                      {folderView === "card" ? (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,200px))] gap-3">
                          {folderChildren.map((child) => (
                            <SortableCard
                              key={child.id}
                              node={child}
                              count={countOf(child)}
                              onClick={() => onRowClick(child)}
                              onContextMenu={(e) => openMenu(e, child)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {folderChildren.map((child) => (
                            <SortableListRow
                              key={child.id}
                              node={child}
                              count={countOf(child)}
                              onClick={() => onRowClick(child)}
                              onContextMenu={(e) => openMenu(e, child)}
                            />
                          ))}
                        </div>
                      )}
                    </SortableContext>
                  </DndContext>
                );
              })()}
            </div>
          )}
        </section>
      </div>

      {menu ? (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            className="fixed z-[61] min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl"
            style={{ left: menu.x, top: menu.y }}
          >
            {menu.node.type === "FOLDER" ? (
              <>
                <ContextItem
                  onClick={() => {
                    setSelectedId(menu.node.id);
                    setCreating("FOLDER");
                    setNewName("");
                    setMenu(null);
                  }}
                >
                  📁 하위 폴더 추가
                </ContextItem>
                <ContextItem
                  onClick={() => {
                    setSelectedId(menu.node.id);
                    setCreating("DOC");
                    setNewName("");
                    setMenu(null);
                  }}
                >
                  📝 문서 추가
                </ContextItem>
                <ContextItem
                  onClick={() => {
                    uploadParentRef.current = menu.node.id;
                    setMenu(null);
                    fileInputRef.current?.click();
                  }}
                >
                  ⬆️ 파일 업로드
                </ContextItem>
                <div className="my-1 h-px bg-slate-100" />
              </>
            ) : null}
            <ContextItem
              danger
              onClick={() => {
                if (menu.confirmDelete) {
                  const target = menu.node;
                  setMenu(null);
                  handleDelete(target);
                } else {
                  setMenu({ ...menu, confirmDelete: true });
                }
              }}
            >
              {menu.confirmDelete ? "정말 삭제할까요?" : "🗑 삭제"}
            </ContextItem>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SortableRow({
  node,
  depth,
  open,
  selected,
  hint,
  count,
  intoActive,
  onClick,
  onContextMenu,
}: {
  node: TeamDocNode;
  depth: number;
  open: boolean;
  selected: boolean;
  hint: "into" | "before" | "after" | null;
  count: number;
  intoActive: boolean;
  onClick: () => void;
  onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const isFolder = node.type === "FOLDER";
  // '폴더 안으로' 드래그 중에는 주변 항목의 순서변경 밀림을 끈다(드래그 중 항목만 이동)
  const suppressShift = intoActive && !isDragging;
  return (
    <div
      ref={setNodeRef}
      className="relative"
      style={{
        transform: suppressShift ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
      }}
    >
      {hint === "before" ? (
        <div className="pointer-events-none absolute inset-x-1 -top-px z-10 h-0.5 rounded-full bg-emerald-500" />
      ) : null}
      <button
        {...attributes}
        {...listeners}
        onClick={onClick}
        onContextMenu={onContextMenu}
        style={{ paddingLeft: depth * 14 + 8 }}
        className={
          "flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[13px] " +
          (hint === "into"
            ? "bg-brand-glass text-brand-primary ring-2 ring-inset ring-brand-border"
            : selected
              ? "bg-brand-glass font-bold text-brand-primary"
              : "text-text-primary hover:bg-surface-muted")
        }
      >
        {isFolder ? (
          <span
            className={
              "inline-block w-3 shrink-0 text-[10px] text-slate-400 transition-transform " +
              (open ? "rotate-90" : "")
            }
          >
            ▶
          </span>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="shrink-0 text-[14px]">{nodeIcon(node, open)}</span>
        <span className="min-w-0 flex-1 truncate">{node.title}</span>
        {isFolder && count > 0 ? (
          <span className="shrink-0 text-[11px] text-slate-400">{count}</span>
        ) : null}
      </button>
      {hint === "after" ? (
        <div className="pointer-events-none absolute inset-x-1 -bottom-px z-10 h-0.5 rounded-full bg-emerald-500" />
      ) : null}
    </div>
  );
}

function SortableCard({
  node,
  count,
  onClick,
  onContextMenu,
}: {
  node: TeamDocNode;
  count: number;
  onClick: () => void;
  onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const isFolder = node.type === "FOLDER";
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
      }}
      className="group flex touch-none flex-col gap-2.5 rounded-xl border border-surface-border bg-surface-raised p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="text-[30px] leading-none">{nodeIcon(node, false)}</span>
        {isFolder ? (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600">
            {count}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 break-all text-[13px] font-bold text-slate-700">
          {node.title}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-400">
          {nodeKindLabel(node)}
        </p>
      </div>
    </button>
  );
}

function SortableListRow({
  node,
  count,
  onClick,
  onContextMenu,
}: {
  node: TeamDocNode;
  count: number;
  onClick: () => void;
  onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const isFolder = node.type === "FOLDER";
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : undefined,
      }}
      className="group flex touch-none items-center gap-3 rounded-xl border border-surface-border bg-surface-raised px-3.5 py-2.5 text-left transition-colors hover:border-brand-border hover:bg-brand-glass"
    >
      <span className="shrink-0 text-[13px] text-slate-300 group-hover:text-slate-400">
        ⠿
      </span>
      <span className="shrink-0 text-[20px] leading-none">
        {nodeIcon(node, false)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">
        {node.title}
      </span>
      {isFolder ? (
        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600">
          {count}
        </span>
      ) : null}
      <span className="shrink-0 text-[11px] font-medium text-slate-400">
        {nodeKindLabel(node)}
      </span>
    </button>
  );
}

function ContextItem({
  danger,
  onClick,
  children,
}: {
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center px-3.5 py-2 text-left text-[13px] font-medium " +
        (danger
          ? "text-destructive hover:bg-danger-glass"
          : "text-text-primary hover:bg-surface-muted")
      }
    >
      {children}
    </button>
  );
}

function DeleteButton({
  confirm,
  label = "삭제",
  onClick,
}: {
  confirm: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      className={
        "h-7 shrink-0 rounded-lg px-3 text-[12px] " +
        (confirm
          ? "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive hover:brightness-110"
          : "hover:bg-danger-glass hover:text-destructive")
      }
    >
      {confirm ? "정말 삭제?" : label}
    </Button>
  );
}

export default DocsModule;
