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
import { GitPullRequest, Plus, RefreshCw } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { toast } from "../../shared/ui/Toast";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import { ColumnResizeHandle } from "../../shared/ui/ColumnResizeHandle";
import { useColumnResize } from "../../shared/lib/useColumnResize";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { getToken } from "../../shared/api/client";
import {
  createCategory,
  createNote,
  createSection,
  createWorkspace,
  deleteCategory,
  deleteNote,
  deleteSection,
  deleteWorkspace,
  getCategories,
  getNotes,
  getSections,
  listWorkspaces,
  reorderCategories,
  reorderNotes,
  reorderSections,
  updateNote,
  type PcrCategory,
  type PcrNote,
  type PcrSection,
  type PcrWorkspace,
} from "../../features/project-code-review/api";

const EMPTY_LEXICAL =
  '{"root":{"children":[{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

function ProjectCodeReviewModule() {
  const [workspaces, setWorkspaces] = useState<PcrWorkspace[]>([]);
  const [categories, setCategories] = useState<PcrCategory[]>([]);
  const [sections, setSections] = useState<PcrSection[]>([]);
  const [notes, setNotes] = useState<PcrNote[]>([]);

  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<PcrNote | null>(null);

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
  const topicWidth = useAppSettingsStore((s) => s.codeReviewTopicWidth);
  const setTopicWidth = useAppSettingsStore((s) => s.setCodeReviewTopicWidth);
  const sectionWidth = useAppSettingsStore((s) => s.codeReviewSectionWidth);
  const setSectionWidth = useAppSettingsStore((s) => s.setCodeReviewSectionWidth);
  const startTopicResize = useColumnResize(topicWidth, setTopicWidth);
  const startSectionResize = useColumnResize(sectionWidth, setSectionWidth);

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    // 프로젝트 전환 시 하위 선택(1·2차 주제·노트) 모두 초기화 → 이전 내용 잔상 제거
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
      const list = await listWorkspaces(token);
      setWorkspaces(list);
      // 첫 프로젝트 자동 선택
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
      setCategories(await getCategories(token, workspaceId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function loadSections(categoryId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setSections(await getSections(token, categoryId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function loadNotes(sectionId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setNotes(await getNotes(token, sectionId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function addWorkspace() {
    const token = getToken();
    if (!token || !newWorkspaceName.trim()) return;
    try {
      const created = await createWorkspace(token, {
        title: newWorkspaceName.trim(),
      });
      setWorkspaces((prev) => [...prev, created]);
      setSelectedWorkspace(created.id);
      setNewWorkspaceName("");
      setAddingWorkspace(false);
      toast.success("프로젝트를 추가했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가하지 못했습니다.");
    }
  }

  async function removeWorkspace(id: string) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteWorkspace(token, id);
      const remaining = workspaces.filter((w) => w.id !== id);
      setWorkspaces(remaining);
      if (selectedWorkspace === id) {
        setSelectedWorkspace(remaining[0]?.id ?? null);
      }
      toast.success("프로젝트를 삭제했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  async function addCategory() {
    const token = getToken();
    if (!token || !selectedWorkspace || !newCategoryName.trim()) return;
    try {
      const created = await createCategory(token, selectedWorkspace, {
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
      const created = await createSection(token, {
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

  async function addNote() {
    const token = getToken();
    if (!token || !selectedSection) return;
    try {
      const created = await createNote(token, {
        sectionId: selectedSection,
        title: "새 리뷰 노트",
        content: EMPTY_LEXICAL,
      });
      setNotes((prev) => [...prev, created]);
      setSelectedNote(created);
      toast.success("노트를 생성했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "생성하지 못했습니다.");
    }
  }

  async function saveNote() {
    const token = getToken();
    if (!token || !selectedNote || !draftTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await updateNote(token, selectedNote.id, {
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
      await deleteCategory(token, id);
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
      await deleteSection(token, id);
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
      await deleteNote(token, id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
      toast.success("노트를 삭제했습니다.");
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
      await reorderCategories(token, selectedWorkspace, reordered.map((c) => c.id));
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
      await reorderSections(token, selectedCategory, reordered.map((s) => s.id));
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
      await reorderNotes(token, selectedSection, reordered.map((note) => note.id));
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
          프로젝트 코드리뷰
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

      {/* 프로젝트 탭바 — 프로젝트가 있을 때만 */}
      {workspaces.length > 0 && (
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2 overflow-x-auto">
        {workspaces.map((ws) => (
          <WorkspaceTab
            key={ws.id}
            workspace={ws}
            selected={selectedWorkspace === ws.id}
            onClick={() => setSelectedWorkspace(ws.id)}
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
            placeholder="프로젝트 이름 (예: towercrane-server)"
            className="shrink-0 w-52 rounded-lg border border-emerald-400 px-3 py-1.5 text-[13px] outline-none"
          />
        ) : (
          <button
            onClick={() => setAddingWorkspace(true)}
            title="새 프로젝트"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-[12px] font-bold text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            프로젝트
          </button>
        )}
      </div>
      )}

      {!selectedWorkspace ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="grid size-16 place-items-center rounded-2xl bg-slate-50 shadow-sm">
            <GitPullRequest className="size-8 text-slate-300" strokeWidth={1.5} />
          </div>
          {loading ? (
            <span className="text-[14px] font-medium text-slate-400">
              불러오는 중…
            </span>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-[16px] font-bold text-slate-700">
                  프로젝트 코드리뷰를 시작하세요
                </p>
                <p className="text-[13px] text-slate-400">
                  프로젝트별 워크스페이스를 만들어 코드리뷰 노트를 정리합니다.
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
                  placeholder="프로젝트 이름 (예: towercrane-server)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[14px] outline-none focus:border-emerald-400"
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
            className="shrink-0 border-r border-slate-200 bg-white flex flex-col"
          >
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2.5">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") addCategory();
                }}
                placeholder="새 1차 주제"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[12px] outline-none focus:border-emerald-400"
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
                    <PcrRow
                      key={cat.id}
                      id={cat.id}
                      icon="📁"
                      label={cat.name}
                      selected={selectedCategory === cat.id}
                      hoverBg="hover:bg-slate-50"
                      onClick={() => setSelectedCategory(cat.id)}
                      onDelete={() => removeCategory(cat.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {categories.length === 0 && (
                <p className="px-3 py-4 text-[12px] text-slate-400">
                  1차 주제를 추가하세요.
                </p>
              )}
            </div>
          </aside>

          <ColumnResizeHandle onMouseDown={startTopicResize} />

          {/* 2열: 섹션 */}
          <aside
            style={{ width: sectionWidth }}
            className="shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col"
          >
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2.5">
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") addSection();
                }}
                placeholder="새 2차 주제"
                disabled={!selectedCategory}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[12px] outline-none focus:border-emerald-400 disabled:bg-slate-100"
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
                      <PcrRow
                        key={sec.id}
                        id={sec.id}
                        icon="🔍"
                        label={sec.title}
                        selected={selectedSection === sec.id}
                        hoverBg="hover:bg-white"
                        onClick={() => setSelectedSection(sec.id)}
                        onDelete={() => removeSection(sec.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="px-3 py-4 text-[12px] text-slate-400">
                  왼쪽에서 1차 주제를 선택하세요.
                </p>
              )}
            </div>
          </aside>

          <ColumnResizeHandle onMouseDown={startSectionResize} />

          {/* 3열: 노트 */}
          <section className="min-w-0 flex-1 overflow-y-auto bg-slate-50 flex flex-col relative">
            {!selectedSection ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-white shadow-sm">
                  <GitPullRequest className="size-8 text-slate-300" strokeWidth={1.5} />
                </div>
                <span className="text-[14px] font-medium text-slate-400">
                  2차 주제를 선택해서 리뷰 노트를 추가하세요.
                </span>
              </div>
            ) : !selectedNote ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="w-full max-w-5xl px-5 py-6 lg:px-6">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[22px]">
                        🔍
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-[18px] font-black text-slate-900">
                          {selectedSectionTitle}
                        </h2>
                        <p className="text-[12px] text-slate-400">
                          리뷰 노트 {notes.length}개
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={addNote}
                      className="shrink-0 rounded-lg px-4 py-2 text-[13px]"
                    >
                      + 새 리뷰 노트
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-20 text-center">
                      <span className="text-4xl opacity-50">📝</span>
                      <p className="text-[13px] text-slate-400">
                        아직 리뷰 노트가 없습니다. 새 노트를 만들어보세요.
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
                      className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-slate-400 hover:bg-white hover:text-emerald-600"
                    >
                      ← 노트 목록
                    </button>
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="리뷰 노트 제목"
                      className="mb-4 min-w-0 w-full rounded-lg border border-surface-border-soft bg-surface-raised px-3 py-2 text-[22px] font-black text-text-primary outline-none transition-colors hover:border-surface-border focus:border-brand-border focus:bg-surface-raised"
                    />
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <LexicalEditor
                        key={selectedNote.id}
                        initialState={draftContent}
                        onChange={setDraftContent}
                        placeholder="코드리뷰 내용을 작성하세요..."
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
                          window.confirm("이 리뷰 노트를 삭제할까요?")
                        ) {
                          void removeNote(selectedNote.id);
                        }
                      }}
                      className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      🗑 삭제
                    </button>
                    <div className="flex items-center gap-3">
                      {isDirty && (
                        <span className="text-[12px] font-medium text-emerald-600">
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
  onDelete,
}: {
  workspace: PcrWorkspace;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div
      onMouseLeave={() => setConfirm(false)}
      className={`group flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors ${
        selected
          ? "bg-emerald-500 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      <button onClick={onClick} className="flex items-center gap-1.5">
        <GitPullRequest className="size-3.5" strokeWidth={2} />
        {workspace.title}
      </button>
      <button
        onClick={() => {
          if (confirm) {
            onDelete();
            setConfirm(false);
          } else {
            setConfirm(true);
          }
        }}
        title={confirm ? "정말 삭제할까요?" : "프로젝트 삭제"}
        className={`rounded px-1 text-[11px] transition-all ${
          confirm
            ? selected
              ? "bg-white/25 text-white"
              : "bg-red-500 text-white"
            : selected
              ? "text-white/70 hover:text-white"
              : "text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
        }`}
      >
        {confirm ? "삭제?" : "✕"}
      </button>
    </div>
  );
}

function PcrRow({
  id,
  icon,
  label,
  selected,
  hoverBg,
  onClick,
  onDelete,
}: {
  id: string;
  icon: string;
  label: string;
  selected: boolean;
  hoverBg: string;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });
  const [confirm, setConfirm] = useState(false);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onMouseLeave={() => setConfirm(false)}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className={`group relative flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-[13px] touch-none transition-colors ${
        selected
          ? "bg-emerald-50 font-bold text-emerald-700"
          : `text-slate-600 ${hoverBg}`
      }`}
    >
      {selected && (
        <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-emerald-500" />
      )}
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
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
            ? "bg-red-500 text-white"
            : "text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        }`}
      >
        {confirm ? "삭제?" : "✕"}
      </button>
    </div>
  );
}

function PcrNoteDeleteButton({ onDelete }: { onDelete: () => void }) {
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
          ? "bg-red-500 text-white"
          : "text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
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
  note: PcrNote;
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
      <PcrNoteDeleteButton onDelete={onDelete} />
    </div>
  );
}

export default ProjectCodeReviewModule;
