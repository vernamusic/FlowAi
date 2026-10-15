import type { AiApiStyle, AiProviderId } from "./types";

/**
 * Price per one million tokens, in USD.
 *
 * Published list prices, used only for estimates. They change over time,
 * so every UI surface labels the result as an estimate.
 */
export interface AiModelPricing {
  inputPerMillion: number;

  outputPerMillion: number;
}

export interface AiModelDefinition {
  id: string;

  label: string;

  note: string;

  contextWindow: number;

  maxOutputTokens: number;

  /** Whether the model can be constrained by a JSON schema. */
  structuredOutput: boolean;

  /** Missing pricing means the cost cannot be estimated. */
  pricing?: AiModelPricing;
}

export interface AiProviderDefinition {
  id: AiProviderId;

  label: string;

  description: string;

  /** Base URL including the API version segment, e.g. ".../v1". */
  defaultBaseUrl: string;

  apiStyle: AiApiStyle;

  requiresApiKey: boolean;

  keyLabel: string;

  keyPlaceholder: string;

  /** Whether the user can point the node at another host. */
  supportsCustomBaseUrl: boolean;

  supportsStructuredOutput: boolean;

  /** Extra hint shown next to the base URL field. */
  baseUrlHint?: string;

  docsUrl?: string;

  models: AiModelDefinition[];
}

/**
 * Provider registry.
 *
 * Every entry speaks an OpenAI-compatible protocol, so adding a new
 * host is a matter of describing it here.
 */
export const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "Official OpenAI API using the Responses endpoint.",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiStyle: "responses",
    requiresApiKey: true,
    keyLabel: "OpenAI API key",
    keyPlaceholder: "sk-...",
    supportsCustomBaseUrl: false,
    supportsStructuredOutput: true,
    docsUrl: "https://platform.openai.com/docs/api-reference/responses",
    models: [
      {
        id: "gpt-4.1-mini",
        label: "GPT-4.1 mini",
        note: "Balanced quality and cost",
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        structuredOutput: true,
        pricing: { inputPerMillion: 0.4, outputPerMillion: 1.6 },
      },
      {
        id: "gpt-4.1-nano",
        label: "GPT-4.1 nano",
        note: "Cheapest and fastest",
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        structuredOutput: true,
        pricing: { inputPerMillion: 0.1, outputPerMillion: 0.4 },
      },
      {
        id: "gpt-4.1",
        label: "GPT-4.1",
        note: "Highest quality of the 4.1 family",
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        structuredOutput: true,
        pricing: { inputPerMillion: 2, outputPerMillion: 8 },
      },
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        note: "Fast and economical",
        contextWindow: 128000,
        maxOutputTokens: 16384,
        structuredOutput: true,
        pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
      },
      {
        id: "gpt-4o",
        label: "GPT-4o",
        note: "Stronger general quality",
        contextWindow: 128000,
        maxOutputTokens: 16384,
        structuredOutput: true,
        pricing: { inputPerMillion: 2.5, outputPerMillion: 10 },
      },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    description: "Models served locally through the Ollama OpenAI-compatible API.",
    defaultBaseUrl: "http://localhost:11434/v1",
    apiStyle: "chat",
    requiresApiKey: false,
    keyLabel: "API key",
    keyPlaceholder: "Optional for local models",
    supportsCustomBaseUrl: true,
    supportsStructuredOutput: true,
    baseUrlHint: "Ollama exposes the OpenAI-compatible API on port 11434.",
    docsUrl: "https://ollama.com/blog/openai-compatibility",
    models: [
      {
        id: "llama3.2",
        label: "llama3.2",
        note: "Small local general model",
        contextWindow: 131072,
        maxOutputTokens: 8192,
        structuredOutput: true,
      },
      {
        id: "qwen2.5",
        label: "qwen2.5",
        note: "Strong multilingual local model",
        contextWindow: 32768,
        maxOutputTokens: 8192,
        structuredOutput: true,
      },
      {
        id: "gemma3",
        label: "gemma3",
        note: "Compact local model",
        contextWindow: 131072,
        maxOutputTokens: 8192,
        structuredOutput: true,
      },
      {
        id: "mistral",
        label: "mistral",
        note: "Fast local instruction model",
        contextWindow: 32768,
        maxOutputTokens: 8192,
        structuredOutput: true,
      },
    ],
  },
  {
    id: "custom",
    label: "OpenAI-compatible endpoint",
    description: "Any host that implements the OpenAI chat completions protocol.",
    defaultBaseUrl: "",
    apiStyle: "chat",
    requiresApiKey: false,
    keyLabel: "API key",
    keyPlaceholder: "Optional",
    supportsCustomBaseUrl: true,
    supportsStructuredOutput: true,
    baseUrlHint: "For example https://openrouter.ai/api/v1 or https://api.groq.com/openai/v1",
    docsUrl: "https://github.com/openai/openai-openapi",
    models: [
      {
        id: "gpt-4o-mini",
        label: "gpt-4o-mini",
        note: "Most gateways expose this id",
        contextWindow: 128000,
        maxOutputTokens: 16384,
        structuredOutput: true,
      },
      {
        id: "llama-3.3-70b-versatile",
        label: "llama-3.3-70b-versatile",
        note: "Common OpenRouter id",
        contextWindow: 131072,
        maxOutputTokens: 8192,
        structuredOutput: true,
      },
      {
        id: "deepseek-chat",
        label: "deepseek-chat",
        note: "Common DeepSeek id",
        contextWindow: 65536,
        maxOutputTokens: 8192,
        structuredOutput: true,
      },
    ],
  },
];

