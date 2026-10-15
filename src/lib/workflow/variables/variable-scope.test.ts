import { describe, expect, it } from "vitest";

import {
  auditWorkflowVariables,
  collectWorkflowReferences,
  findUnresolvedReferences,
} from "@/lib/workflow/variables/variable-audit";
import {
  getAvailableVariables,
  getWorkflowVariables,
} from "@/lib/workflow/variables/variable-scope";
import { createWorkflow } from "@/lib/workflow/create-workflow";
import { createWorkflowNode } from "@/lib/workflow/create-node";

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

function workflow(nodes: WorkflowNode[], edges: WorkflowEdge[] = []): Workflow {
  return { ...createWorkflow("Scope"), nodes, edges };
}

/**
 * trigger → http → writer, plus a node that is never connected.
 */
function buildGraph() {
  const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
  const request = makeNode("http-request", "Fetch Orders", { url: "https://x.test" });
  const writer = makeNode("output", "Writer", { message: "done" });
  const orphan = makeNode("transform", "Orphan", { name: "orphan", value: "x" }, "logic");

  return {
    workflow: workflow(
      [trigger, request, writer, orphan],
      [edge(trigger, request), edge(request, writer)],
    ),
    trigger,
    request,
    writer,
    orphan,
  };
}

function keys(nodeId: string, target: ReturnType<typeof buildGraph>["workflow"]) {
  return getAvailableVariables(target, nodeId).map((variable) => variable.key);
}

describe("available variables", () => {
  it("exposes outputs of connected upstream nodes", () => {
    const { workflow: target, writer } = buildGraph();

    expect(keys(writer.id, target)).toEqual(
      expect.arrayContaining([
        "manual_trigger.name",
        "manual_trigger.email",
        "fetch_orders.status",
        "fetch_orders.data",
      ]),
    );
  });

  it("hides nodes that are not connected above", () => {
    const { workflow: target, writer } = buildGraph();

    expect(keys(writer.id, target).some((key) => key.startsWith("orphan"))).toBe(false);
  });

  it("hides downstream nodes", () => {
    const { workflow: target, writer } = buildGraph();

    expect(keys(writer.id, target)).not.toContain("writer.message");
  });

  it("follows the graph instead of the node order", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const first = makeNode("transform", "First", { name: "a", value: "1" }, "logic");
    const second = makeNode("transform", "Second", { name: "b", value: "2" }, "logic");

    /**
     * `second` is listed before `first` on purpose: only the connection
     * decides what is available, not the position.
     */
    const target = workflow(
      [trigger, second, first],
      [edge(trigger, first), edge(first, second)],
    );

    const available = getAvailableVariables(target, second.id).map((v) => v.key);

    expect(available).toEqual(
      expect.arrayContaining(["first.a", "manual_trigger.name"]),
    );
    expect(available).not.toContain("second.b");
  });

  it("uses the variable name configured on a transform node", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const setter = makeNode("transform", "Set Name", { name: "greeting", value: "hi" }, "logic");
    const writer = makeNode("output", "Writer", { message: "x" });

    const target = workflow(
      [trigger, setter, writer],
      [edge(trigger, setter), edge(setter, writer)],
    );

    expect(getAvailableVariables(target, writer.id).map((v) => v.key)).toContain(
      "set_name.greeting",
    );
  });

  it("exposes loop variables inside the body only", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const loop = makeNode("loop", "Loop", { items: "[1,2]" }, "logic");
    const body = makeNode("transform", "Body", { name: "b", value: "{{item}}" }, "logic");
    const after = makeNode("transform", "After", { name: "a", value: "x" }, "logic");

    const target = workflow(
      [trigger, loop, body, after],
      [edge(trigger, loop), edge(loop, body, "body"), edge(loop, after, "after")],
    );

    expect(getAvailableVariables(target, body.id).map((v) => v.key)).toEqual(
      expect.arrayContaining(["item", "index", "itemCount"]),
    );
    expect(getAvailableVariables(target, after.id).map((v) => v.key)).not.toContain("item");
  });

  it("lets an after-loop node read body outputs", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const loop = makeNode("loop", "Loop", { items: "[1,2]" }, "logic");
    const body = makeNode("transform", "Body", { name: "b", value: "x" }, "logic");
    const after = makeNode("transform", "After", { name: "a", value: "x" }, "logic");

    const target = workflow(
      [trigger, loop, body, after],
      [edge(trigger, loop), edge(loop, body, "body"), edge(loop, after, "after")],
    );

    expect(getAvailableVariables(target, after.id).map((v) => v.key)).toContain(
      "body.b",
    );
  });

  it("lists every output in the workflow", () => {
    const { workflow: target } = buildGraph();

    expect(getWorkflowVariables(target).map((entry) => entry.key)).toEqual(
      expect.arrayContaining(["manual_trigger.name", "fetch_orders.data"]),
    );
  });
});

