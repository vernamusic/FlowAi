import type { Workflow } from "@/types/workflow";

/**
 * Save a workflow to the user's downloads folder.
 *
 * Shared by the toolbar button and the command palette, so both produce
 * the same file name for the same workflow.
 */
export function downloadWorkflowJson(workflow: Workflow) {
  const blob = new Blob([JSON.stringify(workflow, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${slugify(workflow.name) || "workflow"}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

function slugify(name: string) {
  return name
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
}