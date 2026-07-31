import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_MODULE_ORDER,
  isAppModuleId,
  type AppModuleId,
} from "../config/app-modules";
import { DEFAULT_RAIL_THEME, type RailThemeId } from "./rail-themes";

const MENU_ORDER_VERSION = 3;

type AppSettingsState = {
  menuOrderVersion: number;
  notificationsEnabled: boolean;
  railTheme: RailThemeId;
  moduleOrder: AppModuleId[];
  hiddenModuleIds: AppModuleId[];
  apiDocCategoryWidth: number;
  apiDocEndpointWidth: number;
  archNoteTopicWidth: number;
  archNoteSectionWidth: number;
  planningDesignTopicWidth: number;
  planningDesignSectionWidth: number;
  devHistoryTopicWidth: number;
  devHistorySectionWidth: number;
  ideaNoteTopicWidth: number;
  ideaNoteSectionWidth: number;
  discussionNoteListWidth: number;
  discussionNoteCommentWidth: number;
  projectScheduleDetailWidth: number;
  codeReviewTopicWidth: number;
  codeReviewSectionWidth: number;
  studyDiaryTopicWidth: number;
  studyDiarySectionWidth: number;
  setNotificationsEnabled: (enabled: boolean) => void;
  setRailTheme: (theme: RailThemeId) => void;
  setModuleOrder: (moduleIds: AppModuleId[]) => void;
  setModuleVisible: (moduleId: AppModuleId, visible: boolean) => void;
  resetModulePreferences: () => void;
  setApiDocCategoryWidth: (width: number) => void;
  setApiDocEndpointWidth: (width: number) => void;
  setArchNoteTopicWidth: (width: number) => void;
  setArchNoteSectionWidth: (width: number) => void;
  setPlanningDesignTopicWidth: (width: number) => void;
  setPlanningDesignSectionWidth: (width: number) => void;
  setDevHistoryTopicWidth: (width: number) => void;
  setDevHistorySectionWidth: (width: number) => void;
  setIdeaNoteTopicWidth: (width: number) => void;
  setIdeaNoteSectionWidth: (width: number) => void;
  setDiscussionNoteListWidth: (width: number) => void;
  setDiscussionNoteCommentWidth: (width: number) => void;
  setProjectScheduleDetailWidth: (width: number) => void;
  setCodeReviewTopicWidth: (width: number) => void;
  setCodeReviewSectionWidth: (width: number) => void;
  setStudyDiaryTopicWidth: (width: number) => void;
  setStudyDiarySectionWidth: (width: number) => void;
};

function defaultTailModuleOrder(moduleIds: AppModuleId[]) {
  const tailIds: AppModuleId[] = ["projectschedule", "devhistory"];
  const headIds = moduleIds.filter((id) => !tailIds.includes(id));
  return [
    ...headIds,
    ...tailIds.filter((id) => moduleIds.includes(id)),
  ];
}

function placeCommunityModulesAfterChat(moduleIds: AppModuleId[]) {
  const communityIds: AppModuleId[] = ["discussionnote", "projectboard"];
  const ordered = moduleIds.filter((id) => !communityIds.includes(id));
  const chatIndex = ordered.indexOf("chat");
  ordered.splice(
    chatIndex >= 0 ? chatIndex + 1 : 0,
    0,
    ...communityIds.filter((id) => moduleIds.includes(id)),
  );
  return ordered;
}

