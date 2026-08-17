"use client";

import { X } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";

import { NodeConfigForm } from "./node-config-form";

export function NodeConfigPanel() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const selectNode = useWorkflowStore((state) => state.selectNode);

  if (!workflow || !selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center border-l border-zinc-800 bg-zinc-950 px-6">
        <div className="max-w-xs text-center">
          <p className="text-sm font-medium text-zinc-300">No node selected</p>

          <p className="mt-2 text-xs leading-5 text-zinc-600">
            Select a node from the canvas to view its configuration.
          </p>
        </div>
      </div>
    );
  }

  const node = workflow.nodes.find((item) => item.id === selectedNodeId);

  if (!node) {
    return null;
  }

  return (
    <aside className="flex h-full flex-col border-l border-zinc-800 bg-zinc-950">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
            Configuration
          </p>

          <p className="mt-1 truncate text-sm font-medium text-white">
            {node.data.label}
          </p>
        </div>

        <button
          type="button"
          onClick={() => selectNode(null)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Node information */}

      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-600">Type</span>

          <span className="rounded-md bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
            {node.type}
          </span>
        </div>
      </div>

      {/* Configuration */}

      <div className="flex-1 overflow-y-auto">
        <NodeConfigForm node={node} />
      </div>
    </aside>
  );
}
