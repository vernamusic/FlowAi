"use client";

import {
  summarizeByDay,
  summarizeByWorkflow,
  summarizeExecution,
  summarizeExecutions,
  type ExecutionSummary,
  type WorkflowUsage,
} from "@/lib/workflow/execution/execution-metrics";
import {
  formatEstimatedCost,
  formatRunDuration,
  formatTokenCount,
  formatWhen,
  pluralize,
  statusClass,
} from "@/lib/workflow/execution/execution-format";
import {
  executionHistoryLimit,
  getExecutionHistorySnapshot,
  subscribeToExecutionHistory,
} from "@/lib/workflow/execution/execution-storage";
import type { WorkflowExecution } from "@/types/workflow";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { UsageChart } from "./usage-chart";

/**
 * Empty responses have to keep the same reference, or every render would
 * look like new data to the store.
 */
const noExecutions: WorkflowExecution[] = [];

function getSnapshot() {
  return getExecutionHistorySnapshot();
}

export function ExecutionsHistory() {
  const executions = useSyncExternalStore(
    subscribeToExecutionHistory,
    getSnapshot,
    () => noExecutions,
  );

  const [workflowFilter, setWorkflowFilter] = useState("all");

  const summaries = useMemo(
    () => executions.map(summarizeExecution),
    [executions],
  );

  const filtered = useMemo(
    () =>
      workflowFilter === "all"
        ? summaries
        : summaries.filter((item) => item.workflowId === workflowFilter),
    [summaries, workflowFilter],
  );

  const totals = useMemo(() => summarizeExecutions(executions), [executions]);
  const byWorkflow = useMemo(
    () => summarizeByWorkflow(executions),
    [executions],
  );
  const byDay = useMemo(() => summarizeByDay(executions), [executions]);

  if (executions.length === 0) {
    return <NoRuns />;
  }

  const finished = totals.succeeded + totals.failed + totals.canceled;
  const successRate = finished > 0 ? Math.round((totals.succeeded / finished) * 100) : null;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Runs"
          value={String(totals.runs)}
          hint={
            successRate === null
              ? "No finished runs yet"
              : `${successRate}% finished successfully`
          }
        />

        <StatTile
          label="Tokens"
          value={formatTokenCount(totals.totalTokens)}
          hint={`${formatTokenCount(totals.promptTokens)} in · ${formatTokenCount(totals.completionTokens)} out`}
        />

        <StatTile
          label="Estimated cost"
          value={formatEstimatedCost(totals.cost, totals.estimated)}
          hint={costHint(totals.cost, totals.pricedRuns, totals.tokenRuns, totals.estimated)}
        />

        <StatTile
          label="Average duration"
          value={formatRunDuration(totals.averageDuration)}
          hint={`${totals.failed} failed · ${totals.canceled} canceled`}
        />
      </div>

      <UsageChart days={byDay} />

      <WorkflowBreakdown rows={byWorkflow} />

      <RunList
        runs={filtered}
        workflows={byWorkflow}
        filter={workflowFilter}
        onFilterChange={setWorkflowFilter}
      />
    </div>
  );
}

/**
 * What the cost figure actually covers.
 *
 * A run whose model has no published pricing contributes nothing, so a
 * total that mixes priced and unpriced runs has to say which is which
 * rather than presenting a number as if it were everything.
 */
function costHint(
  cost: number | null,
  pricedRuns: number,
  tokenRuns: number,
  estimated: boolean,
) {
  if (cost === null) {
    return "No published pricing for these models";
  }

  if (tokenRuns > pricedRuns) {
    return `Priced ${pricedRuns} of ${tokenRuns} runs that used tokens`;
  }

  return estimated ? "Counted locally, marked with *" : "Reported by the provider";
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>

      <p className="mt-1 truncate text-[11px] text-zinc-600">{hint}</p>
    </div>
  );
}

