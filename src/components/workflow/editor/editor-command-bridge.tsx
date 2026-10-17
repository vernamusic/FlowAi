"use client";

import { useAddNodeAtCenter } from "@/components/workflow/use-add-node-at-center";
import { useEditorCommands } from "@/lib/editor/use-editor-commands";
import { downloadWorkflowJson } from "@/lib/workflow/export-workflow";
import { useWorkflowStore } from "@/store/workflow.store";

/**
 * Publishes the editor's actions to the command palette while an editor
 * is on screen.
 *
 * This sits inside the React Flow provider rather than in the editor
 * itself, because adding a node has to know where the middle of the
 * viewport is, and that only React Flow can answer.
 */
export function EditorCommandBridge() {
  const addNodeAtCenter = useAddNodeAtCenter();
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const saveCurrentWorkflow = useWorkflowStore(
    (state) => state.saveCurrentWorkflow,
  );
  const workflow = useWorkflowStore((state) => state.workflow);

  useEditorCommands({
    addNode: addNodeAtCenter,
    run: () => void runWorkflow(),
    dryRun: () => void runWorkflow({ dryRun: true }),
    save: saveCurrentWorkflow,
    exportWorkflow: () => {
      if (workflow) downloadWorkflowJson(workflow);
    },
  });

  return null;
}