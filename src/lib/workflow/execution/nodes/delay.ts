export const MIN_DELAY_MS = 0;
export const MAX_DELAY_MS = 600000;

export interface DelayConfig {
  durationMs: number;
}

export function readDelayConfig(
  raw: Record<string, unknown> | undefined,
): DelayConfig {
  const config = raw ?? {};

  return {
    durationMs: clampDuration(
      typeof config.durationMs === "number" ? config.durationMs : 1000,
    ),
  };
}

export function clampDuration(value: number): number {
  if (!Number.isFinite(value)) {
    return 1000;
  }

  return Math.min(Math.max(Math.round(value), MIN_DELAY_MS), MAX_DELAY_MS);
}

/**
 * Wait for the configured duration, rejecting as soon as the run is
 * cancelled so a long delay never blocks the cancel button.
 */
export function executeDelay(
  config: DelayConfig,
  options: { signal?: AbortSignal; dryRun?: boolean } = {},
): Promise<Record<string, unknown>> {
  if (options.dryRun) {
    return Promise.resolve({
      waitedMs: 0,
      durationMs: config.durationMs,
      dryRun: true,
    });
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const finish = () => {
      options.signal?.removeEventListener("abort", handleAbort);

      resolve({
        waitedMs: Date.now() - startedAt,
        durationMs: config.durationMs,
      });
    };

    const handleAbort = () => {
      clearTimeout(timer);

      reject(new DOMException("Delay canceled", "AbortError"));
    };

    const timer = setTimeout(finish, config.durationMs);

    if (config.durationMs === 0) {
      finish();

      return;
    }

    if (options.signal?.aborted) {
      handleAbort();

      return;
    }

    options.signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

/**
 * Format a duration for the inspector, e.g. 1.5s or 2m 30s.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  if (ms < 60000) {
    return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);

  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}