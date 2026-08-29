"use client";

import { Trash2, Workflow as WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getSavedWorkflows,
  workflowStorageChangeEvent,
} from "@/lib/workflow/workflow-storage";
import { useWorkflowStore } from "@/store/workflow.store";
import type { Workflow } from "@/types/workflow";

export function WorkflowList() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);

  useEffect(() => {
    const handleStorageChange = () => setWorkflows(getSavedWorkflows());
    const initialLoad = window.setTimeout(handleStorageChange, 0);

    window.addEventListener(workflowStorageChangeEvent, handleStorageChange);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(workflowStorageChangeEvent, handleStorageChange);
    };
  }, []);

  const handleDelete = (workflow: Workflow) => {
    if (
      window.confirm(
        `Delete “${workflow.name}”? This permanently removes the workflow and its nodes.`,
      )
    ) {
      deleteWorkflow(workflow.id);
    }
  };

  if (workflows.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-12 text-center sm:p-12">
        <p className="text-sm text-zinc-500">No workflows yet.</p>
        <p className="mt-1 text-sm text-zinc-600">
          Create your first workflow to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {workflows.map((workflow) => (
        <article
          key={workflow.id}
          className="group relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70"
        >
          <Link
            href={`/workflows/${workflow.id}`}
            className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            aria-label={`Open ${workflow.name}`}
          />

          <div className="relative flex items-start justify-between gap-3 pointer-events-none">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <WorkflowIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-medium text-zinc-100">
                  {workflow.name}
                </h2>
                <p className="mt-0.5 text-[11px] text-zinc-600">
                  {workflow.nodes.length} {workflow.nodes.length === 1 ? "node" : "nodes"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(workflow)}
              aria-label={`Delete ${workflow.name}`}
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <p className="relative mt-4 text-[10px] text-zinc-600">
            Updated {new Date(workflow.updatedAt).toLocaleDateString()}
          </p>
        </article>
      ))}
    </div>
  );
}
