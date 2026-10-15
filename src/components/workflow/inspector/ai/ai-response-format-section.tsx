"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import {
  AI_RESPONSE_FORMATS,
  isStrictCompatible,
  parseJsonSchema,
} from "@/lib/workflow/execution/ai/response-format";
import { SCHEMA_PRESET_OPTIONS } from "@/lib/workflow/execution/ai/prompt-templates";
import { supportsStructuredOutput } from "@/lib/workflow/execution/ai/providers";
import type { AiResponseFormat } from "@/lib/workflow/execution/ai/types";

interface AiResponseFormatSectionProps {
  format: AiResponseFormat;

  schemaText: string;

  providerId: string;

  model: string;

  onFormatChange: (format: AiResponseFormat) => void;

  onSchemaChange: (value: string) => void;
}

export function AiResponseFormatSection({
  format,
  schemaText,
  providerId,
  model,
  onFormatChange,
  onSchemaChange,
}: AiResponseFormatSectionProps) {
  const parsed = parseJsonSchema(schemaText);
  const structuredSupported = supportsStructuredOutput(providerId, model);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-300">Response format</p>

        <p className="mt-1 text-[10px] leading-4 text-zinc-600">
          Text is read as-is. JSON is parsed before the next node runs.
          Structured output is constrained by your schema.
        </p>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Response format">
        {AI_RESPONSE_FORMATS.map((option) => {
          const isActive = option.id === format;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onFormatChange(option.id)}
              className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                isActive
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <span
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                  isActive
                    ? "border-violet-400 bg-violet-400"
                    : "border-zinc-700"
                }`}
              >
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
                )}
              </span>

              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-zinc-200">
                  {option.label}
                </span>

                <span className="block text-[10px] leading-4 text-zinc-600">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {format === "schema" && (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="ai-json-schema"
              className="mb-2 block text-[11px] font-medium text-zinc-400"
            >
              JSON schema
            </label>

            <textarea
              id="ai-json-schema"
              value={schemaText}
              onChange={(event) => onSchemaChange(event.target.value)}
              rows={10}
              spellCheck={false}
              placeholder={
                SCHEMA_PRESET_OPTIONS[0]?.schema ?? "{\n  \"type\": \"object\"\n}"
              }
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-[11px] leading-5 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SCHEMA_PRESET_OPTIONS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSchemaChange(preset.schema)}
                title={preset.description}
                className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-400 transition hover:border-violet-500/40 hover:text-zinc-200"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {parsed.error ? (
              <p className="flex items-start gap-1.5 text-[10px] leading-4 text-red-400">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                {parsed.error}
              </p>
            ) : (
              <>
                <p className="flex items-start gap-1.5 text-[10px] leading-4 text-emerald-400">
                  <CheckCircle2 className="mt-px h-3 w-3 shrink-0" />
                  Valid JSON schema
                  {isStrictCompatible(parsed.schema ?? {})
                    ? " · strict mode on"
                    : " · strict mode off, because some fields are optional or extra keys are allowed"}
                </p>

                {!structuredSupported && (
                  <p className="flex items-start gap-1.5 text-[10px] leading-4 text-amber-400">
                    <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                    This model does not advertise structured output support, so
                    the schema is sent as an instruction instead.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {format === "json" && !structuredSupported && (
        <p className="text-[10px] leading-4 text-amber-400">
          This model does not advertise JSON mode, so the requirement is sent
          as an instruction in the prompt.
        </p>
      )}
    </section>
  );
}