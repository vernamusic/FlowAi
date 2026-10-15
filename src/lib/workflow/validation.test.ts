import { describe, expect, it } from "vitest";

import {
  parseImportedWorkflow,
  validateConnection,
  validateWorkflow,
} from "@/lib/workflow/validation";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { createWorkflow } from "@/lib/workflow/create-workflow";

import type {
  NodeCategory,
  NodeType,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "@/types/workflow";

function makeNode(
  type: NodeType,
  label: string,
  config: Record<string, unknown> = {},
  category: NodeCategory = "action",
): WorkflowNode {
  return {
    ...createWorkflowNode({ type, position: { x: 0, y: 0 } }),
    data: { label, description: "", category, config },
  };
}

function makeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[] = []): Workflow {
  return {
    ...createWorkflow("Test"),
    nodes,
    edges,
  };
}

function edge(
  source: WorkflowNode,
  target: WorkflowNode,
  sourceHandle?: string,
): WorkflowEdge {
  return {
    id: `e-${source.id}-${target.id}-${sourceHandle ?? "main"}`,
    source: source.id,
    target: target.id,
    sourceHandle,
  };
}

function codes(result: ReturnType<typeof validateWorkflow>) {
  return result.issues.map((issue) => issue.code);
}

describe("workflow level rules", () => {
  it("accepts a valid single trigger workflow", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const writer = makeNode("output", "Writer", { message: "done" });

    expect(validateWorkflow(makeWorkflow([trigger, writer], [edge(trigger, writer)])).valid).toBe(true);
  });

  it("rejects an empty workflow", () => {
    const result = validateWorkflow(makeWorkflow([]));

    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("empty");
  });

  it("rejects a workflow without a trigger", () => {
    const writer = makeNode("output", "Writer", { message: "done" });

    expect(codes(validateWorkflow(makeWorkflow([writer])))).toContain("trigger-count");
  });

  it("rejects a workflow with two triggers", () => {
    const first = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const second = makeNode("webhook-trigger", "Webhook", {}, "trigger");

    expect(codes(validateWorkflow(makeWorkflow([first, second])))).toContain("trigger-count");
  });

  it("accepts a webhook trigger instead of a manual one", () => {
    const webhook = makeNode("webhook-trigger", "Webhook", { payload: "{}" }, "trigger");
    const writer = makeNode("output", "Writer", { message: "done" });

    expect(
      validateWorkflow(makeWorkflow([webhook, writer], [edge(webhook, writer)])).valid,
    ).toBe(true);
  });

  it("rejects a cycle", () => {
    const a = makeNode("transform", "A", { name: "a", value: "1" });
    const b = makeNode("transform", "B", { name: "b", value: "2" });

    const result = validateWorkflow(
      makeWorkflow([a, b], [edge(a, b), edge(b, a)]),
    );

    expect(codes(result)).toContain("cycle");
  });

  it("reports a duplicated connection once", () => {
    const a = makeNode("transform", "A", { name: "a", value: "1" });
    const b = makeNode("transform", "B", { name: "b", value: "2" });

    const duplicate: WorkflowEdge = {
      ...edge(a, b),
      id: "another-id",
    };

    const result = validateWorkflow(makeWorkflow([a, b], [edge(a, b), duplicate]));
    const duplicates = result.issues.filter((issue) => issue.code === "duplicate-edge");

    expect(duplicates).toHaveLength(1);
  });
});

