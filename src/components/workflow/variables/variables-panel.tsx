"use client";

import {
  Box,
  CheckCircle2,
  Copy,
  Hash,
  Search,
  ToggleLeft,
  TriangleAlert,
  Type,
  Variable,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  auditWorkflowVariables,
  collectWorkflowReferences,
  type VariableIssue,
} from "@/lib/workflow/variables/variable-audit";
import {
  getWorkflowVariables,
  readLoopVariableNames,
} from "@/lib/workflow/variables/variable-scope";
import { useWorkflowStore } from "@/store/workflow.store";
import type { WorkflowVariable } from "@/types/workflow";

const typeIcons: Record<WorkflowVariable["type"], typeof Type> = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  object: Box,
};

type PanelTab = "outputs" | "references";

/**
 * Workflow-wide view of every variable: what each node produces, what
 * the last run actually returned, and every reference that will not
 * resolve.
 */
export function VariablesPanel() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const execution = useWorkflowStore((state) => state.execution);
  const selectNode = useWorkflowStore((state) => state.selectNode);

  const [tab, setTab] = useState<PanelTab>("outputs");
  const [query, setQuery] = useState("");

  const variables = useMemo(
    () => (workflow ? getWorkflowVariables(workflow) : []),
    [workflow],
  );

  const references = useMemo(
    () => (workflow ? collectWorkflowReferences(workflow) : []),
    [workflow],
  );

  const issues = useMemo(
    () => (workflow ? auditWorkflowVariables(workflow) : []),
    [workflow],
  );

  /**
   * Last known output per node, used to show real values.
   */
  const lastOutputs = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();

    for (const nodeExecution of execution?.nodes ?? []) {
      if (nodeExecution.status === "success" && nodeExecution.output) {
        map.set(nodeExecution.nodeId, nodeExecution.output);
      }
    }

    return map;
  }, [execution]);

  const search = query.trim().toLowerCase();
  const filteredVariables = search
    ? variables.filter(
        (variable) =>
          variable.key.toLowerCase().includes(search) ||
          variable.nodeLabel.toLowerCase().includes(search),
      )
    : variables;

  const filteredReferences = search
    ? references.filter(
        (reference) =>
          reference.raw.toLowerCase().includes(search) ||
          reference.nodeLabel.toLowerCase().includes(search),
      )
    : references;

  const loopVariables = (workflow?.nodes ?? []).filter(
    (node) => node.type === "loop",
  );

  if (!workflow) {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Workflow Variables
        </p>

        <h2 className="mt-1 text-sm font-semibold text-white">
          {variables.length} outputs · {references.length} references
        </h2>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          A node can only read variables from nodes connected above it.
        </p>
      </div>

      {issues.length > 0 && (
        <div className="border-b border-zinc-800 bg-amber-500/5 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-amber-400">
            <TriangleAlert className="h-3 w-3" />
            {issues.length} unresolved {issues.length === 1 ? "reference" : "references"}
          </p>

          <div className="mt-2 space-y-1.5">
            {issues.slice(0, 6).map((issue, index) => (
              <button
                key={`${issue.nodeId}-${issue.reference}-${index}`}
                type="button"
                onClick={() => issue.nodeId && selectNode(issue.nodeId)}
                className="w-full rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 text-left transition hover:border-amber-500/40"
              >
                <p className="text-[10px] leading-4 text-amber-200/90">
                  {issue.message}
                </p>
              </button>
            ))}

            {issues.length > 6 && (
              <p className="px-1 text-[10px] text-amber-400/70">
                and {issues.length - 6} more
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border-b border-zinc-800 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 focus-within:border-zinc-600">
          <Search className="h-3.5 w-3.5 shrink-0 text-zinc-600" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter variables"
            aria-label="Filter variables"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700"
          />
        </div>

        <div className="mt-2 flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          <TabButton
            isActive={tab === "outputs"}
            onClick={() => setTab("outputs")}
            label={`Outputs (${variables.length})`}
          />

          <TabButton
            isActive={tab === "references"}
            onClick={() => setTab("references")}
            label={`References (${references.length})`}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "outputs" ? (
          <div className="space-y-4">
            {loopVariables.length > 0 && (
              <section className="space-y-2">
                <p className="text-[9px] font-medium uppercase tracking-widest text-zinc-700">
                  Inside loops
                </p>

                {loopVariables.map((node) => {
                  const { itemName, indexName } = readLoopVariableNames(node);

                  return (
                    <LoopVariableRow
                      key={node.id}
                      nodeLabel={node.data.label}
                      itemName={itemName}
                      indexName={indexName}
                      onSelect={() => selectNode(node.id)}
                    />
                  );
                })}
              </section>
            )}

            {filteredVariables.length === 0 ? (
              <EmptyState message="No variables match your filter." />
            ) : (
              filteredVariables.map((variable) => (
                <VariableRow
                  key={`${variable.nodeId}-${variable.key}`}
                  variable={variable}
                  lastValue={lastOutputs.get(variable.nodeId)?.[variable.path]}
                  usedBy={
                    references.filter(
                      (reference) => reference.key === variable.key.split(".")[0],
                    ).length
                  }
                  onSelect={() => selectNode(variable.nodeId)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReferences.length === 0 ? (
              <EmptyState message="No variable references yet. Type {{ in any field to insert one." />
            ) : (
              filteredReferences.map((reference, index) => (
                <ReferenceRow
                  key={`${reference.nodeId}-${reference.raw}-${index}`}
                  reference={reference}
                  issue={issues.find(
                    (issue) =>
                      issue.nodeId === reference.nodeId &&
                      issue.reference === reference.raw,
                  )}
                  onSelect={() => selectNode(reference.nodeId)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  isActive,
  onClick,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`flex-1 rounded-md px-2 py-1 text-[10px] transition ${
        isActive ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

function VariableRow({
  variable,
  lastValue,
  usedBy,
  onSelect,
}: {
  variable: WorkflowVariable & { dynamic: boolean };
  lastValue: unknown;
  usedBy: number;
  onSelect: () => void;
}) {
  const Icon = typeIcons[variable.type] ?? Type;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(`{{${variable.key}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 transition hover:border-zinc-700">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />

        <button
          type="button"
          onClick={copy}
          title={`Copy {{${variable.key}}}`}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate font-mono text-[11px] text-zinc-300">
            {variable.key}
          </p>

          <p className="mt-0.5 truncate text-[10px] text-zinc-600">
            {variable.nodeLabel} · {variable.type}
            {variable.dynamic ? " · any shape" : ""}
            {usedBy > 0 ? ` · used ${usedBy}×` : ""}
          </p>
        </button>

        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${variable.key}`}
          className="shrink-0 text-zinc-700 transition hover:text-zinc-300"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {lastValue !== undefined && (
        <p className="mt-2 truncate rounded bg-zinc-950 px-2 py-1 font-mono text-[10px] text-zinc-500">
          {formatValue(lastValue)}
        </p>
      )}

      <button
        type="button"
        onClick={onSelect}
        className="mt-2 text-[10px] text-zinc-600 underline decoration-zinc-800 underline-offset-2 transition hover:text-zinc-400"
      >
        Select node
      </button>
    </div>
  );
}

function LoopVariableRow({
  nodeLabel,
  itemName,
  indexName,
  onSelect,
}: {
  nodeLabel: string;
  itemName: string;
  indexName: string;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5">
      <div className="flex items-start gap-2">
        <Variable className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-zinc-200">{nodeLabel}</p>

          <p className="mt-1 space-x-1 font-mono text-[10px] text-zinc-400">
            <span>{itemName}</span>
            <span>{indexName}</span>
            <span>{itemName}Count</span>
          </p>

          <p className="mt-1 text-[10px] leading-4 text-zinc-600">
            Only available inside this loop body.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="mt-2 text-[10px] text-zinc-500 underline decoration-zinc-800 underline-offset-2 transition hover:text-zinc-300"
      >
        Select node
      </button>
    </div>
  );
}

function ReferenceRow({
  reference,
  issue,
  onSelect,
}: {
  reference: { nodeLabel: string; field: string; raw: string };
  issue?: VariableIssue;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-2.5 text-left transition ${
        issue
          ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
      }`}
    >
      <p className="truncate font-mono text-[11px] text-zinc-300">
        {reference.raw}
      </p>

      <p className="mt-1 truncate text-[10px] text-zinc-600">
        {reference.nodeLabel}
        {reference.field ? ` · ${reference.field}` : ""}
      </p>

      <p
        className={`mt-1 text-[10px] leading-4 ${
          issue ? "text-amber-400" : "text-emerald-500"
        }`}
      >
        {issue ? issue.message : "Resolves from an upstream node."}
      </p>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-6 text-center">
      <p className="text-[10px] leading-4 text-zinc-700">{message}</p>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  }

  try {
    const text = JSON.stringify(value);

    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  } catch {
    return String(value);
  }
}