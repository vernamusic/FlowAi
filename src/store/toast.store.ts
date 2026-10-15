import { create } from "zustand";

export type ToastLevel = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;

  level: ToastLevel;

  message: string;

  createdAt: number;
}

export const TOAST_TIMEOUT_MS = 6000;

interface ToastState {
  toasts: Toast[];

  push: (toast: Omit<Toast, "id" | "createdAt">) => void;

  dismiss: (id: string) => void;

  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts.slice(-4),
        {
          ...toast,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        },
      ],
    })),

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  clear: () => set({ toasts: [] }),
}));

/**
 * Deliver an in-app notification, used by the Output node.
 */
export function pushToast(toast: Omit<Toast, "id" | "createdAt">) {
  useToastStore.getState().push(toast);
}