describe("node configuration rules", () => {
  it("requires an AI prompt", () => {
    const result = validateWorkflow(
      makeWorkflow([makeNode("ai-prompt", "AI", {})]),
    );

    expect(codes(result)).toContain("missing-prompt");
  });

  it("requires a valid HTTP url", () => {
    const result = validateWorkflow(
      makeWorkflow([makeNode("http-request", "Call", { url: "not-a-url" })]),
    );

    expect(codes(result)).toContain("invalid-url");
  });

  it("requires a schema for structured output", () => {
    const result = validateWorkflow(
      makeWorkflow([
        makeNode("ai-prompt", "AI", {
          prompt: "hi",
          responseFormat: "schema",
          jsonSchema: "{ broken",
        }),
      ]),
    );

    expect(codes(result)).toContain("invalid-schema");
  });

  it("requires a base url for a custom provider", () => {
    const result = validateWorkflow(
      makeWorkflow([
        makeNode("ai-prompt", "AI", {
          prompt: "hi",
          providerId: "custom",
          baseUrl: "",
        }),
      ]),
    );

    expect(codes(result)).toContain("missing-base-url");
  });

  it("accepts a custom provider with a base url", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const ai = makeNode("ai-prompt", "AI", {
      prompt: "hi",
      providerId: "custom",
      baseUrl: "https://api.example.com/v1",
    });

    const result = validateWorkflow(
      makeWorkflow([trigger, ai], [edge(trigger, ai)]),
    );

    expect(result.valid).toBe(true);
  });

  it("requires a valid variable name on a transform node", () => {
    const result = validateWorkflow(
      makeWorkflow([makeNode("transform", "Set", { name: "9 bad", value: "x" })]),
    );

    expect(codes(result)).toContain("invalid-variable-name");
  });

  it("requires an input on a JSON parser", () => {
    expect(
      codes(validateWorkflow(makeWorkflow([makeNode("json-parser", "Parse", {})]))),
    ).toContain("missing-json-input");
  });

  it("requires items on a loop", () => {
    const result = validateWorkflow(makeWorkflow([makeNode("loop", "Loop", {})]));

    expect(codes(result)).toContain("missing-loop-items");
  });

  it("flags a loop without a body", () => {
    const loop = makeNode("loop", "Loop", { items: "[1]" });

    expect(codes(validateWorkflow(makeWorkflow([loop])))).toContain("empty-loop-body");
  });

  it("rejects a delay outside the allowed range", () => {
    expect(
      codes(validateWorkflow(makeWorkflow([makeNode("delay", "Wait", { durationMs: -5 })]))),
    ).toContain("invalid-delay");
  });

  it("rejects a malformed webhook payload", () => {
    expect(
      codes(
        validateWorkflow(
          makeWorkflow([
            makeNode("webhook-trigger", "Hook", { payload: "{ oops" }, "trigger"),
          ]),
        ),
      ),
    ).toContain("invalid-webhook-payload");
  });

  it("requires both condition branches", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const condition = makeNode("condition", "Check", {
      leftOperand: "{{manual_trigger.name}}",
      operator: "equals",
      rightOperand: "x",
    });
    const yes = makeNode("output", "Yes", { message: "y" });

    const result = validateWorkflow(
      makeWorkflow(
        [trigger, condition, yes],
        [edge(trigger, condition), edge(condition, yes, "true")],
      ),
    );

    expect(codes(result)).toContain("missing-condition-branch");
  });
});

