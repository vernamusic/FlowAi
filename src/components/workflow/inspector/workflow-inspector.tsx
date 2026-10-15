"use client";

import { Copy, Trash2 } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";

import { AIPromptInspector } from "./ai-prompt-inspector";
import { ManualTriggerInspector } from "./manual-trigger-inspector";
import { HTTPRequestInspector } from "./http-request-inspector";
import { ConditionInspector } from "./condition-inspector";
import { DelayInspector } from "./delay-inspector";
import { JsonParserInspector } from "./json-parser-inspector";
import { LoopInspector } from "./loop-inspector";
import { OutputInspector } from "./output-inspector";
import { TransformInspector } from "./transform-inspector";
import { WebhookTriggerInspector } from "./webhook-trigger-inspector";

interface WorkflowInspectorProps {
  className?: string;
}

export function WorkflowInspector({
  className = "",
}: WorkflowInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);

  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);

  const handleDeleteNode = () => {
    if (!selectedNodeId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this node and all of its connected edges? This cannot be undone.",
    );

    if (confirmed) {
      removeNode(selectedNodeId);
    }
  };

  if (!selectedNodeId || !workflow) {
    return (
      <aside
        className={`w-80 shrink-0 border-l border-zinc-800 bg-zinc-950 ${className}`}
      >
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
    <aside
      className={`flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 ${className}`}
    >
      {/* Header */}

      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Inspector
            </p>

            <h2 className="mt-1 truncate text-sm font-semibold text-white">
              {node.data.label}
            </h2>
          </div>

          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => duplicateNode(node.id)} aria-label={`Duplicate ${node.data.label}`} title="Duplicate node (Ctrl/⌘ + D)" className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" onClick={handleDeleteNode} aria-label={`Delete ${node.data.label}`} title="Delete node" className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {node.data.description}
        </p>
      </div>

      {/* Content */}

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {node.type === "manual-trigger" && (
          <ManualTriggerInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "webhook-trigger" && (
          <WebhookTriggerInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "ai-prompt" && (
          <AIPromptInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "http-request" && (
          <HTTPRequestInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "condition" && (
          <ConditionInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "transform" && (
          <TransformInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "json-parser" && (
          <JsonParserInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "loop" && <LoopInspector key={node.id} nodeId={node.id} />}

        {node.type === "delay" && <DelayInspector key={node.id} nodeId={node.id} />}

        {node.type === "output" && <OutputInspector key={node.id} nodeId={node.id} />}

        {![
          "manual-trigger",
          "webhook-trigger",
          "ai-prompt",
          "http-request",
          "condition",
          "transform",
          "json-parser",
          "loop",
          "delay",
          "output",
        ].includes(node.type) && (
          <p className="text-xs text-zinc-600">
            Configuration for this node is coming soon.
          </p>
        )}
      </div>
    </aside>
  );
}
