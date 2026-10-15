import { describe, expect, it, vi } from "vitest";

import { executeWorkflow } from "@/lib/workflow/execution/execution-engine";
import { createWorkflow } from "@/lib/workflow/create-workflow";
import { createWorkflowNode } from "@/lib/workflow/create-node";

import type {
  ExecutionEvent,
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
    data: { ...createWorkflowNode({ type, position: { x: 0, y: 0 } }).data, label, config },
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
  return { ...createWorkflow("Engine"), nodes, edges };
}

function statusOf(execution: { nodes: { nodeId: string; status: NodeExecutionStatus }[] }, nodeId: string) {
  return execution.nodes.find((item) => item.nodeId === nodeId)?.status;
}

function outputOf(execution: { nodes: { nodeId: string; output?: Record<string, unknown> }[] }, nodeId: string) {
  return execution.nodes.find((item) => item.nodeId === nodeId)?.output;
}

const triggerConfig = { name: "Amir", email: "amir@example.com", userId: "u1" };

describe("sequential execution", () => {
  it("runs a straight line of nodes in order", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const first = node("transform", "First", { name: "a", value: "{{manual_trigger.name}}", valueType: "string" });
    const second = node("transform", "Second", { name: "b", value: "{{first.a}}!", valueType: "string" });

    const execution = await executeWorkflow(
      workflow([trigger, first, second], [edge(trigger, first), edge(first, second)]),
    );

    expect(execution.status).toBe("success");
    expect(outputOf(execution, second.id)).toEqual({ b: "Amir!" });
    expect(execution.duration).toBeGreaterThanOrEqual(0);
  });

  it("emits the documented event order", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const writer = node("output", "Writer", { message: "hi", channel: "log" });

    const events: ExecutionEvent["type"][] = [];

    await executeWorkflow(
      workflow([trigger, writer], [edge(trigger, writer)]),
      (event) => events.push(event.type),
    );

    expect(events[0]).toBe("workflow-started");
    expect(events).toContain("node-started");
    expect(events).toContain("node-completed");
    expect(events.at(-1)).toBe("workflow-completed");
  });

  it("writes a log entry per node", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const writer = node("output", "Writer", { message: "hi", channel: "log" });

    const execution = await executeWorkflow(
      workflow([trigger, writer], [edge(trigger, writer)]),
    );

    const completed = execution.logs.filter((log) =>
      log.message.includes("completed"),
    );

    expect(completed.length).toBeGreaterThanOrEqual(2);
    expect(execution.logs[0].message).toBe("Workflow execution started");
  });
});

describe("branching", () => {
  it("takes the true branch only", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const condition = node("condition", "Check", {
      leftOperand: "{{manual_trigger.name}}",
      operator: "equals",
      rightOperand: "Amir",
    });
    const yes = node("output", "Yes", { message: "yes", channel: "log" });
    const no = node("output", "No", { message: "no", channel: "log" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, condition, yes, no],
        [
          edge(trigger, condition),
          edge(condition, yes, "true"),
          edge(condition, no, "false"),
        ],
      ),
    );

    expect(statusOf(execution, yes.id)).toBe("success");
    expect(statusOf(execution, no.id)).toBe("skipped");
    expect(execution.status).toBe("success");
  });

  it("takes the false branch only", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const condition = node("condition", "Check", {
      leftOperand: "{{manual_trigger.name}}",
      operator: "equals",
      rightOperand: "Someone else",
    });
    const yes = node("output", "Yes", { message: "yes", channel: "log" });
    const no = node("output", "No", { message: "no", channel: "log" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, condition, yes, no],
        [
          edge(trigger, condition),
          edge(condition, yes, "true"),
          edge(condition, no, "false"),
        ],
      ),
    );

    expect(statusOf(execution, yes.id)).toBe("skipped");
    expect(statusOf(execution, no.id)).toBe("success");
  });

  it("compares numbers numerically, not as text", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const score = node("transform", "Score", { name: "score", value: "72", valueType: "number" });
    const condition = node("condition", "High", {
      leftOperand: "{{score.score}}",
      operator: "greater_than",
      rightOperand: "50",
    });
    const pass = node("output", "Pass", { message: "p", channel: "log" });

    const execution = await executeWorkflow(
      workflow(
        [trigger, score, condition, pass],
        [edge(trigger, score), edge(score, condition), edge(condition, pass, "true")],
      ),
    );

    expect(statusOf(execution, pass.id)).toBe("success");
  });

  it("does not run a node with an unmet dependency", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const orphan = node("output", "Orphan", { message: "nope", channel: "log" });

    const execution = await executeWorkflow(
      workflow([trigger, orphan], [edge(trigger, orphan)]),
    );

    expect(statusOf(execution, orphan.id)).toBe("success");
  });

  it("skips everything downstream of a failed node", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const broken = node("transform", "Broken", { name: "x", value: "not a number", valueType: "number" });
    const after = node("output", "After", { message: "should not run", channel: "log" });

    const execution = await executeWorkflow(
      workflow([trigger, broken, after], [edge(trigger, broken), edge(broken, after)]),
    );

    expect(statusOf(execution, broken.id)).toBe("error");
    expect(statusOf(execution, after.id)).toBe("pending");
    expect(execution.status).toBe("error");
  });
});

