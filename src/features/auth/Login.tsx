import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "./api";
import type { User } from "../../entities/user";
import ForgotPassword from "./ForgotPassword";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/input";
import { Label } from "../../shared/ui/label";

type Props = {
  onSuccess: (user: User) => void;
  onSwitchToSignup: () => void;
};

const REMEMBER_KEY = "towercrane.rememberedCredentials";

type Remembered = { email: string; password: string };

function loadRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Remembered>;
    if (typeof parsed.email === "string" && typeof parsed.password === "string") {
      return { email: parsed.email, password: parsed.password };
    }
  } catch {
    // 손상된 값은 무시
  }
  return null;
}

function Login({ onSuccess, onSwitchToSignup }: Props) {
  const remembered = loadRemembered();
  const [email, setEmail] = useState(remembered?.email ?? "");
  const [password, setPassword] = useState(remembered?.password ?? "");
  const [remember, setRemember] = useState(remembered !== null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const result = await login(trimmedEmail, password);
      if (remember) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ email: trimmedEmail, password }),
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      onSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">이메일</Label>
          <Input
            id="login-email"
            type="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">비밀번호</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text-secondary"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-text-secondary">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 cursor-pointer accent-brand-primary"
            />
            <span>로그인 정보 기억하기</span>
          </label>
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-[13px] font-medium text-brand-primary hover:underline"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        {error && (
          <div className="whitespace-pre-line rounded-md border border-destructive/30 bg-danger-glass px-3 py-2.5 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="auth"
          disabled={loading}
          className="w-full"
        >
          {loading ? "로그인 중…" : "로그인"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-text-secondary">
        아직 계정이 없으신가요?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-brand-primary hover:underline"
        >
          회원가입
        </button>
      </p>

      {showForgot && (
        <ForgotPassword
          initialEmail={email.trim()}
          onClose={() => setShowForgot(false)}
        />
      )}
    </>
  );
}

export default Login;