export const DEFAULT_PROVIDER_ID = "openai";

export function getAiProvider(providerId?: AiProviderId): AiProviderDefinition {
  return (
    AI_PROVIDERS.find((provider) => provider.id === providerId) ??
    (AI_PROVIDERS[0] as AiProviderDefinition)
  );
}

export function listAiModels(providerId?: AiProviderId): AiModelDefinition[] {
  return getAiProvider(providerId).models;
}

export function findAiModel(
  providerId: AiProviderId | undefined,
  modelId: string | undefined,
): AiModelDefinition | undefined {
  if (!modelId) {
    return undefined;
  }

  const models = listAiModels(providerId);

  return (
    models.find((model) => model.id === modelId) ??
    models.find((model) => model.id === modelId.toLowerCase())
  );
}

export function getDefaultModel(providerId?: AiProviderId): string {
  return listAiModels(providerId)[0]?.id ?? "gpt-4o-mini";
}

export function getMaxOutputTokens(
  providerId: AiProviderId | undefined,
  modelId: string | undefined,
): number {
  return findAiModel(providerId, modelId)?.maxOutputTokens ?? 128000;
}

/**
 * Structured output support depends on both the host and the model.
 */
export function supportsStructuredOutput(
  providerId: AiProviderId | undefined,
  modelId: string | undefined,
): boolean {
  const provider = getAiProvider(providerId);

  if (!provider.supportsStructuredOutput) {
    return false;
  }

  const model = findAiModel(providerId, modelId);

  /**
   * Unknown models are optimistically treated as capable because most
   * OpenAI-compatible gateways accept the schema parameter today.
   */
  return model ? model.structuredOutput : true;
}

/**
 * Normalize a base URL by removing trailing slashes and whitespace.
 */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

/**
 * Build the fully qualified endpoint for an API style.
 */
export function buildRequestUrl(
  provider: AiProviderDefinition,
  apiStyle: AiApiStyle,
  configuredBaseUrl?: string,
): string {
  const base =
    normalizeBaseUrl(configuredBaseUrl ?? "") || provider.defaultBaseUrl;

  if (!base) {
    throw new Error(
      `Add a base URL for ${provider.label}, for example https://api.example.com/v1`,
    );
  }

  return `${base}/${apiStyle === "responses" ? "responses" : "chat/completions"}`;
}