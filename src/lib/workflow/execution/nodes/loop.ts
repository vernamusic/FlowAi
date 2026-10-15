import type {
  VariableContext,
  VariableValue,
} from "@/lib/workflow/variables/variable-context";

export const DEFAULT_ITEM_NAME = "item";
export const DEFAULT_INDEX_NAME = "index";
export const MAX_ITERATIONS = 1000;

export interface LoopConfig {
  /** Template string, already resolved by the engine. */
  items: string;

  /** Variable names exposed to the nodes inside the loop. */
  itemName: string;

  indexName: string;

  maxIterations: number;

  /** Stop the whole workflow when a node inside the loop fails. */
  stopOnError: boolean;
}

export function readLoopConfig(
  raw: Record<string, unknown> | undefined,
): LoopConfig {
  const config = raw ?? {};

  return {
    items: typeof config.items === "string" ? config.items : "",
    itemName: readName(config.itemName, DEFAULT_ITEM_NAME),
    indexName: readName(config.indexName, DEFAULT_INDEX_NAME),
    maxIterations: clampIterations(
      typeof config.maxIterations === "number" ? config.maxIterations : 25,
    ),
    stopOnError: config.stopOnError !== false,
  };
}

function readName(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function clampIterations(value: number): number {
  if (!Number.isFinite(value)) {
    return 25;
  }

  return Math.min(Math.max(Math.round(value), 1), MAX_ITERATIONS);
}

/**
 * Normalize the configured source into an array of items.
 *
 * Accepts a real array (from an upstream JSON node), a JSON string, or a
 * number to repeat that many times.
 */
export function resolveLoopItems(config: LoopConfig): unknown[] {
  const trimmed = config.items.trim();

  if (!trimmed) {
    throw new Error("Loop needs a list of items to iterate over.");
  }

  if (/^\d+$/.test(trimmed)) {
    return Array.from({ length: Number(trimmed) }, (_, index) => index);
  }

  let parsed: unknown = config.items;

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      throw new Error(
        `Loop could not read the items as JSON${
          error instanceof Error ? `: ${error.message}` : "."
        }`,
      );
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Loop needs an array. Connect a JSON Parser, or paste a JSON array such as [1, 2, 3].",
    );
  }

  if (parsed.length === 0) {
    return [];
  }

  if (parsed.length > config.maxIterations) {
    throw new Error(
      `Loop found ${parsed.length} items, which is above the limit of ${config.maxIterations}. Raise the limit or send fewer items.`,
    );
  }

  return parsed;
}

/**
 * Variables made available to every node inside the loop body.
 */
export function createLoopVariables(
  config: LoopConfig,
  item: unknown,
  index: number,
  total: number,
): VariableContext {
  return {
    [config.itemName]: item as VariableValue,
    [config.indexName]: index,
    [`${config.itemName}Count`]: total,
  };
}