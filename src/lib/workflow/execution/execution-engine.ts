import type {
  ExecutionLog,
  NodeExecution,
  Workflow,
  WorkflowExecution,
  WorkflowNode,
} from "@/types/workflow";
import { createVariableContext } from "@/lib/workflow/variables/variable-context";
import { executeHttpRequest } from "@/lib/workflow/execution/http-request";
import { executeOpenAiPrompt } from "@/lib/workflow/execution/openai";
import { resolveValue } from "@/lib/workflow/variables/variable-resolver";
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
  options: { dryRun?: boolean; signal?: AbortSignal } = {},
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

    case "ai-prompt":
      if (options.dryRun) {
        return {
          response: `[Dry run] ${typeof node.data.config.prompt === "string" ? node.data.config.prompt : "Sample AI response"}`,
          model: typeof node.data.config.model === "string" ? node.data.config.model : "gpt-4o-mini",
        };
      }
      return executeOpenAiPrompt({
        prompt: typeof node.data.config.prompt === "string" ? node.data.config.prompt : "",
        model: typeof node.data.config.model === "string" ? node.data.config.model : "gpt-4o-mini",
        temperature: typeof node.data.config.temperature === "number" ? node.data.config.temperature : 0.7,
        maxTokens: typeof node.data.config.maxTokens === "number" ? node.data.config.maxTokens : 1000,
        instructions: typeof node.data.config.instructions === "string" ? node.data.config.instructions : undefined,
        signal: options.signal,
      });

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
 * Find parents of a node.
 */
function getParents(workflow: Workflow, nodeId: string): WorkflowNode[] {
  const edges = workflow.edges.filter((edge) => edge.target === nodeId);

  return edges
    .map((edge) => workflow.nodes.find((node) => node.id === edge.source))
    .filter((node): node is WorkflowNode => Boolean(node));
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

      const output = await executeNode(executableNode, input, options);

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
