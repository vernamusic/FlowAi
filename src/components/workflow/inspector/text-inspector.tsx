"use client";

import { Type } from "lucide-react";

import {
  TEXT_OPERATIONS,
  readTextConfig,
} from "@/lib/workflow/execution/nodes/text";
import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";

interface TextInspectorProps {
  nodeId: string;
}

export function TextInspector({ nodeId }: TextInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readTextConfig(node.data.config);
  const variables = getAvailableVariables(nodeId);
  const update = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  const needsSecond = config.operation === "join" || config.operation === "remove";
  const secondLabel = config.operation === "join" ? "Separator" : "Characters to remove";

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Text</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Clean up a value that came from another node, or turn a list into one
          readable line.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="text-field"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Field
          </label>

          <select
            id="text-field"
            value={config.field}
            onChange={(event) => update({ field: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            <option value="">The first text that arrives</option>

            {variables.map((variable) => (
              <option key={`${variable.nodeId}-${variable.key}`} value={variable.key}>
                {variable.nodeLabel} · {variable.path}
              </option>
            ))}
          </select>

          <p className="mt-1.5 text-[10px] leading-4 text-zinc-600">
            Leave this empty to work on whichever text arrives first.
          </p>
        </div>

        <div>
          <label
            htmlFor="text-operation"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Do this
          </label>

          <select
            id="text-operation"
            value={config.operation}
            onChange={(event) => update({ operation: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            {TEXT_OPERATIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {needsSecond && (
          <div>
            <label
              htmlFor="text-second"
              className="mb-2 block text-[11px] font-medium text-zinc-400"
            >
              {secondLabel}
            </label>

            <VariableInput
              id="text-second"
              value={config.second}
              variables={variables}
              onChange={(value) => update({ second: value })}
              placeholder={
                config.operation === "join" ? ", " : "0 1 (separated by spaces)"
              }
              rows={2}
            />
          </div>
        )}

        <div>
          <label
            htmlFor="text-name"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Call the result
          </label>

          <input
            id="text-name"
            type="text"
            value={config.name}
            onChange={(event) => update({ name: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          />
        </div>
      </section>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <Type className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />

          <p className="text-[10px] leading-5 text-zinc-400">
            Join needs a list and says so if the value is not one, rather than
            quietly producing{" "}
            <code className="text-zinc-300">one, two</code> from an object.
          </p>
        </div>
      </div>
    </div>
  );
}