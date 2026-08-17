import type { WorkflowNode } from "@/types/workflow";

export type VariableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | unknown[];

export type VariableContext = Record<string, VariableValue>;

/**
 * Converts node label/type into
 * a safe variable key.
 *
 * Example:
 *
 * "Manual Trigger"
 * → "manual_trigger"
 */
export function createVariableKey(node: WorkflowNode): string {
  const value = node.data.label || node.type;

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Creates a variable context
 * from executed workflow nodes.
 */
export function createVariableContext(
  nodes: WorkflowNode[],
  outputs: Map<string, Record<string, unknown>>,
): VariableContext {
  const context: VariableContext = {};

  for (const node of nodes) {
    const output = outputs.get(node.id);

    if (!output) {
      continue;
    }

    const key = createVariableKey(node);

    /**
     * Friendly variable name
     */
    context[key] = output;

    /**
     * Direct node-id access
     */
    context[node.id] = output;
  }

  return context;
}
