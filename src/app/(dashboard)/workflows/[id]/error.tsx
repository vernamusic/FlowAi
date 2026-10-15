"use client";

import { useEffect } from "react";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/**
 * Catches anything thrown while a workflow is being edited, so a broken
 * workflow never leaves a blank screen.
 */
export default function WorkflowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };

  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workflow editor failed", error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-zinc-950 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
          <TriangleAlert className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-sm font-semibold text-white">
          The editor hit an error
        </h2>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Your workflow is still saved in this browser. Reloading the editor
          usually fixes it.
        </p>

        {error.message && (
          <p className="mt-3 max-h-24 overflow-auto rounded-lg bg-zinc-900 px-3 py-2 text-left font-mono text-[10px] leading-4 text-zinc-500">
            {error.message}
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Try again
          </button>

          <Link
            href="/workflows"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400"
          >
            Back to workflows
          </Link>
        </div>
      </div>
    </div>
  );
}