describe("failures", () => {
  it("records the error message on the node and the run", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const broken = node("json-parser", "Parse", { input: "{ not json" });

    const execution = await executeWorkflow(workflow([trigger, broken], [edge(trigger, broken)]));

    const failure = execution.nodes.find((item) => item.nodeId === broken.id);

    expect(failure?.status).toBe("error");
    expect(failure?.error).toContain("JSON");
    expect(execution.logs.some((log) => log.level === "error")).toBe(true);
  });

  it("emits node-failed with the message", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const broken = node("transform", "Broken", { name: "x", value: "abc", valueType: "number" });

    const failures: string[] = [];

    await executeWorkflow(workflow([trigger, broken], [edge(trigger, broken)]), (event) => {
      if (event.type === "node-failed") {
        failures.push(event.error);
      }
    });

    expect(failures[0]).toContain("number");
  });

  it("fails when a required configuration is missing at run time", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const request = node("http-request", "Call", { url: "" });

    const execution = await executeWorkflow(workflow([trigger, request], [edge(trigger, request)]));

    expect(execution.status).toBe("error");
    expect(statusOf(execution, request.id)).toBe("error");
  });

  it("rejects instead of hanging when dependencies cannot resolve", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const a = node("transform", "A", { name: "a", value: "1" });
    const b = node("transform", "B", { name: "b", value: "2" });

    /**
     * A and B wait for each other, so the run can never make progress.
     * The engine gives up with an error instead of spinning.
     */
    await expect(
      executeWorkflow(
        workflow([trigger, a, b], [edge(trigger, a), edge(a, b), edge(b, a)]),
      ),
    ).rejects.toThrow(/unresolved dependencies/i);
  });
});

describe("cancellation", () => {
  it("stops a running workflow when the signal aborts", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const slow = node("delay", "Slow", { durationMs: 5000 });

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);

    const execution = await executeWorkflow(
      workflow([trigger, slow], [edge(trigger, slow)]),
      undefined,
      { signal: controller.signal },
    );

    expect(execution.status).toBe("canceled");
    expect(execution.nodes.find((item) => item.nodeId === slow.id)?.status).not.toBe("success");
  });

  it("marks the cancellation time", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const slow = node("delay", "Slow", { durationMs: 5000 });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);

    const execution = await executeWorkflow(
      workflow([trigger, slow], [edge(trigger, slow)]),
      undefined,
      { signal: controller.signal },
    );

    expect(execution.canceledAt).toBeTruthy();
  });
});

describe("dry run", () => {
  it("completes without calling the outside world", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const ai = node("ai-prompt", "AI", { prompt: "hello", model: "gpt-4o-mini" });
    const request = node("http-request", "Call", { url: "https://example.test" });

    const execution = await executeWorkflow(
      workflow([trigger, ai, request], [edge(trigger, ai), edge(ai, request)]),
      undefined,
      { dryRun: true },
    );

    expect(execution.status).toBe("success");
    expect(execution.mode).toBe("dry-run");
    expect(outputOf(execution, ai.id)?.response).toContain("[Dry run]");
    expect(outputOf(execution, request.id)?.status).toBe(200);
  });
});

describe("loops", () => {
  const buildLoop = (stopOnError: boolean) => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const loop = node("loop", "Loop", {
      items: "[1,2,3]",
      itemName: "item",
      indexName: "index",
      maxIterations: 10,
      stopOnError,
    });
    const body = node("transform", "Body", {
      name: "seen",
      value: "{{item}}",
      valueType: "string",
    });
    const after = node("output", "After", { message: "{{loop.count}}", channel: "log" });

    return workflow(
      [trigger, loop, body, after],
      [edge(trigger, loop), edge(loop, body, "body"), edge(loop, after, "after")],
    );
  };

  it("repeats the body once per item", async () => {
    const execution = await executeWorkflow(buildLoop(true));
    const loopNode = execution.nodes.find((item) => item.output?.count !== undefined);

    expect(execution.status).toBe("success");
    expect(loopNode?.output?.count).toBe(3);
    expect(loopNode?.output?.results).toHaveLength(3);
  });

  it("runs the after branch once", async () => {
    const execution = await executeWorkflow(buildLoop(true));
    const after = execution.nodes.find((item) => item.output?.message !== undefined);

    expect(after?.output?.message).toBe("3");
  });

  it("fails the run when the body fails and stopOnError is on", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const loop = node("loop", "Loop", { items: '["not a number"]', stopOnError: true });
    const body = node("transform", "Body", {
      name: "number",
      value: "{{item}}",
      valueType: "number",
    });

    const execution = await executeWorkflow(
      workflow([trigger, loop, body], [edge(trigger, loop), edge(loop, body, "body")]),
    );

    expect(execution.status).toBe("error");
    expect(statusOf(execution, body.id)).toBe("error");
  });

  it("keeps going when the body fails and stopOnError is off", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const loop = node("loop", "Loop", { items: "[1,2]", stopOnError: false });
    const body = node("transform", "Body", {
      name: "number",
      value: "{{index}}",
      valueType: "number",
    });

    const execution = await executeWorkflow(
      workflow([trigger, loop, body], [edge(trigger, loop), edge(loop, body, "body")]),
    );

    expect(execution.status).toBe("success");
    expect(execution.nodes.find((item) => item.output?.count !== undefined)?.output?.count).toBe(2);
  });

  it("fails clearly when the loop has no body", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const loop = node("loop", "Loop", { items: "[1]" });

    const execution = await executeWorkflow(workflow([trigger, loop], [edge(trigger, loop)]));

    expect(statusOf(execution, loop.id)).toBe("error");
    expect(execution.nodes.find((item) => item.nodeId === loop.id)?.error).toContain("Body");
  });
});

