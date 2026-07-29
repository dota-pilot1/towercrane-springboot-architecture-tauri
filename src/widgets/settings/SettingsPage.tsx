import { useState, type ReactNode } from "react";
import { Bell, Check, LayoutGrid, Settings2, Workflow } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { Switch } from "../../shared/ui/switch";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { RAIL_THEMES } from "../../shared/lib/rail-themes";
import MenuManagementSettings from "./MenuManagementSettings";
import WorkspaceManagementSettings from "./WorkspaceManagementSettings";

type SettingsTab = "general" | "menu" | "workspace";

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Settings2;
}> = [
  { id: "general", label: "일반 설정", icon: Settings2 },
  { id: "menu", label: "메뉴 관리", icon: LayoutGrid },
  { id: "workspace", label: "워크스페이스 관리", icon: Workflow },
];

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          설정
        </span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <header>
            <h1 className="text-[18px] font-bold tracking-tight text-text-primary">
              앱 설정
            </h1>
            <p className="mt-1 text-[12px] text-text-secondary">
              앱 동작과 메뉴, 워크스페이스를 한곳에서 관리합니다.
            </p>
          </header>

          <div
            role="tablist"
            aria-label="설정 메뉴"
            className="mt-5 flex gap-1 overflow-x-auto border-b border-surface-border-soft"
          >
            {SETTINGS_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold transition-colors ${
                    active
                      ? "text-brand-primary"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                  {active && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {activeTab === "general" ? (
              <GeneralSettings />
            ) : activeTab === "menu" ? (
              <MenuManagementSettings />
            ) : (
              <WorkspaceManagementSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const notificationsEnabled = useAppSettingsStore(
    (state) => state.notificationsEnabled,
  );
  const setNotificationsEnabled = useAppSettingsStore(
    (state) => state.setNotificationsEnabled,
  );
  const railTheme = useAppSettingsStore((state) => state.railTheme);
  const setRailTheme = useAppSettingsStore((state) => state.setRailTheme);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SettingsSection
        icon={<Bell className="size-4" />}
        title="알림"
        description="새 메시지와 멘션 알림을 설정합니다."
      >
        <SettingRow
          title="데스크톱 알림"
          description="새 메시지·멘션이 왔을 때 시스템 알림을 표시합니다."
        >
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon={<LayoutGrid className="size-4" />}
        title="화면"
        description="앱의 시각적 표현을 설정합니다."
      >
        <div className="flex flex-col gap-3">
          <div>
            <span className="text-[13px] font-semibold text-text-primary">
              사이드바 색상
            </span>
            <span className="mt-0.5 block text-[12px] text-text-secondary">
              왼쪽 아이콘 레일의 색상을 바꿉니다.
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {RAIL_THEMES.map((theme) => {
              const selected = theme.id === railTheme;
              return (
                <button
                  key={theme.id}
                  type="button"
                  title={theme.label}
                  aria-label={`${theme.label} 테마`}
                  aria-pressed={selected}
                  onClick={() => setRailTheme(theme.id)}
                  className={
                    "flex size-9 items-center justify-center rounded-full transition-all " +
                    (selected
                      ? "ring-2 ring-brand-border ring-offset-2 ring-offset-surface-raised"
                      : "hover:scale-105")
                  }
                  style={{ backgroundImage: theme.gradient }}
                >
                  {selected && (
                    <Check className="size-4 text-text-on-brand drop-shadow" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-surface-border-soft bg-surface-raised p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-glass text-brand-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-[14px] font-bold text-text-primary">{title}</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span className="text-[13px] font-semibold text-text-primary">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12px] text-text-secondary">
            {description}
          </span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default SettingsPage;
