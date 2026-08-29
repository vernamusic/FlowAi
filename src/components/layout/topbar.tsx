"use client";

import { Search, User } from "lucide-react";

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
        {/* Desktop Search */}
        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 sm:flex"
        >
          <Search className="h-4 w-4" />

          <span>Search</span>

          <kbd className="ml-4 rounded border border-zinc-700 px-1.5 py-0.5 text-xs">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search */}
        <button
          type="button"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 sm:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Profile */}
        <button
          type="button"
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 transition hover:border-zinc-700"
        >
          <User className="h-4 w-4 text-zinc-400" />
        </button>
      </div>
    </header>
  );
}
