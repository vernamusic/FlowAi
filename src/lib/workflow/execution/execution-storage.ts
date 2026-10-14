import type { WorkflowExecution } from "@/types/workflow";

const key = "flowai:execution-history";
const eventName = "flowai:execution-history-changed";
const maxHistory = 20;

function canUseStorage() {
  return typeof window !== "undefined";
}

function read(): WorkflowExecution[] {
  if (!canUseStorage()) return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as WorkflowExecution[]) : [];
  } catch {
    return [];
  }
}

function write(executions: WorkflowExecution[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(executions.slice(0, maxHistory)));
  window.dispatchEvent(new Event(eventName));
}

export function getExecutionHistory(workflowId?: string) {
  const executions = read();
  return workflowId ? executions.filter((execution) => execution.workflowId === workflowId) : executions;
}

export function saveExecution(execution: WorkflowExecution) {
  write([execution, ...read().filter((item) => item.id !== execution.id)]);
}

export function clearExecutionHistory() {
  write([]);
}

export function subscribeToExecutionHistory(callback: () => void) {
  if (!canUseStorage()) return () => undefined;
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}
