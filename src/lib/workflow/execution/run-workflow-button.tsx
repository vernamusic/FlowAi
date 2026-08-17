"use client";

import { Play } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";

export function RunWorkflowButton() {
  const workflow = useWorkflowStore((state) => state.workflow);

  const execution = useWorkflowStore((state) => state.execution);

  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);

  const isRunning = execution?.status === "running";

  return (
    <button
      type="button"
      disabled={!workflow || isRunning}
      onClick={runWorkflow}
      className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Play className="h-4 w-4" />

      {isRunning ? "Running..." : "Run Workflow"}
    </button>
  );
}
