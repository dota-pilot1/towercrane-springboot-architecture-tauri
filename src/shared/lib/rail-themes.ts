export type RailThemeId = "sky" | "emerald" | "violet" | "slate";

export type RailTheme = {
  id: RailThemeId;
  label: string;
  gradient: string;
};

// 레일 배경 그라디언트 프리셋. "sky"는 기존 기본값(from-sky-400 to-sky-600)과 동일한 색.
export const RAIL_THEMES: RailTheme[] = [
  { id: "sky", label: "스카이", gradient: "linear-gradient(to bottom, #38bdf8, #0284c7)" },
  { id: "emerald", label: "에메랄드", gradient: "linear-gradient(to bottom, #34d399, #059669)" },
  { id: "violet", label: "바이올렛", gradient: "linear-gradient(to bottom, #a78bfa, #7c3aed)" },
  { id: "slate", label: "슬레이트", gradient: "linear-gradient(to bottom, #64748b, #334155)" },
];

export const DEFAULT_RAIL_THEME: RailThemeId = "sky";

export function getRailTheme(id: RailThemeId): RailTheme {
  return RAIL_THEMES.find((t) => t.id === id) ?? RAIL_THEMES[0];
}