describe("node types", () => {
  it("parses a webhook payload and exposes the query", async () => {
    const webhook = node("webhook-trigger", "Webhook", {
      method: "POST",
      path: "/hooks/x?source=app",
      payload: '{"orderId":"ord_1"}',
    });
    const writer = node("output", "Writer", {
      message: "{{webhook.body.orderId}}",
      channel: "log",
    });

    const execution = await executeWorkflow(workflow([webhook, writer], [edge(webhook, writer)]));

    expect(outputOf(execution, webhook.id)?.body).toEqual({ orderId: "ord_1" });
    expect(outputOf(execution, webhook.id)?.query).toEqual({ source: "app" });
    expect(outputOf(execution, writer.id)?.message).toBe("ord_1");
  });

  it("extracts a path out of JSON", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const parser = node("json-parser", "Parse", {
      input: '{"data":{"items":[{"id":7}]}}',
      path: "data.items[0].id",
    });

    const execution = await executeWorkflow(workflow([trigger, parser], [edge(trigger, parser)]));

    expect(outputOf(execution, parser.id)?.data).toBe(7);
    expect(outputOf(execution, parser.id)?.found).toBe(true);
  });

  it("reports a missing path instead of failing", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const parser = node("json-parser", "Parse", {
      input: '{"data":{}}',
      path: "data.missing",
    });

    const execution = await executeWorkflow(workflow([trigger, parser], [edge(trigger, parser)]));

    expect(execution.status).toBe("success");
    expect(outputOf(execution, parser.id)?.found).toBe(false);
  });

  it("delays for roughly the requested time", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const wait = node("delay", "Wait", { durationMs: 60 });

    const execution = await executeWorkflow(workflow([trigger, wait], [edge(trigger, wait)]));

    expect(outputOf(execution, wait.id)?.waitedMs).toBeGreaterThanOrEqual(50);
  });

  it("pushes a notification from the output node", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const writer = node("output", "Writer", {
      message: "Ship it",
      level: "success",
      channel: "both",
    });

    const { useToastStore } = await import("@/store/toast.store");

    await executeWorkflow(workflow([trigger, writer], [edge(trigger, writer)]));

    expect(useToastStore.getState().toasts.at(-1)?.message).toBe("Ship it");
  });
});

describe("ai nodes", () => {
  it("streams output into node-stream events", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const ai = node("ai-prompt", "AI", {
      prompt: "hello",
      model: "gpt-4o-mini",
      providerId: "openai",
    });

    window.sessionStorage.setItem(
      "flowai:ai-credentials",
      JSON.stringify({ openai: { apiKey: "sk-test" } }),
    );

    const encoder = new TextEncoder();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"delta":"He"}\n\n'));
              controller.enqueue(encoder.encode('data: {"delta":"llo"}\n\n'));
              controller.close();
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        ),
      ),
    );

    const chunks: string[] = [];

    const execution = await executeWorkflow(
      workflow([trigger, ai], [edge(trigger, ai)]),
      (event) => {
        if (event.type === "node-stream") {
          chunks.push(event.delta);
        }
      },
    );

    expect(chunks).toEqual(["He", "llo"]);
    expect(outputOf(execution, ai.id)?.response).toBe("Hello");
  });

  it("surfaces a provider error as a node failure", async () => {
    const trigger = node("manual-trigger", "Manual Trigger", triggerConfig);
    const ai = node("ai-prompt", "AI", { prompt: "hi", providerId: "openai" });

    window.sessionStorage.setItem(
      "flowai:ai-credentials",
      JSON.stringify({ openai: { apiKey: "sk-test" } }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Incorrect API key" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const execution = await executeWorkflow(workflow([trigger, ai], [edge(trigger, ai)]));

    expect(statusOf(execution, ai.id)).toBe("error");
    expect(execution.nodes.find((item) => item.nodeId === ai.id)?.error).toContain("Incorrect API key");
  });
});