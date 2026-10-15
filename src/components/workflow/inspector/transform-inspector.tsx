"use client";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";
import { ResolvedPreview } from "../variables/resolved-preview";

import {
  TRANSFORM_VALUE_TYPES,
  readTransformConfig,
} from "@/lib/workflow/execution/nodes/transform";

interface TransformInspectorProps {
  nodeId: string;
}

export function TransformInspector({ nodeId }: TransformInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readTransformConfig(node.data.config);
  const variables = getAvailableVariables(nodeId);
  const updateConfig = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Set Variable</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Build one value from templates and the output of earlier nodes, then
          use it downstream like any other variable.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="transform-name"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Variable name
          </label>

          <input
            id="transform-name"
            value={config.name}
            onChange={(event) => updateConfig({ name: event.target.value })}
            placeholder="greeting"
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-400"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Downstream nodes read it as{" "}
            <code className="text-zinc-400">
              {`{{${variables.length ? "node." : ""}${config.name || "result"}}}`}
            </code>
            .
          </p>
        </div>

        <div>
          <label
            htmlFor="transform-value"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Value
          </label>

          <VariableInput
            id="transform-value"
            value={config.value}
            variables={variables}
            onChange={(value) => updateConfig({ value })}
            placeholder="Hello {{manual_trigger.name}}"
            rows={4}
          />

          <ResolvedPreview nodeId={nodeId} value={config.value} />
        </div>

        <div>
          <label
            htmlFor="transform-type"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Store as
          </label>

          <select
            id="transform-type"
            value={config.valueType}
            onChange={(event) => updateConfig({ valueType: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            {TRANSFORM_VALUE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            {TRANSFORM_VALUE_TYPES.find((item) => item.value === config.valueType)
              ?.description}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Output
        </p>

        <p className="mt-2 break-words text-xs leading-5 text-zinc-300">
          <code className="text-zinc-400">{`{{${config.name || "result"}}}`}</code>
        </p>

        <p className="mt-2 text-[10px] leading-4 text-zinc-600">
          Converted to {config.valueType} when the node runs.
        </p>
      </section>
    </div>
  );
}