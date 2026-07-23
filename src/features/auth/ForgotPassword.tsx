import { useEffect, useRef, useState } from "react";
import {
  requestPasswordResetCode,
  resetPasswordWithCode,
  verifyPasswordResetCode,
} from "./api";
import { Button } from "../../shared/ui/button";

type Props = {
  initialEmail?: string;
  onClose: () => void;
};

type Step = "email" | "code" | "password";

const CODE_TTL = 300; // 코드 유효시간(초) — 서버 5분
const RESEND_COOLDOWN = 5; // 재발송 대기(초)

function formatTime(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function ForgotPassword({ initialEmail = "", onClose }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const codeTimerRef = useRef<number | null>(null);
  const resendTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (codeTimerRef.current) window.clearInterval(codeTimerRef.current);
      if (resendTimerRef.current) window.clearInterval(resendTimerRef.current);
    };
  }, []);

  function startCodeTimer() {
    if (codeTimerRef.current) window.clearInterval(codeTimerRef.current);
    setCountdown(CODE_TTL);
    codeTimerRef.current = window.setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) {
          if (codeTimerRef.current) window.clearInterval(codeTimerRef.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  function startResendTimer() {
    if (resendTimerRef.current) window.clearInterval(resendTimerRef.current);
    setResendCountdown(RESEND_COOLDOWN);
    resendTimerRef.current = window.setInterval(() => {
      setResendCountdown((v) => {
        if (v <= 1) {
          if (resendTimerRef.current) window.clearInterval(resendTimerRef.current);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  async function handleRequestCode() {
    if (loading || resendCountdown > 0) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("올바른 이메일 형식이 필요합니다.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestPasswordResetCode(trimmed);
      setStep("code");
      setCode("");
      startCodeTimer();
      startResendTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드 발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (loading) return;
    if (code.length !== 6) {
      setError("인증코드 6자리를 입력해 주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { verifiedToken: token } = await verifyPasswordResetCode(email.trim(), code);
      setVerifiedToken(token);
      setStep("password");
      if (codeTimerRef.current) window.clearInterval(codeTimerRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPasswordWithCode(email.trim(), verifiedToken, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const stepOrder: Step[] = ["email", "code", "password"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-[360px] max-w-full flex flex-col gap-4 p-6 bg-white rounded-2xl shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 flex items-center justify-center text-lg bg-emerald-50 border border-emerald-200 rounded-xl">
              🔑
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">비밀번호 찾기</h2>
              <p className="text-xs text-slate-500">이메일 인증 후 새 비밀번호를 설정합니다.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 flex items-center justify-center text-text-muted rounded-lg hover:text-text-secondary hover:bg-surface-muted"
          >
            ✕
          </button>
        </div>

        {!done && (
          <div className="flex gap-1.5">
            {stepOrder.map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${s === step ? "bg-emerald-500" : "bg-slate-200"}`}
              />
            ))}
          </div>
        )}

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="w-12 h-12 flex items-center justify-center text-2xl bg-emerald-50 border border-emerald-200 rounded-2xl">
              ✅
            </span>
            <p className="text-sm font-medium text-slate-900">비밀번호가 변경되었습니다.</p>
            <p className="text-xs text-slate-500">새 비밀번호로 다시 로그인해 주세요.</p>
            <Button
              type="button"
              onClick={onClose}
              className="mt-1 w-full rounded-xl py-2.5 text-sm font-bold"
            >
              로그인으로 돌아가기
            </Button>
          </div>
        ) : (
          <>
            {step === "email" && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
                  <span>이메일</span>
                  <input
                    type="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestCode()}
                    className="px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </label>
                <Button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={loading || resendCountdown > 0}
                  className="rounded-xl py-2.5 text-sm font-bold"
                >
                  {loading
                    ? "발송 중…"
                    : resendCountdown > 0
                      ? `${resendCountdown}초 후 재발송`
                      : "인증코드 발송"}
                </Button>
              </div>
            )}

            {step === "code" && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
                  <span>인증코드</span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        placeholder="6자리"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setError(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                        className="w-full pl-3 pr-14 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white tracking-widest"
                      />
                      {countdown > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 tabular-nums">
                          {formatTime(countdown)}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={loading || code.length !== 6}
                      className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold"
                    >
                      {loading ? "확인 중…" : "확인"}
                    </Button>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={loading || resendCountdown > 0}
                  className="self-end text-xs text-text-muted hover:text-text-secondary disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendCountdown > 0 ? `${resendCountdown}초 후 재발송` : "인증코드 재발송"}
                </button>
              </div>
            )}

            {step === "password" && (
              <form className="flex flex-col gap-3" onSubmit={handleResetPassword}>
                <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span>✓</span>
                  <span>이메일 인증 완료</span>
                </div>
                <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
                  <span>새 비밀번호</span>
                  <input
                    type="password"
                    autoFocus
                    placeholder="8자 이상 입력"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] text-slate-600">
                  <span>새 비밀번호 확인</span>
                  <input
                    type="password"
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </label>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl py-2.5 text-sm font-bold"
                >
                  {loading ? "변경 중…" : "비밀번호 변경"}
                </Button>
              </form>
            )}

            {error && (
              <div className="px-3 py-2.5 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl whitespace-pre-line">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
