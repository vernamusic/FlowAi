"use client";

import {
  ArrowRight,
  Boxes,
  Download,
  LayoutDashboard,
  Monitor,
  Moon,
  Play,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Sun,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { NODE_DEFINITIONS } from "@/constants/nodes";
import {
  getEditorCommands,
  subscribeToEditorCommands,
} from "@/lib/editor/editor-commands";
import { writeThemePreference } from "@/lib/theme/theme";
import {
  getSavedWorkflows,
  workflowStorageChangeEvent,
} from "@/lib/workflow/workflow-storage";

import { filterCommands, type PaletteCommand } from "./palette-commands";
import type { Workflow } from "@/types/workflow";

interface CommandPaletteProps {
  /** Lets the palette reach the shortcut list without owning it. */
  onOpenShortcuts: () => void;
}

/**
 * One palette for the whole app: find a workflow, add a node, or run the
 * action you were about to go looking for a button for.
 */
export function CommandPalette({ onOpenShortcuts }: CommandPaletteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [editor, setEditor] = useState(getEditorCommands);

  /**
   * The highlighted command is tracked by id rather than by position.
   *
   * When the query narrows the list, a position would point at whatever
   * slid into that slot, so the highlight would jump to a command the
   * user never chose. An id that is filtered away simply falls back to
   * the top of the list.
   */
  const [activeId, setActiveId] = useState<string | null>(null);

  const close = useCallback(() => setIsOpen(false), []);

  /**
   * The editor is a different screen from the palette, so its actions
   * appear and disappear with it.
   */
  useEffect(
    () => subscribeToEditorCommands(() => setEditor(getEditorCommands())),
    [],
  );

  /**
   * Ctrl/⌘ + K, from anywhere including a text field, which is where a
   * palette is expected to work.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;

      event.preventDefault();
      setIsOpen((current) => !current);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /**
   * Workflows are read when the palette opens rather than while it is
   * closed, because storage is only readable in the browser.
   */
  useEffect(() => {
    if (!isOpen) return;

    const load = () => setWorkflows(getSavedWorkflows());
    const timer = window.setTimeout(load, 0);

    window.addEventListener(workflowStorageChangeEvent, load);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(workflowStorageChangeEvent, load);
    };
  }, [isOpen]);

  const commands = useMemo(
    () => buildCommands({ editor, workflows, router, onOpenShortcuts }),
    [editor, onOpenShortcuts, router, workflows],
  );

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  const activeIndex = Math.max(
    0,
    results.findIndex((command) => command.id === activeId),
  );

  const runCommand = useCallback(
    (command: PaletteCommand) => {
      close();
      setQuery("");
      command.run();
    },
    [close],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      const next = results[Math.min(activeIndex + 1, results.length - 1)];

      if (next) setActiveId(next.id);

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      const next = results[Math.max(activeIndex - 1, 0)];

      if (next) setActiveId(next.id);

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const command = results[activeIndex];

      if (command) runCommand(command);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open command palette"
        aria-haspopup="dialog"
        title="Search or run a command (Ctrl/⌘ + K)"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <Search className="h-4 w-4 shrink-0" />

        <span className="hidden sm:inline">Search or run a command</span>

        <kbd className="hidden shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500 sm:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog
        open={isOpen}
        onClose={close}
        title="Command palette"
        description="Find a workflow, add a node, or run an action."
        footer="↑ ↓ to move · Enter to run · Esc to close"
      >
        <div className="-mx-5 -mt-4 border-b border-zinc-800 px-5 py-4">
          <div className="command-search flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 transition-colors focus-within:border-violet-400/60">
            <Search className="h-4 w-4 shrink-0 text-zinc-600" />

            <input
              type="text"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="command-palette-list"
              aria-activedescendant={
                results[activeIndex]
                  ? `command-${results[activeIndex].id}`
                  : undefined
              }
              aria-label="Search commands"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search commands, nodes, and workflows…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
        </div>

        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Nothing matches “{query}”.
          </p>
        ) : (
          <div id="command-palette-list" role="listbox" aria-label="Commands">
            {toGroups(results).map(([group, groupCommands]) => (
              <div key={group} className="pb-2">
                <p className="px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                  {group}
                </p>

                {groupCommands.map((command) => {
                  const index = results.indexOf(command);
                  const Icon = command.icon;
                  const isActive = index === activeIndex;

                  return (
                    <div
                      key={command.id}
                      id={`command-${command.id}`}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveId(command.id)}
                      onClick={() => runCommand(command)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${
                        isActive ? "bg-zinc-800 text-white" : "text-zinc-300"
                      }`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900">
                        <Icon className="h-3.5 w-3.5 text-zinc-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{command.label}</p>

                        {command.hint && (
                          <p className="truncate text-[11px] text-zinc-500">
                            {command.hint}
                          </p>
                        )}
                      </div>

                      {command.shortcut && (
                        <kbd className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {command.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}

interface BuildContext {
  editor: ReturnType<typeof getEditorCommands>;
  workflows: Workflow[];
  router: ReturnType<typeof useRouter>;
  onOpenShortcuts: () => void;
}

/**
 * Every command the palette can offer, in the order they are shown when
 * nothing has been typed.
 */
function buildCommands({
  editor,
  workflows,
  router,
  onOpenShortcuts,
}: BuildContext): PaletteCommand[] {
  const commands: PaletteCommand[] = [];

  if (editor) {
    commands.push(
      {
        id: "run",
        label: "Run workflow",
        group: "Actions",
        icon: Play,
        shortcut: "Ctrl ↵",
        keywords: "execute start",
        run: editor.run,
      },
      {
        id: "dry-run",
        label: "Dry run workflow",
        group: "Actions",
        icon: Sparkles,
        keywords: "preview simulate no api calls",
        run: editor.dryRun,
      },
      {
        id: "save",
        label: "Save workflow",
        group: "Actions",
        icon: Save,
        shortcut: "Ctrl S",
        run: editor.save,
      },
      {
        id: "export",
        label: "Export workflow as JSON",
        group: "Actions",
        icon: Download,
        keywords: "download backup json file",
        run: editor.exportWorkflow,
      },
    );

    for (const node of NODE_DEFINITIONS) {
      commands.push({
        id: `add-${node.type}`,
        label: `Add ${node.label}`,
        group: "Add a node",
        hint: node.description,
        icon: Plus,
        keywords: `${node.type} ${node.category} new`,
        run: () => editor.addNode(node.type),
      });
    }
  }

  for (const workflow of workflows) {
    commands.push({
      id: `workflow-${workflow.id}`,
      label: workflow.name || "Untitled Workflow",
      group: "Workflows",
      hint: `${workflow.nodes.length} ${workflow.nodes.length === 1 ? "node" : "nodes"}`,
      icon: WorkflowIcon,
      keywords: "open saved",
      run: () => router.push(`/workflows/${workflow.id}`),
    });
  }

  commands.push(
    {
      id: "go-dashboard",
      label: "Go to Dashboard",
      group: "Go to",
      icon: LayoutDashboard,
      run: () => router.push("/"),
    },
    {
      id: "go-workflows",
      label: "Go to Workflows",
      group: "Go to",
      icon: ArrowRight,
      run: () => router.push("/workflows"),
    },
    {
      id: "go-templates",
      label: "Go to Templates",
      group: "Go to",
      icon: Boxes,
      run: () => router.push("/templates"),
    },
    {
      id: "go-settings",
      label: "Go to Settings",
      group: "Go to",
      icon: Settings,
      run: () => router.push("/settings"),
    },
  );

  commands.push(
    {
      id: "theme-light",
      label: "Use the light theme",
      group: "Appearance",
      icon: Sun,
      keywords: "appearance colour color white day",
      run: () => writeThemePreference("light"),
    },
    {
      id: "theme-dark",
      label: "Use the dark theme",
      group: "Appearance",
      icon: Moon,
      keywords: "appearance colour color night",
      run: () => writeThemePreference("dark"),
    },
    {
      id: "theme-system",
      label: "Match the system theme",
      group: "Appearance",
      icon: Monitor,
      keywords: "appearance auto os preference",
      run: () => writeThemePreference("system"),
    },
    {
      id: "shortcuts",
      label: "Keyboard shortcuts",
      group: "Help",
      icon: Settings,
      keywords: "help keys commands hotkeys",
      run: onOpenShortcuts,
    },
  );

  return commands;
}

/**
 * Keeps the sections in the order their first command appears, so
 * filtering never reorders the app around.
 */
function toGroups(commands: PaletteCommand[]) {
  const groups: [string, PaletteCommand[]][] = [];

  for (const command of commands) {
    const existing = groups.find(([group]) => group === command.group);

    if (existing) {
      existing[1].push(command);
    } else {
      groups.push([command.group, [command]]);
    }
  }

  return groups;
}