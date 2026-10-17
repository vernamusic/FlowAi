"use client";

import { GitMerge } from "lucide-react";

import { readMergeConfig, type MergeMode } from "@/lib/workflow/execution/nodes/merge";
import { useWorkflowStore } from "@/store/workflow.store";

interface MergeInspectorProps {
  nodeId: string;
}

const modes: { value: MergeMode; label: string; hint: string }[] = [
  {
    value: "combine",
    label: "Combine",
    hint: "One object holding everything the branches produced.",
  },
  {
    value: "collect",
    label: "Collect",
    hint: "A list, one item per branch that ran.",
  },
  {
    value: "first",
    label: "First",
    hint: "Only the first branch that produced something.",
  },
];

export function MergeInspector({ nodeId }: MergeInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const merge = readMergeConfig(node.data.config);
  const incoming = (workflow?.edges ?? []).filter(
    (edge) => edge.target === nodeId,
  ).length;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Merge branches</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Connect several branches into this node. It waits for every branch
          that ran, then joins their results into one value.
        </p>
      </div>

      {incoming === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-5 text-amber-200">
          Nothing is connected to this Merge yet. Drag a connection from
          another node&apos;s output into its target handle.
        </p>
      )}

      {incoming === 1 && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] leading-5 text-zinc-500">
          Only one branch is connected, so there is nothing to merge yet.
        </p>
      )}

      <section className="space-y-2">
        {modes.map((mode) => (
          <label
            key={mode.value}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
              merge.mode === mode.value
                ? "border-violet-400/50 bg-violet-500/5"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name={`merge-mode-${nodeId}`}
              checked={merge.mode === mode.value}
              onChange={() => updateNodeConfig(nodeId, { mode: mode.value })}
              className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
            />

            <span>
              <span className="block text-[11px] font-medium text-zinc-200">
                {mode.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">
                {mode.hint}
              </span>
            </span>
          </label>
        ))}
      </section>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <GitMerge className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p className="text-[10px] leading-5 text-zinc-400">
            The result reports <code className="text-zinc-300">sources</code> and
            {" "}<code className="text-zinc-300">labels</code> alongside the
            joined value, so you can see which branch filled in what. Combining
            lets the last branch win when two produce the same key.
          </p>
        </div>
      </div>
    </div>
  );
}