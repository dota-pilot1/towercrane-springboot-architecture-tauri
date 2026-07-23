import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_RAIL_THEME, type RailThemeId } from "./rail-themes";

type AppSettingsState = {
  notificationsEnabled: boolean;
  railTheme: RailThemeId;
  apiDocCategoryWidth: number;
  apiDocEndpointWidth: number;
  setNotificationsEnabled: (enabled: boolean) => void;
  setRailTheme: (theme: RailThemeId) => void;
  setApiDocCategoryWidth: (width: number) => void;
  setApiDocEndpointWidth: (width: number) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      railTheme: DEFAULT_RAIL_THEME,
      apiDocCategoryWidth: 224, // w-56
      apiDocEndpointWidth: 256, // w-64
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setRailTheme: (theme) => set({ railTheme: theme }),
      setApiDocCategoryWidth: (width) => set({ apiDocCategoryWidth: width }),
      setApiDocEndpointWidth: (width) => set({ apiDocEndpointWidth: width }),
    }),
    { name: "towercrane.appSettings" },
  ),
);
