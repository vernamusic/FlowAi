/**
 * Shared types for the AI Prompt node.
 *
 * The runner talks to any OpenAI-compatible endpoint, so every
 * provider specific value is described by these contracts instead of
 * being hardcoded in a single OpenAI client.
 */

/**
 * Identifier of a provider inside the registry.
 *
 * Built-in providers use fixed ids, while any custom
 * OpenAI-compatible endpoint is stored as "custom".
 */
export type AiProviderId = string;

/**
 * Request/response contract used to talk to a provider.
 *
 * - `responses` → `POST {baseUrl}/responses` (OpenAI Responses API)
 * - `chat`      → `POST {baseUrl}/chat/completions` (OpenAI-compatible)
 */
export type AiApiStyle = "responses" | "chat";

/**
 * Shape the model is asked to answer with.
 *
 * - `text`   → plain text
 * - `json`   → a JSON value
 * - `schema` → a JSON value matching a JSON schema (structured output)
 */
export type AiResponseFormat = "text" | "json" | "schema";

export interface AiPromptConfig {
  providerId: AiProviderId;

  apiStyle: AiApiStyle;

  /** Only used by providers that accept a custom base URL. */
  baseUrl?: string;

  model: string;

  prompt: string;

  instructions?: string;

  temperature: number;

  maxTokens: number;

  responseFormat: AiResponseFormat;

  /** Raw JSON text of the schema, used when responseFormat is "schema". */
  jsonSchema?: string;

  /** Whether the runner asks the provider for a streamed response. */
  stream: boolean;
}

/**
 * Token accounting for a single run.
 *
 * `estimated` is true when the provider did not report usage, so the
 * numbers come from the local estimator instead.
 */
export interface AiUsage {
  promptTokens: number;

  completionTokens: number;

  totalTokens: number;

  estimated: boolean;
}

export interface AiRunResult extends Record<string, unknown> {
  /** Raw text output. Downstream nodes can always read this. */
  response: string;

  /** Parsed value, only present for json/schema formats. */
  parsed?: unknown;

  model: string;

  provider: string;

  apiStyle: AiApiStyle;

  responseFormat: AiResponseFormat;

  usage?: AiUsage;

  /** Estimated cost in USD, omitted when pricing is unknown. */
  cost?: number;

  /** True when the cost was derived from estimated token counts. */
  costEstimated: boolean;
}

export interface AiRunOptions {
  signal?: AbortSignal;

  /**
   * Called for every streamed chunk. When provided the runner asks the
   * provider to stream, otherwise it performs a single request.
   */
  onDelta?: (delta: string, accumulated: string) => void;
}