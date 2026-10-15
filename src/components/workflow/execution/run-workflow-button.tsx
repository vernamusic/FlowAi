"use client";

import { AlertCircle, CheckCircle2, FlaskConical, Play, Square } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";

export function RunWorkflowButton() {
  const workflow = useWorkflowStore((state) => state.workflow);

  const execution = useWorkflowStore((state) => state.execution);

  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const cancelWorkflow = useWorkflowStore((state) => state.cancelWorkflow);
  const getExecutionReadiness = useWorkflowStore((state) => state.getExecutionReadiness);

  const isRunning = execution?.status === "running";
  const readiness = getExecutionReadiness();

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <button type="button" onClick={cancelWorkflow} className="flex min-h-10 items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
          <Square className="h-3.5 w-3.5 fill-current" /> Cancel
        </button>
      ) : (
        <>
          <button type="button" disabled={!workflow || !readiness.valid} onClick={() => runWorkflow()} title={readiness.valid ? "Run workflow" : readiness.issues[0]?.message} className="flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
            <Play className="h-4 w-4" /> Run Workflow
          </button>
          <button type="button" disabled={!workflow || !readiness.valid} onClick={() => runWorkflow({ dryRun: true })} title="Run with sample data without external requests" aria-label="Dry run workflow" className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:bg-zinc-900 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40">
            <FlaskConical className="h-4 w-4" />
          </button>
        </>
      )}
      <span className={`hidden items-center gap-1 text-[10px] xl:flex ${readiness.valid ? "text-emerald-400" : "text-amber-400"}`} title={readiness.valid ? "Workflow is ready to run" : readiness.issues.map((issue) => issue.message).join(" ")}>
        {readiness.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        {readiness.valid ? "Ready to run" : "Cannot run"}
      </span>
    </div>
  );
}