function normalizeModuleOrder(
  moduleIds: AppModuleId[],
  options: { placeCommunityModulesAfterChat?: boolean } = {},
) {
  const normalized = defaultTailModuleOrder([
    ...new Set([
      ...moduleIds.filter((id) => isAppModuleId(id)),
      ...DEFAULT_MODULE_ORDER,
    ]),
  ]);
  return options.placeCommunityModulesAfterChat
    ? placeCommunityModulesAfterChat(normalized)
    : normalized;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      menuOrderVersion: MENU_ORDER_VERSION,
      notificationsEnabled: true,
      railTheme: DEFAULT_RAIL_THEME,
      moduleOrder: normalizeModuleOrder(DEFAULT_MODULE_ORDER, {
        placeCommunityModulesAfterChat: true,
      }),
      hiddenModuleIds: [],
      apiDocCategoryWidth: 224, // w-56
      apiDocEndpointWidth: 256, // w-64
      archNoteTopicWidth: 224, // w-56 (1차 주제)
      archNoteSectionWidth: 224, // w-56 (2차 주제)
      planningDesignTopicWidth: 224, // w-56 (1차 주제)
      planningDesignSectionWidth: 224, // w-56 (2차 주제)
      devHistoryTopicWidth: 224, // w-56 (1차 주제)
      devHistorySectionWidth: 224, // w-56 (2차 주제)
      ideaNoteTopicWidth: 224, // w-56 (1차 주제)
      ideaNoteSectionWidth: 224, // w-56 (2차 주제)
      discussionNoteListWidth: 420,
      discussionNoteCommentWidth: 440,
      projectScheduleDetailWidth: 680,
      codeReviewTopicWidth: 224, // w-56 (1차 주제)
      codeReviewSectionWidth: 224, // w-56 (2차 주제)
      studyDiaryTopicWidth: 224, // w-56 (1차 주제)
      studyDiarySectionWidth: 224, // w-56 (2차 주제)
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setRailTheme: (theme) => set({ railTheme: theme }),
      setModuleOrder: (moduleIds) =>
        set({
          moduleOrder: normalizeModuleOrder(moduleIds),
          menuOrderVersion: MENU_ORDER_VERSION,
        }),
      setModuleVisible: (moduleId, visible) =>
        set((state) => ({
          hiddenModuleIds: visible
            ? state.hiddenModuleIds.filter((id) => id !== moduleId)
            : [...new Set([...state.hiddenModuleIds, moduleId])],
        })),
      resetModulePreferences: () =>
        set({
          moduleOrder: normalizeModuleOrder(DEFAULT_MODULE_ORDER, {
            placeCommunityModulesAfterChat: true,
          }),
          menuOrderVersion: MENU_ORDER_VERSION,
          hiddenModuleIds: [],
        }),
      setApiDocCategoryWidth: (width) => set({ apiDocCategoryWidth: width }),
      setApiDocEndpointWidth: (width) => set({ apiDocEndpointWidth: width }),
      setArchNoteTopicWidth: (width) => set({ archNoteTopicWidth: width }),
      setArchNoteSectionWidth: (width) => set({ archNoteSectionWidth: width }),
      setPlanningDesignTopicWidth: (width) =>
        set({ planningDesignTopicWidth: width }),
      setPlanningDesignSectionWidth: (width) =>
        set({ planningDesignSectionWidth: width }),
      setDevHistoryTopicWidth: (width) =>
        set({ devHistoryTopicWidth: width }),
      setDevHistorySectionWidth: (width) =>
        set({ devHistorySectionWidth: width }),
      setIdeaNoteTopicWidth: (width) =>
        set({ ideaNoteTopicWidth: width }),
      setIdeaNoteSectionWidth: (width) =>
        set({ ideaNoteSectionWidth: width }),
      setDiscussionNoteListWidth: (width) =>
        set({ discussionNoteListWidth: width }),
      setDiscussionNoteCommentWidth: (width) =>
        set({ discussionNoteCommentWidth: width }),
      setProjectScheduleDetailWidth: (width) =>
        set({ projectScheduleDetailWidth: width }),
      setCodeReviewTopicWidth: (width) => set({ codeReviewTopicWidth: width }),
      setCodeReviewSectionWidth: (width) => set({ codeReviewSectionWidth: width }),
      setStudyDiaryTopicWidth: (width) => set({ studyDiaryTopicWidth: width }),
      setStudyDiarySectionWidth: (width) => set({ studyDiarySectionWidth: width }),
    }),
    {
      name: "towercrane.appSettings",
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppSettingsState> | undefined;
        const shouldMigrateMenuOrder =
          saved?.menuOrderVersion !== MENU_ORDER_VERSION;
        return {
          ...current,
          ...saved,
          menuOrderVersion: MENU_ORDER_VERSION,
          projectScheduleDetailWidth:
            saved?.projectScheduleDetailWidth &&
            saved.projectScheduleDetailWidth >= 640
              ? saved.projectScheduleDetailWidth
              : current.projectScheduleDetailWidth,
          moduleOrder: normalizeModuleOrder(
            saved?.moduleOrder ?? current.moduleOrder,
            { placeCommunityModulesAfterChat: shouldMigrateMenuOrder },
          ),
          hiddenModuleIds:
            saved?.hiddenModuleIds?.filter(isAppModuleId) ??
            current.hiddenModuleIds,
        };
      },
    },
  ),
);
