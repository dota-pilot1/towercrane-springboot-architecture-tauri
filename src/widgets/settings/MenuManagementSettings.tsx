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
import { GripVertical, RotateCcw } from "lucide-react";
import {
  APP_MODULES,
  type AppModuleDefinition,
} from "../../shared/config/app-modules";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { Button } from "../../shared/ui/button";
import { Switch } from "../../shared/ui/switch";

function MenuManagementSettings() {
  const moduleOrder = useAppSettingsStore((state) => state.moduleOrder);
  const hiddenModuleIds = useAppSettingsStore(
    (state) => state.hiddenModuleIds,
  );
  const setModuleOrder = useAppSettingsStore(
    (state) => state.setModuleOrder,
  );
  const setModuleVisible = useAppSettingsStore(
    (state) => state.setModuleVisible,
  );
  const resetModulePreferences = useAppSettingsStore(
    (state) => state.resetModulePreferences,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const orderedModules = [...APP_MODULES].sort((a, b) => {
    const aIndex = moduleOrder.indexOf(a.id);
    const bIndex = moduleOrder.indexOf(b.id);
    return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
  });
  const visibleCount = orderedModules.filter(
    (module) => !hiddenModuleIds.includes(module.id),
  ).length;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = orderedModules.findIndex((module) => module.id === active.id);
    const to = orderedModules.findIndex((module) => module.id === over.id);
    if (from < 0 || to < 0) return;
    setModuleOrder(arrayMove(orderedModules, from, to).map((module) => module.id));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-bold text-text-primary">
            사이드바 메뉴
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-text-secondary">
            드래그해서 순서를 바꾸고 사용하지 않는 메뉴를 숨길 수 있습니다.
            설정과 프로필은 항상 표시됩니다.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={resetModulePreferences}
          className="shrink-0"
        >
          <RotateCcw className="size-3.5" />
          기본값
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedModules.map((module) => module.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedModules.map((module) => {
              const visible = !hiddenModuleIds.includes(module.id);
              return (
                <SortableMenuRow
                  key={module.id}
                  module={module}
                  visible={visible}
                  visibilityLocked={visible && visibleCount === 1}
                  onVisibleChange={(nextVisible) =>
                    setModuleVisible(module.id, nextVisible)
                  }
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      <p className="text-[11px] text-text-muted">
        최소 한 개의 업무 메뉴는 표시되어야 합니다. 숨긴 메뉴의 데이터는
        삭제되지 않습니다.
      </p>
    </div>
  );
}

function SortableMenuRow({
  module,
  visible,
  visibilityLocked,
  onVisibleChange,
}: {
  module: AppModuleDefinition;
  visible: boolean;
  visibilityLocked: boolean;
  onVisibleChange: (visible: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });
  const Icon = module.icon;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="flex items-center gap-3 border-b border-surface-border-soft px-4 py-3 last:border-b-0"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="드래그하여 순서 변경"
        className="grid size-7 shrink-0 cursor-grab place-items-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text-primary active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-text-secondary">
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[13px] font-bold text-text-primary">
          {module.label}
        </strong>
        <span className="block truncate text-[11px] text-text-muted">
          {module.description}
        </span>
      </span>
      <Switch
        checked={visible}
        onCheckedChange={onVisibleChange}
        disabled={visibilityLocked}
        aria-label={`${module.label} 메뉴 ${visible ? "숨기기" : "표시하기"}`}
      />
    </div>
  );
}

export default MenuManagementSettings;

