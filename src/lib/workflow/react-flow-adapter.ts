import type { Edge, Node } from "@xyflow/react";

import type {
  NodeExecutionStatus,
  WorkflowEdge,
  WorkflowNode,
} from "@/types/workflow";

export function workflowNodeToReactFlowNode(
  node: WorkflowNode,
  executionStatus?: NodeExecutionStatus,
): Node {
  return {
    id: node.id,

    type: "workflowNode",

    position: {
      x: node.position.x,
      y: node.position.y,
    },

    data: {
      ...node.data,

      /**
       * The node card needs the type to decide which handles to draw.
       */
      type: node.type,

      executionStatus: executionStatus ?? "pending",
    },
  };
}

export function workflowEdgeToReactFlowEdge(edge: WorkflowEdge): Edge {
  return {
    id: edge.id,

    source: edge.source,

    target: edge.target,

    sourceHandle: edge.sourceHandle,

    targetHandle: edge.targetHandle,
  };
}
