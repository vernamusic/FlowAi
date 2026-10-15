import type {
  ExecutionLog,
  NodeExecution,
  Workflow,
  WorkflowExecution,
  WorkflowNode,
} from "@/types/workflow";
import { createVariableContext, createVariableKey } from "@/lib/workflow/variables/variable-context";
import { executeHttpRequest } from "@/lib/workflow/execution/http-request";
import { readAiConfig } from "@/lib/workflow/execution/ai/config";
import { runAiPrompt } from "@/lib/workflow/execution/ai/run-ai-prompt";
import {
  createLoopVariables,
  readLoopConfig,
  resolveLoopItems,
  type LoopConfig,
} from "@/lib/workflow/execution/nodes/loop";
import {
  executeDelay,
  readDelayConfig,
} from "@/lib/workflow/execution/nodes/delay";
import {
  executeJsonParser,
  readJsonParserConfig,
} from "@/lib/workflow/execution/nodes/json-parser";
import {
  executeOutput,
  readOutputConfig,
} from "@/lib/workflow/execution/nodes/output";
import {
  executeTransform,
  readTransformConfig,
} from "@/lib/workflow/execution/nodes/transform";
import {
  executeWebhookTrigger,
  readWebhookTriggerConfig,
} from "@/lib/workflow/execution/nodes/webhook-trigger";
import { resolveValue } from "@/lib/workflow/variables/variable-resolver";
import type { VariableContext } from "@/lib/workflow/variables/variable-context";
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function evaluateCondition(
  leftOperand: unknown,
  operator: unknown,
  rightOperand: unknown,
): boolean {
  const left = String(leftOperand ?? "");
  const right = String(rightOperand ?? "");

  switch (operator) {
    case "not_equals":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "not_contains":
      return !left.includes(right);
    case "greater_than":
      return Number(left) > Number(right);
    case "less_than":
      return Number(left) < Number(right);
    case "is_empty":
      return left.trim().length === 0;
    case "is_not_empty":
      return left.trim().length > 0;
    case "is_true":
      return left === "true";
    case "is_false":
      return left === "false";
    case "equals":
    default:
      return left === right;
  }
}

/**
 * Create execution log
 */
