import { Check } from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { Switch } from "../../shared/ui/switch";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { RAIL_THEMES } from "../../shared/lib/rail-themes";

function SettingsPage() {
  const notificationsEnabled = useAppSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useAppSettingsStore((s) => s.setNotificationsEnabled);
  const railTheme = useAppSettingsStore((s) => s.railTheme);
  const setRailTheme = useAppSettingsStore((s) => s.setRailTheme);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">설정</span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto w-full max-w-[640px] flex flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
          <header className="flex flex-col gap-0.5">
            <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">
              앱 설정
            </h1>
            <p className="text-[13px] text-text-secondary">알림 등 앱 동작을 관리하세요.</p>
          </header>

          <section className="rounded-xl border border-surface-border-soft bg-surface-raised p-5 shadow-sm">
            <SettingRow
              title="데스크톱 알림"
              description="새 메시지·멘션이 왔을 때 알림을 표시합니다."
            >
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </SettingRow>
          </section>

          <section className="rounded-xl border border-surface-border-soft bg-surface-raised p-5 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-text-primary">
                  사이드바 색상
                </span>
                <span className="text-[12px] text-text-secondary">
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
                      onClick={() => setRailTheme(theme.id)}
                      className={
                        "flex size-9 items-center justify-center rounded-full transition-all " +
                        (selected
                          ? "ring-2 ring-brand-border ring-offset-2 ring-offset-surface-raised"
                          : "hover:scale-105")
                      }
                      style={{ backgroundImage: theme.gradient }}
                    >
                      {selected && <Check className="size-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-text-primary">{title}</span>
        {description && (
          <span className="text-[12px] text-text-secondary">{description}</span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default SettingsPage;
