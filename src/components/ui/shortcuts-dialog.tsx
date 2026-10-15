"use client";

import { useCallback, useEffect, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import {
  isApplePlatform,
  isTypingTarget,
  SHORTCUT_GROUPS,
} from "@/lib/shortcuts/shortcuts";

/**
 * Keyboard reference, opened from the topbar or with `?`.
 */
export function ShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const apple = isApplePlatform();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || isTypingTarget(event.target)) {
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <span className="hidden sm:inline">Shortcuts</span>

        <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs">
          ?
        </kbd>
      </button>

      <Dialog
        open={isOpen}
        onClose={close}
        title="Keyboard shortcuts"
        description="FlowAI runs entirely in your browser, so every action has a keyboard shortcut."
      >
        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                {group.title}
              </h3>

              <ul className="mt-2 space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.description}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-xs text-zinc-400">
                      {shortcut.description}
                    </span>

                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={`${shortcut.description}-${key}`}
                          className="min-w-6 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-center text-[10px] text-zinc-300"
                        >
                          {key === "Ctrl" && apple ? "⌘" : key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Dialog>
    </>
  );
}