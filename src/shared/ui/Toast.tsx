// 의존성 없는 공통 토스트.
// 어디서든 toast.success("...") / toast.error("...") 호출 → 화면 우하단에 잠깐 떴다 사라진다.
// 표시는 앱 루트에 <ToastViewport /> 를 한 번 마운트해야 동작한다.
import { useEffect, useState } from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const listen of listeners) listen(items);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function show(tone: ToastTone, message: string, duration: number) {
  const id = (seq += 1);
  items = [...items, { id, tone, message }];
  emit();
  window.setTimeout(() => dismiss(id), duration);
}

export const toast = {
  success: (message: string) => show("success", message, 2600),
  error: (message: string) => show("error", message, 3600),
  info: (message: string) => show("info", message, 2600),
};

const TONE_TEXT: Record<ToastTone, string> = {
  success: "text-emerald-700",
  error: "text-red-700",
  info: "text-slate-700",
};

const TONE_BADGE: Record<ToastTone, string> = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-slate-400",
};

const TONE_ICON: Record<ToastTone, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

export function ToastViewport() {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {list.map((t) => (
        <div
          key={t.id}
          className={
            "toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-bold shadow-lg " +
            TONE_TEXT[t.tone]
          }
        >
          <span
            className={
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] text-white " +
              TONE_BADGE[t.tone]
            }
          >
            {TONE_ICON[t.tone]}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
