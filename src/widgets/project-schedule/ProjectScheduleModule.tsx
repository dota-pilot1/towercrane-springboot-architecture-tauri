import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createProjectSchedule,
  deleteProjectSchedule,
  listProjectSchedules,
  reorderProjectSchedules,
  updateProjectSchedule,
  type ProjectSchedule,
  type ProjectScheduleInput,
} from "../../features/project-schedule/api";
import { getToken } from "../../shared/api/client";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { useColumnResize } from "../../shared/lib/useColumnResize";
import { Button } from "../../shared/ui/button";
import { ColumnResizeHandle } from "../../shared/ui/ColumnResizeHandle";
import { Input } from "../../shared/ui/input";
import { Label } from "../../shared/ui/label";
import PageHeader from "../../shared/ui/PageHeader";
import { toast } from "../../shared/ui/Toast";

type ScheduleDraft = {
  title: string;
  description: string;
  startValue: string;
  endValue: string;
};

type VisibleRange = {
  from: string;
  to: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateInputValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toDateKey(date);
}

function inputValueToIso(value: string, isEnd: boolean) {
  const date = new Date(`${value}T${isEnd ? "23:59:59" : "00:00:00"}`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("날짜 형식을 확인해주세요.");
  }
  return date.toISOString();
}

function nextDateKey(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return toDateKey(date);
}

function initialRange(): VisibleRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function initialDraft(dateKey: string): ScheduleDraft {
  return {
    title: "",
    description: "",
    startValue: dateKey,
    endValue: "",
  };
}

function scheduleToDraft(schedule: ProjectSchedule): ScheduleDraft {
  return {
    title: schedule.title,
    description: schedule.description,
    startValue: toDateInputValue(schedule.startAt),
    endValue: schedule.endAt ? toDateInputValue(schedule.endAt) : "",
  };
}

function formatScheduleTime(schedule: ProjectSchedule) {
  const start = toDateInputValue(schedule.startAt);
  if (!schedule.endAt) return start;
  const end = toDateInputValue(schedule.endAt);
  return start === end ? start : `${start} - ${end}`;
}

