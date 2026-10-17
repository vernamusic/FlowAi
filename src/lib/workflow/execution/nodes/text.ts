/**
 * Text
 *
 * Shapes a value into a string: trim it, change its case, join a list,
 * or drop characters. Where Set Variable builds a value out of templates,
 * this node works on a value that already exists.
 */

export type TextOperation =
  | "none"
  | "trim"
  | "upper"
  | "lower"
  | "slug"
  | "join"
  | "json"
  | "remove";

export interface TextConfig {
  /** Which value to work on. Empty means everything the node received. */
  field: string;

  operation: TextOperation;

  /** Used by join, and by remove as the characters to drop. */
  second: string;

  name: string;
}

export interface TextResult {
  text: string;

  operation: TextOperation;

  /** True when the chosen field was not there. */
  missingField: boolean;
}

export const TEXT_OPERATIONS: { value: TextOperation; label: string }[] = [
  { value: "none", label: "Leave as it is" },
  { value: "trim", label: "Trim spaces" },
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "slug", label: "Slug (url safe)" },
  { value: "join", label: "Join a list" },
  { value: "json", label: "Pretty print JSON" },
  { value: "remove", label: "Remove characters" },
];

export const DEFAULT_TEXT_RESULT_NAME = "text";

export function readTextConfig(
  raw: Record<string, unknown> | undefined,
): TextConfig {
  const config = raw ?? {};

  const operation = TEXT_OPERATIONS.some(
    (item) => item.value === config.operation,
  )
    ? (config.operation as TextOperation)
    : "none";

  return {
    field: typeof config.field === "string" ? config.field.trim() : "",

    operation,

    second: typeof config.second === "string" ? config.second : "",

    name:
      typeof config.name === "string" && config.name.trim()
        ? config.name.trim().replace(/\s+/g, "_")
        : DEFAULT_TEXT_RESULT_NAME,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/**
 * Which value to work on.
 *
 * With a field named, that field and nothing else. Without one, the
 * first text that arrived, because "clean up this text" is the common
 * case and the whole input object is not text.
 */
function pickValue(
  input: Record<string, unknown>,
  field: string,
): { value: unknown; missing: boolean } {
  if (field) {
    return field in input
      ? { value: input[field], missing: false }
      : { value: input, missing: true };
  }

  const entries = Object.entries(input);

  const firstText = entries.find(([, value]) => typeof value === "string");
  const firstNumber = entries.find(([, value]) => typeof value === "number");

  if (firstText) return { value: firstText[1], missing: false };
  if (firstNumber) return { value: firstNumber[1], missing: false };

  return { value: input, missing: false };
}

export function executeText(
  config: TextConfig,
  input: Record<string, unknown>,
): TextResult {
  const { value, missing } = pickValue(input, config.field);
  const hasField = Boolean(config.field) && !missing;

  let text: string;

  switch (config.operation) {
    case "trim":
      text = toText(value).trim();
      break;

    case "upper":
      text = toText(value).toUpperCase();
      break;

    case "lower":
      text = toText(value).toLowerCase();
      break;

    case "slug":
      text = slugify(toText(value));
      break;

    case "join": {
      const separator = config.second || ", ";

      if (Array.isArray(value)) {
        text = value.map(toText).join(separator);
      } else {
        /**
         * Joining something that is not a list is a mistake worth saying
         * out loud, rather than stringifying it and moving on.
         */
        throw new Error(
          `Join needs a list. ${config.field || "The input"} is ${describe(value)}.`,
        );
      }

      break;
    }

    case "json":
      try {
        text = JSON.stringify(value, null, 2);
      } catch {
        throw new Error("That value cannot be shown as JSON.");
      }

      break;

    case "remove": {
      const remove = config.second;

      if (!remove) {
        throw new Error(
          "Type the characters to remove, separated by spaces.",
        );
      }

      text = toText(value);

      for (const character of remove.split(/\s+/).filter(Boolean)) {
        text = text.split(character).join("");
      }

      break;
    }

    case "none":
    default:
      text = toText(value);
      break;
  }

  return {
    text,
    operation: config.operation,
    missingField: Boolean(config.field) && !hasField,
  };
}

function describe(value: unknown) {
  if (Array.isArray(value)) return "a list";
  if (value === null) return "empty";
  if (value === undefined) return "empty";
  if (typeof value === "object") return "an object";
  if (typeof value === "number") return "a number";
  return "text";
}