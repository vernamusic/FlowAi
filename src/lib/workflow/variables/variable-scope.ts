import type {
  Workflow,
  WorkflowNode,
  WorkflowVariable,
} from "@/types/workflow";

import { createVariableKey } from "./variable-context";

/**
 * Every node that can reach the given node, following the graph instead
 * of the order the nodes happen to sit in the array.
 *
 * This is what makes a variable available: a node only sees the outputs
 * of nodes that are actually wired above it.
 */
export function collectAncestorIds(workflow: Workflow, nodeId: string): Set<string> {
  const ancestors = new Set<string>();

  const queue: string[] = workflow.edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId || ancestors.has(currentNodeId)) {
      continue;
    }

    ancestors.add(currentNodeId);

    for (const edge of workflow.edges) {
      if (edge.target === currentNodeId && !ancestors.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }

  return ancestors;
}

/**
 * Nodes that run inside a loop body.
 *
 * The walk starts at the loop's Body handle, so a node connected to its
 * After handle is never treated as part of an iteration.
 */
export function getLoopBodyIds(workflow: Workflow, loopNodeId: string): Set<string> {
  const body = new Set<string>();
  const queue = workflow.edges
    .filter(
      (edge) => edge.source === loopNodeId && edge.sourceHandle === "body",
    )
    .map((edge) => edge.target);

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId || body.has(currentNodeId)) {
      continue;
    }

    body.add(currentNodeId);

    for (const edge of workflow.edges) {
      if (edge.source === currentNodeId) {
        queue.push(edge.target);
      }
    }
  }

  return body;
}

/**
 * Loop the given node runs inside, if any.
 */
export function findNearestLoopNode(
  workflow: Workflow,
  nodeId: string,
): WorkflowNode | null {
  for (const node of workflow.nodes) {
    if (node.type !== "loop") {
      continue;
    }

    if (getLoopBodyIds(workflow, node.id).has(nodeId)) {
      return node;
    }
  }

  return null;
}

export interface LoopVariableNames {
  itemName: string;

  indexName: string;
}

export function readLoopVariableNames(node: WorkflowNode): LoopVariableNames {
  return {
    itemName:
      typeof node.data.config.itemName === "string" &&
      node.data.config.itemName.trim()
        ? node.data.config.itemName.trim()
        : "item",
    indexName:
      typeof node.data.config.indexName === "string" &&
      node.data.config.indexName.trim()
        ? node.data.config.indexName.trim()
        : "index",
  };
}

/**
 * Item variables exposed by a loop to the nodes in its body.
 *
 * They are scoped to the iteration, so they are not nested under a node
 * output key the way regular outputs are.
 */
export function getLoopVariables(
  workflow: Workflow,
  nodeId: string,
): WorkflowVariable[] {
  const loopNode = findNearestLoopNode(workflow, nodeId);

  if (!loopNode) {
    return [];
  }

  const { itemName, indexName } = readLoopVariableNames(loopNode);

  return [
    {
      nodeId: loopNode.id,
      nodeLabel: loopNode.data.label,
      key: itemName,
      path: itemName,
      type: "string",
    },
    {
      nodeId: loopNode.id,
      nodeLabel: loopNode.data.label,
      key: indexName,
      path: indexName,
      type: "number",
    },
    {
      nodeId: loopNode.id,
      nodeLabel: loopNode.data.label,
      key: `${itemName}Count`,
      path: `${itemName}Count`,
      type: "number",
    },
  ];
}

/**
 * Output fields of a node, in the order they are shown in the picker.
 *
 * `dynamic` marks fields whose shape is only known at run time, such as
 * the parsed body of a JSON node.
 */
export interface NodeOutputField {
  name: string;

  type: WorkflowVariable["type"];

  /** True when the real shape depends on the data the node receives. */
  dynamic: boolean;
}

