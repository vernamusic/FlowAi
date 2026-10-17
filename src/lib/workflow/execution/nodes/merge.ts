/**
 * Merge
 *
 * Joins what several branches produced back into one place. The engine
 * already waits for every parent to finish, so by the time this runs it
 * knows exactly what arrived and from where.
 */

export type MergeMode = "combine" | "collect" | "first";

export interface MergeConfig {
  mode: MergeMode;
}

export interface MergeInput {
  nodeId: string;

  label: string;

  output: Record<string, unknown>;
}

export function readMergeConfig(raw: Record<string, unknown> | undefined): MergeConfig {
  const config = raw ?? {};

  return {
    mode:
      config.mode === "collect" || config.mode === "first"
        ? config.mode
        : "combine",
  };
}

export interface MergeResult {
  /** How the branches were joined. */
  mode: MergeMode;

  /** How many branches arrived. */
  sources: number;

  /** The label of each branch that produced something. */
  labels: string[];

  [key: string]: unknown;
}

export function executeMerge(
  config: MergeConfig,
  inputs: MergeInput[],
): MergeResult {
  const base = {
    mode: config.mode,
    sources: inputs.length,
    labels: inputs
      .filter((input) => Object.keys(input.output).length > 0)
      .map((input) => input.label),
  };

  if (config.mode === "collect") {
    return {
      ...base,
      items: inputs.map((input) => input.output),
      count: inputs.length,
    };
  }

  if (config.mode === "first") {
    const first = inputs.find(
      (input) => Object.keys(input.output).length > 0,
    );

    return {
      ...base,
      item: first?.output ?? {},
      from: first?.label ?? null,
      found: Boolean(first),
    };
  }

  /**
   * Combine: later branches win on a key the branches both produced,
   * which is what makes this useful for two branches that each fill in
   * part of the same record.
   */
  const combined: Record<string, unknown> = {};

  for (const input of inputs) {
    Object.assign(combined, input.output);
  }

  return { ...base, ...combined };
}