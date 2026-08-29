import type { Workflow } from "@/types/workflow";

const storageKey = "flowai:workflows";
const changeEvent = "flowai:workflows-changed";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readWorkflows(): Workflow[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const value = window.localStorage.getItem(storageKey);
    const workflows: unknown = value ? JSON.parse(value) : [];

    return Array.isArray(workflows) ? (workflows as Workflow[]) : [];
  } catch {
    return [];
  }
}

function writeWorkflows(workflows: Workflow[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(workflows));
  window.dispatchEvent(new Event(changeEvent));
}

export function getSavedWorkflows(): Workflow[] {
  return readWorkflows().sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getSavedWorkflow(id: string): Workflow | null {
  return readWorkflows().find((workflow) => workflow.id === id) ?? null;
}

export function saveWorkflow(workflow: Workflow) {
  const workflows = readWorkflows();
  const index = workflows.findIndex((item) => item.id === workflow.id);

  if (index === -1) {
    workflows.push(workflow);
  } else {
    workflows[index] = workflow;
  }

  writeWorkflows(workflows);
}

export function deleteSavedWorkflow(id: string) {
  writeWorkflows(readWorkflows().filter((workflow) => workflow.id !== id));
}

export { changeEvent as workflowStorageChangeEvent };
