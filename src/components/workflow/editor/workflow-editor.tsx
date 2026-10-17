"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { PanelLeft, PanelRight, X } from "lucide-react";
import { useEffect, useState } from "react";

import "@xyflow/react/dist/style.css";

import { NodeLibrary } from "@/components/workflow/sidebar/node-library";
import { Walkthrough } from "@/components/workflow/onboarding/walkthrough";
import { isTypingTarget } from "@/lib/shortcuts/shortcuts";
import { useWorkflowStore } from "@/store/workflow.store";
import { WorkflowCanvas } from "./workflow-canvas";
import { EditorSkeleton, WorkflowNotFound } from "./workflow-not-found";
import { EditorCommandBridge } from "./editor-command-bridge";
import { useScheduledTrigger } from "./use-scheduled-trigger";
import { WorkflowInspector } from "@/components/workflow/inspector/workflow-inspector";

interface WorkflowEditorProps {
  workflowId: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const resetWorkflow = useWorkflowStore((state) => state.resetWorkflow);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorkflowStore((state) => state.selectedEdgeId);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const removeEdge = useWorkflowStore((state) => state.removeEdge);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const saveCurrentWorkflow = useWorkflowStore((state) => state.saveCurrentWorkflow);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const nodeCount = useWorkflowStore((state) => state.workflow?.nodes.length ?? 0);
  const workflow = useWorkflowStore((state) => state.workflow);

  /**
   * A workflow whose trigger is a page load or an interval starts
   * itself, for as long as this editor is open.
   */
  useScheduledTrigger(workflow);

  useEffect(() => {
    if (!loadWorkflow(workflowId)) {
      resetWorkflow();
    }
  }, [loadWorkflow, resetWorkflow, workflowId]);

  /**
   * Loading is synchronous, so the only thing to wait for is the first
   * paint afterwards. That is what tells "still loading" apart from
   * "nothing stored under this id".
   */
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledFor(workflowId), 0);

    return () => window.clearTimeout(timer);
  }, [workflowId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (modifier && key === "y") {
        event.preventDefault();
        redo();
      } else if (modifier && key === "s") {
        event.preventDefault();
        saveCurrentWorkflow();
      } else if (modifier && event.key === "Enter") {
        event.preventDefault();
        void runWorkflow();
      } else if (modifier && key === "d" && selectedNodeId) {
        event.preventDefault();
        duplicateNode(selectedNodeId);
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (selectedNodeId || selectedEdgeId)
      ) {
        event.preventDefault();

        /**
         * Whatever is selected goes, so the key never does something
         * the user cannot see.
         */
        if (selectedEdgeId) {
          removeEdge(selectedEdgeId);
        } else if (selectedNodeId) {
          removeNode(selectedNodeId);
        }
      } else if (event.key === "Escape") {
        selectNode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    duplicateNode,
    redo,
    removeEdge,
    removeNode,
    runWorkflow,
    saveCurrentWorkflow,
    selectNode,
    selectedEdgeId,
    selectedNodeId,
    undo,
  ]);

  /**
   * The tour introduces the editor itself, so it only appears while the
   * workflow is still empty.
   */
  const isFirstRun = nodeCount <= 1;

  /**
   * An unknown id used to leave the editor on "Loading workflow..." for
   * the whole session.
   */
  if (!workflow) {
    return settledFor === workflowId ? (
      <WorkflowNotFound workflowId={workflowId} />
    ) : (
      <EditorSkeleton />
    );
  }

  return (
    <ReactFlowProvider>
      <Walkthrough autoStart={isFirstRun} />

      {/**
       * The palette is rendered by the top bar on every page; this is
       * what lets it offer editor actions while an editor is open.
       */}
      <EditorCommandBridge />

      <div className="relative flex h-full min-h-0 w-full overflow-hidden">
        {/* Node Library */}
        <NodeLibrary className="hidden lg:block" />

        {/* Canvas */}
        <main className="min-h-0 min-w-0 flex-1">
          <WorkflowCanvas />
        </main>

        {/* Inspector */}
        <WorkflowInspector className="hidden lg:flex" />

        <div className="absolute left-3 top-3 z-20 flex gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => {
              setIsLibraryOpen((open) => !open);
              setIsInspectorOpen(false);
            }}
            aria-label="Toggle node library"
            aria-pressed={isLibraryOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/95 text-zinc-300 shadow-lg backdrop-blur transition hover:bg-zinc-800"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsInspectorOpen((open) => !open);
              setIsLibraryOpen(false);
            }}
            aria-label="Toggle node inspector"
            aria-pressed={isInspectorOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/95 text-zinc-300 shadow-lg backdrop-blur transition hover:bg-zinc-800"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>

        {isLibraryOpen && (
          <div className="absolute inset-0 z-30 lg:hidden">
            <div
              aria-hidden="true"
              onClick={() => setIsLibraryOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <div className="absolute inset-y-0 left-0 z-10 flex w-full max-w-xs flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-3 py-2">
                <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
                  Add a node
                </span>

                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(false)}
                  aria-label="Close node library"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1">
                <NodeLibrary className="h-full" />
              </div>
            </div>
          </div>
        )}

        {isInspectorOpen && (
          <div className="absolute inset-0 z-30 lg:hidden">
            <div
              aria-hidden="true"
              onClick={() => setIsInspectorOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <div className="absolute inset-y-0 right-0 z-10 flex w-full max-w-sm flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-3 py-2">
                <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">
                  Inspector
                </span>

                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  aria-label="Close inspector"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1">
                <WorkflowInspector className="h-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
