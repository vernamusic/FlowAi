"use client";

import { Check, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RunWorkflowButton } from "@/lib/workflow/execution/run-workflow-button";
import { useWorkflowStore } from "@/store/workflow.store";

interface WorkflowActionsProps {
  workflowId: string;
}

export function WorkflowActions({ workflowId }: WorkflowActionsProps) {
  const router = useRouter();
  const saveCurrentWorkflow = useWorkflowStore((state) => state.saveCurrentWorkflow);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveCurrentWorkflow();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Delete this workflow and all of its nodes? This cannot be undone.",
      )
    ) {
      deleteWorkflow(workflowId);
      router.replace("/workflows");
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete workflow"
        title="Delete workflow"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        {saved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
        <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
      </button>

      <RunWorkflowButton />
    </div>
  );
}
