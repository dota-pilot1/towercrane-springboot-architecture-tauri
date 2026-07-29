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
import { BookOpen, RefreshCw } from "lucide-react";
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
  deleteCategory,
  deleteNote,
  deleteSection,
  getCategories,
  getMyNotes,
  getSectionsByCategory,
  reorderCategories,
  reorderNotes,
  reorderSections,
  updateNote,
  type DiaryCategory,
  type DiaryNote,
  type DiarySection,
} from "../../features/study-diary/api";

const EMPTY_LEXICAL =
  '{"root":{"children":[{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

function StudyDiaryModule() {
  const [categories, setCategories] = useState<DiaryCategory[]>([]);
  const [sections, setSections] = useState<DiarySection[]>([]);
  const [notes, setNotes] = useState<DiaryNote[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<DiaryNote | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const topicWidth = useAppSettingsStore((s) => s.studyDiaryTopicWidth);
  const setTopicWidth = useAppSettingsStore((s) => s.setStudyDiaryTopicWidth);
  const sectionWidth = useAppSettingsStore((s) => s.studyDiarySectionWidth);
  const setSectionWidth = useAppSettingsStore((s) => s.setStudyDiarySectionWidth);
  const startTopicResize = useColumnResize(topicWidth, setTopicWidth);
  const startSectionResize = useColumnResize(sectionWidth, setSectionWidth);

  useEffect(() => {
    void loadCategories();
  }, []);

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

  async function loadCategories() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setCategories(await getCategories(token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSections(categoryId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setSections(await getSectionsByCategory(token, categoryId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function loadNotes(sectionId: string) {
    const token = getToken();
    if (!token) return;
    try {
      setNotes(await getMyNotes(token, sectionId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    }
  }

  async function addCategory() {
    const token = getToken();
    if (!token || !newCategoryName.trim()) return;
    try {
      const created = await createCategory(token, { name: newCategoryName.trim() });
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
        title: "새 노트",
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
      setSelectedNote(null); // 저장 후 노트 목록으로
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
    if (!token || !over || active.id === over.id) return;
    const from = categories.findIndex((c) => c.id === active.id);
    const to = categories.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(categories, from, to);
    setCategories(reordered);
    try {
      await reorderCategories(token, reordered.map((c) => c.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "순서 변경 실패");
      void loadCategories();
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
    const from = notes.findIndex((n) => n.id === active.id);
    const to = notes.findIndex((n) => n.id === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(notes, from, to);
    setNotes(reordered);
    try {
      await reorderNotes(token, selectedSection, reordered.map((n) => n.id));
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
          스터디 노트
        </span>
        <Button
          variant="secondary"
          size="sm-icon"
          onClick={() => void loadCategories()}
          title="새로고침"
        >
          <RefreshCw className="size-3.5" strokeWidth={2} />
        </Button>
      </PageHeader>

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
              placeholder="새 카테고리"
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
            {loading ? (
              <p className="px-3 py-4 text-[12px] text-slate-400">불러오는 중…</p>
            ) : (
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
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      selected={selectedCategory === cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      onDelete={() => removeCategory(cat.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            {!loading && categories.length === 0 && (
              <p className="px-3 py-4 text-[12px] text-slate-400">
                카테고리를 추가하세요.
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
              placeholder="새 섹션"
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
                    <SectionRow
                      key={sec.id}
                      section={sec}
                      selected={selectedSection === sec.id}
                      onClick={() => setSelectedSection(sec.id)}
                      onDelete={() => removeSection(sec.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <p className="px-3 py-4 text-[12px] text-slate-400">
                왼쪽에서 카테고리를 선택하세요.
              </p>
            )}
          </div>
        </aside>

        <ColumnResizeHandle onMouseDown={startSectionResize} />

        {/* 3열: 노트 에디터 */}
        <section className="min-w-0 flex-1 overflow-y-auto bg-slate-50 flex flex-col relative">
          {!selectedSection ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-white shadow-sm">
                <BookOpen className="size-8 text-slate-300" strokeWidth={1.5} />
              </div>
              <span className="text-[14px] font-medium text-slate-400">
                섹션을 선택해서 노트를 추가하세요.
              </span>
            </div>
          ) : !selectedNote ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="w-full max-w-5xl px-5 py-6 lg:px-6">
                {/* 섹션 헤더 */}
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[22px]">
                      📖
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-[18px] font-black text-slate-900">
                        {selectedSectionTitle}
                      </h2>
                      <p className="text-[12px] text-slate-400">
                        노트 {notes.length}개
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={addNote}
                    className="shrink-0 rounded-lg px-4 py-2 text-[13px]"
                  >
                    + 새 노트
                  </Button>
                </div>

                {notes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-20 text-center">
                    <span className="text-4xl opacity-50">📝</span>
                    <p className="text-[13px] text-slate-400">
                      아직 노트가 없습니다. 새 노트를 만들어보세요.
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleNoteReorder}
                  >
                    <SortableContext
                      items={notes.map((n) => n.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-2">
                        {notes.map((note) => (
                          <NoteRow
                            key={note.id}
                            note={note}
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
                    placeholder="노트 제목"
                    className="mb-4 min-w-0 w-full rounded-lg border border-surface-border-soft bg-surface-raised px-3 py-2 text-[22px] font-black text-text-primary outline-none transition-colors hover:border-surface-border focus:border-brand-border focus:bg-surface-raised"
                  />
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <LexicalEditor
                      key={selectedNote.id}
                      initialState={draftContent}
                      onChange={setDraftContent}
                      placeholder="노트를 작성하세요..."
                      minHeight="calc(100dvh - 22rem)"
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
                        window.confirm("이 노트를 삭제할까요?")
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
    </div>
  );
}

function DiaryRow({
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

function CategoryRow({
  category,
  selected,
  onClick,
  onDelete,
}: {
  category: DiaryCategory;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <DiaryRow
      id={category.id}
      icon="📚"
      label={category.name}
      selected={selected}
      hoverBg="hover:bg-slate-50"
      onClick={onClick}
      onDelete={onDelete}
    />
  );
}

function SectionRow({
  section,
  selected,
  onClick,
  onDelete,
}: {
  section: DiarySection;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <DiaryRow
      id={section.id}
      icon="📖"
      label={section.title}
      selected={selected}
      hoverBg="hover:bg-white"
      onClick={onClick}
      onDelete={onDelete}
    />
  );
}

function NoteRow({
  note,
  onClick,
  onDelete,
}: {
  note: DiaryNote;
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
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left touch-none transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-[16px] group-hover:bg-emerald-50">
        📝
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-slate-700 group-hover:text-emerald-700">
        {note.title || "제목 없음"}
      </span>
      <NoteDeleteButton onDelete={onDelete} />
    </div>
  );
}

function NoteDeleteButton({ onDelete }: { onDelete: () => void }) {
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

export default StudyDiaryModule;
