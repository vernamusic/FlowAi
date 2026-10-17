/**
 * Per node resilience.
 *
 * A node can be retried, given a deadline, and allowed to fail without
 * stopping the run. All three live together because they describe the
 * same thing: what happens when a node does not work.
 */

export interface ResilienceConfig {
  /** Extra attempts after the first one. */
  retries: number;

  /** Wait between attempts. */
  retryDelayMs: number;

  /** Deadline for one attempt. Zero means no deadline. */
  timeoutMs: number;

  /** Keep the workflow going when this node fails. */
  continueOnError: boolean;
}

export const MAX_RETRIES = 5;
export const MAX_RETRY_DELAY_MS = 60_000;
export const MAX_TIMEOUT_MS = 600_000;

export const DEFAULT_RESILIENCE: ResilienceConfig = {
  retries: 0,
  retryDelayMs: 1000,
  timeoutMs: 0,
  continueOnError: false,
};

function clampInteger(value: unknown, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value), 0), max);
}

export function readResilienceConfig(
  raw: Record<string, unknown> | undefined,
): ResilienceConfig {
  const config = raw ?? {};

  return {
    retries: clampInteger(config.retries, MAX_RETRIES, DEFAULT_RESILIENCE.retries),
    retryDelayMs: clampInteger(
      config.retryDelayMs,
      MAX_RETRY_DELAY_MS,
      DEFAULT_RESILIENCE.retryDelayMs,
    ),
    timeoutMs: clampInteger(
      config.timeoutMs,
      MAX_TIMEOUT_MS,
      DEFAULT_RESILIENCE.timeoutMs,
    ),
    continueOnError:
      config.continueOnError === undefined
        ? DEFAULT_RESILIENCE.continueOnError
        : Boolean(config.continueOnError),
  };
}

/**
 * How many times the node will be attempted in total.
 */
export function attemptCount(config: ResilienceConfig): number {
  return config.retries + 1;
}

export interface ResilienceAttempt {
  /** 1 for the first try. */
  attempt: number;

  of: number;

  error: Error;
}

export interface ResilienceResult {
  /** Called after a failed attempt, so the run can report it. */
  onRetry?: (attempt: ResilienceAttempt) => void;

  /** Aborting the whole run must not be reported as a retryable failure. */
  signal?: AbortSignal;
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (ms <= 0) {
      resolve();
      return;
    }

    const timer = setTimeout(finish, ms);

    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Run canceled", "AbortError"));
    }

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Run one node with its retries, deadline and continue-on-error rule.
 *
 * The attempt gets its own abort signal so a timeout only ends that
 * attempt, while canceling the run still ends everything immediately.
 */
export async function runWithResilience(
  run: (signal: AbortSignal) => Promise<Record<string, unknown>>,
  config: ResilienceConfig,
  options: ResilienceResult = {},
): Promise<Record<string, unknown>> {
  const total = attemptCount(config);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= total; attempt += 1) {
    if (options.signal?.aborted) {
      throw new DOMException("Run canceled", "AbortError");
    }

    const controller = new AbortController();

    const cancel = () => controller.abort();

    options.signal?.addEventListener("abort", cancel, { once: true });

    let timedOut = false;

    const timer =
      config.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, config.timeoutMs)
        : undefined;

    try {
      const result = await run(controller.signal);

      return result;
    } catch (error) {
      /**
       * The run itself was canceled, so this is not something a retry
       * can fix.
       */
      if (options.signal?.aborted) {
        throw error;
      }

      lastError =
        error instanceof Error ? error : new Error("Unknown error");

      if (timedOut) {
        lastError = new Error(
          `Timed out after ${formatMilliseconds(config.timeoutMs)}.`,
        );
      }

      const isLastAttempt = attempt === total;

      if (!isLastAttempt) {
        options.onRetry?.({ attempt, of: total, error: lastError });
      }
    } finally {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
    }

    if (attempt < total) {
      await delay(config.retryDelayMs, options.signal);
    }
  }

  throw lastError ?? new Error("The node failed.");
}

/**
 * The message a failed node carries, once retries are taken into account.
 */
export function describeFailure(
  error: Error,
  config: ResilienceConfig,
): string {
  const total = attemptCount(config);

  return total > 1
    ? `${error.message} (failed after ${total} attempts)`
    : error.message;
}

export function formatMilliseconds(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;

  const minutes = Math.floor(ms / 60_000);

  return `${minutes}m ${Math.round((ms % 60_000) / 1000)}s`;
}