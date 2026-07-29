import { useState } from "react";
import Login from "./Login";
import Signup from "./Signup";
import type { User } from "../../entities/user";
import { getApiTarget, setApiTarget, type ApiTarget } from "../../shared/api/client";
import PageHeader from "../../shared/ui/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/ui/card";

type Props = {
  onSuccess: (user: User) => void;
};

type Mode = "login" | "signup";

function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [apiTarget, setApiTargetState] = useState<ApiTarget>(() => getApiTarget());

  const handleTargetChange = (target: ApiTarget) => {
    if (target === apiTarget) return;
    setApiTarget(target);
    setApiTargetState(target);
    window.location.reload();
  };

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--primary) 85%, #0891b2) 0%, var(--primary) 100%)",
      }}
    >
      <PageHeader>
        <span className="text-sm font-bold text-text-primary">Towercrane Springboot Arch</span>
        <div data-no-drag>
          <div className="inline-flex rounded-lg border border-surface-border-soft bg-surface-muted p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => handleTargetChange("local")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                apiTarget === "local"
                  ? "bg-primary text-primary-foreground"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              로컬
            </button>
            <button
              type="button"
              onClick={() => handleTargetChange("deploy")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                apiTarget === "deploy"
                  ? "bg-primary text-primary-foreground"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              배포
            </button>
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-[360px] max-w-full">
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-13 items-center justify-center rounded-2xl border border-brand-border bg-brand-glass text-2xl">
            🏗️
          </span>
          <CardTitle>Towercrane Springboot Arch</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "개발 업무 앱에 로그인하세요"
              : "새 계정을 만들어 시작하세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <Login
              onSuccess={onSuccess}
              onSwitchToSignup={() => setMode("signup")}
            />
          ) : (
            <Signup
              onSuccess={onSuccess}
              onSwitchToLogin={() => setMode("login")}
            />
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AuthScreen;
