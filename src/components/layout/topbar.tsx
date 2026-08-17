import { Search, User } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      <div>
        <p className="text-sm text-zinc-500">Workspace</p>
        <h2 className="text-sm font-medium text-zinc-100">My Workspace</h2>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200">
          <Search className="h-4 w-4" />

          <span>Search</span>

          <kbd className="ml-4 rounded border border-zinc-700 px-1.5 py-0.5 text-xs">
            ⌘K
          </kbd>
        </button>

        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
          <User className="h-4 w-4 text-zinc-400" />
        </button>
      </div>
    </header>
  );
}
