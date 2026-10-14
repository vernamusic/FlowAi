"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { PanelLeft, PanelRight } from "lucide-react";
import { useEffect, useState } from "react";

import "@xyflow/react/dist/style.css";

import { NodeLibrary } from "@/components/workflow/sidebar/node-library";
import { useWorkflowStore } from "@/store/workflow.store";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowInspector } from "@/components/workflow/inspector/workflow-inspector";

interface WorkflowEditorProps {
  workflowId: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow);
  const resetWorkflow = useWorkflowStore((state) => state.resetWorkflow);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const duplicateNode = useWorkflowStore((state) => state.duplicateNode);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);

  useEffect(() => {
    if (!loadWorkflow(workflowId)) {
      resetWorkflow();
    }
  }, [loadWorkflow, resetWorkflow, workflowId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (modifier && event.key.toLowerCase() === "d" && selectedNodeId) {
        event.preventDefault();
        duplicateNode(selectedNodeId);
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeId) {
        event.preventDefault();
        removeNode(selectedNodeId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duplicateNode, redo, removeNode, selectedNodeId, undo]);

  return (
    <ReactFlowProvider>
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
          <NodeLibrary className="absolute inset-y-0 left-0 z-30 shadow-2xl lg:hidden" />
        )}

        {isInspectorOpen && (
          <WorkflowInspector className="absolute inset-y-0 right-0 z-30 shadow-2xl lg:hidden" />
        )}
      </div>
    </ReactFlowProvider>
  );
}
