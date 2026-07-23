import type { LucideIcon } from "lucide-react";
import type { User } from "../../entities/user";
import PageHeader from "../../shared/ui/PageHeader";

export type HomeModule = {
  id: string;
  label: string;
  icon: LucideIcon;
  ready: boolean;
};

type Props = {
  user: User;
  modules: HomeModule[];
  onOpen: (id: string) => void;
};

// 앱 표지/소개 홈 — 로고(첫 메뉴) 클릭 시 진입. 인사말 + 모듈 바로가기 허브.
function HomePage({ user, modules, onOpen }: Props) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="w-[26px] h-[26px] flex items-center justify-center text-[14px] text-brand-primary bg-brand-glass border border-brand-border rounded-lg">
          🏗️
        </span>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">홈</span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto max-w-2xl flex flex-col items-center gap-8 px-6 py-14">
          {/* 표지 */}
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="w-16 h-16 flex items-center justify-center text-3xl bg-surface-raised border border-surface-border-soft rounded-2xl shadow-sm">
              🏗️
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Towercrane</h1>
            <p className="text-[14px] text-text-secondary leading-relaxed">
              <strong className="font-semibold text-text-primary">{user.name}</strong>님, 환영합니다.
              <br />
              업무 메신저와 협업 워크스페이스
            </p>
          </div>

          {/* 모듈 바로가기 */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => onOpen(m.id)}
                className="group flex items-center gap-3 p-4 text-left bg-surface-raised border border-surface-border rounded-xl hover:border-brand-border hover:shadow-sm transition"
              >
                <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-surface-muted border border-surface-border-soft rounded-xl group-hover:bg-brand-glass group-hover:border-brand-border">
                  <m.icon className="size-5 text-text-secondary group-hover:text-brand-primary" strokeWidth={2} />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold text-text-primary">{m.label}</span>
                  <span className="text-[12px] text-text-muted">
                    {m.ready ? "바로 열기" : "준비 중"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
