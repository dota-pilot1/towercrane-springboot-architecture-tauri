import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Layers, Plus, RefreshCw } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { toast } from "../../shared/ui/Toast";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import { ColumnResizeHandle } from "../../shared/ui/ColumnResizeHandle";
import { useColumnResize } from "../../shared/lib/useColumnResize";
import { getToken } from "../../shared/api/client";
const EMPTY_LEXICAL =
  '{"root":{"children":[{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

export type HierarchicalWorkspace = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  orderIdx: number;
};

export type HierarchicalCategory = {
  id: string;
  workspaceId: string;
  name: string;
  orderIdx: number;
};

export type HierarchicalSection = {
  id: string;
  categoryId: string;
  title: string;
  orderIdx: number;
};

export type HierarchicalDocument = {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  orderIdx: number;
};

export type HierarchicalDocumentApi = {
  listWorkspaces: (token: string) => Promise<HierarchicalWorkspace[]>;
  createWorkspace: (
    token: string,
    body: { title: string; description?: string | null; icon?: string },
  ) => Promise<HierarchicalWorkspace>;
  updateWorkspace: (
    token: string,
    id: string,
    body: { title?: string; description?: string | null; icon?: string },
  ) => Promise<HierarchicalWorkspace>;
  deleteWorkspace: (token: string, id: string) => Promise<void>;
  getCategories: (
    token: string,
    workspaceId: string,
  ) => Promise<HierarchicalCategory[]>;
  createCategory: (
    token: string,
    workspaceId: string,
    body: { name: string },
  ) => Promise<HierarchicalCategory>;
  updateCategory: (
    token: string,
    id: string,
    body: { name: string },
  ) => Promise<HierarchicalCategory>;
  deleteCategory: (token: string, id: string) => Promise<void>;
  reorderCategories: (
    token: string,
    workspaceId: string,
    categoryIds: string[],
  ) => Promise<void>;
  getSections: (
    token: string,
    categoryId: string,
  ) => Promise<HierarchicalSection[]>;
  createSection: (
    token: string,
    body: { categoryId: string; title: string },
  ) => Promise<HierarchicalSection>;
  updateSection: (
    token: string,
    id: string,
    body: { title: string },
  ) => Promise<HierarchicalSection>;
  deleteSection: (token: string, id: string) => Promise<void>;
  reorderSections: (
    token: string,
    categoryId: string,
    sectionIds: string[],
  ) => Promise<void>;
  getNotes: (
    token: string,
    sectionId: string,
  ) => Promise<HierarchicalDocument[]>;
  createNote: (
    token: string,
    body: { sectionId: string; title: string; content: string },
  ) => Promise<HierarchicalDocument>;
  updateNote: (
    token: string,
    id: string,
    body: { title?: string; content?: string },
  ) => Promise<HierarchicalDocument>;
  deleteNote: (token: string, id: string) => Promise<void>;
  reorderNotes: (
    token: string,
    sectionId: string,
    noteIds: string[],
  ) => Promise<void>;
};

export type HierarchicalDocumentCopy = {
  pageTitle: string;
  introTitle: string;
  introDescription: string;
  workspacePlaceholder: string;
  newItemTitle: string;
  itemName: string;
  editorPlaceholder: string;
};

type HierarchicalDocumentModuleProps = {
  api: HierarchicalDocumentApi;
  copy: HierarchicalDocumentCopy;
  topicWidth: number;
  setTopicWidth: (width: number) => void;
  sectionWidth: number;
  setSectionWidth: (width: number) => void;
};

