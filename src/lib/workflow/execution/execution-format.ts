import { formatCost, formatTokenCount } from "@/lib/workflow/execution/ai/tokens";

/**
 * Shared formatting for the execution history screens.
 *
 * Runs are read back from storage, so every value here tolerates being
 * missing rather than rendering "undefined".
 */

export function formatRunDuration(duration: number | undefined): string {
  if (typeof duration !== "number" || !Number.isFinite(duration)) {
    return "—";
  }

  if (duration < 1000) {
    return `${Math.round(duration)}ms`;
  }

  if (duration < 60_000) {
    return `${(duration / 1000).toFixed(duration < 10_000 ? 2 : 1)}s`;
  }

  const minutes = Math.floor(duration / 60_000);

  return `${minutes}m ${Math.round((duration % 60_000) / 1000)}s`;
}

export function formatWhen(iso: string | undefined): string {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.round(seconds / 86_400)}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatClock(iso: string | undefined): string {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${formatClock(iso)}`;
}

export { formatCost, formatTokenCount };

/**
 * A cost with an asterisk when the tokens behind it were counted locally
 * rather than reported by the provider.
 */
export function formatEstimatedCost(cost: number | null, estimated: boolean) {
  if (cost === null) return "—";

  return estimated ? `${formatCost(cost)}*` : formatCost(cost);
}

/**
 * "1 node", "3 nodes". Counts appear in several tables and a stray
 * "1 nodes" reads like a bug.
 */
export function pluralize(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export const statusStyles: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400",
  error: "bg-red-500/10 text-red-400",
  canceled: "bg-zinc-800 text-zinc-400",
  running: "bg-blue-500/10 text-blue-400",
  idle: "bg-zinc-800 text-zinc-400",
  pending: "bg-zinc-800 text-zinc-400",
  skipped: "bg-zinc-800 text-zinc-500",
};

export function statusClass(status: string | undefined): string {
  return statusStyles[status ?? ""] ?? "bg-zinc-800 text-zinc-400";
}