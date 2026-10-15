import { DEFAULT_PROVIDER_ID, getAiProvider, getDefaultModel } from "./providers";
import { findUnresolvedReferences, collectReferences } from "@/lib/workflow/variables/variable-audit";
import type { AiPromptConfig, AiResponseFormat } from "./types";

export { findUnresolvedReferences };

export const DEFAULT_AI_TEMPERATURE = 0.7;
export const DEFAULT_AI_MAX_TOKENS = 1000;

/**
 * Turn whatever is stored on a node into a complete, typed config.
 *
 * Old workflows only carry `prompt`, `model`, `temperature`,
 * `maxTokens`, and `instructions`, so every field has to tolerate a
 * missing or malformed value.
 */
export function readAiConfig(
  raw: Record<string, unknown> | undefined,
): AiPromptConfig {
  const config = raw ?? {};
  const providerId =
    typeof config.providerId === "string" && config.providerId.trim()
      ? config.providerId
      : DEFAULT_PROVIDER_ID;
  const provider = getAiProvider(providerId);
  const apiStyle =
    config.apiStyle === "responses" || config.apiStyle === "chat"
      ? config.apiStyle
      : provider.apiStyle;

  return {
    providerId: provider.id,
    apiStyle,
    baseUrl: typeof config.baseUrl === "string" ? config.baseUrl : "",
    model:
      typeof config.model === "string" && config.model.trim()
        ? config.model
        : getDefaultModel(provider.id),
    prompt: typeof config.prompt === "string" ? config.prompt : "",
    instructions:
      typeof config.instructions === "string" ? config.instructions : "",
    temperature: clampNumber(config.temperature, 0, 2, DEFAULT_AI_TEMPERATURE),
    maxTokens: Math.max(
      1,
      Math.round(clampNumber(config.maxTokens, 1, 128000, DEFAULT_AI_MAX_TOKENS)),
    ),
    responseFormat: readResponseFormat(config.responseFormat),
    jsonSchema: typeof config.jsonSchema === "string" ? config.jsonSchema : "",
    stream: config.stream !== false,
  };
}

export function readResponseFormat(value: unknown): AiResponseFormat {
  return value === "json" || value === "schema" ? value : "text";
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(Math.max(parsed, min), max);
}

export function collectVariableReferences(text: string): string[] {
  return collectReferences(text);
}