function ProjectScheduleModule() {
  const calendarRef = useRef<FullCalendar>(null);
  const drawerCloseTimerRef = useRef<number | null>(null);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);
  const [visibleRange, setVisibleRange] = useState<VisibleRange>(initialRange);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>(
    initialDraft(toDateKey(new Date())),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const scheduleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const detailWidth = useAppSettingsStore(
    (state) => state.projectScheduleDetailWidth,
  );
  const setDetailWidth = useAppSettingsStore(
    (state) => state.setProjectScheduleDetailWidth,
  );
  const startDetailResize = useColumnResize(detailWidth, setDetailWidth, {
    min: 520,
    max: 780,
    direction: "reverse",
  });

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === selectedId) ?? null,
    [schedules, selectedId],
  );

  const orderedSchedules = useMemo(
    () =>
      [...schedules].sort(
        (a, b) =>
          a.orderIdx - b.orderIdx ||
          a.startAt.localeCompare(b.startAt) ||
          a.createdAt.localeCompare(b.createdAt),
      ),
    [schedules],
  );
  const canReorderSchedules =
    orderedSchedules.length > 1 &&
    orderedSchedules.every((schedule) => schedule.canEdit);

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      schedules.map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        start: toDateInputValue(schedule.startAt),
        end:
          schedule.endAt
            ? nextDateKey(toDateInputValue(schedule.endAt))
            : undefined,
        allDay: true,
      })),
    [schedules],
  );

  async function loadSchedules() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      toast.error("로그인이 필요합니다.");
      return;
    }
    try {
      setLoading(true);
      const next = await listProjectSchedules(token, {
        ...visibleRange,
      });
      setSchedules(next);
      if (selectedId && !next.some((schedule) => schedule.id === selectedId)) {
        setSelectedId(null);
        setCreating(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "일정을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedules();
  }, [visibleRange.from, visibleRange.to]);

  useEffect(
    () => () => {
      if (drawerCloseTimerRef.current !== null) {
        window.clearTimeout(drawerCloseTimerRef.current);
      }
    },
    [],
  );

  function handleDatesSet(info: DatesSetArg) {
    setCalendarTitle(info.view.title);
    setVisibleRange({
      from: info.start.toISOString(),
      to: info.end.toISOString(),
    });
  }

  function openDate(dateKey: string) {
    setSelectedDate(dateKey);
    closeDrawer();
  }

  function openSchedule(schedule: ProjectSchedule) {
    if (drawerCloseTimerRef.current !== null) {
      window.clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setDrawerClosing(false);
    setSelectedDate(toDateKey(new Date(schedule.startAt)));
    setSelectedId(schedule.id);
    setCreating(false);
    setDraft(scheduleToDraft(schedule));
  }

  function handleEventClick(info: EventClickArg) {
    const schedule = schedules.find((item) => item.id === info.event.id);
    if (schedule) openSchedule(schedule);
  }

  function startCreate(dateKey = selectedDate) {
    if (drawerCloseTimerRef.current !== null) {
      window.clearTimeout(drawerCloseTimerRef.current);
      drawerCloseTimerRef.current = null;
    }
    setDrawerClosing(false);
    setSelectedDate(dateKey);
    setSelectedId(null);
    setCreating(true);
    setDraft(initialDraft(dateKey));
  }

  function handleDateClick(info: DateClickArg) {
    openDate(info.dateStr);
  }

  function closeDrawer() {
    if ((!creating && !selectedId) || drawerClosing) return;
    setDrawerClosing(true);
    drawerCloseTimerRef.current = window.setTimeout(() => {
      setSelectedId(null);
      setCreating(false);
      setDrawerClosing(false);
      drawerCloseTimerRef.current = null;
    }, 180);
  }

  function toPayload(): ProjectScheduleInput {
    const title = draft.title.trim();
    if (!title) throw new Error("일정 제목을 입력해주세요.");
    if (!draft.startValue) throw new Error("시작일을 입력해주세요.");
    const startAt = inputValueToIso(draft.startValue, false);
    const endAt = draft.endValue
      ? inputValueToIso(draft.endValue, true)
      : null;
    if (endAt && Date.parse(startAt) > Date.parse(endAt)) {
      throw new Error("종료일은 시작일 이후여야 합니다.");
    }
    return {
      title,
      description: draft.description,
      startAt,
      endAt,
    };
  }

  async function handleSave() {
    const token = getToken();
    if (!token) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    try {
      setSaving(true);
      const payload = toPayload();
      const saved = creating
        ? await createProjectSchedule(token, payload)
        : selectedSchedule
          ? await updateProjectSchedule(token, selectedSchedule.id, payload)
          : null;
      if (!saved) return;
      setSchedules((current) => [
        ...current.filter((schedule) => schedule.id !== saved.id),
        saved,
      ]);
      setSelectedId(saved.id);
      setSelectedDate(toDateKey(new Date(saved.startAt)));
      setCreating(false);
      setDraft(scheduleToDraft(saved));
      toast.success(creating ? "일정을 등록했습니다." : "일정을 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "일정을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const token = getToken();
    if (!token || !selectedSchedule?.canDelete) return;
    if (!window.confirm(`"${selectedSchedule.title}" 일정을 삭제할까요?`)) return;
    try {
      setSaving(true);
      await deleteProjectSchedule(token, selectedSchedule.id);
      setSchedules((current) =>
        current.filter((schedule) => schedule.id !== selectedSchedule.id),
      );
      setSelectedId(null);
      setCreating(false);
      toast.success("일정을 삭제했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "일정을 삭제하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleScheduleReorder(event: DragEndEvent) {
    const token = getToken();
    const { active, over } = event;
    if (
      !token ||
      !over ||
      active.id === over.id ||
      !canReorderSchedules
    ) {
      return;
    }
    const from = orderedSchedules.findIndex(
      (schedule) => schedule.id === active.id,
    );
    const to = orderedSchedules.findIndex(
      (schedule) => schedule.id === over.id,
    );
    if (from < 0 || to < 0) return;

    const reordered = arrayMove(orderedSchedules, from, to);
    const orderSlots = orderedSchedules
      .map((schedule) => schedule.orderIdx)
      .sort((a, b) => a - b);
    const optimistic = reordered.map((schedule, index) => ({
      ...schedule,
      orderIdx: orderSlots[index],
    }));
    setSchedules(optimistic);

    try {
      await reorderProjectSchedules(
        token,
        optimistic.map((schedule) => schedule.id),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "일정 순서를 바꾸지 못했습니다.",
      );
      void loadSchedules();
    }
  }

  const formOpen = creating || !!selectedSchedule;
  const formDisabled = !creating && !selectedSchedule?.canEdit;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface-strong">
      <PageHeader>
        <CalendarDays className="size-5 text-brand-primary" />
        <strong className="text-sm text-text-primary">개발 일정</strong>
        <Button
          variant="secondary"
          size="sm-icon"
          className="ml-1"
          aria-label="일정 새로고침"
          title="일정 새로고침"
          onClick={() => void loadSchedules()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1 p-3">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised">
          <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-surface-border-soft px-4 py-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => calendarRef.current?.getApi().today()}
            >
              오늘
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm-icon"
                aria-label="이전 달"
                title="이전 달"
                onClick={() => calendarRef.current?.getApi().prev()}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm-icon"
                aria-label="다음 달"
                title="다음 달"
                onClick={() => calendarRef.current?.getApi().next()}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <strong className="mr-auto min-w-32 text-base text-text-primary">
              {calendarTitle}
            </strong>

            <Button size="sm" onClick={() => startCreate()}>
              <Plus className="size-4" />
              일정 추가
            </Button>
          </div>

          <div className="project-schedule-calendar min-h-0 flex-1 p-3">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={koLocale}
              headerToolbar={false}
              height="100%"
              fixedWeekCount={false}
              showNonCurrentDates
              dayMaxEvents={3}
              events={calendarEvents}
              datesSet={handleDatesSet}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventClassNames={["project-schedule-event"]}
              nowIndicator
            />
          </div>
        </section>

        <ColumnResizeHandle
          onPointerDown={startDetailResize}
          title="일정 상세 영역 너비 조절"
        />

        <aside
          className="relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised"
          style={{ width: detailWidth }}
        >
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-surface-border-soft px-3">
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-text-primary">
                개발 일정 목록
              </strong>
              <span className="text-xs text-text-muted">
                표시 기간 {orderedSchedules.length}개 · 선택일{" "}
                {new Intl.DateTimeFormat("ko-KR", {
                  month: "long",
                  day: "numeric",
                }).format(new Date(`${selectedDate}T00:00:00`))}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm-icon"
              aria-label="선택 날짜에 일정 추가"
              title="일정 추가"
              onClick={() => startCreate()}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {orderedSchedules.length === 0 ? (
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md border border-dashed border-surface-border-soft px-3 py-4 text-left transition-colors hover:bg-surface-muted"
                onClick={() => startCreate()}
              >
                <CalendarPlus className="size-5 text-brand-primary" />
                <span>
                  <strong className="block text-sm text-text-primary">
                    등록된 일정이 없습니다.
                  </strong>
                  <span className="text-xs text-text-muted">
                    선택한 날짜에 일정을 추가합니다.
                  </span>
                </span>
              </button>
            ) : (
              <DndContext
                sensors={scheduleSensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => void handleScheduleReorder(event)}
              >
                <SortableContext
                  items={orderedSchedules.map((schedule) => schedule.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {orderedSchedules.map((schedule, index) => (
                      <SortableScheduleRow
                        key={schedule.id}
                        schedule={schedule}
                        index={index}
                        selected={selectedId === schedule.id}
                        canReorder={canReorderSchedules}
                        onClick={() => openSchedule(schedule)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {formOpen && (
            <div
              className={`project-schedule-drawer absolute inset-0 z-10 flex min-h-0 flex-col shadow-xl ${
                drawerClosing ? "is-closing" : ""
              }`}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                <div className="mb-4 flex items-center gap-2">
                  <strong className="min-w-0 flex-1 truncate text-sm text-text-primary">
                    {creating ? "새 일정" : "일정 상세"}
                  </strong>
                  <Button
                    variant="ghost"
                    size="sm-icon"
                    aria-label="상세 닫기"
                    title="상세 닫기"
                    onClick={closeDrawer}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="schedule-title">제목</Label>
                    <Input
                      id="schedule-title"
                      className="bg-surface-raised"
                      value={draft.title}
                      placeholder="일정 제목"
                      disabled={formDisabled}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="schedule-start">시작</Label>
                      <Input
                        id="schedule-start"
                        type="date"
                        className="bg-surface-raised"
                        value={draft.startValue}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            startValue: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="schedule-end">종료 (선택)</Label>
                      <Input
                        id="schedule-end"
                        type="date"
                        className="bg-surface-raised"
                        value={draft.endValue}
                        min={draft.startValue}
                        disabled={formDisabled}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            endValue: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="schedule-description">상세 내용</Label>
                    <textarea
                      id="schedule-description"
                      className="min-h-44 w-full resize-y rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2 text-sm leading-6 text-text-primary shadow-sm outline-none transition-colors placeholder:text-text-muted focus:border-brand-border focus:ring-2 focus:ring-brand-border/40 disabled:cursor-not-allowed disabled:opacity-50"
                      value={draft.description}
                      placeholder="일정에 필요한 내용을 입력하세요."
                      disabled={formDisabled}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>

                  {!creating && selectedSchedule && (
                    <p className="text-xs text-text-muted">
                      작성자 {selectedSchedule.createdByName}
                    </p>
                  )}
                </div>
              </div>

              {(creating || selectedSchedule?.canEdit) && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-surface-border-soft bg-surface-raised p-3">
                  {!creating && selectedSchedule?.canDelete && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mr-auto"
                      onClick={() => void handleDelete()}
                      disabled={saving}
                    >
                      <Trash2 className="size-4" />
                      삭제
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (selectedSchedule) {
                        setDraft(scheduleToDraft(selectedSchedule));
                      } else {
                        closeDrawer();
                      }
                    }}
                    disabled={saving}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={saving}
                  >
                    <Save className="size-4" />
                    {saving ? "저장 중" : "저장"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SortableScheduleRow({
  schedule,
  index,
  selected,
  canReorder,
  onClick,
}: {
  schedule: ProjectSchedule;
  index: number;
  selected: boolean;
  canReorder: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: schedule.id, disabled: !canReorder });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`flex items-center rounded-md border transition-colors ${
        selected
          ? "border-brand-border bg-brand-glass"
          : "border-surface-border-soft bg-surface-muted hover:bg-surface-strong"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={`ml-1 grid size-8 shrink-0 touch-none place-items-center rounded-md text-text-muted ${
          canReorder
            ? "cursor-grab hover:bg-surface-raised hover:text-text-primary active:cursor-grabbing"
            : "cursor-default opacity-40"
        }`}
        aria-label={`${schedule.title} 순서 변경`}
        title={canReorder ? "드래그하여 순서 변경" : "순서를 변경할 수 없습니다."}
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-left"
        onClick={onClick}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md border border-surface-border-soft bg-surface-raised text-xs font-semibold text-text-secondary">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary">
            {schedule.title}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
            <Clock3 className="size-3" />
            <span className="truncate">{formatScheduleTime(schedule)}</span>
          </span>
        </span>
      </button>
    </div>
  );
}

export default ProjectScheduleModule;
