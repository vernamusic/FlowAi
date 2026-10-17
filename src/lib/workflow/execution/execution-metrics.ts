import type { WorkflowExecution } from "@/types/workflow";

/**
 * Reading numbers back out of stored runs.
 *
 * The history is read from local storage, so every value is treated as
 * untrusted: a run written by an older build may be missing fields, and
 * a hand-edited entry could hold anything. Nothing here throws.
 */

export interface ExecutionUsage {
  promptTokens: number;

  completionTokens: number;

  totalTokens: number;

  /**
   * Money actually reported by a provider. `null` when no run in the set
   * had published pricing for the model it used, which is different from
   * a run that genuinely cost nothing.
   */
  cost: number | null;

  /** How many runs contributed a cost, so partial coverage is visible. */
  pricedRuns: number;

  /** True when any usage figure came from local token counting. */
  estimated: boolean;
}

export interface ExecutionSummary extends ExecutionUsage {
  id: string;

  workflowId: string;

  workflowName: string;

  status: WorkflowExecution["status"];

  mode: "live" | "dry-run";

  startedAt: string;

  duration: number;

  nodes: number;

  failedNodes: number;
}

export interface WorkflowUsage {
  workflowId: string;

  workflowName: string;

  runs: number;

  succeeded: number;

  failed: number;

  canceled: number;

  usage: ExecutionUsage;

  lastRunAt: string;
}

export interface UsageTotals extends ExecutionUsage {
  runs: number;

  succeeded: number;

  failed: number;

  canceled: number;

  /** Runs that spent tokens, which is what pricing can be compared against. */
  tokenRuns: number;

  /** Mean duration of runs that reported one. */
  averageDuration: number;
}

export interface DailyUsage {
  /** Local calendar day as YYYY-MM-DD. */
  date: string;

  runs: number;

  totalTokens: number;

  cost: number | null;

  costEstimated: boolean;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Tokens and cost are recorded per AI node, on the log entry written when
 * that node completed.
 */
export function readExecutionUsage(
  execution: WorkflowExecution,
): ExecutionUsage {
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let cost = 0;
  let pricedRuns = 0;
  let estimated = false;

  for (const log of execution.logs ?? []) {
    const details = log.details;

    if (!details) continue;

    const prompt = readNumber(details.promptTokens);
    const completion = readNumber(details.completionTokens);
    const total = readNumber(details.totalTokens);

    /**
     * A provider that reports only a total still spent tokens, so any
     * of the three counts.
     */
    if (prompt || completion || total) {
      promptTokens += prompt;
      completionTokens += completion;
      totalTokens += total || prompt + completion;
      estimated = estimated || details.usageEstimated !== false;
    }

    const reportedCost = readOptionalNumber(details.cost);

    if (reportedCost !== null) {
      cost += reportedCost;
      pricedRuns += 1;
    }
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cost: pricedRuns > 0 ? cost : null,
    pricedRuns,
    estimated,
  };
}

export function summarizeExecution(
  execution: WorkflowExecution,
): ExecutionSummary {
  const nodes = execution.nodes ?? [];

  return {
    ...readExecutionUsage(execution),
    id: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflowName || "Untitled Workflow",
    status: execution.status,
    mode: execution.mode ?? "live",
    startedAt: execution.startedAt,
    duration: readNumber(execution.duration),
    nodes: nodes.length,
    failedNodes: nodes.filter((node) => node.status === "error").length,
  };
}

export function summarizeExecutions(
  executions: WorkflowExecution[],
): UsageTotals {
  const totals: UsageTotals = {
    runs: executions.length,
    succeeded: 0,
    failed: 0,
    canceled: 0,
    tokenRuns: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
    pricedRuns: 0,
    estimated: false,
    averageDuration: 0,
  };

  let durationTotal = 0;
  let durationCount = 0;

  for (const execution of executions) {
    const usage = readExecutionUsage(execution);

    totals.promptTokens += usage.promptTokens;
    totals.completionTokens += usage.completionTokens;
    totals.totalTokens += usage.totalTokens;
    totals.pricedRuns += usage.pricedRuns;
    totals.estimated = totals.estimated || usage.estimated;

    if (usage.totalTokens > 0) {
      totals.tokenRuns += 1;
    }

    if (usage.cost !== null) {
      totals.cost = (totals.cost ?? 0) + usage.cost;
    }

    if (execution.status === "success") totals.succeeded += 1;
    else if (execution.status === "error") totals.failed += 1;
    else if (execution.status === "canceled") totals.canceled += 1;

    if (typeof execution.duration === "number") {
      durationTotal += execution.duration;
      durationCount += 1;
    }
  }

  totals.cost = totals.pricedRuns > 0 ? totals.cost : null;
  totals.averageDuration = durationCount
    ? Math.round(durationTotal / durationCount)
    : 0;

  return totals;
}

/**
 * Usage per workflow, heaviest first, so the costliest workflow is the
 * first thing seen.
 */
export function summarizeByWorkflow(
  executions: WorkflowExecution[],
): WorkflowUsage[] {
  const groups = new Map<string, WorkflowUsage>();

  for (const execution of executions) {
    const key = execution.workflowId;
    const usage = readExecutionUsage(execution);

    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        workflowId: key,
        workflowName: execution.workflowName || "Untitled Workflow",
        runs: 1,
        succeeded: execution.status === "success" ? 1 : 0,
        failed: execution.status === "error" ? 1 : 0,
        canceled: execution.status === "canceled" ? 1 : 0,
        usage: { ...usage },
        lastRunAt: execution.startedAt,
      });

