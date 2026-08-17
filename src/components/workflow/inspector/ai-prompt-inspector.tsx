"use client";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";
interface AIPromptInspectorProps {
  nodeId: string;
}
export function AIPromptInspector({ nodeId }: AIPromptInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);

  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) {
    return null;
  }

  const config = node.data.config;

  const prompt = typeof config.prompt === "string" ? config.prompt : "";

  const model = typeof config.model === "string" ? config.model : "gpt-4";

  const temperature =
    typeof config.temperature === "number" ? config.temperature : 0.7;

  const maxTokens =
    typeof config.maxTokens === "number" ? config.maxTokens : 1000;

  const updateConfig = (key: string, value: unknown) => {
    updateNodeConfig(nodeId, {
      [key]: value,
    });
  };
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );
  const variables = getAvailableVariables(nodeId);

  return (
    <div className="space-y-6">
      {/* Prompt */}

      <div>
        <label
          htmlFor="ai-prompt"
          className="mb-2 block text-xs font-medium text-zinc-300"
        >
          Prompt
        </label>

        <VariableInput
          value={prompt}
          variables={variables}
          onChange={(value) => updateConfig("prompt", value)}
          placeholder="Enter your prompt..."
          rows={7}
        />

        <p className="mt-2 text-[10px] leading-4 text-zinc-600">
          You can use workflow variables inside the prompt.
        </p>
      </div>

      {/* Model */}

      <div>
        <label
          htmlFor="ai-model"
          className="mb-2 block text-xs font-medium text-zinc-300"
        >
          Model
        </label>

        <select
          id="ai-model"
          value={model}
          onChange={(event) => updateConfig("model", event.target.value)}
          className="
            w-full
            rounded-lg
            border
            border-zinc-800
            bg-zinc-900
            px-3
            py-2.5
            text-xs
            text-zinc-200
            outline-none
            focus:border-zinc-600
          "
        >
          <option value="gpt-4">GPT-4</option>

          <option value="gpt-4o">GPT-4o</option>

          <option value="gpt-4o-mini">GPT-4o Mini</option>
        </select>
      </div>

      {/* Temperature */}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="ai-temperature"
            className="text-xs font-medium text-zinc-300"
          >
            Temperature
          </label>

          <span className="text-[10px] text-zinc-600">
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
            updateConfig("temperature", Number(event.target.value))
          }
          className="w-full"
        />

        <div className="mt-1 flex justify-between text-[9px] text-zinc-700">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}

      <div>
        <label
          htmlFor="ai-max-tokens"
          className="mb-2 block text-xs font-medium text-zinc-300"
        >
          Max Tokens
        </label>

        <input
          id="ai-max-tokens"
          type="number"
          min={1}
          max={100000}
          value={maxTokens}
          onChange={(event) =>
            updateConfig("maxTokens", Number(event.target.value))
          }
          className="
            w-full
            rounded-lg
            border
            border-zinc-800
            bg-zinc-900
            px-3
            py-2.5
            text-xs
            text-zinc-200
            outline-none
            focus:border-zinc-600
          "
        />
      </div>

      {/* Preview */}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Configuration
        </p>

        <div className="mt-3 space-y-2 text-[10px]">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-600">Model</span>

            <span className="text-zinc-400">{model}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-zinc-600">Temperature</span>

            <span className="text-zinc-400">{temperature.toFixed(1)}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-zinc-600">Max Tokens</span>

            <span className="text-zinc-400">{maxTokens}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
