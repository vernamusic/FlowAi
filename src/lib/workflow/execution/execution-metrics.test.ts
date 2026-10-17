import { describe, expect, it } from "vitest";

import {
  readExecutionUsage,
  summarizeByDay,
  summarizeByWorkflow,
  summarizeExecution,
  summarizeExecutions,
  summarizeNodeUsage,
  summarizeNodes,
} from "@/lib/workflow/execution/execution-metrics";

import type { WorkflowExecution } from "@/types/workflow";

function aiRun(overrides: Partial<WorkflowExecution> = {}): WorkflowExecution {
  return {
    id: "run-1",
    workflowId: "wf-1",
    workflowName: "Assistant",
    status: "success",
    startedAt: new Date().toISOString(),
    duration: 1200,
    nodes: [
      { nodeId: "n1", status: "success", duration: 900 },
      { nodeId: "n2", status: "success", duration: 100 },
    ],
    logs: [
      {
        id: "log-1",
        executionId: "run-1",
        nodeId: "n1",
        level: "success",
        message: "AI Prompt completed",
        timestamp: new Date().toISOString(),
        details: {
          provider: "OpenAI",
          model: "gpt-4o-mini",
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          usageEstimated: false,
          cost: 0.0002,
        },
      },
    ],
    ...overrides,
  };
}

describe("readExecutionUsage", () => {
  it("sums the tokens and cost recorded on AI nodes", () => {
    const usage = readExecutionUsage(aiRun());

    expect(usage).toMatchObject({
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      cost: 0.0002,
      pricedRuns: 1,
      estimated: false,
    });
  });

  it("reports no cost rather than zero when no run was priced", () => {
    const run = aiRun({
      logs: [
        {
          id: "log-1",
          executionId: "run-1",
          level: "info",
          message: "Workflow execution started",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const usage = readExecutionUsage(run);

    expect(usage.cost).toBeNull();
    expect(usage.totalTokens).toBe(0);
  });

  it("falls back to the sum when a total is missing", () => {
    const run = aiRun({
      logs: [
        {
          id: "log-1",
          executionId: "run-1",
          level: "success",
          message: "AI Prompt completed",
          timestamp: new Date().toISOString(),
          details: { promptTokens: 10, completionTokens: 5 },
        },
      ],
    });

    expect(readExecutionUsage(run).totalTokens).toBe(15);
  });

  it("survives an entry with no details at all", () => {
    const run = aiRun({
      nodes: [],
      logs: [
        {
          id: "log-1",
          executionId: "run-1",
          level: "info",
          message: "Workflow execution started",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    expect(readExecutionUsage(run).totalTokens).toBe(0);
  });

  it("marks usage as estimated when the provider did not report it", () => {
    const run = aiRun({
      logs: [
        {
          id: "log-1",
          executionId: "run-1",
          level: "success",
          message: "AI Prompt completed",
          timestamp: new Date().toISOString(),
          details: { totalTokens: 900, usageEstimated: true, cost: 0.0001 },
        },
      ],
    });

    expect(readExecutionUsage(run).estimated).toBe(true);
  });
});

describe("summarizeExecution", () => {
  it("names a run, counts its nodes and failures", () => {
    const summary = summarizeExecution(
      aiRun({
        nodes: [
          { nodeId: "n1", status: "error" },
          { nodeId: "n2", status: "skipped" },
          { nodeId: "n3", status: "success" },
        ],
      }),
    );

    expect(summary).toMatchObject({
      workflowName: "Assistant",
      nodes: 3,
      failedNodes: 1,
      duration: 1200,
      status: "success",
      mode: "live",
    });
  });

  it("falls back to a readable name for a run with none", () => {
    const summary = summarizeExecution(aiRun({ workflowName: undefined }));

    expect(summary.workflowName).toBe("Untitled Workflow");
  });

  it("treats a run with no mode as live", () => {
    expect(summarizeExecution(aiRun({ mode: undefined })).mode).toBe("live");
  });
});

describe("summarizeExecutions", () => {
  it("adds up runs, statuses, tokens and cost", () => {
    const totals = summarizeExecutions([
      aiRun(),
      aiRun({
        id: "run-2",
        status: "error",
        duration: 800,
        logs: [
          {
            id: "log-2",
            executionId: "run-2",
            level: "success",
            message: "AI Prompt completed",
            timestamp: new Date().toISOString(),
            details: { totalTokens: 300, cost: 0.0001 },
          },
        ],
      }),
      aiRun({ id: "run-3", status: "canceled", duration: 100, logs: [] }),
    ]);

    expect(totals.runs).toBe(3);
    expect(totals.succeeded).toBe(1);
    expect(totals.failed).toBe(1);
    expect(totals.canceled).toBe(1);
    expect(totals.totalTokens).toBe(1800);
    expect(totals.cost).toBeCloseTo(0.0003, 6);
    expect(totals.averageDuration).toBe(700);
  });

  it("is empty, not broken, with no runs", () => {
    const totals = summarizeExecutions([]);

    expect(totals.runs).toBe(0);
    expect(totals.cost).toBeNull();
    expect(totals.averageDuration).toBe(0);
  });
});

describe("summarizeByWorkflow", () => {
  it("groups runs and orders by token use", () => {
    const rows = summarizeByWorkflow([
      aiRun({ id: "run-1", workflowId: "small" }),
      aiRun({
        id: "run-2",
        workflowId: "big",
        workflowName: "Big job",
        logs: [
          {
            id: "log-2",
            executionId: "run-2",
            level: "success",
            message: "AI Prompt completed",
            timestamp: new Date().toISOString(),
            details: { totalTokens: 9000, cost: 0.01 },
          },
        ],
      }),
      aiRun({ id: "run-3", workflowId: "big", workflowName: "Big job" }),
    ]);

    expect(rows.map((row) => row.workflowId)).toEqual(["big", "small"]);
    expect(rows[0].runs).toBe(2);
    expect(rows[0].usage.totalTokens).toBe(10500);
    expect(rows[0].workflowName).toBe("Big job");
  });

  it("keeps the newest stored name for a workflow", () => {
    const rows = summarizeByWorkflow([
      aiRun({ id: "run-1", workflowName: "Old name" }),
      aiRun({ id: "run-2", workflowName: "New name" }),
    ]);

    expect(rows[0].workflowName).toBe("New name");
  });
});

describe("summarizeByDay", () => {
  it("returns one bucket per day, oldest first, including empty days", () => {
    const days = summarizeByDay(
      [aiRun({ startedAt: new Date().toISOString() })],
      5,
    );

    expect(days).toHaveLength(5);
    expect(days[days.length - 1].runs).toBe(1);
    expect(days[days.length - 1].totalTokens).toBe(1500);
    expect(days[0].runs).toBe(0);
  });

  it("ignores runs older than the window", () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);

    const days = summarizeByDay(
      [aiRun({ startedAt: old.toISOString() })],
      3,
    );

    expect(days.every((day) => day.runs === 0)).toBe(true);
  });
});

describe("node helpers", () => {
  it("pairs node runs with their labels", () => {
    const nodes = summarizeNodes(aiRun(), { n1: "Ask the model" });

    expect(nodes[0]).toMatchObject({ label: "Ask the model", status: "success" });
    expect(nodes[1].label).toBe("n2");
  });

  it("lists what each AI node spent", () => {
    const rows = summarizeNodeUsage(aiRun(), { n1: "Ask the model" });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      label: "Ask the model",
      provider: "OpenAI",
      model: "gpt-4o-mini",
      totalTokens: 1500,
      cost: 0.0002,
      estimated: false,
    });
  });
});