      continue;
    }

    existing.runs += 1;
    existing.succeeded += execution.status === "success" ? 1 : 0;
    existing.failed += execution.status === "error" ? 1 : 0;
    existing.canceled += execution.status === "canceled" ? 1 : 0;
    existing.usage.promptTokens += usage.promptTokens;
    existing.usage.completionTokens += usage.completionTokens;
    existing.usage.totalTokens += usage.totalTokens;
    existing.usage.estimated = existing.usage.estimated || usage.estimated;
    existing.usage.pricedRuns += usage.pricedRuns;

    if (usage.cost !== null) {
      existing.usage.cost = (existing.usage.cost ?? 0) + usage.cost;
    }

    /**
     * The stored name wins, because a later run is the one that saw the
     * current name of the workflow.
     */
    if (execution.workflowName) {
      existing.workflowName = execution.workflowName;
    }

    if (new Date(execution.startedAt) > new Date(existing.lastRunAt)) {
      existing.lastRunAt = execution.startedAt;
    }
  }

  return [...groups.values()].sort(
    (a, b) => b.usage.totalTokens - a.usage.totalTokens || b.runs - a.runs,
  );
}

/**
 * One bucket per day for the last `days` days, oldest first, including
 * days with no runs so the chart keeps an even scale.
 */
export function summarizeByDay(
  executions: WorkflowExecution[],
  days = 14,
): DailyUsage[] {
  const buckets = new Map<string, DailyUsage>();
  const today = new Date();
  const keys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);

    const key = toDayKey(day);

    keys.push(key);
    buckets.set(key, {
      date: key,
      runs: 0,
      totalTokens: 0,
      cost: null,
      costEstimated: false,
    });
  }

  for (const execution of executions) {
    const key = toDayKey(new Date(execution.startedAt));
    const bucket = buckets.get(key);

    if (!bucket) continue;

    const usage = readExecutionUsage(execution);

    bucket.runs += 1;
    bucket.totalTokens += usage.totalTokens;
    bucket.costEstimated = bucket.costEstimated || usage.estimated;

    if (usage.cost !== null) {
      bucket.cost = (bucket.cost ?? 0) + usage.cost;
    }
  }

  return keys.map((key) => buckets.get(key) as DailyUsage);
}

export function toDayKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Node runs in the order they happened, paired with the name of the node
 * when its workflow is still around.
 */
export interface NodeRun {
  nodeId: string;

  label: string;

  status: string;

  duration: number;

  input?: Record<string, unknown>;

  output?: Record<string, unknown>;

  error?: string;
}

export function summarizeNodes(
  execution: WorkflowExecution,
  labels: Record<string, string> = {},
): NodeRun[] {
  return (execution.nodes ?? []).map((node) => ({
    nodeId: node.nodeId,
    label: labels[node.nodeId] ?? node.nodeId,
    status: node.status,
    duration: readNumber(node.duration),
    input: node.input,
    output: node.output,
    error: node.error,
  }));
}

/**
 * The AI nodes of a run, with what each one spent.
 */
export interface NodeUsage {
  nodeId: string;

  label: string;

  provider: string | null;

  model: string | null;

  promptTokens: number;

  completionTokens: number;

  totalTokens: number;

  cost: number | null;

  estimated: boolean;
}

export function summarizeNodeUsage(
  execution: WorkflowExecution,
  labels: Record<string, string> = {},
): NodeUsage[] {
  const rows: NodeUsage[] = [];

  for (const log of execution.logs ?? []) {
    const details = log.details;

    if (!details) continue;

    const promptTokens = readNumber(details.promptTokens);
    const completionTokens = readNumber(details.completionTokens);
    const totalTokens = readNumber(details.totalTokens);

    if (!promptTokens && !completionTokens && !totalTokens) continue;

    rows.push({
      nodeId: log.nodeId ?? "",
      label: log.nodeId ? (labels[log.nodeId] ?? log.nodeId) : "AI node",
      provider: typeof details.provider === "string" ? details.provider : null,
      model: typeof details.model === "string" ? details.model : null,
      promptTokens,
      completionTokens,
      totalTokens: readNumber(details.totalTokens) || promptTokens + completionTokens,
      cost: readOptionalNumber(details.cost),
      estimated: details.usageEstimated !== false,
    });
  }

  return rows;
}