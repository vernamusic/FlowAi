"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TriangleAlert } from "lucide-react";

/**
 * Shown when a workflow id does not resolve.
 *
 * Without this the editor used to sit on "Loading workflow..." forever,
 * because the store silently resets when nothing is found.
 */
export function WorkflowNotFound({ workflowId }: { workflowId: string }) {
  const [isReady, setIsReady] = useState(false);

  /**
   * One frame, so the store has time to report that the load failed.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <EditorSkeleton />;
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
          <TriangleAlert className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-sm font-semibold text-white">Workflow not found</h2>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          This workflow is not stored in this browser any more. It may have
          been deleted, or opened from a different device.
        </p>

        <p className="mt-3 break-all rounded-lg bg-zinc-900 px-3 py-2 font-mono text-[10px] text-zinc-600">
          {workflowId}
        </p>

        <Link
          href="/workflows"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400"
        >
          Back to workflows
        </Link>
      </div>
    </div>
  );
}

/**
 * Placeholder shown while a workflow is being read.
 */
export function EditorSkeleton() {
  return (
    <div className="flex h-full w-full" aria-busy="true">
      <span role="status" className="sr-only">
        Loading workflow
      </span>

      <div className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 lg:block">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />

        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-lg bg-zinc-900"
              style={{ animationDelay: `${index * 80}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-violet-400" />
        </div>
      </div>
    </div>
  );
}