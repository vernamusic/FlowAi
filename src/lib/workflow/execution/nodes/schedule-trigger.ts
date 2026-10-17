/**
 * Triggers that start a run on their own.
 *
 * Everything here still happens in the browser: there is no server to
 * wake up, so both triggers only fire while the editor is open. That is
 * the honest limit of a frontend-only workflow builder, and the copy in
 * the inspector says so.
 */

export interface ScheduleTriggerConfig {
  /** Minutes between runs. */
  intervalMinutes: number;

  /**
   * Whether an automatic run calls real APIs or stands in for them.
   *
   * Interval runs repeat, so this defaults to a dry run: a forgotten
   * editor should not quietly spend money.
   */
  mode: "live" | "dry-run";
}

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 24 * 60;

export function clampIntervalMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 5;
  }

  return Math.min(
    Math.max(Math.round(value * 10) / 10, MIN_INTERVAL_MINUTES),
    MAX_INTERVAL_MINUTES,
  );
}

export function readIntervalTriggerConfig(
  raw: Record<string, unknown> | undefined,
): ScheduleTriggerConfig {
  const config = raw ?? {};

  return {
    intervalMinutes: clampIntervalMinutes(config.intervalMinutes),

    mode: config.mode === "live" ? "live" : "dry-run",
  };
}

/**
 * What the two triggers hand to the rest of the workflow.
 */
export interface ScheduleTriggerOutput {
  [key: string]: unknown;

  trigger: "page-load" | "interval";

  /** ISO timestamp of the run. */
  startedAt: string;

  /** Where it was started from, which is the page the browser is on. */
  page: string;

  /** Minutes between runs, for the interval trigger. */
  intervalMinutes?: number;

  /** Whether this run stands in for real calls. */
  mode: "live" | "dry-run";
}

function readPage(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location?.href ?? "";
}

export function executePageLoadTrigger(): ScheduleTriggerOutput {
  return {
    trigger: "page-load",
    startedAt: new Date().toISOString(),
    page: readPage(),
    mode: "dry-run",
  };
}

export function executeIntervalTrigger(
  config: ScheduleTriggerConfig,
): ScheduleTriggerOutput {
  return {
    trigger: "interval",
    startedAt: new Date().toISOString(),
    page: readPage(),
    intervalMinutes: config.intervalMinutes,
    mode: config.mode,
  };
}

/** Milliseconds between automatic runs. */
export function intervalToMs(minutes: number): number {
  return Math.max(1, Math.round(minutes * 60_000));
}