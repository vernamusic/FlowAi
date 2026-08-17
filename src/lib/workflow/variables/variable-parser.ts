/**
 * Parsed workflow variable
 *
 * Example:
 *
 * {{manual_trigger.email}}
 *
 * becomes:
 *
 * {
 *   raw: "{{manual_trigger.email}}",
 *   key: "manual_trigger",
 *   path: ["email"]
 * }
 */
export interface ParsedVariable {
  raw: string;
  key: string;
  path: string[];
}

/**
 * Variable syntax:
 *
 * {{variable}}
 * {{variable.property}}
 * {{variable.property.nested}}
 */
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_-]+)((?:\.[a-zA-Z0-9_-]+)*)\s*\}\}/g;

/**
 * Parse a single variable expression.
 */
export function parseVariable(expression: string): ParsedVariable | null {
  const match = expression.match(VARIABLE_REGEX);

  if (!match) {
    return null;
  }

  const raw = match[0];

  const content = raw.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");

  const parts = content.split(".").filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const [key, ...path] = parts;

  return {
    raw,
    key,
    path,
  };
}

/**
 * Find all variables inside a text.
 *
 * Example:
 *
 * "Hello {{user.name}}, email: {{user.email}}"
 *
 * returns:
 *
 * [
 *   {
 *     raw: "{{user.name}}",
 *     key: "user",
 *     path: ["name"]
 *   },
 *   {
 *     raw: "{{user.email}}",
 *     key: "user",
 *     path: ["email"]
 *   }
 * ]
 */
export function parseVariables(text: string): ParsedVariable[] {
  const variables: ParsedVariable[] = [];

  for (const match of text.matchAll(VARIABLE_REGEX)) {
    const raw = match[0];

    const content = raw.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");

    const parts = content.split(".").filter(Boolean);

    if (parts.length === 0) {
      continue;
    }

    const [key, ...path] = parts;

    variables.push({
      raw,
      key,
      path,
    });
  }

  return variables;
}

/**
 * Check whether a string
 * contains a variable.
 */
export function hasVariables(text: string): boolean {
  return /\{\{\s*[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\s*\}\}/.test(text);
}
