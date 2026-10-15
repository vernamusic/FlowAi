"use client";

import { CircleCheck, Info, TriangleAlert, X, OctagonAlert } from "lucide-react";
import { useEffect } from "react";

import {
  TOAST_TIMEOUT_MS,
  useToastStore,
  type Toast,
  type ToastLevel,
} from "@/store/toast.store";

const icons: Record<ToastLevel, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: OctagonAlert,
};

const tones: Record<ToastLevel, string> = {
  info: "border-zinc-700 text-zinc-200",
  success: "border-emerald-500/40 text-emerald-300",
  warning: "border-amber-500/40 text-amber-300",
  error: "border-red-500/40 text-red-300",
};

/**
 * Renders notifications raised by the Output node.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (!toasts.length) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const Icon = icons[toast.level];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [onDismiss, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-zinc-950/95 p-3 shadow-2xl backdrop-blur ${tones[toast.level]}`}
      role={toast.level === "error" ? "alert" : "status"}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" />

      <p className="min-w-0 flex-1 text-[11px] leading-4 text-zinc-200">
        {toast.message}
      </p>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-zinc-600 transition hover:text-zinc-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}