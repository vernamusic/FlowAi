export interface JsonParserConfig {
  /** Template string, already resolved by the engine. */
  input: string;

  /** Optional dot path such as `data.items[0].id`. */
  path: string;
}

export function readJsonParserConfig(
  raw: Record<string, unknown> | undefined,
): JsonParserConfig {
  const config = raw ?? {};

  return {
    input: typeof config.input === "string" ? config.input : "",
    path: typeof config.path === "string" ? config.path.trim() : "",
  };
}

/**
 * Parse a JSON payload and optionally pick a single value out of it.
 *
 * A missing path is reported through `found` instead of failing, so a
 * Condition node can branch on it.
 */
export function executeJsonParser(
  config: JsonParserConfig,
): Record<string, unknown> {
  const trimmed = config.input.trim();

  if (!trimmed) {
    throw new Error("JSON Parser needs an input value.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `JSON Parser could not read the input as JSON${
        error instanceof Error ? `: ${error.message}` : "."
      }`,
    );
  }

  if (!config.path) {
    return {
      data: parsed,
      path: "",
      found: true,
      type: describeType(parsed),
    };
  }

  const value = getByPath(parsed, config.path);

  return {
    data: value ?? null,
    path: config.path,
    found: value !== undefined,
    type: describeType(value),
  };
}

/**
 * Resolve a dot path that may contain array indexes, e.g.
 * `data.items[0].id`.
 */
export function getByPath(value: unknown, path: string): unknown {
  if (!path) {
    return value;
  }

  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = value;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);

      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }

      current = current[index];

      continue;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function describeType(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}