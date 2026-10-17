"use client";

import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariablesPanel } from "@/components/workflow/variables/variables-panel";

import { AIPromptInspector } from "./ai-prompt-inspector";
import { ManualTriggerInspector } from "./manual-trigger-inspector";
import { HTTPRequestInspector } from "./http-request-inspector";
import { ConditionInspector } from "./condition-inspector";
import { DelayInspector } from "./delay-inspector";
import { JsonParserInspector } from "./json-parser-inspector";
import { LoopInspector } from "./loop-inspector";
import { MathInspector } from "./math-inspector";
import { MergeInspector } from "./merge-inspector";
import { OutputInspector } from "./output-inspector";
import { ResilienceFields } from "./resilience-fields";
import { ScheduleTriggerInspector } from "./schedule-trigger-inspector";
import { SwitchInspector } from "./switch-inspector";
import { TextInspector } from "./text-inspector";
import { TransformInspector } from "./transform-inspector";
import { WebhookTriggerInspector } from "./webhook-trigger-inspector";

import { isTriggerNode } from "@/types/workflow";

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

  const [panel, setPanel] = useState<"inspector" | "variables">("inspector");

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

  const node = workflow?.nodes.find((item) => item.id === selectedNodeId);

  return (
    <aside
      className={`flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950 ${className}`}
    >
      {/* Panel switcher */}

      <div className="shrink-0 border-b border-zinc-800 p-2">
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          {(["inspector", "variables"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPanel(item)}
              aria-pressed={panel === item}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] capitalize transition ${
                panel === item
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {panel === "variables" ? (
        <VariablesPanel />
      ) : !node ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
          <div>
            <p className="text-sm font-medium text-zinc-400">No node selected</p>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Select a node from the canvas to view its configuration.
            </p>
          </div>
        </div>
      ) : (
        <>
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

        {node.type === "page-load-trigger" && (
          <ScheduleTriggerInspector
            key={node.id}
            nodeId={node.id}
            variant="page-load"
          />
        )}

        {node.type === "interval-trigger" && (
          <ScheduleTriggerInspector
            key={node.id}
            nodeId={node.id}
            variant="interval"
          />
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

        {node.type === "switch" && <SwitchInspector key={node.id} nodeId={node.id} />}

        {node.type === "merge" && <MergeInspector key={node.id} nodeId={node.id} />}

        {node.type === "math" && <MathInspector key={node.id} nodeId={node.id} />}

        {node.type === "text" && <TextInspector key={node.id} nodeId={node.id} />}

        {node.type === "transform" && (
          <TransformInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "json-parser" && (
          <JsonParserInspector key={node.id} nodeId={node.id} />
        )}

        {node.type === "loop" && <LoopInspector key={node.id} nodeId={node.id} />}

        {node.type === "delay" && <DelayInspector key={node.id} nodeId={node.id} />}

        {node.type === "output" && <OutputInspector key={node.id} nodeId={node.id} />}

        {/**
         * Retrying a node that only starts a run would mean retrying the
         * start, which is not a thing.
         */}
        {!isTriggerNode(node.type) && <ResilienceFields nodeId={node.id} />}
      </div>
        </>
      )}
    </aside>
  );
}
