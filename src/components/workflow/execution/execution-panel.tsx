"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  X,
} from "lucide-react";

import { useState } from "react";

import { useWorkflowStore } from "@/store/workflow.store";

export function ExecutionPanel() {
  const execution = useWorkflowStore((state) => state.execution);

  const workflow = useWorkflowStore((state) => state.workflow);

  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  if (!execution || !workflow) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-20 w-[460px] -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Workflow Execution</p>

          <p className="mt-1 text-[11px] capitalize text-zinc-600">
            {execution.status}
          </p>
        </div>

        {execution.duration !== undefined && (
          <span className="text-[11px] text-zinc-600">
            {execution.duration}ms
          </span>
        )}
      </div>

      {/* Nodes */}

      <div className="max-h-[420px] overflow-y-auto p-3">
        <div className="space-y-2">
          {execution.nodes.map((nodeExecution) => {
            const node = workflow.nodes.find(
              (item) => item.id === nodeExecution.nodeId,
            );

            if (!node) {
              return null;
            }

            const expanded = expandedNodeId === node.id;

            return (
              <div
                key={nodeExecution.nodeId}
                className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
              >
                <button
                  type="button"
                  onClick={() => setExpandedNodeId(expanded ? null : node.id)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    {nodeExecution.status === "pending" && (
                      <Circle className="h-4 w-4 text-zinc-700" />
                    )}

                    {nodeExecution.status === "running" && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    )}

                    {nodeExecution.status === "success" && (
                      <Check className="h-4 w-4 text-emerald-400" />
                    )}

                    {nodeExecution.status === "error" && (
                      <X className="h-4 w-4 text-red-400" />
                    )}

                    <span className="text-xs text-zinc-300">
                      {node.data.label}
                    </span>
                  </div>

                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-zinc-800 p-3">
                    {/* Input */}

                    <div>
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        Input
                      </p>

                      <pre className="overflow-x-auto rounded-md bg-zinc-950 p-2 text-[10px] leading-5 text-zinc-500">
                        {JSON.stringify(nodeExecution.input ?? {}, null, 2)}
                      </pre>
                    </div>

                    {/* Output */}

                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        Output
                      </p>

                      <pre className="overflow-x-auto rounded-md bg-zinc-950 p-2 text-[10px] leading-5 text-zinc-500">
                        {JSON.stringify(nodeExecution.output ?? {}, null, 2)}
                      </pre>
                    </div>

                    {/* Error */}

                    {nodeExecution.error && (
                      <div className="mt-4 rounded-md border border-red-900/50 bg-red-950/20 p-2">
                        <p className="text-[10px] text-red-400">
                          {nodeExecution.error}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
