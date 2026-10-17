import { describe, expect, it } from "vitest";

import { createWorkflow } from "@/lib/workflow/create-workflow";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { executeWorkflow } from "@/lib/workflow/execution/execution-engine";
import { switchHandle } from "@/lib/workflow/execution/nodes/switch";

import type {
  NodeExecutionStatus,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "@/types/workflow";

function node(
  type: WorkflowNode["type"],
  label: string,
  config: Record<string, unknown> = {},
): WorkflowNode {
  return {
    ...createWorkflowNode({ type, position: { x: 0, y: 0 } }),
    data: {
      ...createWorkflowNode({ type, position: { x: 0, y: 0 } }).data,
      label,
      config,
    },
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
  return { ...createWorkflow("Resilience"), nodes, edges };
}

function statusOf(
  execution: { nodes: { nodeId: string; status: NodeExecutionStatus }[] },
  nodeId: string,
) {
  return execution.nodes.find((item) => item.nodeId === nodeId)?.status;
}

function outputOf(
  execution: { nodes: { nodeId: string; output?: Record<string, unknown> }[] },
  nodeId: string,
) {
  return execution.nodes.find((item) => item.nodeId === nodeId)?.output;
}

const triggerConfig = { name: "Amir", email: "amir@example.com", userId: "u1" };

describe("retry", () => {
  it("gives up after the configured attempts and says how many it made", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const parser = node("json-parser", "Parse", {
      input: "{{manual_trigger.name}}",
      path: "a",
      retries: 2,
      retryDelayMs: 0,
    });

    const execution = await executeWorkflow(
      workflow([trigger, parser], [edge(trigger, parser)]),
    );

    expect(execution.status).toBe("error");
    expect(statusOf(execution, parser.id)).toBe("error");
    expect(execution.nodes.find((item) => item.nodeId === parser.id)?.error).toMatch(
      /after 3 attempts/,
    );

    const retries = execution.logs.filter((log) => log.message.includes("retrying"));

    expect(retries).toHaveLength(2);
  });

  it("does not retry a node that worked", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const writer = node("output", "Writer", {
      message: "hello",
      channel: "log",
      retries: 3,
      retryDelayMs: 0,
    });

    const execution = await executeWorkflow(
      workflow([trigger, writer], [edge(trigger, writer)]),
    );

    expect(execution.status).toBe("success");
    expect(
      execution.logs.some((log) => log.message.includes("retrying")),
    ).toBe(false);
  });
});

describe("timeout", () => {
  it("stops a node that takes too long and reports the deadline", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const slow = node("delay", "Slow", {
      durationMs: 5000,
      timeoutMs: 150,
      retries: 0,
    });

    const execution = await executeWorkflow(
      workflow([trigger, slow], [edge(trigger, slow)]),
    );

    expect(statusOf(execution, slow.id)).toBe("error");
    expect(execution.nodes.find((item) => item.nodeId === slow.id)?.error).toMatch(
      /timed out after 150ms/i,
    );
  });

  it("lets a node finish inside its deadline", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const quick = node("delay", "Quick", { durationMs: 50, timeoutMs: 5000 });

    const execution = await executeWorkflow(
      workflow([trigger, quick], [edge(trigger, quick)]),
    );

    expect(statusOf(execution, quick.id)).toBe("success");
  });

  it("ignores a deadline when none is set", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const quick = node("delay", "Quick", { durationMs: 60 });

    const execution = await executeWorkflow(
      workflow([trigger, quick], [edge(trigger, quick)]),
    );

    expect(statusOf(execution, quick.id)).toBe("success");
  });
});

