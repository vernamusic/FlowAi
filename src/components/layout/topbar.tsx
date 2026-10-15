"use client";

import { ShortcutsDialog } from "@/components/ui/shortcuts-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
      {/* Workspace */}
      <div className="min-w-0 pl-12 lg:pl-0">
        <p className="text-xs text-zinc-500">Workspace</p>

        <h2 className="truncate text-sm font-medium text-zinc-100">
          My Workspace
        </h2>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ShortcutsDialog />

        <ThemeToggle />
      </div>
    </header>
  );
}