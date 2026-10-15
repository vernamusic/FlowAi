import { getAiApiKey } from "./credentials";
import {
  buildRequestUrl,
  getAiProvider,
  normalizeBaseUrl,
} from "./providers";
import {
  buildStructuredFormatRequest,
  parseJsonPayload,
  parseJsonSchema,
  validateJsonValue,
} from "./response-format";
import { readSseStream } from "./stream";
import { estimateAiCost, resolveUsage } from "./tokens";

import type { AiApiStyle, AiPromptConfig, AiRunOptions, AiRunResult } from "./types";

interface ReportedUsage {
  promptTokens: number;

  completionTokens: number;

  totalTokens?: number;
}

interface StreamPayload {
  delta?: string;

  usage?: ReportedUsage;

  error?: string;
}

/**
 * Run a single AI node.
 *
 * The runner is provider agnostic: it picks the endpoint from the
 * provider registry, shapes the body for the provider's API style, and
 * returns one normalized result for the execution engine, the preview
 * panel, and the streaming test run.
 */
export async function runAiPrompt(
  config: AiPromptConfig,
  options: AiRunOptions = {},
): Promise<AiRunResult> {
  const provider = getAiProvider(config.providerId);
  const apiKey = getAiApiKey(provider.id);

  if (!config.prompt.trim()) {
    throw new Error("Add a prompt before running this AI Prompt node.");
  }

  if (provider.requiresApiKey && !apiKey) {
    throw new Error(
      `Add your ${provider.keyLabel} in the AI Prompt inspector before running this node.`,
    );
  }

  const baseUrl = provider.supportsCustomBaseUrl
    ? normalizeBaseUrl(config.baseUrl ?? "")
    : normalizeBaseUrl(provider.defaultBaseUrl);

  const url = buildRequestUrl(provider, config.apiStyle, baseUrl);

  const structured = buildStructuredFormatRequest({
    format: config.responseFormat,
    apiStyle: config.apiStyle,
    providerId: provider.id,
    model: config.model,
    schemaText: config.jsonSchema ?? "",
  });

  const prompt = [config.prompt, structured.promptSuffix]
    .filter(Boolean)
    .join("\n\n");

  const body = buildRequestBody(config, prompt, structured.payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const wantsStream = Boolean(options.onDelta) && config.stream;

  if (wantsStream) {
    body.stream = true;

    /**
     * Chat completions only report usage when it is requested, and the
     * flag is rejected by some responses-style hosts.
     */
    if (config.apiStyle === "chat") {
      body.stream_options = { include_usage: true };
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(
      `The browser could not reach ${provider.label}. Check your connection and whether your browser allows this request.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isEventStream = contentType.includes("text/event-stream");

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, provider.label));
  }

  /**
   * Some OpenAI-compatible hosts ignore the stream flag and answer with
   * a regular JSON body, so both shapes are accepted.
   */
  if (isEventStream && response.body) {
    return readStreamedResponse({
      response,
      apiStyle: config.apiStyle,
      config,
      providerLabel: provider.label,
      model: config.model,
      prompt,
      onDelta: options.onDelta,
    });
  }

  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  const text = extractText(config.apiStyle, payload);

  return finalizeRun({
    config,
    providerLabel: provider.label,
    model: config.model,
    prompt,
    text,
    reportedUsage: extractUsage(config.apiStyle, payload),
  });
}

interface StreamedRunOptions {
  response: Response;

  apiStyle: AiApiStyle;

  config: AiPromptConfig;

  providerLabel: string;

  model: string;

  prompt: string;

  onDelta?: (delta: string, accumulated: string) => void;
}

async function readStreamedResponse({
  response,
  apiStyle,
  config,
  providerLabel,
  model,
  prompt,
  onDelta,
}: StreamedRunOptions): Promise<AiRunResult> {
  const body = response.body;

  if (!body) {
    throw new Error(`${providerLabel} returned an empty streaming response.`);
  }

  let text = "";
  let reportedUsage: ReportedUsage | undefined;

  for await (const message of readSseStream(body)) {
    const payload = parseJsonObject(message.data);

    if (payload?.error) {
      throw new Error(readNestedError(payload) ?? "The provider reported a failure.");
    }

    const chunk = extractStreamChunk(apiStyle, payload, message.event);

    if (chunk?.error) {
      throw new Error(chunk.error);
    }

    if (chunk?.delta) {
      text += chunk.delta;
      onDelta?.(chunk.delta, text);
    }

    if (chunk?.usage) {
      reportedUsage = chunk.usage;
    }
  }

  return finalizeRun({
    config,
    providerLabel,
    model,
    prompt,
    text,
    reportedUsage,
  });
}

interface FinalizeRunOptions {
  config: AiPromptConfig;

  providerLabel: string;

  model: string;

  prompt: string;

  text: string;

  reportedUsage?: ReportedUsage;
}

/**
 * Shared tail for streamed and non-streamed runs: shape handling,
 * schema validation, usage, and cost.
 */
function finalizeRun({
  config,
  providerLabel,
  model,
  prompt,
  text,
  reportedUsage,
}: FinalizeRunOptions): AiRunResult {
  const response = text.trim();

  if (!response) {
    throw new Error(`${providerLabel} returned no text output.`);
  }

  const result: AiRunResult = {
    response,
    model,
    provider: providerLabel,
    apiStyle: config.apiStyle,
    responseFormat: config.responseFormat,
    costEstimated: true,
  };

  if (config.responseFormat !== "text") {
    const parsed = parseJsonPayload(response);

    if (parsed.error) {
      throw new Error(parsed.error);
    }

    if (config.responseFormat === "schema") {
      const schema = parseJsonSchema(config.jsonSchema ?? "");

      if (schema.schema) {
        const issues = validateJsonValue(parsed.value, schema.schema);

        if (issues.length) {
          throw new Error(
            `The response does not match the schema: ${issues
              .map((issue) => `${issue.path} ${issue.message}`)
              .join(", ")}`,
          );
        }
      }
    }

    result.parsed = parsed.value;
  }

  const instructions = config.instructions?.trim() ?? "";
  const usage = resolveUsage({
    promptText: instructions ? `${instructions}\n${prompt}` : prompt,
    completionText: response,
    reported: reportedUsage,
  });

  result.usage = usage;

  const cost = estimateAiCost({
    providerId: config.providerId,
    model,
    promptTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    estimated: usage.estimated,
  });

  if (cost.cost !== null) {
    result.cost = cost.cost;
    result.costEstimated = usage.estimated;
  }

  return result;
}

/**
 * Build the request body for the provider's API style.
 */
function buildRequestBody(
  config: AiPromptConfig,
  prompt: string,
  structuredPayload: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const instructions = config.instructions?.trim();

  if (config.apiStyle === "responses") {
    return {
      model: config.model,
      input: prompt,
      instructions: instructions || undefined,
      temperature: config.temperature,
      max_output_tokens: config.maxTokens,
      ...structuredPayload,
    };
  }

  const messages: { role: string; content: string }[] = [];

  if (instructions) {
    messages.push({ role: "system", content: instructions });
  }

  messages.push({ role: "user", content: prompt });

  return {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    ...structuredPayload,
  };
}

/**
 * Pull the streamed text out of a single server-sent event.
 */
function extractStreamChunk(
  apiStyle: AiApiStyle,
  payload: Record<string, unknown> | null,
  eventName?: string,
): StreamPayload | null {
  if (!payload) {
    return null;
  }

  const type =
    typeof payload.type === "string" ? payload.type : (eventName ?? undefined);

  if (apiStyle === "responses") {
    if (type === "response.failed" || type === "error") {
      return { error: readNestedError(payload) ?? "The provider reported a failure." };
    }

    if (type === "response.completed" || type === "response.incomplete") {
      const response =
        payload.response && typeof payload.response === "object"
          ? (payload.response as Record<string, unknown>)
          : undefined;

      return response ? { usage: extractUsage("responses", response) } : null;
    }

    return typeof payload.delta === "string" ? { delta: payload.delta } : null;
  }

  if (payload.error) {
    return { error: readNestedError(payload) ?? "The provider reported a failure." };
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = choices[0] as Record<string, unknown> | undefined;
  const delta =
    choice && typeof choice === "object" && choice.delta
      ? (choice.delta as Record<string, unknown>)
      : undefined;

  const content =
    typeof delta?.content === "string"
      ? delta.content
      : Array.isArray(delta?.content)
        ? extractChatContentParts(delta.content)
        : "";

  const usage = extractUsage("chat", payload);

  if (!content && !usage) {
    return null;
  }

  return { delta: content, usage };
}

function extractChatContentParts(parts: unknown[]): string {
  return parts
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part && typeof part === "object") {
        const content = (part as Record<string, unknown>).text;

        return typeof content === "string" ? content : "";
      }

      return "";
    })
    .join("");
}

function extractText(
  apiStyle: AiApiStyle,
  payload: Record<string, unknown> | null,
): string {
  if (!payload) {
    return "";
  }

  if (typeof payload.error === "object" && payload.error) {
    throw new Error(
      readNestedError(payload) ?? "The provider reported a failure.",
    );
  }

  if (apiStyle === "responses") {
    if (typeof payload.output_text === "string" && payload.output_text.trim()) {
      return payload.output_text;
    }

    const output = Array.isArray(payload.output) ? payload.output : [];

    return output
      .flatMap((item) =>
        item && typeof item === "object" && Array.isArray((item as { content?: unknown }).content)
          ? ((item as { content: unknown[] }).content as unknown[])
          : [],
      )
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
      .filter((item) => item.type === "output_text" || item.type === undefined)
      .map((item) => (typeof item.text === "string" ? item.text : ""))
      .filter(Boolean)
      .join("\n");
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = choices[0] as Record<string, unknown> | undefined;
  const message =
    choice && typeof choice === "object" && choice.message
      ? (choice.message as Record<string, unknown>)
      : undefined;

  if (!message) {
    return "";
  }

  if (typeof message.content === "string") {
    return message.content;
  }

  return Array.isArray(message.content)
    ? extractChatContentParts(message.content)
    : "";
}

function extractUsage(
  apiStyle: AiApiStyle,
  payload: Record<string, unknown> | null,
): ReportedUsage | undefined {
  const usage =
    payload && typeof payload.usage === "object" && payload.usage
      ? (payload.usage as Record<string, unknown>)
      : undefined;

  if (!usage) {
    return undefined;
  }

  const promptTokens =
    apiStyle === "responses" ? usage.input_tokens : usage.prompt_tokens;
  const completionTokens =
    apiStyle === "responses" ? usage.output_tokens : usage.completion_tokens;

  if (typeof promptTokens !== "number" || typeof completionTokens !== "number") {
    return undefined;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens:
      typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
  };
}

function readNestedError(payload: Record<string, unknown>): string | null {
  const error = payload.error;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

async function readErrorMessage(
  response: Response,
  providerLabel: string,
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  const detail = payload ? readNestedError(payload) : null;

  if (detail) {
    return detail;
  }

  if (response.status === 401 || response.status === 403) {
    return `${providerLabel} rejected the API key. Check the key for this provider.`;
  }

  if (response.status === 404) {
    return `${providerLabel} could not find the endpoint or the model "${providerLabel}". Check the base URL and model name.`;
  }

  if (response.status === 429) {
    return `${providerLabel} rate limited this request. Wait a moment and try again.`;
  }

  return `${providerLabel} request failed (${response.status}).`;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function parseJsonObject(data: string): Record<string, unknown> | null {
  if (!data || data === "[DONE]") {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as unknown;

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}