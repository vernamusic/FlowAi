import type {
  AiApiStyle,
  AiPromptConfig,
  AiResponseFormat,
  AiRunOptions,
  AiRunResult,
  AiUsage,
} from "./types";

export type {
  AiApiStyle,
  AiPromptConfig,
  AiResponseFormat,
  AiRunOptions,
  AiRunResult,
  AiUsage,
};

export {
  AI_PROVIDERS,
  DEFAULT_PROVIDER_ID,
  buildRequestUrl,
  findAiModel,
  getAiProvider,
  getDefaultModel,
  getMaxOutputTokens,
  listAiModels,
  normalizeBaseUrl,
  supportsStructuredOutput,
} from "./providers";
export type {
  AiModelDefinition,
  AiModelPricing,
  AiProviderDefinition,
} from "./providers";

export {
  getAiApiKey,
  getAiCredential,
  getAiCredentials,
  getAiCredentialsServerSnapshot,
  setAiCredential,
  subscribeToAiCredentials,
} from "./credentials";
export type { AiCredential, AiCredentialMap } from "./credentials";

export {
  DEFAULT_AI_MAX_TOKENS,
  DEFAULT_AI_TEMPERATURE,
  collectVariableReferences,
  findUnresolvedReferences,
  readAiConfig,
  readResponseFormat,
} from "./config";

export {
  AI_RESPONSE_FORMATS,
  DEFAULT_SCHEMA_NAME,
  buildStructuredFormatRequest,
  extractJsonPayload,
  isStrictCompatible,
  parseJsonPayload,
  parseJsonSchema,
  validateJsonValue,
} from "./response-format";
export type { JsonSchemaIssue } from "./response-format";

export {
  PROMPT_TEMPLATES,
  PROMPT_TEMPLATE_CATEGORIES,
  SCHEMA_PRESETS,
  SCHEMA_PRESET_OPTIONS,
  SYSTEM_INSTRUCTION_PRESETS,
  findPromptTemplate,
} from "./prompt-templates";
export type {
  PromptTemplate,
  PromptTemplateCategory,
  SchemaPreset,
  SystemInstructionPreset,
} from "./prompt-templates";

export { readSseStream } from "./stream";
export type { SseMessage } from "./stream";

export {
  estimateAiCost,
  estimateMessageTokens,
  estimateTokens,
  formatCost,
  formatTokenCount,
  resolveUsage,
} from "./tokens";
export type { AiCostEstimate } from "./tokens";

export { runAiPrompt } from "./run-ai-prompt";