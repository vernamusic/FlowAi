"use client";

import { ShieldCheck } from "lucide-react";

import {
  MAX_RETRIES,
  MAX_RETRY_DELAY_MS,
  MAX_TIMEOUT_MS,
  formatMilliseconds,
  readResilienceConfig,
} from "@/lib/workflow/execution/nodes/resilience";
import { useWorkflowStore } from "@/store/workflow.store";

interface ResilienceFieldsProps {
  nodeId: string;
}

/**
 * Retry, deadline and continue-on-error.
 *
 * These apply to every node, so they live in one place rather than being
 * copied into each inspector.
 */
export function ResilienceFields({ nodeId }: ResilienceFieldsProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const resilience = readResilienceConfig(node.data.config);
  const update = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  return (
    <section className="border-t border-zinc-800 pt-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />

        <p className="text-xs font-medium text-zinc-300">If this node fails</p>
      </div>

      <p className="mt-1 text-[11px] leading-5 text-zinc-600">
        Retries help with flaky APIs. A deadline stops a call that hangs.
        Continuing keeps the rest of the run going.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[11px] font-medium text-zinc-400">
            Retry {resilience.retries > 0 ? resilience.retries : ""} more time
            {resilience.retries === 1 ? "" : "s"}
          </span>

          <input
            type="range"
            min={0}
            max={MAX_RETRIES}
            step={1}
            value={resilience.retries}
            onChange={(event) =>
              update({ retries: Number(event.target.value) })
            }
            aria-label="Retries"
            className="mt-1.5 w-full accent-violet-400"
          />

          <span className="text-[10px] text-zinc-600">
            {resilience.retries + 1} attempt
            {resilience.retries === 0 ? "" : "s"} in total
          </span>
        </label>

        {resilience.retries > 0 && (
          <label className="block">
            <span className="text-[11px] font-medium text-zinc-400">
              Wait between attempts
            </span>

            <div className="relative mt-1.5">
              <input
                type="number"
                min={0}
                max={MAX_RETRY_DELAY_MS / 1000}
                step={0.5}
                value={resilience.retryDelayMs / 1000}
                onChange={(event) =>
                  update({
                    retryDelayMs: Math.min(
                      Math.max(Number(event.target.value) * 1000, 0),
                      MAX_RETRY_DELAY_MS,
                    ),
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-12 text-xs text-zinc-200 outline-none focus:border-violet-400"
              />

              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                sec
              </span>
            </div>
          </label>
        )}

        <label className="block">
          <span className="text-[11px] font-medium text-zinc-400">
            Give up after
          </span>

          <div className="relative mt-1.5">
            <input
              type="number"
              min={0}
              max={MAX_TIMEOUT_MS / 1000}
              step={1}
              value={Math.round(resilience.timeoutMs / 1000)}
              onChange={(event) =>
                update({
                  timeoutMs: Math.min(
                    Math.max(Number(event.target.value) * 1000, 0),
                    MAX_TIMEOUT_MS,
                  ),
                })
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 pr-12 text-xs text-zinc-200 outline-none focus:border-violet-400"
            />

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
              sec
            </span>
          </div>

          <span className="mt-1 block text-[10px] text-zinc-600">
            {resilience.timeoutMs === 0
              ? "No deadline. A hanging call will hang the run."
              : `Fails after ${formatMilliseconds(resilience.timeoutMs)}. 0 means no deadline.`}
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <input
            type="checkbox"
            checked={resilience.continueOnError}
            onChange={(event) =>
              update({ continueOnError: event.target.checked })
            }
            className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
          />

          <span>
            <span className="block text-[11px] font-medium text-zinc-300">
              Continue on error
            </span>

            <span className="mt-0.5 block text-[10px] leading-4 text-zinc-600">
              The run carries on down the rest of the graph. The node still
              shows as failed, and the error is passed on as
              {" "}<code className="text-zinc-400">error</code>.
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}