export function getNodeOutputFields(node: WorkflowNode): NodeOutputField[] {
  const config = node.data.config;

  switch (node.type) {
    case "manual-trigger":
      return [
        { name: "name", type: "string", dynamic: false },
        { name: "email", type: "string", dynamic: false },
        { name: "userId", type: "string", dynamic: false },
      ];

    case "webhook-trigger":
      return [
        { name: "body", type: "object", dynamic: true },
        { name: "query", type: "object", dynamic: true },
        { name: "method", type: "string", dynamic: false },
        { name: "url", type: "string", dynamic: false },
        { name: "receivedAt", type: "string", dynamic: false },
      ];

    case "ai-prompt":
      return [
        { name: "response", type: "string", dynamic: false },
        ...(config.responseFormat === "json" ||
        config.responseFormat === "schema"
          ? [{ name: "parsed", type: "object" as const, dynamic: true }]
          : []),
      ];

    case "http-request":
      return [
        { name: "status", type: "number", dynamic: false },
        { name: "success", type: "boolean", dynamic: false },
        { name: "data", type: "object", dynamic: true },
      ];

    case "condition":
      return [{ name: "result", type: "boolean", dynamic: false }];

    case "transform": {
      const name =
        typeof config.name === "string" && config.name.trim()
          ? config.name.trim()
          : "result";
      const valueType =
        typeof config.valueType === "string" ? config.valueType : "string";

      return [
        {
          name,
          type:
            valueType === "number"
              ? "number"
              : valueType === "boolean"
                ? "boolean"
                : valueType === "object" || valueType === "array"
                  ? "object"
                  : "string",
          dynamic: valueType === "object" || valueType === "array",
        },
      ];
    }

    case "json-parser":
      return [
        { name: "data", type: "object", dynamic: true },
        { name: "found", type: "boolean", dynamic: false },
        { name: "type", type: "string", dynamic: false },
      ];

    case "loop":
      return [
        { name: "count", type: "number", dynamic: false },
        { name: "results", type: "object", dynamic: true },
      ];

    case "delay":
      return [{ name: "waitedMs", type: "number", dynamic: false }];

    case "output":
      return [{ name: "message", type: "string", dynamic: false }];

    default:
      return [];
  }
}

/**
 * Every node reachable downstream of the given start nodes.
 */
function collectDescendantIds(
  workflow: Workflow,
  startNodeIds: string[],
): Set<string> {
  const found = new Set<string>();
  const queue: string[] = [];

  for (const startNodeId of startNodeIds) {
    if (!found.has(startNodeId)) {
      found.add(startNodeId);
      queue.push(startNodeId);
    }
  }

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) {
      continue;
    }

    for (const edge of workflow.edges) {
      if (edge.source !== currentNodeId || found.has(edge.target)) {
        continue;
      }

      found.add(edge.target);
      queue.push(edge.target);
    }
  }

  return found;
}

/**
 * Body nodes a node may read after a loop finished.
 *
 * The engine keeps the output of the last iteration, so anything on the
 * loop's After branch, and everything downstream of it, can still read
 * the nodes that ran inside the body.
 */
export function getExposedLoopBodyIds(
  workflow: Workflow,
  nodeId: string,
): Set<string> {
  const exposed = new Set<string>();

  for (const loopNode of workflow.nodes) {
    if (loopNode.type !== "loop") {
      continue;
    }

    const bodyIds = collectDescendantIds(
      workflow,
      workflow.edges
        .filter(
          (edge) =>
            edge.source === loopNode.id && edge.sourceHandle === "body",
        )
        .map((edge) => edge.target),
    );

    const afterIds = collectDescendantIds(
      workflow,
      workflow.edges
        .filter(
          (edge) =>
            edge.source === loopNode.id && edge.sourceHandle === "after",
        )
        .map((edge) => edge.target),
    );

    if (!afterIds.has(nodeId)) {
      continue;
    }

    for (const bodyId of bodyIds) {
      exposed.add(bodyId);
    }
  }

  return exposed;
}

/**
 * A variable together with the node that produces it.
 */
export interface WorkflowVariableEntry extends WorkflowVariable {
  /** True when the real shape is only known at run time. */
  dynamic: boolean;
}

/**
 * Every output variable in the workflow, in canvas order.
 */
export function getWorkflowVariables(
  workflow: Workflow,
): WorkflowVariableEntry[] {
  const entries: WorkflowVariableEntry[] = [];

  for (const node of workflow.nodes) {
    const key = createVariableKey(node);

    for (const field of getNodeOutputFields(node)) {
      entries.push({
        nodeId: node.id,
        nodeLabel: node.data.label,
        key: `${key}.${field.name}`,
        path: field.name,
        type: field.type,
        dynamic: field.dynamic,
      });
    }
  }

  return entries;
}

/**
 * Variables a node can read, based on what is actually connected above it.
 */
export function getAvailableVariables(
  workflow: Workflow,
  nodeId: string,
): WorkflowVariable[] {
  const ancestors = collectAncestorIds(workflow, nodeId);
  const exposedBodyIds = getExposedLoopBodyIds(workflow, nodeId);

  const variables: WorkflowVariable[] = [...getLoopVariables(workflow, nodeId)];

  /**
   * Anything connected above the node, ordered by canvas position so the
   * picker stays predictable regardless of connection order.
   */
  const upstream = workflow.nodes.filter(
    (node) =>
      node.id !== nodeId &&
      (ancestors.has(node.id) || exposedBodyIds.has(node.id)),
  );

  upstream.sort(
    (a, b) => workflow.nodes.indexOf(a) - workflow.nodes.indexOf(b),
  );

  for (const node of upstream) {
    const key = createVariableKey(node);

    for (const field of getNodeOutputFields(node)) {
      variables.push({
        nodeId: node.id,
        nodeLabel: node.data.label,
        key: `${key}.${field.name}`,
        path: field.name,
        type: field.type,
      });
    }
  }

  return variables;
}