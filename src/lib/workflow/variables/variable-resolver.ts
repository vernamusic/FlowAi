import { parseVariable, parseVariables, type ParsedVariable } from "./variable-parser";

import type { VariableContext, VariableValue } from "./variable-context";

/**
 * Resolve a nested value using the parsed segments.
 *
 * Supports property names, array indexes (including negative ones),
 * bracket notation, the `length` of arrays and strings, and optional
 * segments that stop at the first missing value.
 */
function getValueBySegments(
  value: VariableValue,
  segments: ParsedVariable["segments"],
): VariableValue {
  let current: unknown = value;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (segment.kind === "index") {
      if (!Array.isArray(current)) {
        return undefined;
      }

      const index =
        segment.index < 0 ? current.length + segment.index : segment.index;

      if (index < 0 || index >= current.length) {
        return undefined;
      }

      current = current[index];

      continue;
    }

    /**
     * `.length` is a common request for lists and strings.
     */
    if (segment.name === "length") {
      if (Array.isArray(current)) {
        current = current.length;

        continue;
      }

      if (typeof current === "string") {
        current = current.length;

        continue;
      }

      return undefined;
    }

    if (typeof current !== "object" || Array.isArray(current)) {
      /**
       * A non optional segment on a primitive is a real mismatch, but
       * returning undefined keeps templates forgiving.
       */
      return undefined;
    }

    const object = current as Record<string, unknown>;

    if (segment.optional && !(segment.name in object)) {
      return undefined;
    }

    current = object[segment.name];
  }

  return current as VariableValue;
}

/**
 * Convert a fallback literal into a value.
 *
 * `"text"` stays text, `12` becomes a number, and `true` a boolean.
 */
function parseFallback(raw: string): VariableValue {
  const trimmed = raw.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1)
  ) {
    return trimmed.slice(1, -1);
  }

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  return trimmed;
}

/**
 * Whether a fallback should be used.
 *
 * Empty strings count, because a blank value is rarely what a template
 * author wants to send onward.
 */
function isEmptyValue(value: VariableValue): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Resolve a single variable expression.
 *
 * Example:
 *
 * resolveVariable("{{manual_trigger.email}}", context)
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
    return applyFallback(parsed, undefined);
  }

  return applyFallback(parsed, getValueBySegments(root, parsed.segments));
}

function applyFallback(
  parsed: ParsedVariable,
  value: VariableValue,
): VariableValue {
  if (parsed.fallback === undefined || !isEmptyValue(value)) {
    return value;
  }

  return parseFallback(parsed.fallback);
}

/**
 * Convert any variable value to a string.
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
 * Resolve all variables inside a text template.
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

    result = replaceOnce(result, variable.raw, stringifyValue(value));
  }

  return result;
}

/**
 * Replace the first occurrence only, so the same expression used twice
 * keeps both values.
 */
function replaceOnce(text: string, search: string, replacement: string) {
  const index = text.indexOf(search);

  if (index === -1) {
    return text;
  }

  return text.slice(0, index) + replacement + text.slice(index + search.length);
}

/**
 * Resolve a value recursively.
 *
 * Supports strings, numbers, booleans, objects, and arrays.
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