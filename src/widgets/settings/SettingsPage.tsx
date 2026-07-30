import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Check,
  LayoutGrid,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { User } from "../../entities/user";
import { getToken } from "../../features/auth/api";
import { getOrgTree, type OrgMember, type OrgNode } from "../../features/org/api";
import PageHeader from "../../shared/ui/PageHeader";
import { AppUpdateCard } from "../../shared/ui/AppUpdateCard";
import { Button } from "../../shared/ui/button";
import { Switch } from "../../shared/ui/switch";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { RAIL_THEMES } from "../../shared/lib/rail-themes";
import type { useAppUpdate } from "../../shared/lib/useAppUpdate";
import MenuManagementSettings from "./MenuManagementSettings";

type SettingsTab = "general" | "menu" | "update" | "users";

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Settings2;
}> = [
  { id: "general", label: "일반 설정", icon: Settings2 },
  { id: "menu", label: "메뉴 관리", icon: LayoutGrid },
  { id: "update", label: "업데이트 체크", icon: RefreshCw },
  { id: "users", label: "사용자 관리", icon: Users },
];

type SettingsPageProps = {
  user: User;
  appUpdate: ReturnType<typeof useAppUpdate>;
};

function SettingsPage({ user, appUpdate }: SettingsPageProps) {
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
              앱 동작과 메뉴, 업데이트, 사용자를 한곳에서 관리합니다.
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
            ) : activeTab === "update" ? (
              <UpdateSettings appUpdate={appUpdate} />
            ) : (
              <UserManagementSettings user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UpdateSettings({
  appUpdate,
}: {
  appUpdate: ReturnType<typeof useAppUpdate>;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <AppUpdateCard appUpdate={appUpdate} />
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

function UserManagementSettings({ user }: { user: User }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMembers() {
    const token = getToken();
    if (!token) {
      setMembers([]);
      setError("로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const tree = await getOrgTree(token);
      setMembers(flattenMembers(tree));
    } catch (err) {
      setError(err instanceof Error ? err.message : "사용자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  const adminCount = members.filter((member) => member.role === "admin").length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <SettingsSection
        icon={<Users className="size-4" />}
        title="사용자"
        description="조직도 기준 사용자와 권한을 확인합니다."
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="전체 사용자" value={`${members.length}명`} />
            <Metric label="관리자" value={`${adminCount}명`} />
            <Metric label="현재 계정" value={user.role === "admin" ? "관리자" : "사용자"} />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-surface-border-soft pt-4">
            <div className="min-w-0">
              <span className="text-[13px] font-bold text-text-primary">
                사용자 목록
              </span>
              <span className="mt-0.5 block text-[12px] text-text-secondary">
                {loading ? "불러오는 중입니다." : `${members.length}명`}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void loadMembers()}
              className="shrink-0"
            >
              <RefreshCw className={"size-3.5" + (loading ? " animate-spin" : "")} />
              새로고침
            </Button>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-danger-glass px-3 py-2 text-[12px] font-semibold text-destructive">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-md border border-surface-border-soft">
            {members.length === 0 && !loading ? (
              <div className="px-4 py-5 text-[13px] text-text-secondary">
                등록된 사용자가 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-surface-border-soft">
                {members.map((member) => (
                  <UserRow
                    key={member.id}
                    member={member}
                    current={member.id === user.id}
                  />
                ))}
              </div>
            )}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
      <span className="block text-[11px] font-semibold text-text-muted">{label}</span>
      <strong className="mt-1 block text-[17px] font-black text-text-primary">
        {value}
      </strong>
    </div>
  );
}

function UserRow({ member, current }: { member: OrgMember; current: boolean }) {
  const roleLabel = member.role === "admin" ? "관리자" : "사용자";

  return (
    <div className="flex items-center justify-between gap-3 bg-surface-raised px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-surface-border-soft bg-brand-glass text-[13px] font-black text-brand-primary">
          {member.profileImageUrl ? (
            <img
              src={member.profileImageUrl}
              alt={member.name}
              className="h-full w-full object-cover"
            />
          ) : (
            member.name.charAt(0) || "U"
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <strong className="truncate text-[13px] text-text-primary">
              {member.name}
            </strong>
            {current ? (
              <span className="rounded-full border border-brand-border bg-brand-glass px-1.5 py-0.5 text-[10px] font-black text-brand-primary">
                본인
              </span>
            ) : null}
          </span>
          <span className="block truncate text-[12px] text-text-secondary">
            {member.email}
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-[12px] text-text-muted sm:inline">
          {member.position || "직책 없음"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-black text-text-secondary">
          {member.role === "admin" ? <ShieldCheck className="size-3" /> : null}
          {roleLabel}
        </span>
      </div>
    </div>
  );
}

function flattenMembers(nodes: OrgNode[]): OrgMember[] {
  return nodes.flatMap((node) => [
    ...node.members,
    ...flattenMembers(node.children),
  ]);
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
