"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;

  onClose: () => void;

  title: string;

  description?: string;

  children?: ReactNode;

  /** Rendered next to the close button, such as a keyboard hint. */
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog with the behaviour a screen reader and a keyboard user
 * expect: focus moves in, Tab stays inside, Escape closes, and focus
 * returns to whatever opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const focusFirst = useCallback(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const target = panel.querySelector<HTMLElement>(FOCUSABLE);

    (target ?? panel).focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel = panelRef.current;

      if (!panel) {
        return;
      }

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previousFocusRef.current?.focus?.();
    };
  }, [focusFirst, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? "dialog-description" : undefined}
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{title}</h2>

            {description && (
              <p id="dialog-description" className="mt-1 text-[11px] leading-5 text-zinc-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-md p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children && <div className="max-h-[60vh] overflow-y-auto px-5 py-4">{children}</div>}

        {footer && (
          <div className="border-t border-zinc-800 px-5 py-3 text-[10px] text-zinc-600">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}