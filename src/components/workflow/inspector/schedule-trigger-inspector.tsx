"use client";

import { AlertTriangle, PanelsTopLeft, RefreshCw } from "lucide-react";

import {
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  clampIntervalMinutes,
  readIntervalTriggerConfig,
} from "@/lib/workflow/execution/nodes/schedule-trigger";
import { useWorkflowStore } from "@/store/workflow.store";

interface ScheduleTriggerInspectorProps {
  nodeId: string;

  /** Page load fires once, interval repeats. */
  variant: "page-load" | "interval";
}

export function ScheduleTriggerInspector({
  nodeId,
  variant,
}: ScheduleTriggerInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readIntervalTriggerConfig(node.data.config);
  const update = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  if (variant === "page-load") {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-xs font-medium text-zinc-300">Runs on open</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-600">
            This workflow starts by itself once, when you open it in the
            editor. Nothing runs while the editor is closed, because there is
            no server to run it.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex gap-2">
            <PanelsTopLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />

            <p className="text-[10px] leading-5 text-zinc-400">
              The automatic run is a dry run, so it never calls an AI provider
              or an external API. Press Run to make a real one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Every few minutes</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          This workflow starts again on a timer while you have it open. Closing
          the editor stops the timer.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="interval-minutes"
            className="mb-2 flex items-center justify-between text-[11px] font-medium text-zinc-400"
          >
            Every
            <span className="text-[10px] text-zinc-500">
              between {MIN_INTERVAL_MINUTES} and {MAX_INTERVAL_MINUTES / 60} hours
            </span>
          </label>

          <div className="relative">
            <input
              id="interval-minutes"
              type="number"
              min={MIN_INTERVAL_MINUTES}
              max={MAX_INTERVAL_MINUTES}
              step={0.5}
              value={config.intervalMinutes}
              onChange={(event) =>
                update({ intervalMinutes: clampIntervalMinutes(Number(event.target.value)) })
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-16 text-xs text-zinc-200 outline-none focus:border-violet-400"
            />

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
              minutes
            </span>
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] font-medium text-zinc-400">
            Automatic runs
          </span>

          <select
            value={config.mode}
            onChange={(event) =>
              update({ mode: event.target.value === "live" ? "live" : "dry-run" })
            }
            className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            <option value="dry-run">Dry run (no API calls)</option>
            <option value="live">Live (calls real APIs)</option>
          </select>
        </label>
      </section>

      {config.mode === "live" && (
        <p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[10px] leading-5 text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

          <span>
            This repeats forever while the editor is open. If the workflow calls
            a paid API, that is a bill every {config.intervalMinutes} minutes.
            Dry run is the safer default.
          </span>
        </p>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />

          <p className="text-[10px] leading-5 text-zinc-400">
            FlowAI runs entirely in your browser, so a timer only ticks while
            the editor is on screen. A real scheduler needs a server, which
            this deliberately does not have.
          </p>
        </div>
      </div>
    </div>
  );
}