describe("continue on error", () => {
  it("keeps going and lets the run finish", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const parser = node("json-parser", "Parse", {
      input: "{{manual_trigger.name}}",
      path: "a",
      continueOnError: true,
    });
    const writer = node("output", "Writer", { message: "still ran", channel: "log" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, parser, writer],
        [edge(trigger, parser), edge(parser, writer)],
      ),
    );

    expect(statusOf(execution, parser.id)).toBe("error");
    expect(statusOf(execution, writer.id)).toBe("success");
    expect(execution.status).toBe("success");
  });

  it("passes the error downstream so a later node can see it", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const parser = node("json-parser", "Parse", {
      input: "{{manual_trigger.name}}",
      path: "a",
      continueOnError: true,
    });
    const writer = node("output", "Writer", {
      message: "{{parse.continued}}",
      channel: "log",
    });

    const execution = await executeWorkflow(
      workflow(
        [trigger, parser, writer],
        [edge(trigger, parser), edge(parser, writer)],
      ),
    );

    expect(outputOf(execution, parser.id)).toMatchObject({ continued: true });
    expect(String(outputOf(execution, writer.id)?.message)).toBe("true");
  });

  it("says the run finished with continued errors", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const parser = node("json-parser", "Parse", {
      input: "{{manual_trigger.name}}",
      path: "a",
      continueOnError: true,
    });

    const execution = await executeWorkflow(
      workflow([trigger, parser], [edge(trigger, parser)]),
    );

    const final = execution.logs[execution.logs.length - 1];

    expect(final.message).toMatch(/completed with 1 continued error/);
  });

  it("still stops the run when the setting is off", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const parser = node("json-parser", "Parse", {
      input: "{{manual_trigger.name}}",
      path: "a",
    });
    const writer = node("output", "Writer", { message: "never", channel: "log" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, parser, writer],
        [edge(trigger, parser), edge(parser, writer)],
      ),
    );

    expect(execution.status).toBe("error");
    expect(statusOf(execution, writer.id)).toBe("pending");
  });
});

describe("merge", () => {
  it("joins what two branches produced", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const left = node("transform", "Left", { name: "left", value: "one", valueType: "string" });
    const right = node("transform", "Right", { name: "right", value: "two", valueType: "string" });
    const merge = node("merge", "Merge", { mode: "combine" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, left, right, merge],
        [edge(trigger, left), edge(trigger, right), edge(left, merge), edge(right, merge)],
      ),
    );

    expect(execution.status).toBe("success");
    expect(outputOf(execution, merge.id)).toMatchObject({
      left: "one",
      right: "two",
      sources: 2,
    });
  });

  it("collects each branch as its own item", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const left = node("transform", "Left", { name: "left", value: "one", valueType: "string" });
    const right = node("transform", "Right", { name: "right", value: "two", valueType: "string" });
    const merge = node("merge", "Merge", { mode: "collect" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, left, right, merge],
        [edge(trigger, left), edge(trigger, right), edge(left, merge), edge(right, merge)],
      ),
    );

    expect(outputOf(execution, merge.id)).toMatchObject({ count: 2 });
    expect((outputOf(execution, merge.id)?.items as unknown[]).length).toBe(2);
  });

  it("runs with what arrived when a branch was not taken", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const condition = node("condition", "Split", {
      leftOperand: "{{manual_trigger.name}}",
      operator: "equals",
      rightOperand: "Amir",
    });
    const taken = node("transform", "Taken", { name: "left", value: "one", valueType: "string" });
    const skipped = node("transform", "Skipped", { name: "right", value: "two", valueType: "string" });
    const merge = node("merge", "Merge", { mode: "combine" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, condition, taken, skipped, merge],
        [
          edge(trigger, condition),
          edge(condition, taken, "true"),
          edge(condition, skipped, "false"),
          edge(taken, merge),
          edge(skipped, merge),
        ],
      ),
    );

    /**
     * The engine waits for every parent, so a merge after a branch that
     * never ran would wait for ever. It runs with what did arrive.
     */
    expect(execution.status).toBe("success");
    expect(outputOf(execution, merge.id)).toMatchObject({
      left: "one",
      sources: 1,
    });
  });
});

