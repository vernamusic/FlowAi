"use client";

import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import {
  getOpenAiApiKey,
  setOpenAiApiKey,
  subscribeToOpenAiApiKey,
} from "@/lib/workflow/execution/openai";
import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";

interface AIPromptInspectorProps {
  nodeId: string;
}

export function AIPromptInspector({ nodeId }: AIPromptInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );
  const apiKey = useSyncExternalStore(
    subscribeToOpenAiApiKey,
    getOpenAiApiKey,
    () => "",
  );
  const [showKey, setShowKey] = useState(false);

  const node = workflow?.nodes.find((item) => item.id === nodeId);
  if (!node) return null;

  const config = node.data.config;
  const prompt = typeof config.prompt === "string" ? config.prompt : "";
  const instructions =
    typeof config.instructions === "string" ? config.instructions : "";
  const model =
    typeof config.model === "string" ? config.model : "gpt-4o-mini";
  const temperature =
    typeof config.temperature === "number" ? config.temperature : 0.7;
  const maxTokens =
    typeof config.maxTokens === "number" ? config.maxTokens : 1000;
  const variables = getAvailableVariables(nodeId);
  const updateConfig = (key: string, value: unknown) =>
    updateNodeConfig(nodeId, { [key]: value });
  const handleKeyChange = (value: string) => {
    setOpenAiApiKey(value);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
        <div className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
          <div>
            <p className="text-xs font-medium text-violet-100">
              OpenAI personal key
            </p>
            <p className="mt-1 text-[10px] leading-4 text-zinc-400">
              Used only in this browser session. It is never saved in the
              workflow, local storage, or exported JSON.
            </p>
          </div>
        </div>

        <label htmlFor="openai-api-key" className="sr-only">
          OpenAI API key
        </label>
        <div className="mt-3 flex overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 focus-within:border-violet-400">
          <KeyRound className="m-2.5 h-4 w-4 shrink-0 text-zinc-500" />
          <input
            id="openai-api-key"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(event) => handleKeyChange(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700"
          />
          <button
            type="button"
            onClick={() => setShowKey((current) => !current)}
            aria-label={showKey ? "Hide API key" : "Show API key"}
            className="px-2 text-zinc-500 transition hover:text-zinc-200"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className={`mt-2 text-[10px] ${apiKey ? "text-emerald-400" : "text-zinc-600"}`}>
          {apiKey ? "Key ready for this session" : "Add a key to run this node"}
        </p>
      </div>

      <div>
        <label htmlFor="ai-prompt" className="mb-2 block text-xs font-medium text-zinc-300">Prompt</label>
        <VariableInput id="ai-prompt" value={prompt} variables={variables} onChange={(value) => updateConfig("prompt", value)} placeholder="Ask the model to summarize, classify, or generate…" rows={7} />
        <p className="mt-2 text-[10px] leading-4 text-zinc-600">Use the variable picker to include data from connected upstream nodes.</p>
      </div>

      <div>
        <label htmlFor="ai-instructions" className="mb-2 block text-xs font-medium text-zinc-300">System instructions <span className="font-normal text-zinc-600">(optional)</span></label>
        <VariableInput id="ai-instructions" value={instructions} variables={variables} onChange={(value) => updateConfig("instructions", value)} placeholder="You are a concise workflow assistant…" rows={3} />
      </div>

      <div>
        <label htmlFor="ai-model" className="mb-2 block text-xs font-medium text-zinc-300">Model</label>
        <select id="ai-model" value={model} onChange={(event) => updateConfig("model", event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-zinc-600">
          <option value="gpt-4o-mini">GPT-4o mini — fast and economical</option>
          <option value="gpt-4o">GPT-4o — stronger general quality</option>
          <option value="gpt-4.1-mini">GPT-4.1 mini — balanced</option>
        </select>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between"><label htmlFor="ai-temperature" className="text-xs font-medium text-zinc-300">Temperature</label><span className="text-[10px] text-zinc-500">{temperature.toFixed(1)}</span></div>
        <input id="ai-temperature" type="range" min={0} max={2} step={0.1} value={temperature} onChange={(event) => updateConfig("temperature", Number(event.target.value))} className="w-full accent-violet-400" />
        <div className="mt-1 flex justify-between text-[9px] text-zinc-700"><span>Consistent</span><span>Creative</span></div>
      </div>

      <div>
        <label htmlFor="ai-max-tokens" className="mb-2 block text-xs font-medium text-zinc-300">Maximum output tokens</label>
        <input id="ai-max-tokens" type="number" min={1} max={100000} value={maxTokens} onChange={(event) => updateConfig("maxTokens", Number(event.target.value))} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-zinc-600" />
      </div>
    </div>
  );
}
