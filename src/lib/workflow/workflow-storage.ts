import type { Workflow } from "@/types/workflow";

const storageKey = "flowai:workflows";
const recoveryKeyPrefix = "flowai:workflows-recovery:";
const changeEvent = "flowai:workflows-changed";
const schemaVersion = 2;

interface WorkflowStorageEnvelope {
  version: number;
  savedAt: string;
  recoveredAt?: string;
  workflows: Workflow[];
}

export interface WorkflowStorageStatus {
  savedAt: string | null;
  recovered: boolean;
}

let storageStatus: WorkflowStorageStatus = { savedAt: null, recovered: false };

function setStorageStatus(next: WorkflowStorageStatus) {
  if (
    storageStatus.savedAt !== next.savedAt ||
    storageStatus.recovered !== next.recovered
  ) {
    storageStatus = next;
  }
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function isWorkflow(value: unknown): value is Workflow {
  if (!value || typeof value !== "object") return false;
  const workflow = value as Partial<Workflow>;
  return (
    typeof workflow.id === "string" &&
    typeof workflow.name === "string" &&
    Array.isArray(workflow.nodes) &&
    Array.isArray(workflow.edges) &&
    typeof workflow.createdAt === "string" &&
    typeof workflow.updatedAt === "string"
  );
}

function persist(workflows: Workflow[], recovered = false) {
  if (!canUseStorage()) return;
  const savedAt = new Date().toISOString();
  const envelope: WorkflowStorageEnvelope = {
    version: schemaVersion,
    savedAt,
    ...(recovered ? { recoveredAt: savedAt } : {}),
    workflows,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(envelope));
  setStorageStatus({ savedAt, recovered });
  window.dispatchEvent(new Event(changeEvent));
}

function recover(raw: string | null) {
  if (!canUseStorage()) return;
  if (raw) {
    window.localStorage.setItem(`${recoveryKeyPrefix}${Date.now()}`, raw);
  }
}

function readWorkflows(): Workflow[] {
  if (!canUseStorage()) return [];

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    const legacyWorkflows = Array.isArray(parsed) ? parsed : null;
    const envelope =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Partial<WorkflowStorageEnvelope>)
        : null;
    const storedWorkflows = legacyWorkflows ?? envelope?.workflows;

    if (!Array.isArray(storedWorkflows)) {
      recover(raw);
      persist([], true);
      return [];
    }

    const workflows = storedWorkflows.filter(isWorkflow);
    const needsMigration =
      Boolean(legacyWorkflows) ||
      envelope?.version !== schemaVersion ||
      workflows.length !== storedWorkflows.length;

    if (needsMigration) {
      recover(raw);
      persist(workflows, true);
    } else {
      setStorageStatus({
        savedAt: typeof envelope?.savedAt === "string" ? envelope.savedAt : null,
        recovered: typeof envelope?.recoveredAt === "string",
      });
    }

    return workflows;
  } catch {
    recover(raw);
    persist([], true);
    return [];
  }
}

export function getSavedWorkflows(): Workflow[] {
  return readWorkflows().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getSavedWorkflow(id: string): Workflow | null {
  return readWorkflows().find((workflow) => workflow.id === id) ?? null;
}

export function saveWorkflow(workflow: Workflow) {
  const workflows = readWorkflows();
  const index = workflows.findIndex((item) => item.id === workflow.id);
  if (index === -1) workflows.push(workflow);
  else workflows[index] = workflow;
  persist(workflows);
}

export function deleteSavedWorkflow(id: string) {
  persist(readWorkflows().filter((workflow) => workflow.id !== id));
}

export function resetSavedWorkflows() {
  persist([]);
}

export function getWorkflowStorageStatus() {
  if (canUseStorage()) readWorkflows();
  return storageStatus;
}

export function subscribeToWorkflowStorage(callback: () => void) {
  if (!canUseStorage()) return () => undefined;
  window.addEventListener(changeEvent, callback);
  return () => window.removeEventListener(changeEvent, callback);
}

export { changeEvent as workflowStorageChangeEvent, schemaVersion as workflowStorageSchemaVersion };