function WorkflowBreakdown({ rows }: { rows: WorkflowUsage[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Usage by workflow</h2>

        <p className="mt-0.5 text-[11px] text-zinc-600">
          Heaviest first. Costs are estimated unless the provider reported
          them.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-900 text-[10px] uppercase tracking-wider text-zinc-600">
              <th className="px-4 py-2 font-medium">Workflow</th>
              <th className="px-4 py-2 font-medium">Runs</th>
              <th className="px-4 py-2 font-medium">Success</th>
              <th className="px-4 py-2 font-medium">Tokens</th>
              <th className="px-4 py-2 font-medium">Cost</th>
              <th className="px-4 py-2 font-medium">Last run</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.workflowId}
                className="border-b border-zinc-900/70 last:border-b-0"
              >
                <td className="px-4 py-2.5">
                  <span className="block truncate text-zinc-200">
                    {row.workflowName}
                  </span>
                </td>

                <td className="px-4 py-2.5 text-zinc-400">{row.runs}</td>

                <td className="px-4 py-2.5 text-zinc-400">
                  {row.succeeded}/{row.runs}
                </td>

                <td className="px-4 py-2.5 text-zinc-400">
                  {formatTokenCount(row.usage.totalTokens)}
                </td>

                <td className="px-4 py-2.5 text-zinc-400">
                  {formatEstimatedCost(row.usage.cost, row.usage.estimated)}
                </td>

                <td className="px-4 py-2.5 text-zinc-500">
                  {formatWhen(row.lastRunAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RunList({
  runs,
  workflows,
  filter,
  onFilterChange,
}: {
  runs: ExecutionSummary[];
  workflows: WorkflowUsage[];
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Runs</h2>

          <p className="mt-0.5 text-[11px] text-zinc-600">
            The last {executionHistoryLimit} runs are kept in this browser.
          </p>
        </div>

        {workflows.length > 1 && (
          <label className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Workflow</span>

            <select
              value={filter}
              onChange={(event) => onFilterChange(event.target.value)}
              aria-label="Filter runs by workflow"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-zinc-700"
            >
              <option value="all">All workflows</option>

              {workflows.map((row) => (
                <option key={row.workflowId} value={row.workflowId}>
                  {row.workflowName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {runs.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-zinc-500">
          No runs for this workflow yet.
        </p>
      ) : (
        <ul>
          {runs.map((run) => (
            <li key={run.id}>
              <Link
                href={`/executions/${run.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-zinc-900/70 px-4 py-3 transition last:border-b-0 hover:bg-zinc-900/50"
              >
                <span
                  className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-medium capitalize ${statusClass(run.status)}`}
                >
                  {run.status}
                </span>

                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                  {run.workflowName}
                </span>

                {run.mode === "dry-run" && (
                  <span className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    dry run
                  </span>
                )}

                <span className="shrink-0 text-[11px] text-zinc-500">
                  {pluralize(run.nodes, "node")}
                </span>

                <span className="shrink-0 text-[11px] text-zinc-500">
                  {formatRunDuration(run.duration)}
                </span>

                <span className="w-20 shrink-0 text-right text-[11px] text-zinc-400">
                  {run.totalTokens > 0
                    ? formatTokenCount(run.totalTokens)
                    : "—"}
                </span>

                <span className="w-20 shrink-0 text-right text-[11px] text-zinc-400">
                  {formatEstimatedCost(run.cost, run.estimated)}
                </span>

                <span className="w-16 shrink-0 text-right text-[11px] text-zinc-600">
                  {formatWhen(run.startedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoRuns() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center">
      <p className="text-sm font-medium text-zinc-300">No runs yet</p>

      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        Run a workflow and it will appear here with its logs, the data each
        node passed along, and the tokens and cost it used. Runs stay in
        this browser and are never sent anywhere.
      </p>

      <Link
        href="/workflows"
        className="mt-5 inline-flex items-center rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
      >
        Go to workflows
      </Link>
    </div>
  );
}