describe("switch", () => {
  const switchConfig = {
    rules: [
      { handle: switchHandle(0), label: "Positive", leftOperand: "{{manual_trigger.name}}", operator: "contains", rightOperand: "A" },
      { handle: switchHandle(1), label: "Anything", leftOperand: "{{manual_trigger.name}}", operator: "is_not_empty", rightOperand: "" },
    ],
  };

  it("runs only the matching case", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const router = node("switch", "Router", switchConfig);
    const first = node("output", "First", { message: "case one", channel: "log" });
    const second = node("output", "Second", { message: "case two", channel: "log" });
    const fallback = node("output", "Fallback", { message: "default", channel: "log" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, router, first, second, fallback],
        [
          edge(trigger, router),
          edge(router, first, switchHandle(0)),
          edge(router, second, switchHandle(1)),
          edge(router, fallback, "default"),
        ],
      ),
    );

    expect(execution.status).toBe("success");
    expect(statusOf(execution, first.id)).toBe("success");
    expect(statusOf(execution, second.id)).toBe("skipped");
    expect(statusOf(execution, fallback.id)).toBe("skipped");
    expect(outputOf(execution, router.id)).toMatchObject({
      matched: switchHandle(0),
      label: "Positive",
    });
  });

  it("falls through to the default branch", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", {
      name: "Zoe",
      email: "z@example.com",
      userId: "u2",
    });
    const router = node("switch", "Router", {
      rules: [
        { handle: switchHandle(0), label: "Contains A", leftOperand: "{{manual_trigger.name}}", operator: "contains", rightOperand: "A" },
      ],
    });
    const fallback = node("output", "Fallback", { message: "default", channel: "log" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, router, fallback],
        [edge(trigger, router), edge(router, fallback, "default")],
      ),
    );

    expect(outputOf(execution, router.id)).toMatchObject({
      matched: "default",
      matchedRule: false,
    });
    expect(statusOf(execution, fallback.id)).toBe("success");
  });
});

describe("math and text", () => {
  it("calculates and names the result", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const total = node("math", "Total", {
      expression: "(120 * 0.2) + round(4.6)",
      name: "total",
    });

    const execution = await executeWorkflow(
      workflow([trigger, total], [edge(trigger, total)]),
    );

    expect(outputOf(execution, total.id)).toMatchObject({ total: 29, result: 29 });
  });

  it("fails the node when the formula cannot be read", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const broken = node("math", "Broken", { expression: "2 +" });

    const execution = await executeWorkflow(
      workflow([trigger, broken], [edge(trigger, broken)]),
    );

    expect(statusOf(execution, broken.id)).toBe("error");
  });

  it("shapes text", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const slugs = node("text", "Slug", { operation: "slug", name: "slug" });

    const execution = await executeWorkflow(
      workflow([trigger, slugs], [edge(trigger, slugs)]),
    );

    expect(outputOf(execution, slugs.id)).toMatchObject({
      slug: "amir",
      text: "amir",
    });
  });
});

describe("scheduled triggers", () => {
  it("runs a page load trigger like any other start", async () => {
    const trigger = node("page-load-trigger", "Page Load");
    const writer = node("output", "Writer", { message: "ran", channel: "log" });

    const execution = await executeWorkflow(
      workflow([trigger, writer], [edge(trigger, writer)]),
    );

    expect(execution.status).toBe("success");
    expect(outputOf(execution, trigger.id)).toMatchObject({ trigger: "page-load" });
  });

  it("reports the interval it was configured with", async () => {
    const trigger = node("interval-trigger", "Every 5 minutes", {
      intervalMinutes: 5,
      mode: "live",
    });

    const execution = await executeWorkflow(workflow([trigger]));

    expect(outputOf(execution, trigger.id)).toMatchObject({
      trigger: "interval",
      intervalMinutes: 5,
      mode: "live",
    });
  });
});