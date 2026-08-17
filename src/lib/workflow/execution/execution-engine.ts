import type {
  ExecutionLog,
  NodeExecution,
  Workflow,
  WorkflowExecution,
  WorkflowNode,
} from "@/types/workflow";
import { createVariableContext } from "@/lib/workflow/variables/variable-context";

import { resolveValue } from "@/lib/workflow/variables/variable-resolver";
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
function executeNode(
  node: WorkflowNode,
  input: Record<string, unknown>,
): Record<string, unknown> {
  switch (node.type) {
    case "manual-trigger":
      return {
        name: "Amir",
        email: "amir@example.com",
        userId: "user_123",
      };

    case "ai-prompt":
      return {
        response: `AI response for: ${
          typeof node.data.config.prompt === "string"
            ? node.data.config.prompt
            : "Empty prompt"
        }`,
      };

    case "http-request":
      return {
        status: 200,
        success: true,
        data: input,
      };

    case "condition":
      return {
        result: true,
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
function getChildren(workflow: Workflow, nodeId: string): WorkflowNode[] {
  const edges = workflow.edges.filter((edge) => edge.source === nodeId);

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

  /**
   * Initial queue.
   */
  const roots = findRootNodes(workflow);

  const queue: WorkflowNode[] = [...roots];

  /**
   * Execution loop
   */
  while (queue.length > 0) {
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

    startLog.input = input;

    execution.logs.push(startLog);

    onEvent?.({
      type: "log",
      log: startLog,
    });

    /**
     * Simulate execution.
     */
    await wait(700);

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

      const output = executeNode(executableNode, input);

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
      const children = getChildren(workflow, node.id);

      for (const child of children) {
        if (!completed.has(child.id) && !failed.has(child.id)) {
          queue.push(child);
        }
      }
    } catch (error) {
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
  execution.status = hasError ? "error" : "success";

  execution.completedAt = completedAt;

  execution.duration =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();

  /**
   * Final log.
   */
  const workflowCompletedLog = createExecutionLog(
    executionId,
    hasError ? "error" : "success",
    hasError ? "Workflow execution failed" : "Workflow execution completed",
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
