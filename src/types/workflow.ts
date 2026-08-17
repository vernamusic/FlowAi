export type NodeType =
  | "manual-trigger"
  | "ai-prompt"
  | "condition"
  | "http-request";

export type NodeCategory = "trigger" | "ai" | "logic" | "action";

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNodeData {
  label: string;
  description: string;
  category: NodeCategory;

  config: Record<string, unknown>;

  outputs?: WorkflowVariable[];
}

export interface WorkflowNode {
  id: string;

  type: NodeType;

  position: WorkflowNodePosition;

  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;

  source: string;

  target: string;

  sourceHandle?: string;

  targetHandle?: string;

  label?: string;
}

export interface Workflow {
  id: string;

  name: string;

  description: string;

  status: "draft" | "published";

  nodes: WorkflowNode[];

  edges: WorkflowEdge[];

  createdAt: string;

  updatedAt: string;
}

export interface WorkflowVariable {
  nodeId: string;
  nodeLabel: string;
  key: string;
  path: string;
  type: "string" | "number" | "boolean" | "object";
}

export type ExecutionStatus = "idle" | "running" | "success" | "error";

export type NodeExecutionStatus = "pending" | "running" | "success" | "error";

export interface NodeExecution {
  nodeId: string;

  status: NodeExecutionStatus;

  startedAt?: string;

  completedAt?: string;

  duration?: number;

  input?: Record<string, unknown>;

  output?: Record<string, unknown>;

  error?: string;
}

export interface WorkflowExecution {
  id: string;

  workflowId: string;

  status: ExecutionStatus;

  startedAt: string;

  completedAt?: string;

  duration?: number;

  nodes: NodeExecution[];

  logs: ExecutionLog[];
}

export type ExecutionLogLevel = "info" | "success" | "error";

export interface ExecutionLog {
  id: string;

  executionId: string;

  nodeId?: string;

  level: ExecutionLogLevel;

  message: string;

  timestamp: string;

  duration?: number;

  input?: Record<string, unknown>;

  output?: Record<string, unknown>;

  error?: string;
}

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
