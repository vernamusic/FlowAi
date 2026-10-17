import type { LucideIcon } from "lucide-react";

/**
 * One thing the palette can do.
 *
 * Commands are plain data so the list can be built, filtered and tested
 * without a browser or a React tree.
 */
export interface PaletteCommand {
  id: string;

  label: string;

  /** Section heading, and part of what the query is matched against. */
  group: string;

  /** Secondary line, such as a node description. */
  hint?: string;

  icon: LucideIcon;

  /**
   * Extra words that should find this command. "webhook" finds Webhook
   * Trigger even though the label already has it, and "light" finds the
   * light theme command.
   */
  keywords?: string;

  /** Rendered as a key hint on the right, such as "Ctrl S". */
  shortcut?: string;

  run: () => void;
}

/** Better matches first; anything scoring `noMatch` is dropped. */
const noMatch = Number.POSITIVE_INFINITY;

const startsWith = 0;
const contains = 1;
const keyword = 2;

function scoreCommand(command: PaletteCommand, query: string): number {
  const label = command.label.toLowerCase();
  const keywords = command.keywords?.toLowerCase() ?? "";

  if (label.startsWith(query)) return startsWith;
  if (label.includes(query)) return contains;
  if (keywords.includes(query)) return keyword;

  return noMatch;
}

/**
 * Narrow the list to what the query matches, best first.
 *
 * An empty query keeps everything, in the order the commands were built,
 * because the grouping already puts the useful things on top.
 */
export function filterCommands(
  commands: PaletteCommand[],
  query: string,
): PaletteCommand[] {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) return commands;

  return commands
    .map((command, index) => ({ command, index, score: scoreCommand(command, trimmed) }))
    .filter((entry) => entry.score !== noMatch)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.command);
}