function HierarchicalDocumentModule({
  api,
  copy,
  topicWidth,
  setTopicWidth,
  sectionWidth,
  setSectionWidth,
}: HierarchicalDocumentModuleProps) {
  const [workspaces, setWorkspaces] = useState<HierarchicalWorkspace[]>([]);
  const [categories, setCategories] = useState<HierarchicalCategory[]>([]);
  const [sections, setSections] = useState<HierarchicalSection[]>([]);
  const [notes, setNotes] = useState<HierarchicalDocument[]>([]);

  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] =
    useState<HierarchicalDocument | null>(null);

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [addingWorkspace, setAddingWorkspace] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // 1·2차 주제 컬럼 폭 — zustand persist(localStorage)에 저장돼 재시작 후에도 유지
  const startTopicResize = useColumnResize(topicWidth, setTopicWidth);
  const startSectionResize = useColumnResize(sectionWidth, setSectionWidth);

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    // 워크스페이스 전환 시 하위 선택(1·2차 주제·노트) 모두 초기화 → 이전 내용 잔상 제거
    setSelectedCategory(null);
    setSelectedSection(null);
    setSelectedNote(null);
    setSections([]);
    setNotes([]);
    if (selectedWorkspace) {
      void loadCategories(selectedWorkspace);
    } else {
      setCategories([]);
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedCategory) {
      void loadSections(selectedCategory);
    } else {
      setSections([]);
      setSelectedSection(null);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedSection) {
      void loadNotes(selectedSection);
    } else {
      setNotes([]);
      setSelectedNote(null);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (selectedNote) {
      setDraftTitle(selectedNote.title);
      setDraftContent(selectedNote.content);
    }
  }, [selectedNote]);

  async function loadWorkspaces() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const list = await api.listWorkspaces(token);
      setWorkspaces(list);
      // 첫 워크스페이스 자동 선택
      if (list.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(list[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories(workspaceId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setCategories(await api.getCategories(token, workspaceId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function loadSections(categoryId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setSections(await api.getSections(token, categoryId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function loadNotes(sectionId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setNotes(await api.getNotes(token, sectionId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function addWorkspace() {
    const token = getToken();
    if (!token || !newWorkspaceName.trim()) return;
    try {
      const created = await api.createWorkspace(token, {
        title: newWorkspaceName.trim(),
      });
      setWorkspaces((prev) => [...prev, created]);
      setSelectedWorkspace(created.id);
      setNewWorkspaceName("");
      setAddingWorkspace(false);
      toast.success("워크스페이스를 추가했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가하지 못했습니다.");
    }
  }

  async function removeWorkspace(id: string) {
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteWorkspace(token, id);
      const remaining = workspaces.filter((w) => w.id !== id);
      setWorkspaces(remaining);
      if (selectedWorkspace === id) {
        setSelectedWorkspace(remaining[0]?.id ?? null);
      }
      toast.success("워크스페이스를 삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  async function renameWorkspace(id: string, title: string) {
    const token = getToken();
    const nextTitle = title.trim();
    if (!token || !nextTitle) return;
    try {
      const updated = await api.updateWorkspace(token, id, { title: nextTitle });
      setWorkspaces((prev) =>
        prev.map((workspace) => (workspace.id === id ? updated : workspace)),
      );
      toast.success("워크스페이스 이름을 변경했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이름을 변경하지 못했습니다.");
      throw err;
    }
  }

  async function addCategory() {
    const token = getToken();
    if (!token || !selectedWorkspace || !newCategoryName.trim()) return;
    try {
      const created = await api.createCategory(token, selectedWorkspace, {
        name: newCategoryName.trim(),
      });
      setCategories((prev) => [...prev, created]);
      setNewCategoryName("");
      toast.success("카테고리를 추가했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가하지 못했습니다.");
    }
  }

  async function addSection() {
    const token = getToken();
    if (!token || !selectedCategory || !newSectionName.trim()) return;
    try {
      const created = await api.createSection(token, {
        categoryId: selectedCategory,
        title: newSectionName.trim(),
      });
      setSections((prev) => [...prev, created]);
      setNewSectionName("");
      toast.success("섹션을 추가했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가하지 못했습니다.");
    }
  }

  async function renameCategory(id: string, name: string) {
    const token = getToken();
    const nextName = name.trim();
    if (!token || !nextName) return;
    try {
      const updated = await api.updateCategory(token, id, { name: nextName });
      setCategories((prev) =>
        prev.map((category) => (category.id === id ? updated : category)),
      );
      toast.success("1차 주제 이름을 변경했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이름을 변경하지 못했습니다.");
      throw err;
    }
  }

  async function renameSection(id: string, title: string) {
    const token = getToken();
    const nextTitle = title.trim();
    if (!token || !nextTitle) return;
    try {
      const updated = await api.updateSection(token, id, { title: nextTitle });
      setSections((prev) =>
        prev.map((section) => (section.id === id ? updated : section)),
      );
      toast.success("2차 주제 이름을 변경했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이름을 변경하지 못했습니다.");
      throw err;
    }
  }

  async function addNote() {
    const token = getToken();
    if (!token || !selectedSection) return;
    try {
      const created = await api.createNote(token, {
        sectionId: selectedSection,
        title: copy.newItemTitle,
        content: EMPTY_LEXICAL,
      });
      setNotes((prev) => [...prev, created]);
      setSelectedNote(created);
      toast.success(`${copy.itemName}를 생성했습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "생성하지 못했습니다.");
    }
  }

  async function saveNote() {
    const token = getToken();
    if (!token || !selectedNote || !draftTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateNote(token, selectedNote.id, {
        title: draftTitle.trim(),
        content: draftContent,
      });
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      toast.success("저장했습니다.");
      setSelectedNote(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(id: string) {
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteCategory(token, id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategory === id) setSelectedCategory(null);
      toast.success("카테고리를 삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  async function removeSection(id: string) {
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteSection(token, id);
      setSections((prev) => prev.filter((s) => s.id !== id));
      if (selectedSection === id) setSelectedSection(null);
      toast.success("섹션을 삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  async function removeNote(id: string) {
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteNote(token, id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
      toast.success(`${copy.itemName}를 삭제했습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  async function handleCategoryReorder(event: DragEndEvent) {
    const token = getToken();
    const { active, over } = event;
    if (!token || !over || active.id === over.id || !selectedWorkspace) return;
    const from = categories.findIndex((c) => c.id === active.id);
    const to = categories.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(categories, from, to);
    setCategories(reordered);
    try {
      await api.reorderCategories(
        token,
        selectedWorkspace,
        reordered.map((c) => c.id),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "순서 변경 실패");
      void loadCategories(selectedWorkspace);
    }
  }

  async function handleSectionReorder(event: DragEndEvent) {
    const token = getToken();
    const { active, over } = event;
    if (!token || !over || active.id === over.id || !selectedCategory) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(sections, from, to);
    setSections(reordered);
    try {
      await api.reorderSections(
        token,
        selectedCategory,
        reordered.map((s) => s.id),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "순서 변경 실패");
      void loadSections(selectedCategory);
    }
  }

  async function handleNoteReorder(event: DragEndEvent) {
    const token = getToken();
    const { active, over } = event;
    if (!token || !over || active.id === over.id || !selectedSection) return;
    const from = notes.findIndex((note) => note.id === active.id);
    const to = notes.findIndex((note) => note.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(notes, from, to);
    setNotes(reordered);
    try {
      await api.reorderNotes(
        token,
        selectedSection,
        reordered.map((note) => note.id),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "순서 변경 실패");
      void loadNotes(selectedSection);
    }
  }

  const isDirty =
    selectedNote &&
    (draftTitle !== selectedNote.title ||
      draftContent !== selectedNote.content);

  const selectedSectionTitle =
    sections.find((s) => s.id === selectedSection)?.title ?? "";

  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          {copy.pageTitle}
        </span>
        <Button
          variant="secondary"
          size="sm-icon"
          onClick={() => void loadWorkspaces()}
          title="새로고침"
        >
          <RefreshCw className="size-3.5" strokeWidth={2} />
        </Button>
      </PageHeader>

      {/* 워크스페이스 탭바 (분류: 백엔드/프론트/DevOps) — 워크스페이스가 있을 때만 */}
      {workspaces.length > 0 && (
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-surface-border bg-surface-raised px-3 py-2">
        {workspaces.map((ws) => (
          <WorkspaceTab
            key={ws.id}
            workspace={ws}
            selected={selectedWorkspace === ws.id}
            onClick={() => setSelectedWorkspace(ws.id)}
            onRename={(title) => renameWorkspace(ws.id, title)}
            onDelete={() => removeWorkspace(ws.id)}
          />
        ))}
        {addingWorkspace ? (
          <input
            autoFocus
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") addWorkspace();
              if (e.key === "Escape") {
                setAddingWorkspace(false);
                setNewWorkspaceName("");
              }
            }}
            onBlur={() => {
              if (!newWorkspaceName.trim()) {
                setAddingWorkspace(false);
                setNewWorkspaceName("");
              }
            }}
            placeholder={copy.workspacePlaceholder}
            className="w-52 shrink-0 rounded-lg border border-brand-border bg-surface-raised px-3 py-1.5 text-[13px] text-text-primary outline-none"
          />
        ) : (
          <button
            onClick={() => setAddingWorkspace(true)}
            title="새 워크스페이스"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-surface-border px-2.5 py-1.5 text-[12px] font-bold text-text-muted hover:border-brand-border hover:text-brand-primary"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            워크스페이스
          </button>
        )}
      </div>
      )}

      {!selectedWorkspace ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="grid size-16 place-items-center rounded-2xl bg-surface-muted shadow-sm">
            <Layers className="size-8 text-text-muted" strokeWidth={1.5} />
          </div>
          {loading ? (
            <span className="text-[14px] font-medium text-text-muted">
              불러오는 중…
            </span>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-[16px] font-bold text-text-primary">
                  {copy.introTitle}
                </p>
                <p className="text-[13px] text-text-muted">
                  {copy.introDescription}
                </p>
              </div>
              {/* 중앙에서 바로 입력 → 시선 분산 없음 */}
              <div className="flex w-full max-w-sm items-center gap-2">
                <input
                  autoFocus
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter") addWorkspace();
                    if (e.key === "Escape") setNewWorkspaceName("");
                  }}
                  placeholder={copy.workspacePlaceholder}
                  className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-[14px] text-text-primary outline-none focus:border-brand-border"
                />
                <Button
                  variant="primary"
                  onClick={addWorkspace}
                  disabled={!newWorkspaceName.trim()}
                  className="shrink-0 rounded-lg px-5 py-2 text-[14px]"
                >
                  만들기
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* 1열: 카테고리 */}
          <aside
            style={{ width: topicWidth }}
            className="flex shrink-0 flex-col border-r border-surface-border bg-surface-raised"
          >
            <div className="flex items-center gap-1.5 border-b border-surface-border-soft px-3 py-2.5">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") addCategory();
                }}
                placeholder="새 1차 주제"
                className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-raised px-2 py-1 text-[12px] text-text-primary outline-none focus:border-brand-border"
              />
              <Button
                variant="primary"
                size="sm"
                className="h-auto rounded-lg px-2 py-1 text-[11px]"
                onClick={addCategory}
              >
                +
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryReorder}
              >
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {categories.map((cat) => (
                    <ArchRow
                      key={cat.id}
                      id={cat.id}
                      icon="📚"
                      label={cat.name}
                      selected={selectedCategory === cat.id}
                      hoverBg="hover:bg-surface-muted"
                      onClick={() => setSelectedCategory(cat.id)}
                      onRename={(name) => renameCategory(cat.id, name)}
                      onDelete={() => removeCategory(cat.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {categories.length === 0 && (
                <p className="px-3 py-4 text-[12px] text-text-muted">
                  1차 주제를 추가하세요.
                </p>
              )}
            </div>
          </aside>

          <ColumnResizeHandle onMouseDown={startTopicResize} />

          {/* 2열: 섹션 */}
          <aside
            style={{ width: sectionWidth }}
            className="flex shrink-0 flex-col border-r border-surface-border bg-surface-muted"
          >
            <div className="flex items-center gap-1.5 border-b border-surface-border-soft px-3 py-2.5">
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") addSection();
                }}
                placeholder="새 2차 주제"
                disabled={!selectedCategory}
                className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-raised px-2 py-1 text-[12px] text-text-primary outline-none focus:border-brand-border disabled:bg-surface-strong"
              />
              <Button
                variant="primary"
                size="sm"
                className="h-auto rounded-lg px-2 py-1 text-[11px]"
                onClick={addSection}
                disabled={!selectedCategory}
              >
                +
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {selectedCategory ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSectionReorder}
                >
                  <SortableContext
                    items={sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sections.map((sec) => (
                      <ArchRow
                        key={sec.id}
                        id={sec.id}
                        icon="📖"
                        label={sec.title}
                        selected={selectedSection === sec.id}
                        hoverBg="hover:bg-surface-raised"
                        onClick={() => setSelectedSection(sec.id)}
                        onRename={(title) => renameSection(sec.id, title)}
                        onDelete={() => removeSection(sec.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="px-3 py-4 text-[12px] text-text-muted">
                  왼쪽에서 1차 주제를 선택하세요.
                </p>
              )}
            </div>
          </aside>

          <ColumnResizeHandle onMouseDown={startSectionResize} />

          {/* 3열: 노트 */}
          <section className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-surface-muted">
            {!selectedSection ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-surface-raised shadow-sm">
                  <Layers className="size-8 text-text-muted" strokeWidth={1.5} />
                </div>
                <span className="text-[14px] font-medium text-text-muted">
                  2차 주제를 선택해서 {copy.itemName}를 추가하세요.
                </span>
              </div>
            ) : !selectedNote ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="w-full max-w-5xl px-5 py-6 lg:px-6">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-glass text-[22px]">
                        📖
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-[18px] font-black text-text-primary">
                          {selectedSectionTitle}
                        </h2>
                        <p className="text-[12px] text-text-muted">
                          {copy.itemName} {notes.length}개
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={addNote}
                      className="shrink-0 rounded-lg px-4 py-2 text-[13px]"
                    >
                      + 새 {copy.itemName}
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-20 text-center">
                      <span className="text-4xl opacity-50">📝</span>
                      <p className="text-[13px] text-text-muted">
                        아직 {copy.itemName}가 없습니다. 새 {copy.itemName}를
                        만들어보세요.
                      </p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleNoteReorder}
                    >
                      <SortableContext
                        items={notes.map((note) => note.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex flex-col gap-2">
                          {notes.map((note, index) => (
                            <SortableNoteCard
                              key={note.id}
                              note={note}
                              index={index}
                              onClick={() => setSelectedNote(note)}
                              onDelete={() => removeNote(note.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="w-full max-w-5xl px-5 py-5 lg:px-6">
                    <button
                      onClick={() => setSelectedNote(null)}
                      className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-text-muted hover:bg-surface-raised hover:text-brand-primary"
                    >
                      ← {copy.itemName} 목록
                    </button>
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder={`${copy.itemName} 제목`}
                      className="mb-4 min-w-0 w-full rounded-lg border border-surface-border-soft bg-surface-raised px-3 py-2 text-[22px] font-black text-text-primary outline-none transition-colors hover:border-surface-border focus:border-brand-border focus:bg-surface-raised"
                    />
                    <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
                      <LexicalEditor
                        key={selectedNote.id}
                        initialState={draftContent}
                        onChange={setDraftContent}
                        placeholder={copy.editorPlaceholder}
                        minHeight="calc(100dvh - 24rem)"
                      />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t border-surface-border bg-surface-raised px-5 py-3 lg:px-6">
                  <div className="flex w-full max-w-5xl items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        if (
                          selectedNote &&
                          window.confirm(`이 ${copy.itemName}를 삭제할까요?`)
                        ) {
                          void removeNote(selectedNote.id);
                        }
                      }}
                      className="rounded-lg px-3 py-2 text-[13px] font-medium text-text-muted hover:bg-danger-glass hover:text-destructive"
                    >
                      🗑 삭제
                    </button>
                    <div className="flex items-center gap-3">
                      {isDirty && (
                        <span className="text-[12px] font-medium text-brand-primary">
                          · 저장되지 않은 변경사항
                        </span>
                      )}
                      <Button
                        variant="primary"
                        className="rounded-lg px-6 py-2 text-[14px]"
                        onClick={saveNote}
                        disabled={!isDirty || saving || !draftTitle.trim()}
                      >
                        {saving ? "저장 중…" : "저장"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function WorkspaceTab({
  workspace,
  selected,
  onClick,
  onRename,
  onDelete,
}: {
  workspace: HierarchicalWorkspace;
  selected: boolean;
  onClick: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(workspace.title);
  const [menuPosition, setMenuPosition] = useState<ContextMenuPosition | null>(
    null,
  );

  function beginEditing() {
    setDraft(workspace.title);
    setEditing(true);
    setMenuPosition(null);
  }

  async function commitRename() {
    const nextTitle = draft.trim();
    if (!nextTitle || nextTitle === workspace.title) {
      setDraft(workspace.title);
      setEditing(false);
      return;
    }
    try {
      await onRename(nextTitle);
      setEditing(false);
    } catch {
      // 오류 토스트는 상위 API 처리에서 노출하며 입력 상태는 유지한다.
    }
  }

  return (
    <div
      onMouseLeave={() => setConfirm(false)}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuPosition({ x: event.clientX, y: event.clientY });
      }}
      title="더블클릭하거나 우클릭하여 이름 변경"
      className={`group flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
        selected
          ? "bg-brand-primary text-primary-foreground"
          : "bg-surface-muted text-text-secondary hover:bg-surface-strong"
      }`}
    >
      <Layers className="size-3.5 shrink-0" strokeWidth={2} />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onBlur={() => void commitRename()}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter") void commitRename();
            if (event.key === "Escape") {
              setDraft(workspace.title);
              setEditing(false);
            }
          }}
          className="min-w-24 w-44 rounded-md border border-brand-border bg-surface-raised px-2 py-0.5 text-[13px] font-bold text-text-primary outline-none"
        />
      ) : (
        <button
          onClick={onClick}
          onDoubleClick={(event) => {
            event.stopPropagation();
            beginEditing();
          }}
          className="max-w-64 truncate"
        >
          {workspace.title}
        </button>
      )}
      <button
        onClick={() => {
          if (confirm) {
            onDelete();
            setConfirm(false);
          } else {
            setConfirm(true);
          }
        }}
        title={confirm ? "정말 삭제할까요?" : "워크스페이스 삭제"}
        className={`rounded px-1 text-[11px] transition-all ${
          confirm
            ? selected
              ? "bg-surface-raised/25 text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
            : selected
              ? "text-primary-foreground/70 hover:text-primary-foreground"
              : "text-text-muted opacity-0 hover:text-destructive group-hover:opacity-100"
        }`}
      >
        {confirm ? "삭제?" : "✕"}
      </button>
      {menuPosition && (
        <RenameContextMenu
          position={menuPosition}
          onRename={beginEditing}
          onDelete={() => {
            setMenuPosition(null);
            if (window.confirm(`"${workspace.title}" 워크스페이스를 삭제할까요?`)) {
              onDelete();
            }
          }}
          onClose={() => setMenuPosition(null)}
        />
      )}
    </div>
  );
}

function ArchRow({
  id,
  icon,
  label,
  selected,
  hoverBg,
  onClick,
  onRename,
  onDelete,
}: {
  id: string;
  icon: string;
  label: string;
  selected: boolean;
  hoverBg: string;
  onClick: () => void;
  onRename: (label: string) => Promise<void>;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const [menuPosition, setMenuPosition] = useState<ContextMenuPosition | null>(
    null,
  );

  function beginEditing() {
    setDraft(label);
    setEditing(true);
    setMenuPosition(null);
  }

  async function commitRename() {
    const nextLabel = draft.trim();
    if (!nextLabel || nextLabel === label) {
      setDraft(label);
      setEditing(false);
      return;
    }
    try {
      await onRename(nextLabel);
      setEditing(false);
    } catch {
      // 오류 토스트는 상위 API 처리에서 노출하며 입력 상태는 유지한다.
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onDoubleClick={(event) => {
        event.stopPropagation();
        beginEditing();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuPosition({ x: event.clientX, y: event.clientY });
      }}
      onMouseLeave={() => setConfirm(false)}
      title="더블클릭하거나 우클릭하여 이름 변경"
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`group relative flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-[13px] touch-none transition-colors ${
        selected
          ? "bg-brand-glass font-bold text-brand-primary"
          : `text-text-secondary ${hoverBg}`
      }`}
    >
      {selected && (
        <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brand-primary" />
      )}
      <span className="shrink-0">{icon}</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onBlur={() => void commitRename()}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter") void commitRename();
            if (event.key === "Escape") {
              setDraft(label);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-brand-border bg-surface-raised px-2 py-0.5 text-[13px] text-text-primary outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm) {
            onDelete();
            setConfirm(false);
          } else {
            setConfirm(true);
          }
        }}
        title={confirm ? "정말 삭제할까요?" : "삭제"}
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold transition-all ${
          confirm
            ? "bg-destructive text-destructive-foreground"
            : "text-text-muted opacity-0 hover:bg-danger-glass hover:text-destructive group-hover:opacity-100"
        }`}
      >
        {confirm ? "삭제?" : "✕"}
      </button>
      {menuPosition && (
        <RenameContextMenu
          position={menuPosition}
          onRename={beginEditing}
          onDelete={() => {
            setMenuPosition(null);
            if (window.confirm(`"${label}" 항목을 삭제할까요?`)) {
              onDelete();
            }
          }}
          onClose={() => setMenuPosition(null)}
        />
      )}
    </div>
  );
}

type ContextMenuPosition = { x: number; y: number };

function RenameContextMenu({
  position,
  onRename,
  onDelete,
  onClose,
}: {
  position: ContextMenuPosition;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      role="menu"
      style={{ left: position.x, top: position.y }}
      onPointerDown={(event) => event.stopPropagation()}
      className="fixed z-[100] min-w-36 overflow-hidden rounded-lg border border-surface-border bg-surface-raised p-1 text-[12px] font-medium text-text-secondary shadow-xl"
    >
      <button
        type="button"
        role="menuitem"
        onClick={onRename}
        className="block w-full rounded-md px-3 py-2 text-left hover:bg-surface-muted hover:text-brand-primary"
      >
        이름 변경
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        className="block w-full rounded-md px-3 py-2 text-left text-destructive hover:bg-danger-glass"
      >
        삭제
      </button>
    </div>
  );
}

function ArchNoteDeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (confirm) {
          onDelete();
          setConfirm(false);
        } else {
          setConfirm(true);
        }
      }}
      onMouseLeave={() => setConfirm(false)}
      className={`shrink-0 rounded-md px-2 py-1 text-[12px] font-bold transition-all ${
        confirm
          ? "bg-destructive text-destructive-foreground"
          : "text-text-muted opacity-0 hover:bg-danger-glass hover:text-destructive group-hover:opacity-100"
      }`}
    >
      {confirm ? "삭제?" : "✕"}
    </button>
  );
}

function SortableNoteCard({
  note,
  index,
  onClick,
  onDelete,
}: {
  note: HierarchicalDocument;
  index: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id: note.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="group flex cursor-pointer touch-none items-center gap-3 rounded-xl border border-surface-border-soft bg-surface-raised px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-[12px] font-black text-text-muted group-hover:bg-brand-glass group-hover:text-brand-primary">
        {index + 1}
      </span>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-[16px] group-hover:bg-brand-glass">
        📝
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text-secondary group-hover:text-brand-primary">
        {note.title || "제목 없음"}
      </span>
      <ArchNoteDeleteButton onDelete={onDelete} />
    </div>
  );
}

export default HierarchicalDocumentModule;
