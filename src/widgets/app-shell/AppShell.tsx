import { useEffect, useRef, useState } from "react";
import {
  LogOut,
  Package,
  Settings,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import type { User } from "../../entities/user";
import { useMeetingInbox } from "../../features/chat/useMeetingInbox";
import { sumUnread, useUnreadStore } from "../../features/chat/unread-store";
import Messenger from "../messenger/Messenger";
import ChatModule from "../chat/ChatModule";
import DocsModule from "../docs/DocsModule";
import StudyDiaryModule from "../study-diary/StudyDiaryModule";
import ArchNoteModule from "../arch-note/ArchNoteModule";
import PlanningDesignModule from "../planning-design/PlanningDesignModule";
import DevHistoryModule from "../dev-history/DevHistoryModule";
import IdeaNoteModule from "../idea-note/IdeaNoteModule";
import ProjectCodeReviewModule from "../project-code-review/ProjectCodeReviewModule";
import HomePage from "../home/HomePage";
import ProfilePage from "../profile/ProfilePage";
import SettingsPage from "../settings/SettingsPage";
import PageHeader from "../../shared/ui/PageHeader";
import WindowControls from "../../shared/ui/WindowControls";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { getRailTheme } from "../../shared/lib/rail-themes";
import { useAppUpdate } from "../../shared/lib/useAppUpdate";
import {
  APP_MODULES,
  type AppModuleId,
} from "../../shared/config/app-modules";

type Props = {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
};

type ViewId = "home" | "profile" | "settings" | AppModuleId;

function AppShell({ user, onUserUpdate, onLogout }: Props) {
  const [active, setActive] = useState<ViewId>("home");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const moduleOrder = useAppSettingsStore((s) => s.moduleOrder);
  const hiddenModuleIds = useAppSettingsStore((s) => s.hiddenModuleIds);
  const orderedModules = [...APP_MODULES].sort((a, b) => {
    const aIndex = moduleOrder.indexOf(a.id);
    const bIndex = moduleOrder.indexOf(b.id);
    return (
      (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
    );
  });
  const visibleModules = orderedModules.filter(
    (module) => !hiddenModuleIds.includes(module.id),
  );
  const activeModule = APP_MODULES.find((m) => m.id === active);
  const railTheme = getRailTheme(useAppSettingsStore((s) => s.railTheme));
  const displayName = user.name || user.email;
  const roleName = user.role === "admin" ? "관리자" : "사용자";

  // 전역 인박스 — 모든 방의 새 메시지를 수신해 배지/네이티브 알림 처리
  useMeetingInbox(user.id, user.name);
  const counts = useUnreadStore((s) => s.counts);
  const dmBadge = sumUnread(counts, "dm");
  const channelBadge = sumUnread(counts, "channel");

  // 실제 설치된 앱 버전 + 업데이트 확인 (Tauri). 브라우저 dev 등 Tauri 밖 환경에선 조용히 무시.
  const appUpdate = useAppUpdate();
  const appVersion = appUpdate.state.currentVersion;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      appUpdate.checkOnceOnStartup();
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [appUpdate.checkOnceOnStartup]);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* 앱 레벨 아이콘 레일 (전체 높이) */}
      <nav
        className="shrink-0 flex flex-col items-center text-white w-[72px]"
        style={{ backgroundImage: railTheme.gradient }}
      >
        {/* 로고 — 레일 최상단, 클릭 시 홈 */}
        <div className="w-full h-12 shrink-0 flex items-center justify-center border-b border-white/10">
          <button
            onClick={() => setActive("home")}
            title="홈"
            className={
              "flex items-center justify-center w-[44px] h-[44px] text-[22px] shadow-sm transition-all duration-300 ease-in-out " +
              (active === "home"
                ? "bg-white/30 ring-2 ring-white/40 rounded-[14px]"
                : "bg-white/15 hover:bg-white/25 rounded-[22px] hover:rounded-[14px]")
            }
          >
            🏗️
          </button>
        </div>

        {/* 모듈 버튼 */}
        <div className="flex-1 flex flex-col items-center gap-2 pt-2">
          {visibleModules.map((m) => {
            const isActive = m.id === active;
            // 안읽음 배지 — 메신저=DM, 채팅=채널
            const badge =
              m.id === "messenger" ? dmBadge : m.id === "chat" ? channelBadge : null;
            const showBadge = !!badge && badge.unread > 0;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                title={m.ready ? m.label : `${m.label} (준비 중)`}
                className={
                  "group relative flex flex-col items-center justify-center gap-0.5 w-[52px] h-[52px] transition-all duration-300 ease-in-out " +
                  (isActive
                    ? "bg-white/25 text-primary-foreground rounded-[16px]"
                    : "text-white/80 hover:bg-white/15 hover:text-primary-foreground rounded-[26px] hover:rounded-[16px]")
                }
              >
                {/* 왼쪽 인디케이터 — active는 길게, hover는 짧게 (디스코드 방식) */}
                <span
                  className={
                    "absolute top-1/2 -translate-y-1/2 -left-2.5 w-1 rounded-r-full bg-white transition-all duration-300 ease-in-out " +
                    (isActive ? "h-7" : "h-0 group-hover:h-3")
                  }
                />
                <m.icon className="size-[21px] shrink-0" strokeWidth={2} />
                <span className="w-full overflow-hidden px-0.5 text-center text-[10px] font-semibold leading-[1.08] opacity-100 [word-break:keep-all]">
                  {m.label}
                </span>
                {/* 안읽음 배지 — 멘션 있으면 강조 링 */}
                {showBadge && (
                  <span
                    className={
                      "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums bg-red-500 text-white " +
                      (badge.mentions > 0 ? "ring-2 ring-white" : "")
                    }
                  >
                    {badge.unread > 99 ? "99+" : badge.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 사용자 / 로그아웃 */}
        <div className="relative w-full flex flex-col items-center gap-2 py-2.5 border-t border-white/10" ref={accountRef}>
          <button
            onClick={() => void appUpdate.installUpdate()}
            disabled={appUpdate.state.status !== "available" || appUpdate.busy}
            title={
              appUpdate.state.status === "available"
                ? `새 버전 v${appUpdate.state.availableVersion} 설치`
                : appUpdate.state.status === "checking"
                  ? "업데이트 확인 중"
                  : "업데이트 없음"
            }
            className={
              "grid h-[22px] w-[58px] place-items-center rounded-lg border text-[10px] font-black leading-none shadow-sm transition-colors " +
              (appUpdate.state.status === "available"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "cursor-default border-white/35 bg-white/20 text-white/75")
            }
          >
            <span>
              {appUpdate.state.status === "checking"
                ? "확인"
                : appUpdate.state.status === "downloading"
                  ? `${appUpdate.state.progress}%`
                  : appUpdate.state.status === "available"
                    ? "업데이트"
                    : "최신"}
            </span>
          </button>
          {appVersion && (
            <span
              title={`Towercrane v${appVersion}`}
              className="overflow-hidden max-h-3 opacity-100 text-[10px] font-bold text-white/85 tabular-nums select-none"
            >
              v{appVersion}
            </span>
          )}
          <button
            onClick={() => setActive("settings")}
            title="설정"
            className={
              "w-[40px] h-[40px] flex items-center justify-center text-[17px] transition-all duration-200 " +
              (active === "settings"
                ? "bg-white/25 text-primary-foreground ring-1 ring-white/50 rounded-[14px]"
                : "text-white/80 hover:bg-white/15 hover:text-primary-foreground rounded-[20px] hover:rounded-[14px]")
            }
          >
            <Settings className="size-[18px]" strokeWidth={2} />
          </button>
          <button
            onClick={() => setAccountOpen((open) => !open)}
            title={`${displayName} · ${roleName}`}
            className={
              "grid min-h-[56px] w-[58px] place-items-center gap-1 rounded-[13px] border px-1 py-1.5 text-[9px] font-extrabold transition-all " +
              (accountOpen || active === "profile"
                ? "border-white/60 bg-white text-slate-900 shadow-lg"
                : "border-transparent bg-transparent text-white/85 hover:border-white/30 hover:bg-white/20 hover:text-white")
            }
          >
            <span className="grid h-[38px] w-[38px] place-items-center overflow-hidden rounded-full border border-white/30 bg-white text-[14px] font-black uppercase text-slate-900">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                displayName.charAt(0) || "U"
              )}
            </span>
            <span className="max-w-[50px] overflow-hidden text-ellipsis whitespace-nowrap">{roleName}</span>
          </button>
          {accountOpen && (
            <div className="absolute bottom-2 left-[calc(100%+12px)] z-30 w-[248px] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xl">
              <div className="flex items-center gap-2.5 border-b border-slate-100 p-3">
                <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-slate-200 bg-emerald-50 text-sm font-black uppercase text-emerald-700 shadow-sm">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    displayName.charAt(0) || "U"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px] leading-5 text-slate-900">{displayName}</strong>
                  <span className="block truncate text-xs font-semibold text-slate-400">{user.email}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">
                  {roleName}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                  로그인됨
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  setActive("profile");
                }}
                className="flex min-h-10 w-full items-center gap-2 bg-white px-3 text-left text-[13px] font-extrabold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <UserCircle className="size-4" />
                <span>프로필</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onLogout();
                }}
                className="flex min-h-10 w-full items-center gap-2 bg-white px-3 text-left text-[13px] font-extrabold text-slate-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="size-4" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 활성 화면 */}
      <div className="flex-1 min-w-0 flex">
        {active === "home" ? (
          <HomePage
            user={user}
            modules={visibleModules}
            onOpen={(id) => setActive(id as ViewId)}
          />
        ) : active === "profile" ? (
          <ProfilePage
            user={user}
            onUserUpdate={onUserUpdate}
            onLogout={onLogout}
            appUpdate={appUpdate}
          />
        ) : active === "settings" ? (
          <SettingsPage />
        ) : activeModule?.id === "messenger" ? (
          <Messenger user={user} />
        ) : activeModule?.id === "chat" ? (
          <ChatModule user={user} />
        ) : activeModule?.id === "docs" ? (
          <DocsModule />
        ) : activeModule?.id === "studydiary" ? (
          <StudyDiaryModule />
        ) : activeModule?.id === "archnote" ? (
          <ArchNoteModule />
        ) : activeModule?.id === "planningdesign" ? (
          <PlanningDesignModule />
        ) : activeModule?.id === "devhistory" ? (
          <DevHistoryModule />
        ) : activeModule?.id === "ideanote" ? (
          <IdeaNoteModule />
        ) : activeModule?.id === "codereview" ? (
          <ProjectCodeReviewModule />
        ) : (
          <PlaceholderModule
            label={activeModule?.label ?? ""}
            icon={activeModule?.icon ?? Package}
          />
        )}
      </div>

      {/* 창 버튼 — 항상 창 우상단, 메인 헤더 위 오버레이 */}
      <div className="absolute top-0 right-0 h-12 flex items-center pr-2 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <WindowControls />
        </div>
      </div>
    </div>
  );
}

function PlaceholderModule({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">{label}</span>
      </PageHeader>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-surface-muted text-center">
        <Icon className="size-10 text-text-muted" strokeWidth={1.5} />
        <span className="text-lg font-bold text-text-secondary">{label}</span>
        <span className="text-[13px] text-text-muted">준비 중인 모듈입니다.</span>
      </div>
    </div>
  );
}

export default AppShell;