function createExecutionLog(
  executionId: string,
  level: ExecutionLog["level"],
  message: string,
  nodeId?: string,
): ExecutionLog {
  return {
    id: crypto.randomUUID(),
    executionId,
    nodeId,
    level,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execution events
 */
export type ExecutionEvent =
  | {
      type: "workflow-started";
      execution: WorkflowExecution;
    }
  | {
      type: "node-started";
      nodeId: string;
    }
  | {
      type: "node-completed";
      nodeId: string;
      output: Record<string, unknown>;
    }
  | {
      type: "node-failed";
      nodeId: string;
      error: string;
    }
  | {
      type: "node-skipped";
      nodeId: string;
      reason: string;
    }
  | {
      type: "node-stream";
      nodeId: string;
      delta: string;
      accumulated: string;
    }
  | {
      type: "workflow-completed";
      execution: WorkflowExecution;
    }
  | {
      type: "log";
      log: ExecutionLog;
    };

/**
 * Simulates execution of a single node.
 */
async function executeNode(
  node: WorkflowNode,
  input: Record<string, unknown>,
  options: {
    dryRun?: boolean;
    signal?: AbortSignal;
    onStreamDelta?: (delta: string, accumulated: string) => void;
    runLoop?: (
      node: WorkflowNode,
      config: LoopConfig,
    ) => Promise<Record<string, unknown>>;
  } = {},
): Promise<Record<string, unknown>> {
  void input;

  switch (node.type) {
    case "manual-trigger":
      return {
        name:
          typeof node.data.config.name === "string"
            ? node.data.config.name
            : "Amir",
        email:
          typeof node.data.config.email === "string"
            ? node.data.config.email
            : "amir@example.com",
        userId:
          typeof node.data.config.userId === "string"
            ? node.data.config.userId
            : "user_123",
      };

    case "ai-prompt": {
      const config = readAiConfig(node.data.config);

      if (options.dryRun) {
        return {
          response: `[Dry run] ${config.prompt || "Sample AI response"}`,
          model: config.model,
          provider: "Dry run",
          responseFormat: config.responseFormat,
          streamed: false,
        };
      }

      /**
       * The config was already resolved by the engine, so the prompt and
       * instructions arrive with their variables already substituted.
       */
      return runAiPrompt(config, {
        signal: options.signal,
        onDelta: options.onStreamDelta,
      });
    }

    case "delay":
      return executeDelay(readDelayConfig(node.data.config), options);

    case "transform":
      if (options.dryRun) {
        return {
          [readTransformConfig(node.data.config).name]: "[Dry run] sample value",
        };
      }

      return executeTransform(readTransformConfig(node.data.config));

    case "json-parser":
      if (options.dryRun) {
        return {
          data: { sample: true },
          path: readJsonParserConfig(node.data.config).path,
          found: true,
          type: "object",
          dryRun: true,
        };
      }

      return executeJsonParser(readJsonParserConfig(node.data.config));

    case "webhook-trigger":
      return executeWebhookTrigger(readWebhookTriggerConfig(node.data.config));

    case "output":
      return executeOutput(readOutputConfig(node.data.config), options);

    case "loop": {
      const config = readLoopConfig(node.data.config);

      if (options.dryRun) {
        const count = Math.min(2, estimateDryRunIterations(config.items));

        return {
          count,
          iterations: count,
          results: [],
          dryRun: true,
        };
      }

      /**
       * Iterating a subtree needs the shared execution state, so the
       * runner is provided by `executeWorkflow`.
       */
      if (!options.runLoop) {
        throw new Error("This loop cannot run because it has no workflow context.");
      }

      return options.runLoop(node, config);
    }

    case "http-request": {
      if (options.dryRun) {
        return {
          status: 200,
          statusText: "OK (dry run)",
          success: true,
          headers: { "content-type": "application/json" },
          data: { message: "Sample HTTP response" },
        };
      }
      const result = await executeHttpRequest({
        url:
          typeof node.data.config.url === "string"
            ? node.data.config.url
            : undefined,

        method:
          typeof node.data.config.method === "string"
            ? node.data.config.method
            : "GET",

        headers: Array.isArray(node.data.config.headers)
          ? node.data.config.headers
          : undefined,

        queryParams:
          Array.isArray(node.data.config.queryParams) ||
          (node.data.config.queryParams &&
            typeof node.data.config.queryParams === "object")
            ? (node.data.config.queryParams as
                | { key: string; value: string }[]
                | Record<string, string>)
            : undefined,

        body: node.data.config.body,

        timeout:
          typeof node.data.config.timeout === "number"
            ? node.data.config.timeout
            : 10000,

        authType:
          node.data.config.authType === "bearer" ||
          node.data.config.authType === "basic"
            ? node.data.config.authType
            : "none",

        token:
          typeof node.data.config.token === "string"
            ? node.data.config.token
            : undefined,

        username:
          typeof node.data.config.username === "string"
            ? node.data.config.username
            : undefined,

        password:
          typeof node.data.config.password === "string"
            ? node.data.config.password
            : undefined,

        signal: options.signal,
      });

      return result;
    }
    case "condition":
      return {
        result: evaluateCondition(
          node.data.config.leftOperand,
          node.data.config.operator,
          node.data.config.rightOperand,
        ),
      };

    default:
      return {};
  }
}

/**
 * Find root nodes.
 *
 * A root node has no incoming edge.
 */
function findRootNodes(workflow: Workflow): WorkflowNode[] {
  return workflow.nodes.filter(
    (node) => !workflow.edges.some((edge) => edge.target === node.id),
  );
}

/**
 * Find children of a node.
 */
function getChildren(
  workflow: Workflow,
  node: WorkflowNode,
  conditionResult?: boolean,
): WorkflowNode[] {
  const edges = workflow.edges.filter((edge) => {
    if (edge.source !== node.id) {
      return false;
    }

    /**
     * A loop runs its body internally, so only the "after" branch
     * continues in the main pass.
     */
    if (node.type === "loop") {
      return edge.sourceHandle !== "body";
    }

    if (node.type !== "condition") {
      return true;
    }

    if (edge.sourceHandle === "true") {
      return conditionResult === true;
    }

    if (edge.sourceHandle === "false") {
      return conditionResult === false;
    }

    return true;
  });

  return edges
    .map((edge) => workflow.nodes.find((node) => node.id === edge.target))
    .filter((node): node is WorkflowNode => Boolean(node));
}

/**
 * Direct children of a loop body, connected through its body handle.
 */
function getLoopBodyRoots(workflow: Workflow, loopNodeId: string): WorkflowNode[] {
  return workflow.edges
    .filter((edge) => edge.source === loopNodeId && edge.sourceHandle === "body")
    .map((edge) => workflow.nodes.find((node) => node.id === edge.target))
    .filter((node): node is WorkflowNode => Boolean(node));
}

/**
 * Find parents of a node.
 */
function getParents(workflow: Workflow, nodeId: string): WorkflowNode[] {
  const edges = workflow.edges.filter((edge) => edge.target === nodeId);

  return edges
    .map((edge) => workflow.nodes.find((node) => node.id === edge.source))
    .filter((node): node is WorkflowNode => Boolean(node));
}

/**
 * Every node reachable downstream of the given start nodes.
 */
function collectDescendants(
  workflow: Workflow,
  startNodeIds: string[],
): string[] {
  const found = new Set<string>();

  for (const startNodeId of startNodeIds) {
    if (!found.has(startNodeId)) {
      found.add(startNodeId);
    }
  }

  const queue: string[] = [...startNodeIds];

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId) {
      continue;
    }

    for (const edge of workflow.edges) {
      if (edge.source !== currentNodeId || found.has(edge.target)) {
        continue;
      }

      found.add(edge.target);
      queue.push(edge.target);
    }
  }

  return [...found];
}

