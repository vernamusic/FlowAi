"use client";

import { useMemo } from "react";

import { createVariableContext } from "./variable-context";
import { findUnresolvedReferences } from "./variable-audit";
import { resolveTemplate, resolveValue } from "./variable-resolver";
import type { VariableContext } from "./variable-context";
import { useWorkflowStore } from "@/store/workflow.store";
import type { Workflow, WorkflowExecution } from "@/types/workflow";
import { getAvailableVariables } from "./variable-scope";

export interface ResolvedVariables {
  /** Values available right now, built from the last successful runs. */
  context: VariableContext;

  /** Replace every variable in a template with its current value. */
  resolve: (text: string) => string;

  /** Resolve a whole config object, the same way the engine does. */
  resolveConfig: <T>(config: T) => T;

  /** References in a template that this node cannot read. */
  unresolved: (text: string) => string[];
}

/**
 * Variable context for the inspector.
 *
 * Everything after the last run has no data yet, so the preview shows
 * the template as written instead of guessing values.
 */
export function useResolvedVariables(nodeId: string): ResolvedVariables {
  const workflow = useWorkflowStore((state) => state.workflow);
  const execution = useWorkflowStore((state) => state.execution);
  const executionHistory = useWorkflowStore((state) => state.executionHistory);

  const context = useMemo(
    () => createPreviewContext(workflow, [execution, ...executionHistory]),
    [execution, executionHistory, workflow],
  );

  const availableKeys = useMemo(
    () =>
      workflow
        ? getAvailableVariables(workflow, nodeId).map((variable) => variable.key)
        : [],
    [nodeId, workflow],
  );

  return useMemo(
    () => ({
      context,
      resolve: (text: string) => resolveTemplate(text, context),
      resolveConfig: <T,>(config: T) => resolveValue(config, context) as T,
      unresolved: (text: string) => findUnresolvedReferences(text, availableKeys),
    }),
    [availableKeys, context],
  );
}

/**
 * Build the context from every recorded successful node output, newest
 * run first.
 */
export function createPreviewContext(
  workflow: Workflow | null,
  runs: (WorkflowExecution | null)[],
): VariableContext {
  if (!workflow) {
    return {};
  }

  const outputs = new Map<string, Record<string, unknown>>();

  for (const run of runs) {
    if (!run) {
      continue;
    }

    for (const nodeExecution of run.nodes) {
      if (nodeExecution.status === "success" && nodeExecution.output) {
        outputs.set(nodeExecution.nodeId, nodeExecution.output);
      }
    }
  }

  return createVariableContext(workflow.nodes, outputs);
}