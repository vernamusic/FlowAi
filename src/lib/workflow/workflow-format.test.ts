import { describe, expect, it } from "vitest";

import { createWorkflow } from "@/lib/workflow/create-workflow";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import {
  WORKFLOW_FORMAT_KIND,
  WORKFLOW_FORMAT_VERSION,
  createWorkflowExport,
  readWorkflowImport,
} from "@/lib/workflow/workflow-format";

function validWorkflow() {
  const workflow = createWorkflow("Imported");

  return {
    ...workflow,
    nodes: [
      createWorkflowNode({ type: "manual-trigger", position: { x: 0, y: 0 } }),
      createWorkflowNode({ type: "output", position: { x: 300, y: 0 } }),
    ],
  };
}

describe("createWorkflowExport", () => {
  it("wraps a workflow in a versioned envelope", () => {
    const workflow = validWorkflow();
    const file = createWorkflowExport(workflow, "FlowAI 1.0");

    expect(file).toMatchObject({
      kind: WORKFLOW_FORMAT_KIND,
      version: WORKFLOW_FORMAT_VERSION,
      exportedBy: "FlowAI 1.0",
    });

    expect(file.workflow).toEqual(workflow);
    expect(Number.isNaN(new Date(file.exportedAt).getTime())).toBe(false);
  });
});

describe("readWorkflowImport", () => {
  it("reads a file this build wrote", () => {
    const workflow = validWorkflow();
    const result = readWorkflowImport(createWorkflowExport(workflow));

    expect(result.workflow?.name).toBe("Imported");
    expect(result.workflow?.nodes).toHaveLength(2);
    expect(result.migratedFrom).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("reads a version 1 file, which had no envelope, and says it upgraded", () => {
    const result = readWorkflowImport(validWorkflow());

    expect(result.workflow?.name).toBe("Imported");
    expect(result.migratedFrom).toBe(1);
  });

  it("refuses a file from a newer FlowAI rather than half reading it", () => {
    const result = readWorkflowImport({
      kind: WORKFLOW_FORMAT_KIND,
      version: WORKFLOW_FORMAT_VERSION + 5,
      exportedAt: new Date().toISOString(),
      workflow: validWorkflow(),
    });

    expect(result.workflow).toBeNull();
    expect(result.error).toMatch(/newer FlowAI/);
  });

  it("refuses an envelope that does not say what version it is", () => {
    const result = readWorkflowImport({
      kind: WORKFLOW_FORMAT_KIND,
      workflow: validWorkflow(),
    });

    expect(result.workflow).toBeNull();
    expect(result.error).toMatch(/format version/i);
  });

  it("rejects malformed json shapes", () => {
    expect(readWorkflowImport(null).workflow).toBeNull();
    expect(readWorkflowImport("not json").workflow).toBeNull();
    expect(readWorkflowImport({}).workflow).toBeNull();
    expect(readWorkflowImport({ name: "x" }).workflow).toBeNull();
    expect(
      readWorkflowImport({ name: "x", nodes: "no", edges: [] }).workflow,
    ).toBeNull();
  });

  it("rejects a node type this build does not have", () => {
    const workflow = validWorkflow();
    const result = readWorkflowImport({
      ...workflow,
      nodes: [{ ...workflow.nodes[0], type: "teleporter" }],
    });

    expect(result.workflow).toBeNull();
    expect(result.error).toMatch(/node this build does not have/i);
  });

  it("accepts every node type the editor can place", () => {
    /**
     * This list used to live in validation as a copy of the node types,
     * which meant importing a workflow with any newer node failed
     * without saying why. It is now checked against the registry.
     */
    const workflow = validWorkflow();

    const withEveryNode = {
      ...workflow,
      nodes: [
        createWorkflowNode({ type: "page-load-trigger", position: { x: 0, y: 0 } }),
        createWorkflowNode({ type: "interval-trigger", position: { x: 0, y: 0 } }),
        createWorkflowNode({ type: "switch", position: { x: 0, y: 0 } }),
        createWorkflowNode({ type: "merge", position: { x: 0, y: 0 } }),
        createWorkflowNode({ type: "math", position: { x: 0, y: 0 } }),
        createWorkflowNode({ type: "text", position: { x: 0, y: 0 } }),
      ],
    };

    expect(readWorkflowImport(withEveryNode).workflow?.nodes).toHaveLength(6);
  });

  it("rejects nodes and edges with a broken shape", () => {
    const workflow = validWorkflow();

    expect(
      readWorkflowImport({ ...workflow, nodes: [{ id: "n1", type: "output" }] })
        .workflow,
    ).toBeNull();

    expect(
      readWorkflowImport({ ...workflow, edges: [{ id: "e1", source: "n1" }] })
        .workflow,
    ).toBeNull();
  });

  it("fills in what an older file left out", () => {
    const result = readWorkflowImport({ name: "  ", nodes: [], edges: [] });

    expect(result.workflow?.name).toBe("Imported Workflow");
    expect(result.workflow?.status).toBe("draft");
    expect(result.workflow?.id).toBeTruthy();
    expect(result.workflow?.createdAt).toBeTruthy();
  });

  it("fills in the per-node outputs an older file did not have", () => {
    const workflow = validWorkflow();

    const stripped = {
      ...workflow,
      nodes: workflow.nodes.map(({ data, ...node }) => {
        const { outputs: _outputs, ...rest } = data;

        void _outputs;

        return { ...node, data: rest };
      }),
    };

    const result = readWorkflowImport(stripped);

    expect(result.workflow?.nodes.every((node) => Array.isArray(node.data.outputs))).toBe(
      true,
    );
  });

  it("gives an imported workflow a fresh modified time", () => {
    const workflow = validWorkflow();
    const stale = new Date("2020-01-01T00:00:00.000Z").toISOString();

    const result = readWorkflowImport({
      ...workflow,
      createdAt: stale,
      updatedAt: stale,
    });

    expect(result.workflow?.createdAt).toBe(stale);
    expect(result.workflow?.updatedAt).not.toBe(stale);
  });
});