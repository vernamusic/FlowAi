import type { AiResponseFormat } from "./types";

/**
 * Ready-made JSON schemas for the structured output panel.
 */
export const SCHEMA_PRESETS = {
  sentiment: JSON.stringify(
    {
      type: "object",
      additionalProperties: false,
      properties: {
        sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
        confidence: { type: "number" },
        reason: { type: "string" },
      },
      required: ["sentiment", "confidence", "reason"],
    },
    null,
    2,
  ),
  decision: JSON.stringify(
    {
      type: "object",
      additionalProperties: false,
      properties: {
        escalate: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["escalate", "reason"],
    },
    null,
    2,
  ),
  score: JSON.stringify(
    {
      type: "object",
      additionalProperties: false,
      properties: {
        score: { type: "number" },
        justification: { type: "string" },
      },
      required: ["score", "justification"],
    },
    null,
    2,
  ),
  contactDetails: JSON.stringify(
    {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
        company: { type: ["string", "null"] },
      },
      required: ["name", "email", "company"],
    },
    null,
    2,
  ),
  keyPoints: JSON.stringify(
    {
      type: "object",
      additionalProperties: false,
      properties: {
        points: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["points"],
    },
    null,
    2,
  ),
};

export interface SchemaPreset {
  id: keyof typeof SCHEMA_PRESETS;

  label: string;

  description: string;

  schema: string;
}

export const SCHEMA_PRESET_OPTIONS: SchemaPreset[] = [
  {
    id: "sentiment",
    label: "Sentiment",
    description: "Label, confidence, and reason.",
    schema: SCHEMA_PRESETS.sentiment,
  },
  {
    id: "decision",
    label: "Escalation decision",
    description: "Boolean decision with a reason.",
    schema: SCHEMA_PRESETS.decision,
  },
  {
    id: "score",
    label: "Score",
    description: "Numeric score with a justification.",
    schema: SCHEMA_PRESETS.score,
  },
  {
    id: "contactDetails",
    label: "Contact details",
    description: "Name, email, and company.",
    schema: SCHEMA_PRESETS.contactDetails,
  },
  {
    id: "keyPoints",
    label: "Key points",
    description: "A list of short strings.",
    schema: SCHEMA_PRESETS.keyPoints,
  },
];

export type PromptTemplateCategory =
  | "classify"
  | "extract"
  | "generate"
  | "transform"
  | "analyze"
  | "route";

export interface PromptTemplate {
  id: string;

  label: string;

  category: PromptTemplateCategory;

  description: string;

  /**
   * Uses `{{variable}}` placeholders. Point each one at a real value
   * with the variable picker that opens when you type `{{`.
   */
  prompt: string;

  /** Optional system instructions applied together with the prompt. */
  instructions?: string;

  responseFormat?: AiResponseFormat;

  jsonSchema?: string;
}

export const PROMPT_TEMPLATE_CATEGORIES: {
  id: PromptTemplateCategory;
  label: string;
}[] = [
  { id: "classify", label: "Classify" },
  { id: "extract", label: "Extract" },
  { id: "generate", label: "Generate" },
  { id: "transform", label: "Transform" },
  { id: "analyze", label: "Analyze" },
  { id: "route", label: "Route" },
];

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "summarize",
    label: "Summarize text",
    category: "transform",
    description: "Condense a long text into a few sentences.",
    prompt:
      "Summarize the following text in {{sentences}} sentences. Keep the original language and drop any filler.\n\n{{content}}",
    instructions:
      "You are a precise summarizer. Never invent details that are not present in the source text.",
    responseFormat: "text",
  },
  {
    id: "classify-sentiment",
    label: "Detect sentiment",
    category: "classify",
    description: "Label the tone as positive, negative, or neutral.",
    prompt:
      "Classify the sentiment of the text below as positive, negative, or neutral. Reply with the label and one short reason.\n\n{{content}}",
    instructions:
      "You are a sentiment classifier. Answer with the label first, then a single sentence of justification.",
    responseFormat: "json",
    jsonSchema: SCHEMA_PRESETS.sentiment,
  },
  {
    id: "extract-fields",
    label: "Extract fields",
    category: "extract",
    description: "Pull specific fields out of unstructured text.",
    prompt:
      "Extract the requested fields from the text below. Use null when a field is missing.\n\nText:\n{{content}}\n\nFields:\n{{fields}}",
    instructions:
      "You extract data verbatim. Never guess a value that is not present in the text.",
    responseFormat: "schema",
  },
  {
    id: "custom-fields",
    label: "Extract with custom schema",
    category: "extract",
    description: "Structured extraction driven by a JSON schema.",
    prompt:
      "Read the text below and answer with a JSON object that matches the requested schema.\n\nText:\n{{content}}",
    instructions:
      "You return strictly the JSON object described by the schema. Missing values become null.",
    responseFormat: "schema",
    jsonSchema: SCHEMA_PRESETS.contactDetails,
  },
  {
    id: "draft-reply",
    label: "Draft a reply",
    category: "generate",
    description: "Write a short reply to an incoming message.",
    prompt:
      "Write a short, professional reply to the message below. Match its language and keep it under {{sentences}} sentences.\n\nMessage from {{name}}:\n{{content}}",
    instructions:
      "You draft replies that are warm, specific, and under 150 words unless asked otherwise.",
    responseFormat: "text",
  },
  {
    id: "rewrite-tone",
    label: "Rewrite tone",
    category: "transform",
    description: "Rewrite text in a different tone.",
    prompt:
      "Rewrite the text below in a {{tone}} tone. Keep every fact and the original length.\n\n{{content}}",
    instructions: "You rewrite copy without changing facts, names, or numbers.",
    responseFormat: "text",
  },
  {
    id: "translate",
    label: "Translate",
    category: "transform",
    description: "Translate text into another language.",
    prompt:
      "Translate the text below into {{language}}. Keep the formatting.\n\n{{content}}",
    responseFormat: "text",
  },
  {
    id: "route-decision",
    label: "Route a decision",
    category: "route",
    description: "Decide whether a ticket should be escalated.",
    prompt:
      "Decide whether the request below needs a human reply. Answer with a boolean and the reason.\n\nRequest:\n{{content}}",
    instructions:
      "You triage incoming requests. Answer with the decision first, then one short reason.",
    responseFormat: "json",
    jsonSchema: SCHEMA_PRESETS.decision,
  },
  {
    id: "compare-options",
    label: "Compare options",
    category: "analyze",
    description: "Weigh two options against a criterion.",
    prompt:
      "Compare the options below and recommend one for the stated goal.\n\nGoal:\n{{goal}}\n\nOptions:\n{{content}}",
    instructions:
      "You are an analyst. State the recommendation first, then one line per option.",
    responseFormat: "json",
  },
  {
    id: "score-quality",
    label: "Score a text",
    category: "analyze",
    description: "Rate a text between 0 and 1 with a justification.",
    prompt:
      "Score how well the text below achieves the goal, from 0 to 1, and justify the score in one sentence.\n\nGoal:\n{{goal}}\n\nText:\n{{content}}",
    instructions: "You are a strict reviewer. You never give a perfect score.",
    responseFormat: "json",
    jsonSchema: SCHEMA_PRESETS.score,
  },
];