describe("reference collection", () => {
  it("finds references in nested config values", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const request = makeNode("http-request", "Fetch", {
      url: "https://x.test/{{manual_trigger.name}}",
      headers: [{ key: "X-Id", value: "{{manual_trigger.userId}}" }],
    });

    const references = collectWorkflowReferences(
      workflow([trigger, request], [edge(trigger, request)]),
    );

    expect(references).toHaveLength(2);
    expect(references.map((item) => item.field)).toEqual(
      expect.arrayContaining(["url", "headers[0].value"]),
    );
  });

  it("finds references inside a JSON parser path", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const parser = makeNode("json-parser", "Parse", { input: "{{manual_trigger.name}}" });

    const references = collectWorkflowReferences(
      workflow([trigger, parser], [edge(trigger, parser)]),
    );

    expect(references[0].field).toBe("input");
  });
});

describe("audit", () => {
  it("reports nothing for a clean workflow", () => {
    const { workflow: target } = buildGraph();

    expect(auditWorkflowVariables(target)).toEqual([]);
  });

  it("flags a reference to a node that is not connected above", () => {
    const { workflow: target, writer } = buildGraph();
    writer.data.config.message = "{{orphan.orphan}}";

    expect(auditWorkflowVariables(target)[0]?.code).toBe("not-connected");
  });

  it("flags a variable that does not exist", () => {
    const { workflow: target, writer } = buildGraph();
    writer.data.config.message = "{{nope.value}}";

    expect(auditWorkflowVariables(target)[0]?.code).toBe("unknown-variable");
  });

  it("flags an output field the node does not produce", () => {
    const { workflow: target, writer } = buildGraph();
    writer.data.config.message = "{{fetch_orders.dta}}";

    expect(auditWorkflowVariables(target)[0]?.code).toBe("unknown-field");
  });

  it("allows deep paths into dynamic outputs", () => {
    const { workflow: target, writer } = buildGraph();
    writer.data.config.message = "{{fetch_orders.data.orders[0].id}}";

    expect(auditWorkflowVariables(target)).toEqual([]);
  });

  it("flags a loop variable used outside the body", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const loop = makeNode("loop", "Loop", { items: "[1,2]" }, "logic");
    const body = makeNode("transform", "Body", { name: "b", value: "x" }, "logic");
    const writer = makeNode("output", "Writer", { message: "{{item}}" });

    const target = workflow(
      [trigger, loop, body, writer],
      [
        edge(trigger, loop),
        edge(loop, body, "body"),
        edge(loop, writer, "after"),
      ],
    );

    expect(auditWorkflowVariables(target)[0]?.code).toBe("loop-variable-outside");
  });

  it("allows loop variables inside the body", () => {
    const trigger = makeNode("manual-trigger", "Manual Trigger", {}, "trigger");
    const loop = makeNode("loop", "Loop", { items: "[1,2]" }, "logic");
    const body = makeNode("transform", "Body", {
      name: "b",
      value: "{{item}} {{index}} {{itemCount}}",
    }, "logic");

    const target = workflow(
      [trigger, loop, body],
      [edge(trigger, loop), edge(loop, body, "body")],
    );

    expect(auditWorkflowVariables(target)).toEqual([]);
  });

  it("does not flag fallbacks", () => {
    const { workflow: target, writer } = buildGraph();
    writer.data.config.message = "{{fetch_orders.data.total ?? 0}}";

    expect(auditWorkflowVariables(target)).toEqual([]);
  });
});

describe("unresolved reference helper", () => {
  it("only reports what is missing", () => {
    const found = findUnresolvedReferences(
      "{{manual_trigger.name}} {{nope.here}} {{fetch_orders.data.items}}",
      ["manual_trigger.name", "fetch_orders.data"],
    );

    expect(found).toEqual(["{{nope.here}}"]);
  });

  it("reports nothing when everything resolves", () => {
    expect(
      findUnresolvedReferences("{{a.b}}", ["a.b"]),
    ).toEqual([]);
  });
});