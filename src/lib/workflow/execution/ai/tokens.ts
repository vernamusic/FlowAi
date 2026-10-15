import { findAiModel } from "./providers";

import type { AiProviderId, AiUsage } from "./types";

/**
 * Rough token estimate for a piece of text.
 *
 * Providers do not expose a tokenizer for every model, so this uses the
 * widely used "four characters per token" heuristic, raised to the
 * word-based estimate when a text is word heavy.
 */
export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }

  const characters = text.length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const characterEstimate = Math.ceil(characters / 4);
  const wordEstimate = Math.ceil(words * 1.3);

  return Math.max(characterEstimate, wordEstimate);
}

/**
 * Messages are prefixed with a small per-message overhead.
 */
export function estimateMessageTokens(
  messages: { role: string; content: string }[],
): number {
  const overhead = messages.length * 4;

  return (
    messages.reduce(
      (total, message) => total + estimateTokens(`${message.role}:${message.content}`),
      overhead,
    ) || 0
  );
}

export interface AiCostEstimate {
  /** Known only when the provider publishes pricing for the model. */
  cost: number | null;

  promptTokens: number;

  /** Upper bound derived from the configured maximum output tokens. */
  maxOutputTokens: number;

  /** True when the estimate came from local token counting. */
  estimated: boolean;
}

/**
 * Estimate the cost of a run.
 *
 * Returns `cost: null` when the provider does not publish pricing, so
 * the UI can say that the cost is unavailable instead of inventing it.
 */
export function estimateAiCost(options: {
  providerId: AiProviderId;

  model: string;

  promptTokens: number;

  outputTokens: number;

  estimated?: boolean;
}): AiCostEstimate {
  const { providerId, model, promptTokens, outputTokens } = options;
  const definition = findAiModel(providerId, model);
  const pricing = definition?.pricing;

  if (!pricing) {
    return {
      cost: null,
      promptTokens,
      maxOutputTokens: outputTokens,
      estimated: options.estimated ?? true,
    };
  }

  const cost =
    (promptTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return {
    cost,
    promptTokens,
    maxOutputTokens: outputTokens,
    estimated: options.estimated ?? true,
  };
}

/**
 * Build usage from provider reported numbers, falling back to estimates
 * when the provider does not report usage.
 */
export function resolveUsage(options: {
  promptText: string;

  completionText: string;

  reported?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
  };
}): AiUsage {
  const { promptText, completionText, reported } = options;

  if (reported && reported.promptTokens > 0) {
    const promptTokens = reported.promptTokens;
    const completionTokens = reported.completionTokens;
    const totalTokens =
      reported.totalTokens && reported.totalTokens > 0
        ? reported.totalTokens
        : promptTokens + completionTokens;

    return { promptTokens, completionTokens, totalTokens, estimated: false };
  }

  const promptTokens = estimateTokens(promptText);
  const completionTokens = estimateTokens(completionText);

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimated: true,
  };
}

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }

  return String(Math.max(0, Math.round(value)));
}

/**
 * Format a USD amount. Very small amounts keep more precision so a
 * cheap run still shows a meaningful number.
 */
export function formatCost(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return "$0.00";
  }

  if (value < 0.01) {
    return `$${value.toFixed(5)}`;
  }

  if (value < 1) {
    return `$${value.toFixed(4)}`;
  }

  return `$${value.toFixed(2)}`;
}