"use client";

import { Activity, ArrowRight, Boxes, Clock3, Workflow as WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { NewWorkflowButton } from "@/components/workflow/new-workflow-button";
import {
  getSavedWorkflows,
  workflowStorageChangeEvent,
} from "@/lib/workflow/workflow-storage";
import type { Workflow } from "@/types/workflow";

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(updatedAt));
}

export function DashboardOverview() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    const refresh = () => setWorkflows(getSavedWorkflows());
    const initialLoad = window.setTimeout(refresh, 0);

    window.addEventListener(workflowStorageChangeEvent, refresh);

    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(workflowStorageChangeEvent, refresh);
    };
  }, []);

  const nodeCount = workflows.reduce(
    (total, workflow) => total + workflow.nodes.length,
    0,
  );
  const recentWorkflows = workflows.slice(0, 4);

  return (
    <section className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Build, manage, and run your AI workflows.
          </p>
        </div>

        <NewWorkflowButton />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard icon={WorkflowIcon} label="Saved workflows" value={workflows.length} detail="Available in this browser" />
        <MetricCard icon={Boxes} label="Total nodes" value={nodeCount} detail="Across all saved workflows" />
        <MetricCard
          icon={Activity}
          label="Ready to run"
          value={workflows.filter((workflow) => workflow.nodes.length > 0).length}
          detail="Workflows with at least one node"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Recent workflows</h2>
              <p className="mt-1 text-xs text-zinc-600">Your latest saved work.</p>
            </div>
            <Link href="/workflows" className="inline-flex items-center gap-1 text-xs text-violet-300 transition hover:text-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentWorkflows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <WorkflowIcon className="mx-auto h-6 w-6 text-zinc-700" />
              <p className="mt-3 text-sm text-zinc-400">Create your first workflow to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {recentWorkflows.map((workflow) => (
                <Link
                  key={workflow.id}
                  href={`/workflows/${workflow.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                      <WorkflowIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">{workflow.name}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">
                        {workflow.nodes.length} {workflow.nodes.length === 1 ? "node" : "nodes"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-zinc-600">{formatUpdatedAt(workflow.updatedAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
          <Clock3 className="h-5 w-5 text-violet-300" />
          <h2 className="mt-4 text-sm font-semibold text-zinc-100">Workflow tips</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Start with a Manual Trigger, then connect actions and conditions to build your automation.
          </p>
          <Link href="/workflows" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-200">
            Browse workflows <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </aside>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof WorkflowIcon;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">{value}</p>
      <p className="mt-1 text-[11px] text-zinc-600">{detail}</p>
    </div>
  );
}
