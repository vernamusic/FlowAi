"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  summarizeExecution,
  summarizeNodeUsage,
  summarizeNodes,
  type NodeUsage,
} from "@/lib/workflow/execution/execution-metrics";
import {
  formatClock,
  formatDateTime,
  formatEstimatedCost,
  formatRunDuration,
  formatTokenCount,
  prettyJson,
  statusClass,
} from "@/lib/workflow/execution/execution-format";
import { getExecutionById, executionHistoryLimit } from "@/lib/workflow/execution/execution-storage";
import { getSavedWorkflows } from "@/lib/workflow/workflow-storage";
import type { Workflow, WorkflowExecution } from "@/types/workflow";

/**
 * One run, in full: what it did, what each node passed along, and what
 * it spent.
 */
export function ExecutionDetail({ executionId }: { executionId: string }) {
  /**
   * The run lives in this browser's storage rather than on a server, so
   * it is read after the first paint. Reading during render would also
   * hand the server and the browser different markup.
   */
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExecution(getExecutionById(executionId));
      setWorkflows(getSavedWorkflows());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [executionId]);

  const labels = useMemo(() => {
    const workflow = workflows.find((item) => item.id === execution?.workflowId);
    const entries =
      workflow?.nodes.map((node) => [node.id, node.data.label]) ?? [];

    return Object.fromEntries(entries);
  }, [workflows, execution?.workflowId]);

  if (!execution) {
    return <RunNotFound executionId={executionId} />;
  }

  const summary = summarizeExecution(execution);
  const nodes = summarizeNodes(execution, labels);
  const nodeUsage = summarizeNodeUsage(execution, labels);
  const workflow = workflows.find((item) => item.id === execution.workflowId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/executions"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 transition hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All executions
          </Link>

          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-white">
            {summary.workflowName}
          </h1>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            <span>{formatDateTime(execution.startedAt)}</span>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusClass(execution.status)}`}
            >
              {execution.status}
            </span>

            {summary.mode === "dry-run" && (
              <span className="rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                dry run
              </span>
            )}

            <span>{formatRunDuration(execution.duration)}</span>
          </p>
        </div>

        {workflow && (
          <Link
            href={`/workflows/${workflow.id}`}
            className="shrink-0 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            Open workflow
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Nodes" value={String(summary.nodes)} hint={`${summary.failedNodes} failed`} />
        <StatTile
          label="Tokens"
          value={formatTokenCount(summary.totalTokens)}
          hint={`${formatTokenCount(summary.promptTokens)} in · ${formatTokenCount(summary.completionTokens)} out`}
        />
        <StatTile
          label="Cost"
          value={formatEstimatedCost(summary.cost, summary.estimated)}
          hint={
            summary.cost === null
              ? "No published pricing"
              : summary.estimated
                ? "Estimated from local token counts"
                : "Reported by the provider"
          }
        />
        <StatTile label="Log events" value={String(execution.logs.length)} hint={`Run id ${execution.id.slice(0, 8)}`} />
      </div>

      {nodeUsage.length > 0 && (
        <NodeUsageTable rows={nodeUsage} />
      )}

      <NodeRuns nodes={nodes} expanded={expandedNode} onExpand={setExpandedNode} />

      <LogTimeline logs={execution.logs} labels={labels} />
    </div>
  );
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
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>

      <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>

      <p className="mt-1 truncate text-[11px] text-zinc-600">{hint}</p>
    </div>
  );
}

function NodeUsageTable({ rows }: { rows: NodeUsage[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">AI usage</h2>

        <p className="mt-0.5 text-[11px] text-zinc-600">
          What each AI node sent and received.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-900 text-[10px] uppercase tracking-wider text-zinc-600">
              <th className="px-4 py-2 font-medium">Node</th>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 font-medium">In</th>
              <th className="px-4 py-2 font-medium">Out</th>
              <th className="px-4 py-2 font-medium">Cost</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={`${row.nodeId}-${row.model}`} className="border-b border-zinc-900/70 last:border-b-0">
                <td className="px-4 py-2.5">
                  <span className="block truncate text-zinc-200">{row.label}</span>

                  {row.provider && (
                    <span className="text-[10px] text-zinc-600">{row.provider}</span>
                  )}
                </td>

                <td className="px-4 py-2.5 text-zinc-400">{row.model ?? "—"}</td>

                <td className="px-4 py-2.5 text-zinc-400">
                  {formatTokenCount(row.promptTokens)}
                </td>

                <td className="px-4 py-2.5 text-zinc-400">
                  {formatTokenCount(row.completionTokens)}
                </td>

                <td className="px-4 py-2.5 text-zinc-400">
                  {formatEstimatedCost(row.cost, row.estimated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NodeRuns({
  nodes,
  expanded,
  onExpand,
}: {
  nodes: ReturnType<typeof summarizeNodes>;
  expanded: string | null;
  onExpand: (nodeId: string | null) => void;
}) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Node inputs and outputs</h2>

        <p className="mt-0.5 text-[11px] text-zinc-600">
          What each node received and produced, in the order they ran.
        </p>
      </div>

      <ul>
        {nodes.map((node) => {
          const isOpen = expanded === node.nodeId;
          const hasPayload = Boolean(node.input || node.output || node.error);

          return (
            <li key={node.nodeId} className="border-b border-zinc-900/70 last:border-b-0">
              <button
                type="button"
                onClick={() => onExpand(isOpen ? null : node.nodeId)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zinc-900/50"
              >
                {hasPayload ? (
                  isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  )
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                  {node.label}
                </span>

                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(node.status)}`}
                >
                  {node.status}
                </span>

                <span className="w-20 shrink-0 text-right text-[11px] text-zinc-600">
                  {formatRunDuration(node.duration)}
                </span>
              </button>

              {isOpen && hasPayload && (
                <div className="space-y-3 border-t border-zinc-900 bg-black/20 px-4 py-3">
                  {node.error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                      {node.error}
                    </div>
                  )}

                  {node.input && <Payload label="Input" value={node.input} />}

                  {node.output && <Payload label="Output" value={node.output} />}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Payload({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown>;
}) {
  const text = prettyJson(value);

  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <div className="relative">
        <pre className="max-h-56 overflow-auto rounded-lg border border-zinc-900 bg-zinc-950 p-3 pr-9 text-[11px] leading-5 text-zinc-400">
          {text}
        </pre>

        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(text)}
          aria-label={`Copy ${label.toLowerCase()} json`}
          className="absolute right-1 top-1 rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function LogTimeline({
  logs,
  labels,
}: {
  logs: WorkflowExecution["logs"];
  labels: Record<string, string>;
}) {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Logs</h2>

        <p className="mt-0.5 text-[11px] text-zinc-600">
          Every event the run reported, in order.
        </p>
      </div>

      <ul className="max-h-96 overflow-y-auto">
        {logs.map((log) => (
          <li
            key={log.id}
            className="flex items-start gap-3 border-b border-zinc-900/70 px-4 py-2.5 last:border-b-0"
          >
            <span className="mt-0.5 shrink-0">
              {log.level === "success" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : log.level === "error" ? (
                <X className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Info className="h-3.5 w-3.5 text-blue-400" />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[11px] text-zinc-300">{log.message}</span>

              {log.nodeId && labels[log.nodeId] && (
                <span className="text-[10px] text-zinc-600">
                  {labels[log.nodeId]}
                </span>
              )}

              {log.error && (
                <span className="mt-1 block rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-[10px] text-red-300">
                  {log.error}
                </span>
              )}
            </span>

            <span className="shrink-0 text-[10px] text-zinc-600">
              {formatClock(log.timestamp)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RunNotFound({ executionId }: { executionId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center">
      <h1 className="text-sm font-medium text-zinc-300">Run not found</h1>

      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        No execution with that id is stored in this browser. Only the last{" "}
        {executionHistoryLimit} runs are kept, so older ones are dropped.
      </p>

      <p className="mt-2 text-[11px] text-zinc-700">{executionId}</p>

      <Link
        href="/executions"
        className="mt-5 inline-flex items-center rounded-lg border border-zinc-800 px-3.5 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-white"
      >
        Back to executions
      </Link>
    </div>
  );
}