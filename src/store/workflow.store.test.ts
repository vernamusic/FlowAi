import { beforeEach, describe, expect, it } from "vitest";

import { createWorkflow } from "@/lib/workflow/create-workflow";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { useWorkflowStore } from "@/store/workflow.store";

import type { Workflow } from "@/types/workflow";

function workflowWithOneNode(): Workflow {
  const workflow = createWorkflow("Dragging");

  return {
    ...workflow,
    nodes: [
      createWorkflowNode({ type: "manual-trigger", position: { x: 0, y: 0 } }),
    ],
  };
}

beforeEach(() => {
  useWorkflowStore.getState().resetWorkflow();
});

describe("node dragging", () => {
  it("moves the node", () => {
    const workflow = workflowWithOneNode();
    const nodeId = workflow.nodes[0].id;

    useWorkflowStore.getState().setWorkflow(workflow);
    useWorkflowStore.getState().updateNodePosition(nodeId, { x: 96, y: 48 });

    expect(
      useWorkflowStore.getState().workflow?.nodes[0].position,
    ).toEqual({ x: 96, y: 48 });
  });

  it("records one undo step for a whole drag, not one per movement", () => {
    const workflow = workflowWithOneNode();
    const nodeId = workflow.nodes[0].id;

    useWorkflowStore.getState().setWorkflow(workflow);

    useWorkflowStore.getState().beginNodeDrag();

    for (let step = 1; step <= 30; step += 1) {
      useWorkflowStore.getState().updateNodePosition(nodeId, {
        x: step * 10,
        y: step * 5,
      });
    }

    expect(useWorkflowStore.getState().historyPast).toHaveLength(0);

    useWorkflowStore.getState().endNodeDrag();

    expect(useWorkflowStore.getState().historyPast).toHaveLength(1);

    useWorkflowStore.getState().undo();

    expect(
      useWorkflowStore.getState().workflow?.nodes[0].position,
    ).toEqual({ x: 0, y: 0 });
  });

  it("does not add history for a drag that never moved", () => {
    const workflow = workflowWithOneNode();
    const nodeId = workflow.nodes[0].id;

    useWorkflowStore.getState().setWorkflow(workflow);

    /**
     * A click is a drag that starts and ends in the same place, and it
     * should not cost the user an undo press.
     */
    useWorkflowStore.getState().beginNodeDrag();
    useWorkflowStore.getState().updateNodePosition(nodeId, { x: 0, y: 0 });
    useWorkflowStore.getState().endNodeDrag();

    expect(useWorkflowStore.getState().historyPast).toHaveLength(0);
  });

  it("drops the redo trail once a moved drag ends", () => {
    const workflow = workflowWithOneNode();

    useWorkflowStore.getState().setWorkflow(workflow);
    useWorkflowStore.getState().addNode(
      createWorkflowNode({ type: "output", position: { x: 10, y: 10 } }),
    );

    useWorkflowStore.getState().undo();
    expect(useWorkflowStore.getState().historyFuture).toHaveLength(1);

    useWorkflowStore.getState().beginNodeDrag();
    useWorkflowStore.getState().updateNodePosition(workflow.nodes[0].id, {
      x: 32,
      y: 32,
    });
    useWorkflowStore.getState().endNodeDrag();

    expect(useWorkflowStore.getState().historyFuture).toHaveLength(0);
  });
});