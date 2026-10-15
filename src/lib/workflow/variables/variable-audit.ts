import type { Workflow, WorkflowNode } from "@/types/workflow";

import { createVariableKey } from "./variable-context";
import { parseVariable, parseVariables } from "./variable-parser";
import {
  collectAncestorIds,
  findNearestLoopNode,
  getExposedLoopBodyIds,
  getNodeOutputFields,
  readLoopVariableNames,
} from "./variable-scope";

/**
 * A single `{{ ... }}` usage found in a node configuration.
 */
export interface VariableReference {
  nodeId: string;

  nodeLabel: string;

  /** Config field the reference lives in, e.g. `prompt`. */
  field: string;

  raw: string;

  key: string;

  path: string[];
}

export type VariableIssueCode =
  | "unknown-variable"
  | "not-connected"
  | "unknown-field"
  | "loop-variable-outside";

export interface VariableIssue {
  code: VariableIssueCode;

  message: string;

  nodeId?: string;

  reference?: string;
}

/**
 * Every variable reference in a node, including nested config values.
 */
export function collectNodeReferences(
  node: WorkflowNode,
): VariableReference[] {
  const references: VariableReference[] = [];

  const visit = (value: unknown, field: string) => {
    if (typeof value === "string") {
      for (const variable of parseVariables(value)) {
        references.push({
          nodeId: node.id,
          nodeLabel: node.data.label,
          field,
          raw: variable.raw,
          key: variable.key,
          path: variable.path,
        });
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${field}[${index}]`));

      return;
    }

    if (value !== null && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        visit(item, field ? `${field}.${key}` : key);
      }
    }
  };

  visit(node.data.config, "");

  return references;
}

/**
 * Every variable reference in a workflow.
 */
export function collectWorkflowReferences(
  workflow: Workflow): VariableReference[] {
  return workflow.nodes.flatMap((node) => collectNodeReferences(node));
}

/**
 * Check every reference in a workflow against the graph.
 *
 * Catches the three ways a template breaks:
 *
 * - the variable does not exist at all
 * - it belongs to a node that is not wired above this one
 * - it points at a field the node does not produce
 */
export function auditWorkflowVariables(workflow: Workflow): VariableIssue[] {
  const issues: VariableIssue[] = [];
  const nodeByKey = new Map<string, WorkflowNode>();

  for (const node of workflow.nodes) {
    nodeByKey.set(createVariableKey(node), node);
  }

  /**
   * Loop variables only exist while the body runs, so every name a loop
   * introduces is tracked to give a precise message elsewhere.
   */
  const loopVariableOwners = new Map<string, WorkflowNode>();

  for (const node of workflow.nodes) {
    if (node.type !== "loop") {
      continue;
    }

    const { itemName, indexName } = readLoopVariableNames(node);

    loopVariableOwners.set(itemName, node);
    loopVariableOwners.set(indexName, node);
    loopVariableOwners.set(`${itemName}Count`, node);
  }

  for (const node of workflow.nodes) {
    const references = collectNodeReferences(node);

    if (!references.length) {
      continue;
    }

    const ancestors = collectAncestorIds(workflow, node.id);
    const exposedBodyIds = getExposedLoopBodyIds(workflow, node.id);
    const loopNode = findNearestLoopNode(workflow, node.id);
    const loopNames = loopNode ? readLoopVariableNames(loopNode) : null;

    /**
     * Output fields reachable from this node.
     */
    const reachableFields = new Map<string, boolean>();

    for (const candidate of workflow.nodes) {
      if (!ancestors.has(candidate.id) && !exposedBodyIds.has(candidate.id)) {
        continue;
      }

      const key = createVariableKey(candidate);

      for (const field of getNodeOutputFields(candidate)) {
        reachableFields.set(`${key}.${field.name}`, field.dynamic);
      }
    }

    for (const reference of references) {
      /**
       * Loop item and index variables live in the iteration scope rather
       * than in a node output.
       */
      if (loopNames && reference.key === loopNames.itemName) {
        continue;
      }

      if (
        loopNames &&
        (reference.key === loopNames.indexName ||
          reference.key === `${loopNames.itemName}Count`)
      ) {
        continue;
      }

      const ownerNode = nodeByKey.get(reference.key);

      if (!ownerNode) {
        const loopOwner = loopVariableOwners.get(reference.key);

        issues.push({
          code: loopOwner ? "loop-variable-outside" : "unknown-variable",
          message: loopOwner
            ? `${reference.nodeLabel} uses ${reference.raw}, but that only exists inside the ${loopOwner.data.label} body. Connect this node to its Body handle.`
            : `${reference.nodeLabel} uses ${reference.raw}, but no node provides "${reference.key}".`,
          nodeId: node.id,
          reference: reference.raw,
        });

        continue;
      }

      if (!ancestors.has(ownerNode.id) && !exposedBodyIds.has(ownerNode.id)) {
        issues.push({
          code: "not-connected",
          message: `${reference.nodeLabel} uses ${reference.raw}, but ${ownerNode.data.label} is not connected above it.`,
          nodeId: node.id,
          reference: reference.raw,
        });

        continue;
      }

      if (!reference.path.length) {
        continue;
      }

      /**
       * Dynamic outputs can hold any shape, so only the first segment is
       * checked here. Missing segments are reported because the node
       * definitely does not produce them.
       */
      const fieldKey = `${createVariableKey(ownerNode)}.${reference.path[0]}`;

      if (!reachableFields.has(fieldKey)) {
        issues.push({
          code: "unknown-field",
          message: `${reference.nodeLabel} uses ${reference.raw}, but ${ownerNode.data.label} has no "${reference.path[0]}" output.`,
          nodeId: node.id,
          reference: reference.raw,
        });
      }
    }
  }

  return issues;
}

/**
 * Every variable expression inside a text, without duplicates.
 */
export function collectReferences(text: string): string[] {
  return Array.from(
    new Set(parseVariables(text).map((variable) => variable.raw)),
  );
}

/**
 * References that the node cannot read.
 *
 * Used for the inline preview next to a field, so the author sees the
 * same problem the pre-run audit would report.
 */
export function findUnresolvedReferences(
  text: string,
  availableKeys: string[],
): string[] {
  const available = new Set(availableKeys);

  return collectReferences(text).filter((reference) => {
    const parsed = parseVariable(reference);

    if (!parsed) {
      return false;
    }

    if (!parsed.path.length) {
      return !available.has(parsed.key);
    }

    return !available.has(`${parsed.key}.${parsed.path[0]}`);
  });
}

/**
 * Names used by a loop, for display in the variables panel.
 */
export function getLoopVariableLabels(
  workflow: Workflow,
): { node: WorkflowNode; itemName: string; indexName: string }[] {
  return workflow.nodes
    .filter((node) => node.type === "loop")
    .map((node) => ({ node, ...readLoopVariableNames(node) }));
}