import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_RAIL_THEME, type RailThemeId } from "./rail-themes";

type AppSettingsState = {
  notificationsEnabled: boolean;
  railTheme: RailThemeId;
  apiDocCategoryWidth: number;
  apiDocEndpointWidth: number;
  archNoteTopicWidth: number;
  archNoteSectionWidth: number;
  planningDesignTopicWidth: number;
  planningDesignSectionWidth: number;
  codeReviewTopicWidth: number;
  codeReviewSectionWidth: number;
  studyDiaryTopicWidth: number;
  studyDiarySectionWidth: number;
  setNotificationsEnabled: (enabled: boolean) => void;
  setRailTheme: (theme: RailThemeId) => void;
  setApiDocCategoryWidth: (width: number) => void;
  setApiDocEndpointWidth: (width: number) => void;
  setArchNoteTopicWidth: (width: number) => void;
  setArchNoteSectionWidth: (width: number) => void;
  setPlanningDesignTopicWidth: (width: number) => void;
  setPlanningDesignSectionWidth: (width: number) => void;
  setCodeReviewTopicWidth: (width: number) => void;
  setCodeReviewSectionWidth: (width: number) => void;
  setStudyDiaryTopicWidth: (width: number) => void;
  setStudyDiarySectionWidth: (width: number) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      railTheme: DEFAULT_RAIL_THEME,
      apiDocCategoryWidth: 224, // w-56
      apiDocEndpointWidth: 256, // w-64
      archNoteTopicWidth: 224, // w-56 (1차 주제)
      archNoteSectionWidth: 224, // w-56 (2차 주제)
      planningDesignTopicWidth: 224, // w-56 (1차 주제)
      planningDesignSectionWidth: 224, // w-56 (2차 주제)
      codeReviewTopicWidth: 224, // w-56 (1차 주제)
      codeReviewSectionWidth: 224, // w-56 (2차 주제)
      studyDiaryTopicWidth: 224, // w-56 (1차 주제)
      studyDiarySectionWidth: 224, // w-56 (2차 주제)
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setRailTheme: (theme) => set({ railTheme: theme }),
      setApiDocCategoryWidth: (width) => set({ apiDocCategoryWidth: width }),
      setApiDocEndpointWidth: (width) => set({ apiDocEndpointWidth: width }),
      setArchNoteTopicWidth: (width) => set({ archNoteTopicWidth: width }),
      setArchNoteSectionWidth: (width) => set({ archNoteSectionWidth: width }),
      setPlanningDesignTopicWidth: (width) =>
        set({ planningDesignTopicWidth: width }),
      setPlanningDesignSectionWidth: (width) =>
        set({ planningDesignSectionWidth: width }),
      setCodeReviewTopicWidth: (width) => set({ codeReviewTopicWidth: width }),
      setCodeReviewSectionWidth: (width) => set({ codeReviewSectionWidth: width }),
      setStudyDiaryTopicWidth: (width) => set({ studyDiaryTopicWidth: width }),
      setStudyDiarySectionWidth: (width) => set({ studyDiarySectionWidth: width }),
    }),
    { name: "towercrane.appSettings" },
  ),
);
