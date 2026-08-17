"use client";

import { useWorkflowStore } from "@/store/workflow.store";

import { AIPromptInspector } from "./ai-prompt-inspector";
import { ManualTriggerInspector } from "./manual-trigger-inspector";
import { HTTPRequestInspector } from "./http-request-inspector";
import { ConditionInspector } from "./condition-inspector";

export function WorkflowInspector() {
  const workflow = useWorkflowStore((state) => state.workflow);

  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);

  if (!selectedNodeId || !workflow) {
    return (
      <aside className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-950">
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div>
            <p className="text-sm font-medium text-zinc-400">
              No node selected
            </p>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Select a node from the canvas to view its configuration.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const node = workflow.nodes.find((item) => item.id === selectedNodeId);

  if (!node) {
    return null;
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      {/* Header */}

      <div className="border-b border-zinc-800 px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Inspector
        </p>

        <h2 className="mt-1 text-sm font-semibold text-white">
          {node.data.label}
        </h2>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {node.data.description}
        </p>
      </div>

      {/* Content */}

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {node.type === "manual-trigger" && (
          <ManualTriggerInspector nodeId={node.id} />
        )}

        {node.type === "ai-prompt" && <AIPromptInspector nodeId={node.id} />}

        {node.type === "http-request" && (
          <HTTPRequestInspector nodeId={node.id} />
        )}

        {node.type === "condition" && <ConditionInspector nodeId={node.id} />}

        {!["manual-trigger", "ai-prompt", "http-request", "condition"].includes(
          node.type,
        ) && (
          <p className="text-xs text-zinc-600">
            Configuration for this node is coming soon.
          </p>
        )}
      </div>
    </aside>
  );
}
