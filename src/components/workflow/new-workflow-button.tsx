"use client";

import { useRouter } from "next/navigation";

import { createWorkflow } from "@/lib/workflow/create-workflow";
import { useWorkflowStore } from "@/store/workflow.store";

export function NewWorkflowButton() {
  const router = useRouter();

  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);

  const handleCreate = () => {
    const workflow = createWorkflow();

    setWorkflow(workflow);

    router.push(`/workflows/${workflow.id}`);
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      + New Workflow
    </button>
  );
}