describe("connection rules", () => {
  const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
  const a = makeNode("transform", "A", { name: "a", value: "1" });
  const b = makeNode("transform", "B", { name: "b", value: "2" });
  const workflow = makeWorkflow([trigger, a, b], [edge(trigger, a)]);

  it("rejects a self connection", () => {
    const result = validateConnection(workflow, edge(a, a));

    expect(result.issues.map((issue) => issue.code)).toContain("self-connection");
  });

  it("rejects an incoming connection to a trigger", () => {
    const result = validateConnection(workflow, edge(a, trigger));

    expect(result.issues.map((issue) => issue.code)).toContain("trigger-input");
  });

  it("rejects a condition connection without a branch handle", () => {
    const condition = makeNode("condition", "Check", {
      leftOperand: "{{a.a}}",
      operator: "equals",
      rightOperand: "1",
    });

    const withCondition = makeWorkflow(
      [trigger, a, condition, b],
      [edge(trigger, a)],
    );

    const result = validateConnection(withCondition, edge(condition, b));

    expect(result.issues.map((issue) => issue.code)).toContain("condition-handle");
  });

  it("rejects a handle on a node without branches", () => {
    const result = validateConnection(workflow, edge(a, b, "true"));

    expect(result.issues.map((issue) => issue.code)).toContain("unexpected-handle");
  });

  it("rejects a loop connection without a named handle", () => {
    const loop = makeNode("loop", "Loop", { items: "[1]" });
    const withLoop = makeWorkflow([trigger, a, loop, b], [edge(trigger, a)]);

    const result = validateConnection(withLoop, edge(loop, b));

    expect(result.issues.map((issue) => issue.code)).toContain("loop-handle");
  });

  it("accepts a loop body connection", () => {
    const loop = makeNode("loop", "Loop", { items: "[1]" });
    const withLoop = makeWorkflow([trigger, a, loop, b], [edge(trigger, a)]);

    expect(validateConnection(withLoop, edge(loop, b, "body")).valid).toBe(true);
  });

  it("rejects a second connection on the same condition branch", () => {
    const condition = makeNode("condition", "Check", {
      leftOperand: "{{a.a}}",
      operator: "equals",
      rightOperand: "1",
    });
    const c = makeNode("output", "C", { message: "c" });

    const withBranch = makeWorkflow(
      [trigger, a, condition, b, c],
      [edge(trigger, condition), edge(condition, b, "true")],
    );

    const result = validateConnection(withBranch, edge(condition, c, "true"));

    expect(result.issues.map((issue) => issue.code)).toContain("duplicate-branch");
  });

  it("rejects a duplicate edge", () => {
    const result = validateConnection(workflow, edge(trigger, a));

    expect(result.issues.map((issue) => issue.code)).toContain("duplicate-edge");
  });

  it("rejects a missing node", () => {
    const result = validateConnection(workflow, {
      id: "ghost",
      source: "nope",
      target: a.id,
    });

    expect(result.issues.map((issue) => issue.code)).toContain("missing-node");
  });
});

describe("import parsing", () => {
  const valid = {
    name: "Imported",
    nodes: [
      {
        id: "n1",
        type: "manual-trigger",
        position: { x: 0, y: 0 },
        data: { label: "Manual", description: "", category: "trigger", config: {} },
      },
    ],
    edges: [],
  };

  it("accepts a valid export", () => {
    const parsed = parseImportedWorkflow(valid);

    expect(parsed?.name).toBe("Imported");
    expect(parsed?.nodes).toHaveLength(1);
  });

  it("rejects malformed json shapes", () => {
    expect(parseImportedWorkflow(null)).toBeNull();
    expect(parseImportedWorkflow("not json")).toBeNull();
    expect(parseImportedWorkflow({})).toBeNull();
    expect(parseImportedWorkflow({ name: "x" })).toBeNull();
    expect(parseImportedWorkflow({ name: "x", nodes: "no", edges: [] })).toBeNull();
  });

  it("rejects unknown node types", () => {
    const parsed = parseImportedWorkflow({
      ...valid,
      nodes: [{ ...valid.nodes[0], type: "teleporter" }],
    });

    expect(parsed).toBeNull();
  });

  it("rejects nodes with a broken shape", () => {
    expect(
      parseImportedWorkflow({
        ...valid,
        nodes: [{ id: "n1", type: "manual-trigger" }],
      }),
    ).toBeNull();
  });

  it("rejects edges with a broken shape", () => {
    expect(
      parseImportedWorkflow({
        ...valid,
        edges: [{ id: "e1", source: "n1" }],
      }),
    ).toBeNull();
  });

  it("fills in missing ids and defaults", () => {
    const parsed = parseImportedWorkflow({ name: "  ", nodes: valid.nodes, edges: [] });

    expect(parsed?.name).toBe("Imported Workflow");
    expect(parsed?.status).toBe("draft");
    expect(parsed?.id).toBeTruthy();
  });
});