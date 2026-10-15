"use client";

import { Check, Download, Redo2, Save, Trash2, Undo2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";

import { RunWorkflowButton } from "@/components/workflow/execution/run-workflow-button";
import { useWorkflowStore } from "@/store/workflow.store";
import { parseImportedWorkflow } from "@/lib/workflow/validation";
import {
  getWorkflowStorageStatus,
  subscribeToWorkflowStorage,
} from "@/lib/workflow/workflow-storage";

interface WorkflowActionsProps {
  workflowId: string;
}

export function WorkflowActions({ workflowId }: WorkflowActionsProps) {
  const router = useRouter();
  const saveCurrentWorkflow = useWorkflowStore((state) => state.saveCurrentWorkflow);
  const deleteWorkflow = useWorkflowStore((state) => state.deleteWorkflow);
  const workflow = useWorkflowStore((state) => state.workflow);
  const replaceWorkflow = useWorkflowStore((state) => state.replaceWorkflow);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const historyPast = useWorkflowStore((state) => state.historyPast);
  const historyFuture = useWorkflowStore((state) => state.historyFuture);
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageStatus = useSyncExternalStore(
    subscribeToWorkflowStorage,
    getWorkflowStorageStatus,
    () => ({ savedAt: null, recovered: false }),
  );

  const handleSave = () => {
    saveCurrentWorkflow();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleExport = () => {
    if (!workflow) return;
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflow.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "workflow"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseImportedWorkflow(JSON.parse(await file.text()));
      if (!imported) throw new Error("The file is not a valid FlowAI workflow.");
      replaceWorkflow(imported);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import this file.");
    }
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
    <div className="relative flex shrink-0 items-center gap-2">
      <button type="button" onClick={undo} disabled={historyPast.length === 0} aria-label="Undo" title="Undo (Ctrl/⌘ + Z)" className="hidden h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:flex">
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={redo} disabled={historyFuture.length === 0} aria-label="Redo" title="Redo (Ctrl/⌘ + Shift + Z)" className="hidden h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:flex">
        <Redo2 className="h-4 w-4" />
      </button>
      <input ref={fileInputRef} onChange={handleImport} accept="application/json,.json" className="hidden" type="file" />
      <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Import workflow" title="Import workflow JSON" className="hidden h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:bg-zinc-900 hover:text-white sm:flex">
        <Upload className="h-4 w-4" />
      </button>
      <button type="button" onClick={handleExport} disabled={!workflow} aria-label="Export workflow" title="Export workflow JSON" className="hidden h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:flex">
        <Download className="h-4 w-4" />
      </button>
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
      {storageStatus.savedAt && (
        <span className="hidden text-[10px] text-zinc-500 xl:inline">
          Saved {new Date(storageStatus.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      {importError && <p role="alert" className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-red-500/30 bg-zinc-950 p-2 text-xs text-red-300 shadow-xl">{importError}</p>}
    </div>
  );
}
