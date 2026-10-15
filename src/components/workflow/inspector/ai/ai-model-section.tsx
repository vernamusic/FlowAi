"use client";

import { listAiModels, findAiModel } from "@/lib/workflow/execution/ai/providers";

interface AiModelSectionProps {
  providerId: string;

  model: string;

  temperature: number;

  maxTokens: number;

  stream: boolean;

  onChange: (patch: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }) => void;
}

export function AiModelSection({
  providerId,
  model,
  temperature,
  maxTokens,
  stream,
  onChange,
}: AiModelSectionProps) {
  const models = listAiModels(providerId);
  const definition = findAiModel(providerId, model);
  const listId = `ai-models-${providerId}`;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-300">Model</p>

        <p className="mt-1 text-[10px] leading-4 text-zinc-600">
          Pick a known model or type any identifier your provider accepts.
        </p>
      </div>

      <div>
        <label htmlFor="ai-model" className="mb-2 block text-[11px] font-medium text-zinc-400">
          Model
        </label>

        <input
          id="ai-model"
          list={listId}
          value={model}
          onChange={(event) => onChange({ model: event.target.value })}
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
        />

        <datalist id={listId}>
          {models.map((item) => (
            <option key={item.id} value={item.id}>
              {item.note}
            </option>
          ))}
        </datalist>

        <p className="mt-2 text-[10px] leading-4 text-zinc-600">
          {definition
            ? `${definition.note} · context ${Math.round(definition.contextWindow / 1000)}k tokens`
            : "Custom model id. Token and cost estimates are unavailable until the provider publishes pricing."}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="ai-temperature" className="text-[11px] font-medium text-zinc-400">
            Temperature
          </label>

          <span className="text-[10px] text-zinc-500">
            {temperature.toFixed(1)}
          </span>
        </div>

        <input
          id="ai-temperature"
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(event) =>
            onChange({ temperature: Number(event.target.value) })
          }
          className="w-full accent-violet-400"
        />

        <div className="mt-1 flex justify-between text-[9px] text-zinc-700">
          <span>Consistent</span>
          <span>Creative</span>
        </div>
      </div>

      <div>
        <label htmlFor="ai-max-tokens" className="mb-2 block text-[11px] font-medium text-zinc-400">
          Maximum output tokens
        </label>

        <div className="relative">
          <input
            id="ai-max-tokens"
            type="number"
            min={1}
            max={128000}
            value={maxTokens}
            onChange={(event) =>
              onChange({ maxTokens: Number(event.target.value) })
            }
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-16 text-xs text-zinc-200 outline-none focus:border-violet-400"
          />

          {definition && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">
              max {Math.round(definition.maxOutputTokens / 1000)}k
            </span>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={stream}
          onChange={(event) => onChange({ stream: event.target.checked })}
          className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
        />

        <span className="min-w-0">
          <span className="block text-[11px] font-medium text-zinc-300">
            Stream the response
          </span>

          <span className="block text-[10px] leading-4 text-zinc-600">
            Shows the answer while the model writes it. Falls back to a single
            response when the provider does not stream.
          </span>
        </span>
      </label>
    </section>
  );
}