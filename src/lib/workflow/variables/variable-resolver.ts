import { parseVariable, parseVariables } from "./variable-parser";

import type { VariableContext, VariableValue } from "./variable-context";

/**
 * Resolve a nested value from an object.
 *
 * Example:
 *
 * context = {
 *   manual_trigger: {
 *     user: {
 *       name: "Amir"
 *     }
 *   }
 * }
 *
 * path = ["user", "name"]
 *
 * result = "Amir"
 */
function getValueByPath(value: VariableValue, path: string[]): VariableValue {
  let current: unknown = value;

  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(key);

      if (Number.isNaN(index) || index < 0 || index >= current.length) {
        return undefined;
      }

      current = current[index];

      continue;
    }

    const object = current as Record<string, unknown>;

    current = object[key];
  }

  return current as VariableValue;
}

/**
 * Resolve a single variable.
 *
 * Example:
 *
 * {{manual_trigger.email}}
 *
 * → "amir@example.com"
 */
export function resolveVariable(
  expression: string,
  context: VariableContext,
): VariableValue {
  const parsed = parseVariable(expression);

  if (!parsed) {
    return undefined;
  }

  const root = context[parsed.key];

  if (root === undefined) {
    return undefined;
  }

  return getValueByPath(root, parsed.path);
}

/**
 * Convert any variable value
 * to a string.
 */
function stringifyValue(value: VariableValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

/**
 * Resolve all variables inside
 * a text template.
 *
 * Example:
 *
 * "Hello {{manual_trigger.name}}"
 *
 * →
 *
 * "Hello Amir"
 */
export function resolveTemplate(
  text: string,
  context: VariableContext,
): string {
  const variables = parseVariables(text);

  if (variables.length === 0) {
    return text;
  }

  let result = text;

  for (const variable of variables) {
    const value = resolveVariable(variable.raw, context);

    result = result.replace(variable.raw, stringifyValue(value));
  }

  return result;
}

/**
 * Resolve a value recursively.
 *
 * Supports:
 *
 * string
 * number
 * boolean
 * object
 * array
 */
export function resolveValue(
  value: unknown,
  context: VariableContext,
): unknown {
  if (typeof value === "string") {
    return resolveTemplate(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, context));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = resolveValue(item, context);
    }

    return result;
  }

  return value;
}
