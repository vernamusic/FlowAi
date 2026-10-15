import type { AiApiStyle, AiResponseFormat } from "./types";
import { supportsStructuredOutput } from "./providers";

export interface AiResponseFormatOption {
  id: AiResponseFormat;

  label: string;

  description: string;
}

export const AI_RESPONSE_FORMATS: AiResponseFormatOption[] = [
  {
    id: "text",
    label: "Text",
    description: "Free-form text, easiest to read in the execution logs.",
  },
  {
    id: "json",
    label: "JSON",
    description: "A single JSON value, parsed before it reaches the next node.",
  },
  {
    id: "schema",
    label: "Structured output",
    description: "JSON constrained by a schema you define below.",
  },
];

export const DEFAULT_SCHEMA_NAME = "flowai_output";

export interface ParsedSchema {
  schema: Record<string, unknown> | null;

  error: string | null;
}

export function parseJsonSchema(text: string): ParsedSchema {
  const trimmed = text.trim();

  if (!trimmed) {
    return { schema: null, error: "Add a JSON schema to use structured output." };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      schema: null,
      error: error instanceof Error ? error.message : "The schema is not valid JSON.",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { schema: null, error: "The schema must be a JSON object." };
  }

  return { schema: parsed as Record<string, unknown>, error: null };
}

/**
 * Structured output in strict mode requires every property to be
 * required and objects to forbid extra keys. Schemas that break those
 * rules are sent without `strict` so the provider does not reject them.
 */
export function isStrictCompatible(schema: Record<string, unknown>): boolean {
  if (schema.type !== "object") {
    return false;
  }

  if (schema.additionalProperties !== false) {
    return false;
  }

  const properties = schema.properties;

  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    return false;
  }

  const required = schema.required;

  if (!Array.isArray(required)) {
    return false;
  }

  return Object.keys(properties).every((key) => required.includes(key));
}

export interface JsonSchemaIssue {
  path: string;

  message: string;
}

/**
 * Validate a parsed JSON value against the subset of JSON Schema that
 * the structured-output panel exposes. It is intentionally forgiving:
 * unknown keywords are ignored, mismatches are reported as issues.
 */
export function validateJsonValue(
  value: unknown,
  schema: Record<string, unknown>,
  path = "$",
): JsonSchemaIssue[] {
  const issues: JsonSchemaIssue[] = [];
  const type = schema.type;

  if (typeof type === "string" && !matchesType(value, type)) {
    issues.push({
      path,
      message: `expected ${type}, received ${describeType(value)}`,
    });

    return issues;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value as never)) {
    issues.push({ path, message: `must be one of ${schema.enum.join(", ")}` });
  }

  if (type === "object" && value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const properties =
      schema.properties && typeof schema.properties === "object"
        ? (schema.properties as Record<string, Record<string, unknown>>)
        : {};

    for (const required of Array.isArray(schema.required) ? schema.required : []) {
      if (typeof required === "string" && !(required in object)) {
        issues.push({ path: `${path}.${required}`, message: "is required" });
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in object && childSchema && typeof childSchema === "object") {
        issues.push(...validateJsonValue(object[key], childSchema, `${path}.${key}`));
      }
    }
  }

  if (type === "array" && Array.isArray(value) && isRecord(schema.items)) {
    value.forEach((item, index) => {
      issues.push(...validateJsonValue(item, schema.items as Record<string, unknown>, `${path}[${index}]`));
    });
  }

  return issues;
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "null":
      return value === null;
    default:
      return true;
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Remove markdown fences and surrounding prose so a JSON payload can be
 * parsed even when the model wraps it in text.
 */
export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.search(/[[{]/);

  if (start === -1) {
    return candidate;
  }

  const opening = candidate[start];
  const closing = opening === "{" ? "}" : "]";
  const end = candidate.lastIndexOf(closing);

  return end > start ? candidate.slice(start, end + 1) : candidate.slice(start);
}

export interface ParsedJsonPayload {
  value: unknown;

  error: string | null;
}

export function parseJsonPayload(text: string): ParsedJsonPayload {
  const payload = extractJsonPayload(text);

  if (!payload.trim()) {
    return { value: null, error: "The model returned an empty response." };
  }

  try {
    return { value: JSON.parse(payload), error: null };
  } catch (error) {
    return {
      value: null,
      error:
        error instanceof Error
          ? `The model did not return valid JSON: ${error.message}`
          : "The model did not return valid JSON.",
    };
  }
}

export interface StructuredFormatRequest {
  /** Fragment merged into the request body. */
  payload?: Record<string, unknown>;

  /** Text appended to the prompt when the API cannot enforce the shape. */
  promptSuffix?: string;

  /** Why the schema is not being enforced by the API. */
  warning?: string;
}

/**
 * Build the request fragment that asks a provider for a JSON value.
 *
 * When the host or model cannot enforce a schema, the requirement is
 * downgraded to an instruction in the prompt instead.
 */
export function buildStructuredFormatRequest(options: {
  format: AiResponseFormat;

  apiStyle: AiApiStyle;

  providerId: string;

  model: string;

  schemaText: string;

  schemaName?: string;
}): StructuredFormatRequest {
  const { format, apiStyle, providerId, model, schemaText } = options;

  if (format === "text") {
    return {};
  }

  if (format === "json") {
    /**
     * `json_object` mode requires the word JSON somewhere in the prompt,
     * so the instruction is always added as a safety net.
     */
    const jsonInstruction =
      "Answer with a single valid JSON value and no extra commentary.";

    if (apiStyle === "responses") {
      return {
        payload: { text: { format: { type: "json_object" } } },
        promptSuffix: jsonInstruction,
      };
    }

    return {
      payload: { response_format: { type: "json_object" } },
      promptSuffix: jsonInstruction,
    };
  }

  const parsed = parseJsonSchema(schemaText);

  if (!parsed.schema) {
    return { promptSuffix: "Answer with a single valid JSON value." };
  }

  const schema = parsed.schema;

  if (!supportsStructuredOutput(providerId, model)) {
    return {
      promptSuffix: buildSchemaInstruction(schema),
      warning:
        "This model does not advertise structured output support, so the schema is sent as an instruction.",
    };
  }

  const strict = isStrictCompatible(schema);
  const name = options.schemaName?.trim() || DEFAULT_SCHEMA_NAME;

  if (apiStyle === "responses") {
    return {
      payload: {
        text: {
          format: {
            type: "json_schema",
            name,
            schema,
            strict,
          },
        },
      },
      warning: strict
        ? undefined
        : "Strict mode is off because the schema is missing required fields or allows extra keys.",
    };
  }

  return {
    payload: {
      response_format: {
        type: "json_schema",
        json_schema: { name, schema, strict },
      },
    },
    warning: strict
      ? undefined
      : "Strict mode is off because the schema is missing required fields or allows extra keys.",
  };
}

function buildSchemaInstruction(schema: Record<string, unknown>): string {
  return [
    "Answer with a single valid JSON value that matches this JSON schema.",
    "Do not wrap it in markdown fences and do not add commentary.",
    "",
    JSON.stringify(schema, null, 2),
  ].join("\n");
}