"use client";

import { formatCost, formatTokenCount, estimateAiCost, estimateTokens } from "@/lib/workflow/execution/ai/tokens";
import { findAiModel } from "@/lib/workflow/execution/ai/providers";

interface AiUsagePanelProps {
  providerId: string;

  model: string;

  prompt: string;

  instructions: string;

  maxTokens: number;
}

export function AiUsagePanel({
  providerId,
  model,
  prompt,
  instructions,
  maxTokens,
}: AiUsagePanelProps) {
  const promptText = [instructions.trim(), prompt.trim()]
    .filter(Boolean)
    .join("\n");
  const promptTokens = estimateTokens(promptText);
  const definition = findAiModel(providerId, model);

  const minimum = estimateAiCost({
    providerId,
    model,
    promptTokens,
    outputTokens: 0,
  });

  const maximum = estimateAiCost({
    providerId,
    model,
    promptTokens,
    outputTokens: maxTokens,
  });

  const contextShare = definition
    ? Math.min(100, (promptTokens / definition.contextWindow) * 100)
    : 0;

  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-medium text-zinc-300">Token &amp; cost estimate</p>

        <p className="mt-1 text-[10px] leading-4 text-zinc-600">
          Estimates use published list prices and a local token count. The
          execution log reports the real numbers after a run.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric
          label="Prompt tokens"
          value={formatTokenCount(promptTokens)}
          hint={`${promptText.length} characters`}
        />

        <Metric
          label="Output tokens"
          value={`${formatTokenCount(maxTokens)} max`}
          hint={
            definition
              ? `model allows ${formatTokenCount(definition.maxOutputTokens)}`
              : "no model metadata"
          }
        />

        <Metric
          label="Estimated cost"
          value={
            minimum.cost === null
              ? "unavailable"
              : `${formatCost(minimum.cost)} – ${formatCost(maximum.cost)}`
          }
          hint={
            minimum.cost === null
              ? "no pricing for this model"
              : "per single run"
          }
        />

        <Metric
          label="Context used"
          value={definition ? `${contextShare.toFixed(1)}%` : "—"}
          hint={
            definition
              ? `of ${formatTokenCount(definition.contextWindow)} tokens`
              : "no model metadata"
          }
        />
      </div>

      {definition && contextShare > 90 && (
        <p className="text-[10px] leading-4 text-amber-400">
          The prompt uses most of the context window. Shorten it or lower the
          maximum output tokens.
        </p>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-widest text-zinc-700">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-medium text-zinc-200">{value}</p>

      <p className="mt-0.5 truncate text-[9px] text-zinc-600">{hint}</p>
    </div>
  );
}