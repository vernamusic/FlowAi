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

export function getExecutionById(id: string) {
  return read().find((execution) => execution.id === id) ?? null;
}

export function saveExecution(execution: WorkflowExecution) {
  write([execution, ...read().filter((item) => item.id !== execution.id)]);
}

export function clearExecutionHistory() {
  write([]);
}

/**
 * A stable snapshot for components that subscribe rather than poll, so
 * reading the history during a render does not produce a new array every
 * time.
 */
let cachedHistory: WorkflowExecution[] | null = null;
let cachedRaw: string | null = null;

export function getExecutionHistorySnapshot(): WorkflowExecution[] {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(key);

  if (cachedHistory && cachedRaw === raw) {
    return cachedHistory;
  }

  const executions = getExecutionHistory();

  cachedHistory = executions;
  cachedRaw = raw;

  return executions;
}

export function subscribeToExecutionHistory(callback: () => void) {
  if (!canUseStorage()) return () => undefined;

  window.addEventListener(eventName, callback);

  return () => window.removeEventListener(eventName, callback);
}

export const executionHistoryChangeEvent = eventName;

/** Number of runs kept, which the history page states plainly. */
export const executionHistoryLimit = maxHistory;
