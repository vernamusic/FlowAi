/**
 * Variable syntax
 *
 * {{manual_trigger.email}}
 * {{orders.items[0].title}}
 * {{orders.items[-1].id}}
 * {{order.customer?.email}}
 * {{order.total ?? "unknown"}}
 *
 * A path segment is either a property name or an array index. Segments
 * prefixed with `?.` stop at the first missing value instead of failing,
 * and `??` supplies a fallback for empty results.
 */

export type PathSegment =
  | { kind: "key"; name: string; optional: boolean }
  | { kind: "index"; index: number };

export interface ParsedVariable {
  /** The full expression, e.g. `{{order.items[0]}}`. */
  raw: string;

  /** Root key, usually a node variable such as `manual_trigger`. */
  key: string;

  /** Flattened path, kept for display and back compatibility. */
  path: string[];

  segments: PathSegment[];

  /** Raw fallback text after `??`, when present. */
  fallback?: string;
}

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * Parse a single variable expression.
 *
 * Returns null when the text is not a valid expression, so malformed
 * input stays literal instead of silently resolving to nothing.
 */
export function parseVariable(expression: string): ParsedVariable | null {
  const start = expression.indexOf("{{");

  if (start === -1) {
    return null;
  }

  const content = readExpression(expression, start);

  if (content === null) {
    return null;
  }

  const parsed = parseExpression(content);

  return parsed ? { ...parsed, raw: expression.slice(start, start + content.length + 4) } : null;
}

/**
 * Find all variable expressions inside a text.
 *
 * Example:
 *
 * "Hi {{user.name}} ({{user.email}})"
 *
 * returns two parsed variables, in order.
 */
export function parseVariables(text: string): ParsedVariable[] {
  const variables: ParsedVariable[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf("{{", cursor);

    if (start === -1) {
      break;
    }

    const content = readExpression(text, start);

    if (content === null) {
      cursor = start + 2;

      continue;
    }

    const parsed = parseExpression(content);

    if (parsed) {
      variables.push({
        ...parsed,
        raw: text.slice(start, start + content.length + 4),
      });
    }

    cursor = start + content.length + 4;
  }

  return variables;
}

/**
 * Check whether a string contains a variable.
 */
export function hasVariables(text: string): boolean {
  return parseVariables(text).length > 0;
}

/**
 * Read the text between `{{` and `}}`, ignoring braces inside quotes so
 * a fallback such as `?? "}}"` does not end the expression early.
 *
 * Returns the inner text, or null when the expression is not closed.
 */
function readExpression(
  text: string,
  start: number,
): string | null {
  let quote: string | null = null;

  for (let index = start + 2; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;

      continue;
    }

    if (character === "}" && text[index + 1] === "}") {
      return text.slice(start + 2, index);
    }
  }

  return null;
}

function parseExpression(content: string): Omit<ParsedVariable, "raw"> | null {
  const trimmed = content.trim();

  if (!trimmed) {
    return null;
  }

  const { expression, fallback } = splitFallback(trimmed);
  const scanner = new PathScanner(expression);

  const key = scanner.readIdentifier();

  if (!key) {
    return null;
  }

  const segments = scanner.readSegments();

  if (segments === null) {
    return null;
  }

  return {
    key,
    segments,
    path: segments.map((segment) =>
      segment.kind === "index" ? String(segment.index) : segment.name,
    ),
    ...(fallback === undefined ? {} : { fallback }),
  };
}

/**
 * Separate the `?? fallback` part from the path, ignoring `??` inside
 * quotes.
 */
function splitFallback(text: string): {
  expression: string;
  fallback?: string;
} {
  let quote: string | null = null;

  for (let index = 0; index < text.length - 1; index += 1) {
    const character = text[index];

    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;

      continue;
    }

    if (character === "?" && text[index + 1] === "?") {
      return {
        expression: text.slice(0, index).trim(),
        fallback: text.slice(index + 2).trim(),
      };
    }
  }

  return { expression: text };
}

/**
 * Tiny cursor over the path portion of an expression.
 */
class PathScanner {
  private index = 0;

  constructor(private readonly source: string) {}

  readIdentifier(): string | null {
    const match = this.source.slice(this.index).match(/^[a-zA-Z_][a-zA-Z0-9_-]*/);

    if (!match) {
      return null;
    }

    this.index += match[0].length;

    return IDENTIFIER.test(match[0]) ? match[0] : null;
  }

  readSegments(): PathSegment[] | null {
    const segments: PathSegment[] = [];

    while (this.index < this.source.length) {
      const character = this.source[this.index];

      if (character === "[") {
        const segment = this.readIndex();

        if (!segment) {
          return null;
        }

        segments.push(segment);

        continue;
      }

      /**
       * `?.` marks an optional segment, `.` a regular one.
       */
      if (
        character === "?" &&
        this.source[this.index + 1] === "."
      ) {
        this.index += 2;

        const name = this.readIdentifier();

        if (!name) {
          return null;
        }

        segments.push({ kind: "key", name, optional: true });

        continue;
      }

      if (character === ".") {
        this.index += 1;

        const name = this.readIdentifier();

        if (!name) {
          return null;
        }

        segments.push({ kind: "key", name, optional: false });

        continue;
      }

      return null;
    }

    return segments;
  }

  private readIndex(): PathSegment | null {
    const closing = this.source.indexOf("]", this.index);

    if (closing === -1) {
      return null;
    }

    const raw = this.source.slice(this.index + 1, closing).trim();

    /**
     * Quoted indexes address object keys, e.g. ["content-type"].
     */
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      const name = raw.slice(1, -1);

      if (!name) {
        return null;
      }

      this.index = closing + 1;

      return { kind: "key", name, optional: false };
    }

    if (!/^-?\d+$/.test(raw)) {
      return null;
    }

    this.index = closing + 1;

    return { kind: "index", index: Number(raw) };
  }
}