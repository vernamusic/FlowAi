import type { WorkflowEdge } from "@/types/workflow";

/**
 * The named outputs a node can have.
 *
 * Conditions branch into two, loops into two, and everything else has a
 * single anonymous output. Validation and rendering both read this, so a
 * new branch cannot be added in one place and forgotten in the other.
 */
export const CONDITION_HANDLES = ["true", "false"] as const;
export const LOOP_HANDLES = ["body", "after"] as const;

export const BRANCH_HANDLES = [...CONDITION_HANDLES, ...LOOP_HANDLES] as const;

export type BranchHandle = (typeof BRANCH_HANDLES)[number];

/**
 * How a connection is drawn.
 *
 * A branch carries a colour and a label, so the shape of a workflow is
 * readable without opening a node. Plain connections stay quiet.
 */
export interface EdgePresentation {
  stroke: string;

  /** Shown on the edge itself. Plain connections have no label. */
  label?: string;

  isBranch: boolean;
}

interface BranchStyle {
  stroke: string;
  label: string;
}

const branchStyles: Record<BranchHandle, BranchStyle> = {
  true: { stroke: "#34d399", label: "True" },
  false: { stroke: "#f87171", label: "False" },
  body: { stroke: "#a78bfa", label: "Body" },
  after: { stroke: "#38bdf8", label: "After" },
};

export const defaultEdgeColor = "#52525b";

export function getEdgePresentation(edge: WorkflowEdge): EdgePresentation {
  const handle = edge.sourceHandle;
  const style = handle ? branchStyles[handle as BranchHandle] : undefined;

  /**
   * An unknown handle falls back to a plain edge rather than inventing a
   * colour for it.
   */
  if (!style) {
    return { stroke: defaultEdgeColor, isBranch: false };
  }

  return {
    stroke: style.stroke,
    label: style.label,
    isBranch: true,
  };
}