import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import {
  checkEmail,
  sendSignupCode,
  signup,
  verifySignupCode,
} from "./api";
import type { User } from "../../entities/user";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/input";
import { Label } from "../../shared/ui/label";

type Props = {
  onSuccess: (user: User) => void;
  onSwitchToLogin: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Signup({ onSuccess, onSwitchToLogin }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_RE.test(trimmedEmail);

  async function handleSendCode() {
    if (sending || !emailValid) return;
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const { available } = await checkEmail(trimmedEmail);
      if (!available) {
        setError("이미 가입된 이메일입니다.");
        return;
      }
      await sendSignupCode(trimmedEmail);
      setCodeSent(true);
      setNotice("인증코드를 이메일로 보냈습니다. 메일함을 확인해 주세요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드 발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode() {
    if (verifying || code.trim().length !== 6) return;
    setError(null);
    setNotice(null);
    setVerifying(true);
    try {
      const { verifiedToken: token } = await verifySignupCode(
        trimmedEmail,
        code.trim(),
      );
      setVerifiedToken(token);
      setEmailVerified(true);
      setNotice("이메일 인증이 완료되었습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드가 올바르지 않습니다.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!emailVerified) {
      setError("이메일 인증을 먼저 완료해 주세요.");
      return;
    }
    if (name.trim().length < 2) {
      setError("이름은 2자 이상 입력해 주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signup({
        email: trimmedEmail,
        password,
        name: name.trim(),
        verifiedToken,
      });
      onSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* 이메일 + 인증코드 발송 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">이메일</Label>
          <div className="flex gap-2">
            <Input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={emailVerified}
              required
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              size="auth"
              onClick={handleSendCode}
              disabled={!emailValid || emailVerified || sending}
              className="h-10 shrink-0 px-3"
            >
              {emailVerified ? (
                <Check size={16} className="text-brand-primary" />
              ) : sending ? (
                "발송 중…"
              ) : codeSent ? (
                "재발송"
              ) : (
                "인증코드"
              )}
            </Button>
          </div>
        </div>

        {/* 인증코드 입력 (발송 후, 미인증 상태에서만) */}
        {codeSent && !emailVerified && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signup-code">인증코드</Label>
            <div className="flex gap-2">
              <Input
                id="signup-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="6자리 숫자"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="flex-1 tracking-[0.3em]"
              />
              <Button
                type="button"
                size="auth"
                onClick={handleVerifyCode}
                disabled={code.trim().length !== 6 || verifying}
                className="h-10 shrink-0 px-4"
              >
                {verifying ? "확인 중…" : "확인"}
              </Button>
            </div>
          </div>
        )}

        {/* 이름 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">이름</Label>
          <Input
            id="signup-name"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* 비밀번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">비밀번호</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text-secondary"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* 비밀번호 확인 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-confirm">비밀번호 확인</Label>
          <Input
            id="signup-confirm"
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호 재입력"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="whitespace-pre-line rounded-md border border-destructive/30 bg-danger-glass px-3 py-2.5 text-[13px] text-destructive">
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="rounded-md border border-brand-border bg-brand-glass px-3 py-2.5 text-[13px] text-brand-primary">
            {notice}
          </div>
        )}

        <Button
          type="submit"
          size="auth"
          disabled={submitting || !emailVerified}
          className="w-full"
        >
          {submitting ? "가입 중…" : "회원가입"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-text-secondary">
        이미 계정이 있으신가요?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-brand-primary hover:underline"
        >
          로그인
        </button>
      </p>
    </>
  );
}

export default Signup;
