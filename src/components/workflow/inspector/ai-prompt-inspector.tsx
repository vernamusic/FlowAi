"use client";

import { useMemo, useState } from "react";

import { readAiConfig } from "@/lib/workflow/execution/ai/config";
import type {
  AiPromptConfig,
  AiResponseFormat,
  AiRunResult,
} from "@/lib/workflow/execution/ai/types";
import {
  useResolvedVariables,
} from "@/lib/workflow/variables/use-resolved-variables";
import { useWorkflowStore } from "@/store/workflow.store";
import type {
  NodeExecution,
  WorkflowExecution,
} from "@/types/workflow";

import { VariableInput } from "../variables/variable-input";

import { AiModelSection } from "./ai/ai-model-section";
import { AiPreviewPanels } from "./ai/ai-preview-panels";
import { AiProviderSection } from "./ai/ai-provider-section";
import { AiResponseFormatSection } from "./ai/ai-response-format-section";
import { AiTestRun } from "./ai/ai-test-run";
import { AiUsagePanel } from "./ai/ai-usage-panel";
import { PromptLibrary } from "./ai/prompt-library";

interface AIPromptInspectorProps {
  nodeId: string;
}

export function AIPromptInspector({ nodeId }: AIPromptInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );
  const execution = useWorkflowStore((state) => state.execution);
  const executionHistory = useWorkflowStore((state) => state.executionHistory);

  const [testResult, setTestResult] = useState<AiRunResult | null>(null);
  const [streamingText, setStreamingText] = useState("");

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  /**
   * Variables resolve against the newest successful runs, so the preview
   * and the test run send what the workflow would really send.
   */
  const resolvedVariables = useResolvedVariables(nodeId);

  const { unresolved } = useResolvedVariables(nodeId);

  const resolvedConfig = useMemo(() => {
    const nodeConfig = node?.data.config;

    if (!nodeConfig) {
      return null;
    }

    const resolved = resolvedVariables.resolveConfig(nodeConfig);

    return readAiConfig(resolved);
  }, [node?.data.config, resolvedVariables]);

  if (!node || !resolvedConfig) return null;

  const config = node.data.config;
  const aiConfig = readAiConfig(config);
  const variables = getAvailableVariables(nodeId);
  const resolvedPrompt = resolvedConfig.prompt;
  const resolvedInstructions = resolvedConfig.instructions ?? "";
  const unresolvedReferences = unresolved(
    `${resolvedPrompt}\n${resolvedInstructions}`,
  );

  const updateConfig = (patch: Record<string, unknown>) => {
    updateNodeConfig(nodeId, patch);
    setTestResult(null);
  };

  const lastExecution = findLastNodeExecution(
    [execution, ...executionHistory],
    nodeId,
  );
  const previewResult = testResult ?? toAiResult(lastExecution?.output);
  const lastRunAt = lastExecution?.completedAt
    ? new Date(lastExecution.completedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  const blockedReason = !resolvedPrompt.trim()
    ? "Add a prompt before running a test."
    : unresolvedReferences.length > 0
      ? "Some placeholders are not connected to an upstream node yet."
      : undefined;

  return (
    <div className="space-y-7">
      <AiProviderSection
        providerId={aiConfig.providerId}
        apiStyle={aiConfig.apiStyle}
        baseUrl={aiConfig.baseUrl ?? ""}
        onChange={(patch) => updateConfig(patch)}
      />

      <section className="space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-300">Prompt</p>

          <p className="mt-1 text-[10px] leading-4 text-zinc-600">
            Type {"{{"} to insert a variable from an upstream node.
          </p>
        </div>

        <PromptLibrary
          onApplyTemplate={(template) =>
            updateConfig({
              prompt: template.prompt,
              ...(template.instructions
                ? { instructions: template.instructions }
                : {}),
              ...(template.responseFormat
                ? { responseFormat: template.responseFormat }
                : {}),
              ...(template.jsonSchema ? { jsonSchema: template.jsonSchema } : {}),
            })
          }
          onApplyInstructions={(preset) =>
            updateConfig({ instructions: preset.instructions })
          }
        />

        <div>
          <label
            htmlFor="ai-prompt"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Prompt
          </label>

          <VariableInput
            id="ai-prompt"
            value={aiConfig.prompt}
            variables={variables}
            onChange={(value) => updateConfig({ prompt: value })}
            placeholder="Ask the model to summarize, classify, or generate…"
            rows={7}
          />
        </div>

        <div>
          <label
            htmlFor="ai-instructions"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            System instructions{" "}
            <span className="font-normal text-zinc-600">(optional)</span>
          </label>

          <VariableInput
            id="ai-instructions"
            value={aiConfig.instructions ?? ""}
            variables={variables}
            onChange={(value) => updateConfig({ instructions: value })}
            placeholder="You are a concise workflow assistant…"
            rows={3}
          />
        </div>
      </section>

      <AiResponseFormatSection
        format={aiConfig.responseFormat}
        schemaText={aiConfig.jsonSchema ?? ""}
        providerId={aiConfig.providerId}
        model={aiConfig.model}
        onFormatChange={(responseFormat: AiResponseFormat) =>
          updateConfig({ responseFormat })
        }
        onSchemaChange={(value) => updateConfig({ jsonSchema: value })}
      />

      <AiModelSection
        providerId={aiConfig.providerId}
        model={aiConfig.model}
        temperature={aiConfig.temperature}
        maxTokens={aiConfig.maxTokens}
        stream={aiConfig.stream}
        onChange={(patch) => updateConfig(patch)}
      />

      <AiUsagePanel
        providerId={resolvedConfig.providerId}
        model={resolvedConfig.model}
        prompt={resolvedPrompt}
        instructions={resolvedInstructions}
        maxTokens={resolvedConfig.maxTokens}
      />

      <AiPreviewPanels
        resolvedPrompt={resolvedPrompt}
        resolvedInstructions={resolvedInstructions}
        requestPreview={JSON.stringify(
          buildRequestPreview(resolvedConfig, resolvedInstructions),
          null,
          2,
        )}
        lastResult={previewResult}
        lastRunAt={lastRunAt}
        unresolvedReferences={unresolvedReferences}
        isRunning={Boolean(streamingText)}
        streamingText={streamingText}
      />

      <AiTestRun
        config={resolvedConfig}
        blockedReason={blockedReason}
        onResult={setTestResult}
        onStreamingChange={setStreamingText}
      />
    </div>
  );
}

function findLastNodeExecution(
  runs: (WorkflowExecution | null)[],
  nodeId: string,
): NodeExecution | undefined {
  for (const run of runs) {
    const match = run?.nodes.find(
      (item) => item.nodeId === nodeId && item.output,
    );

    if (match) {
      return match;
    }
  }

  return undefined;
}

/**
 * Reuse a recorded node output as a preview result.
 */
function toAiResult(
  output: Record<string, unknown> | undefined,
): AiRunResult | null {
  if (!output || typeof output.response !== "string") {
    return null;
  }

  return output as unknown as AiRunResult;
}

function buildRequestPreview(
  config: AiPromptConfig,
  instructions: string,
): Record<string, unknown> {
  return {
    provider: config.providerId,
    apiStyle: config.apiStyle,
    model: config.model,
    responseFormat: config.responseFormat,
    temperature: config.temperature,
    max_output_tokens: config.maxTokens,
    instructions: instructions || undefined,
  };
}