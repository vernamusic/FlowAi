"use client";

import { Clock } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";

import {
  MAX_DELAY_MS,
  clampDuration,
  formatDuration,
} from "@/lib/workflow/execution/nodes/delay";

interface DelayInspectorProps {
  nodeId: string;
}

export function DelayInspector({ nodeId }: DelayInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const durationMs =
    typeof node.data.config.durationMs === "number"
      ? clampDuration(node.data.config.durationMs)
      : 1000;

  const updateConfig = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Delay</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Pause the workflow before continuing. Useful when an API asks you to
          slow down between calls.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="delay-seconds"
              className="text-[11px] font-medium text-zinc-400"
            >
              Wait for
            </label>

            <span className="text-[10px] text-zinc-500">
              {formatDuration(durationMs)}
            </span>
          </div>

          <div className="relative">
            <input
              id="delay-seconds"
              type="number"
              min={0}
              max={MAX_DELAY_MS / 1000}
              step={0.5}
              value={durationMs / 1000}
              onChange={(event) =>
                updateConfig({
                  durationMs: clampDuration(Number(event.target.value) * 1000),
                })
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-12 text-xs text-zinc-200 outline-none focus:border-violet-400"
            />

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
              sec
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={30}
            step={0.5}
            value={Math.min(durationMs / 1000, 30)}
            onChange={(event) =>
              updateConfig({
                durationMs: clampDuration(Number(event.target.value) * 1000),
              })
            }
            aria-label="Delay duration"
            className="mt-3 w-full accent-violet-400"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Up to {formatDuration(MAX_DELAY_MS)}. Canceling the run stops the
            wait immediately.
          </p>
        </div>
      </section>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p className="text-[10px] leading-5 text-zinc-400">
            The delay blocks this workflow only. It also reports the real wait
            time as <code className="text-zinc-300">waitedMs</code> so you can
            branch on slow runs.
          </p>
        </div>
      </div>
    </div>
  );
}