/**
 * Guess how many iterations a dry run would perform, so the preview does
 * not have to run the whole list.
 */
function estimateDryRunIterations(items: string): number {
  const trimmed = items.trim();

  if (!trimmed) {
    return 0;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  try {
    const parsed = JSON.parse(trimmed);

    return Array.isArray(parsed) ? parsed.length : 1;
  } catch {
    return 1;
  }
}

interface ExecuteLoopBodyOptions {
  workflow: Workflow;

  /** The loop node that owns this body. */
  root: WorkflowNode;

  config: LoopConfig;

  itemVariables: VariableContext;

  index: number;

  total: number;

  execution: WorkflowExecution;

  executionId: string;

  onEvent?: (event: ExecutionEvent) => void;

  options: {
    dryRun?: boolean;
    signal?: AbortSignal;
    onStreamDelta?: (delta: string, accumulated: string) => void;
  };

  outputs: Map<string, Record<string, unknown>>;

  completed: Set<string>;

  failed: Set<string>;

  loopOwned: Set<string>;

  runLoop: (
    node: WorkflowNode,
    config: LoopConfig,
  ) => Promise<Record<string, unknown>>;

  markBodySkipped: (node: WorkflowNode, reason: string) => void;

  /** Outputs of this iteration, keyed by node variable name. */
  iterationOutputs: Record<string, unknown>;
}

/**
 * Execute the nodes downstream of a loop for a single item.
 *
 * The pass mirrors the main workflow loop: dependency order, condition
 * branches, per-node status, and logs. The only difference is that every
 * node sees the current item through the loop variables.
 */
async function executeLoopBody(
  params: ExecuteLoopBodyOptions,
): Promise<void> {
  const {
    workflow,
    root,
    config,
    itemVariables,
    index,
    total,
    execution,
    executionId,
    onEvent,
    options,
    outputs,
    completed,
    failed,
    loopOwned,
    runLoop,
    markBodySkipped,
    iterationOutputs,
  } = params;

  const done = new Set<string>();
  const queue: WorkflowNode[] = [...getLoopBodyRoots(workflow, root.id)];

  while (queue.length > 0) {
    if (options.signal?.aborted) {
      throw new DOMException("Loop canceled", "AbortError");
    }

    const node = queue.shift();

    if (!node || done.has(node.id) || !loopOwned.has(node.id)) {
      continue;
    }

    const parents = getParents(workflow, node.id).filter(
      (parent) => parent.id !== root.id,
    );

    const ready = parents.every(
      (parent) => done.has(parent.id) || completed.has(parent.id),
    );

    if (!ready) {
      queue.push(node);

      if (queue.length > workflow.nodes.length * 2) {
        throw new Error("The loop body contains an unresolved dependency.");
      }

      continue;
    }

    const nodeExecution = execution.nodes.find(
      (item) => item.nodeId === node.id,
    );

    if (!nodeExecution) {
      continue;
    }

    const startedAt = new Date().toISOString();

    nodeExecution.status = "running";
    nodeExecution.startedAt = startedAt;
    onEvent?.({ type: "node-started", nodeId: node.id });

    const iterationLog = createExecutionLog(
      executionId,
      "info",
      `${node.data.label} started`,
      node.id,
    );

    iterationLog.details = { loop: root.data.label, iteration: index + 1, total };
    execution.logs.push(iterationLog);
    onEvent?.({ type: "log", log: iterationLog });

    /**
     * Body variables sit on top of everything completed so far.
     */
    const bodyContext: VariableContext = {
      ...createVariableContext(workflow.nodes, outputs),
      ...itemVariables,
    };

    const input: Record<string, unknown> = {};

    for (const parent of parents) {
      Object.assign(input, outputs.get(parent.id) ?? {});
    }

    try {
      const resolvedConfig = resolveValue(node.data.config, bodyContext);

      const executableNode: WorkflowNode = {
        ...node,
        data: {
          ...node.data,
          config: resolvedConfig as Record<string, unknown>,
        },
      };

      const output = await executeNode(executableNode, input, {
        dryRun: options.dryRun,
        signal: options.signal,
        onStreamDelta: options.onStreamDelta,
        runLoop,
      });

      const completedAt = new Date().toISOString();
      const duration =
        new Date(completedAt).getTime() - new Date(startedAt).getTime();

      nodeExecution.status = "success";
      nodeExecution.output = output;
      nodeExecution.completedAt = completedAt;
      nodeExecution.duration = duration;
      nodeExecution.error = undefined;

      outputs.set(node.id, output);
      iterationOutputs[createVariableKey(node)] = output;
      done.add(node.id);
      completed.add(node.id);

      const completedLog = createExecutionLog(
        executionId,
        "success",
        `${node.data.label} completed`,
        node.id,
      );

      completedLog.input = input;
      completedLog.output = output;
      completedLog.duration = duration;
      completedLog.details = { loop: root.data.label, iteration: index + 1, total };
      execution.logs.push(completedLog);
      onEvent?.({ type: "node-completed", nodeId: node.id, output });
      onEvent?.({ type: "log", log: completedLog });

      const conditionResult =
        node.type === "condition" && typeof output.result === "boolean"
          ? output.result
          : undefined;

      const allChildren = getChildren(workflow, node);

      for (const child of getChildren(workflow, node, conditionResult)) {
        if (!done.has(child.id)) {
          queue.push(child);
        }
      }

      if (node.type === "condition") {
        for (const child of allChildren) {
          if (!loopOwned.has(child.id)) {
            continue;
          }

          if (!getChildren(workflow, node, conditionResult).some((taken) => taken.id === child.id)) {
            markBodySkipped(
              child,
              `Condition evaluated ${conditionResult ? "true" : "false"} inside the loop.`,
            );
          }
        }
      }
    } catch (error) {
      if (options.signal?.aborted) {
        throw new DOMException("Loop canceled", "AbortError");
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const completedAt = new Date().toISOString();

      nodeExecution.status = "error";
      nodeExecution.error = errorMessage;
      nodeExecution.completedAt = completedAt;
      nodeExecution.duration =
        new Date(completedAt).getTime() - new Date(startedAt).getTime();
      failed.add(node.id);

      const errorLog = createExecutionLog(
        executionId,
        "error",
        `${node.data.label} failed`,
        node.id,
      );

      errorLog.input = input;
      errorLog.error = errorMessage;
      errorLog.details = { loop: root.data.label, iteration: index + 1, total };
      execution.logs.push(errorLog);
      onEvent?.({ type: "node-failed", nodeId: node.id, error: errorMessage });
      onEvent?.({ type: "log", log: errorLog });

      if (config.stopOnError) {
        throw error;
      }
    }
  }
}

/**
 * Execute workflow.
 */
export async function executeWorkflow(
  workflow: Workflow,
  onEvent?: (event: ExecutionEvent) => void,
  options: { dryRun?: boolean; signal?: AbortSignal } = {},
): Promise<WorkflowExecution> {
  const executionId = crypto.randomUUID();

  const startedAt = new Date().toISOString();

  /**
   * Initial node execution state
   */
  const executionNodes: NodeExecution[] = workflow.nodes.map((node) => ({
    nodeId: node.id,
    status: "pending",
  }));

  /**
   * Initial execution
   */
  const execution: WorkflowExecution = {
    id: executionId,

    workflowId: workflow.id,

    status: "running",

    startedAt,

    nodes: executionNodes,

    logs: [],
    mode: options.dryRun ? "dry-run" : "live",
  };

  /**
   * Workflow started log
   */
  const workflowStartLog = createExecutionLog(
    executionId,
    "info",
    "Workflow execution started",
  );

  execution.logs.push(workflowStartLog);

  /**
   * Notify workflow started
   */
  onEvent?.({
    type: "workflow-started",
    execution,
  });

  /**
   * Notify log
   */
  onEvent?.({
    type: "log",
    log: workflowStartLog,
  });

  /**
   * Store outputs of completed nodes.
   */
  const outputs = new Map<string, Record<string, unknown>>();

  /**
   * Completed nodes.
   */
  const completed = new Set<string>();

  /**
   * Failed nodes.
   */
  const failed = new Set<string>();
  const skipped = new Set<string>();
  let canceled = false;

  /**
   * Nodes owned by a loop body. They run inside the iteration and are
   * never queued by the main pass.
   */
  const loopOwned = new Set<string>();

  const markSkipped = (node: WorkflowNode, reason: string) => {
    if (completed.has(node.id) || failed.has(node.id) || skipped.has(node.id)) return;
    skipped.add(node.id);
    const nodeExecution = execution.nodes.find((item) => item.nodeId === node.id);
    if (nodeExecution) {
      nodeExecution.status = "skipped";
      nodeExecution.completedAt = new Date().toISOString();
    }
    const log = createExecutionLog(executionId, "info", `${node.data.label} skipped`, node.id);
    log.error = reason;
    execution.logs.push(log);
    onEvent?.({ type: "node-skipped", nodeId: node.id, reason });
    onEvent?.({ type: "log", log });
    for (const child of getChildren(workflow, node)) markSkipped(child, reason);
  };

  /**
   * Run every node downstream of a loop once per item.
   *
   * The body is a self-contained pass: it resolves its own variables
   * (including the current item), keeps its own condition branches, and
   * reports the results back so the loop node can summarize them.
   */
  const runLoopNode = async (
    loopNode: WorkflowNode,
    config: LoopConfig,
  ): Promise<Record<string, unknown>> => {
    const items = resolveLoopItems(config);
    const bodyRoots = getLoopBodyRoots(workflow, loopNode.id);

    if (bodyRoots.length === 0) {
      throw new Error(
        "This loop has nothing to repeat. Connect the nodes to run from its Body handle.",
      );
    }

    const bodyNodes = collectDescendants(
      workflow,
      bodyRoots.map((node) => node.id),
    );

    for (const nodeId of bodyNodes) {
      loopOwned.add(nodeId);
    }

    /**
     * Reuse the skip marker for branches the loop did not take.
     */
    const markBodySkipped = (node: WorkflowNode, reason: string) => {
      if (completed.has(node.id) || failed.has(node.id) || skipped.has(node.id)) {
        return;
      }

      skipped.add(node.id);

      const nodeExecution = execution.nodes.find(
        (item) => item.nodeId === node.id,
      );

      if (nodeExecution) {
        nodeExecution.status = "skipped";
        nodeExecution.completedAt = new Date().toISOString();
      }

      const log = createExecutionLog(
        executionId,
        "info",
        `${node.data.label} skipped`,
        node.id,
      );

      log.error = reason;
      log.details = { loop: loopNode.data.label };
      execution.logs.push(log);
      onEvent?.({ type: "node-skipped", nodeId: node.id, reason });
      onEvent?.({ type: "log", log });

      for (const child of getChildren(workflow, node)) {
        markBodySkipped(child, reason);
      }
    };

    const iterationLog = createExecutionLog(
      executionId,
      "info",
      `${loopNode.data.label} iterating over ${items.length} item${items.length === 1 ? "" : "s"}`,
      loopNode.id,
    );

    iterationLog.details = {
      count: items.length,
      itemName: config.itemName,
      indexName: config.indexName,
    };
    execution.logs.push(iterationLog);
    onEvent?.({ type: "log", log: iterationLog });

    const results: Record<string, unknown>[] = [];

    for (const [index, item] of items.entries()) {
      if (options.signal?.aborted) {
        canceled = true;
        break;
      }

      const itemVariables = createLoopVariables(
        config,
        item,
        index,
        items.length,
      );

      /**
       * Each iteration starts from a clean slate so a node that did not
       * run in the previous pass is not treated as done.
       */
      for (const nodeId of bodyNodes) {
        skipped.delete(nodeId);
      }

      const iterationOutputs: Record<string, unknown> = {};

      await executeLoopBody({
        workflow,
        root: loopNode,
        config,
        itemVariables,
        index,
        total: items.length,
        execution,
        executionId,
        onEvent,
        options,
        outputs,
        completed,
        failed,
        loopOwned,
        runLoop: runLoopNode,
        markBodySkipped,
        iterationOutputs,
      });

      results.push(iterationOutputs);

      const iterationDone = createExecutionLog(
        executionId,
        "success",
        `${loopNode.data.label} iteration ${index + 1} of ${items.length}`,
        loopNode.id,
      );

      iterationDone.details = {
        index,
        total: items.length,
        item,
        ...iterationOutputs,
      };
      execution.logs.push(iterationDone);
      onEvent?.({ type: "log", log: iterationDone });
    }

    return {
      count: results.length,
      iterations: results.length,
      results,
      itemName: config.itemName,
      indexName: config.indexName,
    };
  };

  /**
   * Initial queue.
   */
  const roots = findRootNodes(workflow);

  const queue: WorkflowNode[] = [...roots];

  /**
   * Execution loop
   */
  while (queue.length > 0) {
    if (options.signal?.aborted) {
      canceled = true;
      break;
    }
    const node = queue.shift();

    if (!node) {
      continue;
    }

    /**
     * Already completed.
     */
    if (completed.has(node.id)) {
      continue;
    }

    /**
     * Already failed.
     */
    if (failed.has(node.id)) {
      continue;
    }

    /**
     * Nodes inside a loop already ran during the iteration pass.
     */
    if (loopOwned.has(node.id)) {
      continue;
    }

    /**
     * Check dependencies.
     */
    const parents = getParents(workflow, node.id);

    const dependenciesReady = parents.every((parent) =>
      completed.has(parent.id),
    );

    if (!dependenciesReady) {
      queue.push(node);

      /**
       * Prevent infinite loops.
       */
      if (queue.length > workflow.nodes.length * 2) {
        throw new Error("Workflow contains unresolved dependencies.");
      }

      continue;
    }

    /**
     * Find execution state.
     */
    const nodeExecution = execution.nodes.find(
      (item) => item.nodeId === node.id,
    );

    if (!nodeExecution) {
      continue;
    }

    /**
     * Build input from parent outputs.
     */
    const input: Record<string, unknown> = {};

    for (const parent of parents) {
      const parentOutput = outputs.get(parent.id);

      if (!parentOutput) {
        continue;
      }

      Object.assign(input, parentOutput);
    }
    const variableContext = createVariableContext(workflow.nodes, outputs);

    nodeExecution.input = input;

    /**
     * Mark node as running.
     */
    const nodeStartedAt = new Date().toISOString();

    nodeExecution.status = "running";

    nodeExecution.startedAt = nodeStartedAt;

    /**
     * Notify node started.
     */
    onEvent?.({
      type: "node-started",
      nodeId: node.id,
    });

    /**
     * Create start log.
     */
    const startLog = createExecutionLog(
      executionId,
      "info",
      `${node.data.label} started`,
      node.id,
    );

    onEvent?.({
      type: "log",
      log: startLog,
    });

    /**
     * Simulate execution.
     */
    await wait(options.dryRun ? 120 : 700);

    if (options.signal?.aborted) {
      canceled = true;
      break;
    }

    try {
      /**
       * Execute node.
       */
      const resolvedConfig = resolveValue(node.data.config, variableContext);

      const executableNode = {
        ...node,

        data: {
          ...node.data,

          config: resolvedConfig as Record<string, unknown>,
        },
      };

      const output = await executeNode(executableNode, input, {
        ...options,
        runLoop: runLoopNode,
        onStreamDelta:
          node.type === "ai-prompt" && !options.dryRun
            ? (delta, accumulated) =>
                onEvent?.({
                  type: "node-stream",
                  nodeId: node.id,
                  delta,
                  accumulated,
                })
            : undefined,
      });

      const completedAt = new Date().toISOString();

      /**
       * Calculate duration.
       */
      const duration =
        new Date(completedAt).getTime() - new Date(nodeStartedAt).getTime();

      /**
       * Update execution state.
       */
      nodeExecution.status = "success";

      nodeExecution.output = output;

      nodeExecution.completedAt = completedAt;

      nodeExecution.duration = duration;

      /**
       * Store output.
       */
      outputs.set(node.id, output);

      /**
       * Mark completed.
       */
      completed.add(node.id);

      /**
       * Create completion log.
       */
      const completedLog = createExecutionLog(
        executionId,
        "success",
        `${node.data.label} completed`,
        node.id,
      );

      completedLog.input = input;

      completedLog.output = output;

      completedLog.duration = duration;

      if (node.type === "http-request") {
        completedLog.details = {
          method: executableNode.data.config.method ?? "GET",
          url: executableNode.data.config.url ?? "",
          status: output.status ?? null,
          success: output.success ?? false,
        };
      }

      if (node.type === "ai-prompt") {
        const usage = output.usage as
          | {
              promptTokens?: number;
              completionTokens?: number;
              totalTokens?: number;
              estimated?: boolean;
            }
          | undefined;

        completedLog.details = {
          provider: output.provider ?? null,
          model: output.model ?? null,
          responseFormat: output.responseFormat ?? "text",
          promptTokens: usage?.promptTokens ?? null,
          completionTokens: usage?.completionTokens ?? null,
          totalTokens: usage?.totalTokens ?? null,
          usageEstimated: usage?.estimated ?? true,
          cost: typeof output.cost === "number" ? output.cost : null,
          costEstimated: output.costEstimated ?? true,
        };
      }

      execution.logs.push(completedLog);

      /**
       * Notify node completed.
       */
      onEvent?.({
        type: "node-completed",
        nodeId: node.id,
        output,
      });

      /**
       * Notify completion log.
       */
      onEvent?.({
        type: "log",
        log: completedLog,
      });

      /**
       * Add children.
       */
      const conditionResult =
        node.type === "condition" && typeof output.result === "boolean"
          ? output.result
          : undefined;
      const allChildren = getChildren(workflow, node);
      const children = getChildren(workflow, node, conditionResult);
      if (node.type === "condition") {
        for (const child of allChildren) {
          if (!children.some((selectedChild) => selectedChild.id === child.id)) {
            markSkipped(child, `Condition evaluated ${conditionResult ? "true" : "false"}.`);
          }
        }
      }

      for (const child of children) {
        if (!completed.has(child.id) && !failed.has(child.id)) {
          queue.push(child);
        }
      }
    } catch (error) {
      if (options.signal?.aborted) {
        canceled = true;
        nodeExecution.status = "skipped";
        break;
      }
      /**
       * Error message.
       */
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const completedAt = new Date().toISOString();

      const duration =
        new Date(completedAt).getTime() - new Date(nodeStartedAt).getTime();

      /**
       * Update node execution.
       */
      nodeExecution.status = "error";

      nodeExecution.error = errorMessage;

      nodeExecution.completedAt = completedAt;

      nodeExecution.duration = duration;

      /**
       * Mark failed.
       */
      failed.add(node.id);

      /**
       * Create error log.
       */
      const errorLog = createExecutionLog(
        executionId,
        "error",
        `${node.data.label} failed`,
        node.id,
      );

      errorLog.input = input;

      errorLog.error = errorMessage;

      errorLog.duration = duration;

      execution.logs.push(errorLog);

      /**
       * Notify node failed.
       */
      onEvent?.({
        type: "node-failed",
        nodeId: node.id,
        error: errorMessage,
      });

      /**
       * Notify error log.
       */
      onEvent?.({
        type: "log",
        log: errorLog,
      });

      /**
       * Stop workflow.
       */
      break;
    }
  }

  /**
   * Check final status.
   */
  const hasError = execution.nodes.some((node) => node.status === "error");

  const completedAt = new Date().toISOString();

  /**
   * Final execution state.
   */
  execution.status = canceled ? "canceled" : hasError ? "error" : "success";

  execution.completedAt = completedAt;
  if (canceled) execution.canceledAt = completedAt;

  execution.duration =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();

  /**
   * Final log.
   */
  const workflowCompletedLog = createExecutionLog(
    executionId,
    hasError ? "error" : "success",
    canceled ? "Workflow execution canceled" : hasError ? "Workflow execution failed" : "Workflow execution completed",
  );

  workflowCompletedLog.duration = execution.duration;

  execution.logs.push(workflowCompletedLog);

  /**
   * Notify final log.
   */
  onEvent?.({
    type: "log",
    log: workflowCompletedLog,
  });

  /**
   * Notify workflow completed.
   */
  onEvent?.({
    type: "workflow-completed",
    execution,
  });

  return execution;
}