export interface SystemInstructionPreset {
  id: string;

  label: string;

  description: string;

  instructions: string;
}

/**
 * Reusable system instructions that can be attached to any AI node.
 */
export const SYSTEM_INSTRUCTION_PRESETS: SystemInstructionPreset[] = [
  {
    id: "concise",
    label: "Concise assistant",
    description: "Short answers, no filler.",
    instructions:
      "You are a concise assistant. Answer in as few words as possible and never repeat the question.",
  },
  {
    id: "json-only",
    label: "JSON only",
    description: "Always answers with one JSON value.",
    instructions:
      "You are a JSON-only assistant. Every answer is a single valid JSON value with no markdown fences and no commentary.",
  },
  {
    id: "translator",
    label: "Translator",
    description: "Translates and keeps the original tone.",
    instructions:
      "You are a translator. You translate faithfully, keep the tone of the source, and never add explanations.",
  },
  {
    id: "classifier",
    label: "Classifier",
    description: "Labels content from a fixed list.",
    instructions:
      "You are a classifier. Choose exactly one label from the provided list, answer with the label only, and never invent a new label.",
  },
  {
    id: "extractor",
    label: "Data extractor",
    description: "Copies values without guessing.",
    instructions:
      "You extract data verbatim. If a value is not present in the source you return null instead of guessing.",
  },
  {
    id: "analyst",
    label: "Analyst",
    description: "Lead with the conclusion, then support it.",
    instructions:
      "You are an analyst. Lead with the conclusion, support it with the evidence in the source, and flag anything uncertain.",
  },
  {
    id: "copywriter",
    label: "Copywriter",
    description: "Clear, warm marketing copy.",
    instructions:
      "You are a copywriter. Write clear, warm copy with concrete wording and no clichés.",
  },
  {
    id: "strict-schema",
    label: "Schema follower",
    description: "Never breaks the requested structure.",
    instructions:
      "You follow the requested output structure exactly. You never add fields, prose, or markdown that were not asked for.",
  },
];

export function findPromptTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((template) => template.id === id);
}