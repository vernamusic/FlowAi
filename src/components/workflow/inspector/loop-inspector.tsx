"use client";

import { Repeat } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";
import { ResolvedPreview } from "../variables/resolved-preview";

import {
  MAX_ITERATIONS,
  clampIterations,
  readLoopConfig,
  resolveLoopItems,
} from "@/lib/workflow/execution/nodes/loop";

interface LoopInspectorProps {
  nodeId: string;
}

export function LoopInspector({ nodeId }: LoopInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readLoopConfig(node.data.config);
  const variables = getAvailableVariables(nodeId);
  const updateConfig = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  let preview: string | null = null;
  let error: string | null = null;

  if (config.items.trim()) {
    try {
      const items = resolveLoopItems(config);

      preview = `${items.length} item${items.length === 1 ? "" : "s"} detected`;
    } catch (itemsError) {
      error = itemsError instanceof Error ? itemsError.message : "Unreadable list.";
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Loop</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Repeat everything connected below this node once per item. Useful for
          sending one request or one AI call per record.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="loop-items"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Items
          </label>

          <VariableInput
            id="loop-items"
            value={config.items}
            variables={variables}
            onChange={(value) => updateConfig({ items: value })}
            placeholder="{{json_parser.data}} or [1, 2, 3]"
            rows={4}
          />

          <ResolvedPreview
            nodeId={nodeId}
            value={config.items}
            label="Resolved items"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            A JSON array, a variable holding one, or a number to repeat that
            many times.
          </p>

          {preview && (
            <p className="mt-2 text-[10px] leading-4 text-emerald-400">
              {preview}
            </p>
          )}

          {error && (
            <p className="mt-2 text-[10px] leading-4 text-red-400">{error}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="loop-item-name"
              className="mb-2 block text-[11px] font-medium text-zinc-400"
            >
              Item variable
            </label>

            <input
              id="loop-item-name"
              value={config.itemName}
              onChange={(event) => updateConfig({ itemName: event.target.value })}
              spellCheck={false}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label
              htmlFor="loop-index-name"
              className="mb-2 block text-[11px] font-medium text-zinc-400"
            >
              Index variable
            </label>

            <input
              id="loop-index-name"
              value={config.indexName}
              onChange={(event) => updateConfig({ indexName: event.target.value })}
              spellCheck={false}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="loop-max"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Maximum iterations
          </label>

          <input
            id="loop-max"
            type="number"
            min={1}
            max={MAX_ITERATIONS}
            value={config.maxIterations}
            onChange={(event) =>
              updateConfig({
                maxIterations: clampIterations(Number(event.target.value)),
              })
            }
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Protects you from an accidental list with thousands of entries.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={config.stopOnError}
            onChange={(event) => updateConfig({ stopOnError: event.target.checked })}
            className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
          />

          <span className="min-w-0">
            <span className="block text-[11px] font-medium text-zinc-300">
              Stop on the first failure
            </span>

            <span className="block text-[10px] leading-4 text-zinc-600">
              Turn this off to keep going after a failed item.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <div className="text-[10px] leading-5 text-zinc-400">
            <p>
              Nodes below the loop can use{" "}
              <code className="text-zinc-300">{`{{${config.itemName}}}`}</code>,{" "}
              <code className="text-zinc-300">{`{{${config.indexName}}}`}</code>,{" "}
              and{" "}
              <code className="text-zinc-300">
                {`{{${config.itemName}Count}}`}
              </code>
              .
            </p>

            <p className="mt-2">
              After the loop finishes, the node exposes{" "}
              <code className="text-zinc-300">count</code> and{" "}
              <code className="text-zinc-300">results</code>, which holds the
              output of every iteration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}