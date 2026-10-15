"use client";

import { Bell } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";
import { ResolvedPreview } from "../variables/resolved-preview";

import {
  OUTPUT_CHANNELS,
  OUTPUT_LEVELS,
  readOutputConfig,
} from "@/lib/workflow/execution/nodes/output";

interface OutputInspectorProps {
  nodeId: string;
}

export function OutputInspector({ nodeId }: OutputInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readOutputConfig(node.data.config);
  const variables = getAvailableVariables(nodeId);
  const updateConfig = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Output</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          End a branch with a message. It is always recorded in the execution
          log, and can also appear as an in-app notification.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="output-message"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Message
          </label>

          <VariableInput
            id="output-message"
            value={config.message}
            variables={variables}
            onChange={(value) => updateConfig({ message: value })}
            placeholder="Order {{webhook_trigger.body.orderId}} needs a reply"
            rows={4}
          />

          <ResolvedPreview nodeId={nodeId} value={config.message} />
        </div>

        <div>
          <label
            htmlFor="output-level"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Severity
          </label>

          <select
            id="output-level"
            value={config.level}
            onChange={(event) => updateConfig({ level: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            {OUTPUT_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="output-channel"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Deliver to
          </label>

          <select
            id="output-channel"
            value={config.channel}
            onChange={(event) => updateConfig({ channel: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            {OUTPUT_CHANNELS.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            {OUTPUT_CHANNELS.find((channel) => channel.value === config.channel)
              ?.description}
          </p>
        </div>
      </section>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p className="text-[10px] leading-5 text-zinc-400">
            Notifications appear in the corner of the screen while the workflow
            runs and disappear after a few seconds. Downstream nodes can still
            read the resolved <code className="text-zinc-300">message</code>.
          </p>
        </div>
      </div>
    </div>
  );
}