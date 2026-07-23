import { useRef, useState } from "react";
import {
  changePassword,
  getToken,
  updateProfileImage,
  uploadProfileImage,
} from "../../features/auth/api";
import type { User } from "../../entities/user";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import type { useAppUpdate } from "../../shared/lib/useAppUpdate";
import { AppUpdateCard } from "../../shared/ui/AppUpdateCard";

type Props = {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
  appUpdate: ReturnType<typeof useAppUpdate>;
};

function ProfilePage({ user, onUserUpdate, onLogout, appUpdate }: Props) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">프로필</span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-surface-muted">
        <div className="mx-auto w-full max-w-[860px] flex flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
          <header className="flex flex-col gap-0.5">
            <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">설정</h1>
            <p className="text-[13px] text-text-secondary">계정과 보안을 관리하세요.</p>
          </header>

          <IdentityCard user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <AccountCard user={user} />
            <PasswordCard />
          </div>

          <AppUpdateCard appUpdate={appUpdate} />
        </div>
      </div>
    </div>
  );
}

/* ---------- shadcn-style primitives ---------- */

function Avatar({ user, size }: { user: User; size: number }) {
  if (user.profileImageUrl) {
    return (
      <img
        src={user.profileImageUrl}
        alt={user.name}
        style={{ width: size, height: size }}
        className="rounded-xl object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex items-center justify-center font-semibold uppercase text-white bg-emerald-500 rounded-xl"
    >
      {user.name.charAt(0) || "🙂"}
    </span>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 p-5 pb-0">
        <h2 className="text-[14px] font-semibold leading-none tracking-tight text-slate-900">
          {title}
        </h2>
        {description && <p className="text-[12px] text-slate-500">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Notice({ kind, text }: { kind: "ok" | "error"; text: string }) {
  return (
    <div
      className={
        "rounded-md border px-3 py-2 text-[13px] whitespace-pre-line " +
        (kind === "ok"
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : "text-red-700 bg-red-50 border-red-200")
      }
    >
      {text}
    </div>
  );
}

const inputClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      {children}
      {hint}
    </label>
  );
}

function Badge({ user }: { user: User }) {
  const admin = user.role === "admin";
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold " +
        (admin
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600")
      }
    >
      {admin ? "관리자" : "일반"}
    </span>
  );
}

/* ---------- identity (avatar upload) ---------- */

function IdentityCard({
  user,
  onUserUpdate,
  onLogout,
}: {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(work: () => Promise<User>) {
    const token = getToken();
    if (!token || busy) return;
    setError(null);
    setBusy(true);
    try {
      onUserUpdate(await work());
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const token = getToken();
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
    if (!file || !token) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    void run(() => uploadProfileImage(token, file));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        {/* 아바타 클릭 → 파일 선택 업로드 */}
        <Button
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          title="클릭해서 프로필 사진 변경"
          className="group relative shrink-0 overflow-hidden rounded-xl border border-surface-border-soft px-0 py-0 disabled:cursor-wait"
        >
          <Avatar user={user} size={72} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white bg-black/45 opacity-0 group-hover:opacity-100 group-disabled:opacity-100 transition-opacity">
            {busy ? "업로드…" : "변경"}
          </span>
        </Button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[16px] font-semibold tracking-tight text-slate-900 truncate">
              {user.name}
            </span>
            <Badge user={user} />
          </div>
          <span className="text-[13px] text-slate-500 truncate">{user.email}</span>
          {error ? (
            <span className="text-[12px] text-red-600">{error}</span>
          ) : (
            user.profileImageUrl && (
              <Button
                variant="ghost"
                onClick={() => run(() => updateProfileImage(getToken()!, null))}
                disabled={busy}
                className="self-start h-auto px-0 py-0 text-[12px] font-normal text-text-muted hover:text-text-secondary hover:bg-transparent disabled:opacity-50"
              >
                기본 이미지로
              </Button>
            )
          )}
        </div>

        <Button
          variant="secondary"
          onClick={onLogout}
          className="shrink-0 self-start h-9 rounded-md border-surface-border-soft bg-surface-raised px-3.5 text-[13px] font-medium text-text-secondary shadow-sm hover:bg-danger-glass hover:border-destructive hover:text-destructive"
        >
          로그아웃
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
    </section>
  );
}

/* ---------- account info (read-only) ---------- */

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className="text-[13px] font-medium text-slate-800 text-right truncate">
        {children}
      </span>
    </div>
  );
}

function AccountCard({ user }: { user: User }) {
  return (
    <Card title="계정 정보">
      <div className="-mt-2 flex flex-col">
        <InfoRow label="이메일">{user.email}</InfoRow>
        <InfoRow label="권한">{user.role === "admin" ? "관리자" : "일반 사용자"}</InfoRow>
        <InfoRow label="AI 기능">
          <span className={user.aiAccess ? "text-emerald-600" : "text-slate-400"}>
            {user.aiAccess ? "사용 가능" : "사용 불가"}
          </span>
        </InfoRow>
        <InfoRow label="가입일">{formatDate(user.createdAt)}</InfoRow>
      </div>
    </Card>
  );
}

/* ---------- password change ---------- */

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current.length > 0 && next.length >= 8 && next === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || saving || !valid) return;
    setError(null);
    setDone(false);
    setSaving(true);
    try {
      await changePassword(token, current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="비밀번호 변경" description="주기적으로 변경하는 것을 권장합니다.">
      <form className="-mt-1 flex flex-col gap-3.5" onSubmit={submit}>
        <Field label="현재 비밀번호">
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="새 비밀번호"
          hint={
            <span className={"text-[11px] " + (tooShort ? "text-red-500" : "text-slate-400")}>
              {tooShort ? "8자 이상이어야 합니다." : "8자 이상"}
            </span>
          }
        >
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="새 비밀번호 확인"
          hint={
            confirm.length > 0 ? (
              <span
                className={"text-[11px] " + (mismatch ? "text-red-500" : "text-emerald-600")}
              >
                {mismatch ? "✗ 일치하지 않습니다." : "✓ 일치합니다."}
              </span>
            ) : undefined
          }
        >
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </Field>

        {error && <Notice kind="error" text={error} />}
        {done && <Notice kind="ok" text="비밀번호를 변경했습니다." />}

        <Button
          type="submit"
          variant="primary"
          disabled={saving || !valid}
          className="mt-1 self-start rounded-md h-9 px-4 text-[13px] font-medium shadow-sm disabled:pointer-events-none"
        >
          {saving ? "변경 중…" : "비밀번호 변경"}
        </Button>
      </form>
    </Card>
  );
}

export default ProfilePage;
