export type TransformValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export interface TransformConfig {
  /** Key the value is exposed under, e.g. `greeting`. */
  name: string;

  /** Template string, already resolved by the engine. */
  value: string;

  valueType: TransformValueType;
}

export const TRANSFORM_VALUE_TYPES: {
  value: TransformValueType;
  label: string;
  description: string;
}[] = [
  { value: "string", label: "Text", description: "Kept exactly as written." },
  {
    value: "number",
    label: "Number",
    description: "Parsed as a number, fails when it is not numeric.",
  },
  {
    value: "boolean",
    label: "True / false",
    description: "Accepts true/false, yes/no, and 1/0.",
  },
  {
    value: "object",
    label: "JSON object",
    description: "Parsed from a JSON object.",
  },
  {
    value: "array",
    label: "JSON array",
    description: "Parsed from a JSON array.",
  },
];

export function readTransformConfig(
  raw: Record<string, unknown> | undefined,
): TransformConfig {
  const config = raw ?? {};

  return {
    name:
      typeof config.name === "string" && config.name.trim()
        ? config.name.trim()
        : "result",
    value: typeof config.value === "string" ? config.value : "",
    valueType: isTransformValueType(config.valueType)
      ? config.valueType
      : "string",
  };
}

function isTransformValueType(value: unknown): value is TransformValueType {
  return TRANSFORM_VALUE_TYPES.some((item) => item.value === value);
}

/**
 * Coerce the template result into the declared type so downstream nodes
 * can compare or route on it without extra parsing.
 */
export function executeTransform(
  config: TransformConfig,
): Record<string, unknown> {
  const raw = config.value.trim();

  switch (config.valueType) {
    case "number": {
      const parsed = Number(raw);

      if (raw === "" || Number.isNaN(parsed)) {
        throw new Error(
          `Set Variable could not read "${raw || "(empty)"}" as a number.`,
        );
      }

      return { [config.name]: parsed };
    }

    case "boolean": {
      const normalized = raw.toLowerCase();

      if (["true", "yes", "1", "on"].includes(normalized)) {
        return { [config.name]: true };
      }

      if (["false", "no", "0", "off"].includes(normalized)) {
        return { [config.name]: false };
      }

      throw new Error(
        `Set Variable could not read "${raw}" as true or false. Use true, false, yes, no, 1, or 0.`,
      );
    }

    case "object":
    case "array": {
      let parsed: unknown;

      try {
        parsed = raw ? JSON.parse(raw) : config.valueType === "array" ? [] : {};
      } catch (error) {
        throw new Error(
          `Set Variable could not parse the value as JSON${
            error instanceof Error ? `: ${error.message}` : "."
          }`,
        );
      }

      if (config.valueType === "array" && !Array.isArray(parsed)) {
        throw new Error("Set Variable expected a JSON array but got another type.");
      }

      if (config.valueType === "object" && (Array.isArray(parsed) || parsed === null || typeof parsed !== "object")) {
        throw new Error("Set Variable expected a JSON object but got another type.");
      }

      return { [config.name]: parsed };
    }

    default:
      return { [config.name]: config.value };
  }
}