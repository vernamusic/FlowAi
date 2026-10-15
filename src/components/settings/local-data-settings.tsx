"use client";

import { AlertTriangle, DatabaseBackup, RotateCcw } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import {
  getSavedWorkflows,
  getWorkflowStorageStatus,
  resetSavedWorkflows,
  subscribeToWorkflowStorage,
  workflowStorageSchemaVersion,
} from "@/lib/workflow/workflow-storage";
import { useWorkflowStore } from "@/store/workflow.store";

export function LocalDataSettings() {
  const resetWorkflow = useWorkflowStore((state) => state.resetWorkflow);
  const status = useSyncExternalStore(
    subscribeToWorkflowStorage,
    getWorkflowStorageStatus,
    () => ({ savedAt: null, recovered: false }),
  );
  const [didReset, setDidReset] = useState(false);
  const workflowCount = getSavedWorkflows().length;

  const handleReset = () => {
    if (!window.confirm("Reset all locally saved workflows? This cannot be undone.")) return;
    resetSavedWorkflows();
    resetWorkflow();
    setDidReset(true);
  };

  return (
    <section className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <p className="text-sm text-zinc-500">Workspace</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-zinc-500">Manage data stored only in this browser.</p>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex gap-3">
          <DatabaseBackup className="mt-0.5 h-5 w-5 text-violet-300" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Local workflow storage</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{workflowCount} saved {workflowCount === 1 ? "workflow" : "workflows"} · storage schema v{workflowStorageSchemaVersion}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">Your workflows remain on this device and browser. Export important work before clearing browser data.</p>
          </div>
        </div>
        {status.recovered && (
          <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            Saved workflow data was repaired after an unsupported or malformed entry was found. A recovery copy was kept in this browser’s local storage.
          </div>
        )}
        {didReset && <p role="status" className="mt-4 text-xs text-emerald-400">All local workflows have been reset.</p>}
      </div>

      <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Reset local workflows</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500">This deletes every workflow stored by FlowAI in this browser. It does not affect your AI provider session keys.</p>
        <button type="button" onClick={handleReset} disabled={workflowCount === 0} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-red-500/30 px-3 text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
          <RotateCcw className="h-4 w-4" /> Reset all workflows
        </button>
      </div>
    </section>
  );
}
