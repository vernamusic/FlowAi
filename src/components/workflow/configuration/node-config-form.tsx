"use client";

import type { WorkflowNode } from "@/types/workflow";

interface NodeConfigFormProps {
  node: WorkflowNode;
}

export function NodeConfigForm({ node }: NodeConfigFormProps) {
  return (
    <div className="space-y-6 p-4">
      <div>
        <p className="text-xs font-medium text-zinc-300">Node Configuration</p>

        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Configure how this node behaves during workflow execution.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-[11px] text-zinc-500">Configuration fields for</p>

        <p className="mt-1 text-xs text-zinc-300">{node.type}</p>
      </div>
    </div>
  );
}
