"use client";

import { useWorkflowStore } from "@/store/workflow.store";

interface WorkflowNameInputProps {
  workflowId: string;
}

export function WorkflowNameInput({ workflowId }: WorkflowNameInputProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateWorkflowName = useWorkflowStore(
    (state) => state.updateWorkflowName,
  );

  const isLoaded = workflow?.id === workflowId;

  /**
   * The editor shows the reason a workflow is missing, so the header only
   * has to avoid pretending it is still loading.
   */
  const placeholder = isLoaded ? workflow.name : "Unavailable workflow";

  return (
    <input
      aria-label="Workflow name"
      value={isLoaded ? workflow.name : ""}
      placeholder={placeholder}
      disabled={!isLoaded}
      onChange={(event) => updateWorkflowName(event.target.value)}
      title={isLoaded ? "Rename this workflow" : "This workflow is not stored in this browser"}
      className="mt-1 w-full max-w-sm truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-zinc-100 outline-none transition placeholder:text-zinc-500 hover:border-zinc-800 hover:bg-zinc-900 focus:border-zinc-700 focus:bg-zinc-900 focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:text-zinc-500"
    />
  );
}
