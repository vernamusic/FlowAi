import { MarkerType, type BuiltInEdge, type Node } from "@xyflow/react";

import { getEdgePresentation } from "@/constants/edges";

import type {
  NodeExecutionStatus,
  WorkflowEdge,
  WorkflowNode,
} from "@/types/workflow";

export interface EdgeRenderState {
  /** Execution status of the node the edge starts from. */
  sourceStatus?: NodeExecutionStatus;

  isSelected?: boolean;

  isHovered?: boolean;
}

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

/**
 * Turn a workflow edge into something readable.
 *
 * Branch edges are coloured and labelled, plain connections stay quiet,
 * and an edge animates while the node feeding it is running so you can
 * follow the live path through the graph.
 */
export function workflowEdgeToReactFlowEdge(
  edge: WorkflowEdge,
  state: EdgeRenderState = {},
): BuiltInEdge {
  const presentation = getEdgePresentation(edge);
  const isRunning = state.sourceStatus === "running";
  const isActive = isRunning || state.isSelected || state.isHovered;

  return {
    id: edge.id,

    source: edge.source,

    target: edge.target,

    sourceHandle: edge.sourceHandle,

    targetHandle: edge.targetHandle,

    /**
     * Right angles read better than curves for a left to right graph,
     * and they make branch routing obvious.
     */
    type: "smoothstep",

    pathOptions: { borderRadius: 12 },

    animated: isRunning,

    selected: state.isSelected ?? false,

    label: presentation.label,

    labelShowBg: true,

    labelBgPadding: [6, 3],

    labelBgBorderRadius: 6,

    labelBgStyle: {
      fill: "#09090b",
      stroke: presentation.stroke,
      strokeWidth: 1,
      opacity: 0.95,
    },

    labelStyle: {
      fill: presentation.stroke,
      fontSize: 10,
      fontWeight: 600,
    },

    style: {
      stroke: presentation.stroke,
      strokeWidth: isActive ? 3 : 2,
      opacity: isActive ? 1 : 0.85,
    },

    /**
     * Direction, and it matches the branch colour.
     */
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: presentation.stroke,
      width: 18,
      height: 18,
    },

    /**
     * A wide invisible hit area, so a thin line is still easy to hover
     * and click.
     */
    interactionWidth: 24,

    selectable: true,
  };
}