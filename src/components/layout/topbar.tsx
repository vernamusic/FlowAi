"use client";

import { Menu } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { CommandPalette } from "@/components/command-palette/command-palette";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ShortcutsDialog } from "@/components/ui/shortcuts-dialog";
import {
  isMobileSidebarOpen,
  setMobileSidebarOpen,
  subscribeToSidebar,
} from "@/lib/ui/sidebar";

export function Topbar() {
  const mobileOpen = useSyncExternalStore(
    subscribeToSidebar,
    isMobileSidebarOpen,
    () => false,
  );

  /**
   * Owned here so the command palette can open the shortcut list, which
   * otherwise only answered to its own button and the `?` key.
   */
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
      {/**
       * On a phone the sidebar covers the page, so the button that opens
       * it belongs in the bar it would otherwise sit on top of.
       */}
      {!mobileOpen && (
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 transition hover:border-zinc-700 hover:text-white lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* Workspace */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500">Workspace</p>

        <h2 className="truncate text-sm font-medium text-zinc-100">
          My Workspace
        </h2>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <CommandPalette onOpenShortcuts={() => setShortcutsOpen(true)} />

        <ShortcutsDialog
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
        />

        <ThemeToggle />
      </div>
    </header>
  );
}