import type { NodeType, Workflow, WorkflowEdge, WorkflowNode } from "@/types/workflow";

export interface WorkflowValidationIssue {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

function isHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasCycle(workflow: Workflow) {
  const children = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const values = children.get(edge.source) ?? [];
    values.push(edge.target);
    children.set(edge.source, values);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const child of children.get(nodeId) ?? []) {
      if (visit(child)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  return workflow.nodes.some((node) => visit(node.id));
}

function validateNodeConfig(node: WorkflowNode): WorkflowValidationIssue[] {
  const config = node.data.config;
  if (node.type === "ai-prompt") {
    const prompt = config.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return [{ code: "missing-prompt", nodeId: node.id, message: `${node.data.label} needs a prompt.` }];
    }
  }
  if (node.type === "http-request" && !isHttpUrl(config.url)) {
    return [{ code: "invalid-url", nodeId: node.id, message: `${node.data.label} needs a valid HTTP or HTTPS URL.` }];
  }
  if (node.type === "condition") {
    const left = config.leftOperand;
    const operator = config.operator;
    const right = config.rightOperand;
    const requiresRight = operator !== "is_empty" && operator !== "is_not_empty" && operator !== "is_true" && operator !== "is_false";
    if (typeof left !== "string" || !left.trim() || typeof operator !== "string" || (requiresRight && (typeof right !== "string" || !right.trim()))) {
      return [{ code: "invalid-condition", nodeId: node.id, message: `${node.data.label} needs complete condition values.` }];
    }
  }
  return [];
}

export function validateConnection(workflow: Workflow, edge: WorkflowEdge): ValidationResult {
  const source = workflow.nodes.find((node) => node.id === edge.source);
  const target = workflow.nodes.find((node) => node.id === edge.target);
  const issues: WorkflowValidationIssue[] = [];
  if (!source || !target) issues.push({ code: "missing-node", message: "Both ends of a connection must exist." });
  if (edge.source === edge.target) issues.push({ code: "self-connection", message: "A node cannot connect to itself." });
  if (target?.type === "manual-trigger") issues.push({ code: "trigger-input", nodeId: target.id, message: "A manual trigger cannot have an incoming connection." });
  if (source?.type === "condition" && edge.sourceHandle !== "true" && edge.sourceHandle !== "false") issues.push({ code: "condition-handle", nodeId: source.id, message: "Conditions must use their True or False branch." });
  if (source && source.type !== "condition" && edge.sourceHandle) issues.push({ code: "unexpected-handle", nodeId: source.id, message: "This node does not have named output branches." });
  if (workflow.edges.some((item) => item.source === edge.source && item.target === edge.target && item.sourceHandle === edge.sourceHandle)) issues.push({ code: "duplicate-edge", message: "That connection already exists." });
  if (source?.type === "condition" && workflow.edges.some((item) => item.source === edge.source && item.sourceHandle === edge.sourceHandle)) issues.push({ code: "duplicate-branch", nodeId: source.id, message: `The ${edge.sourceHandle === "true" ? "True" : "False"} branch is already connected.` });
  if (!issues.length && hasCycle({ ...workflow, edges: [...workflow.edges, edge] })) issues.push({ code: "cycle", message: "Connections cannot create a cycle." });
  return { valid: issues.length === 0, issues };
}

export function validateWorkflow(workflow: Workflow): ValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  const triggers = workflow.nodes.filter((node) => node.type === "manual-trigger");
  if (workflow.nodes.length === 0) issues.push({ code: "empty", message: "Add a Manual Trigger to start building your workflow." });
  if (triggers.length !== 1) issues.push({ code: "trigger-count", message: "A workflow needs exactly one Manual Trigger." });
  for (const node of workflow.nodes) {
    issues.push(...validateNodeConfig(node));
    if (node.type === "condition") {
      const branches = workflow.edges.filter((edge) => edge.source === node.id);
      if (!branches.some((edge) => edge.sourceHandle === "true") || !branches.some((edge) => edge.sourceHandle === "false")) {
        issues.push({ code: "missing-condition-branch", nodeId: node.id, message: `${node.data.label} needs both True and False branches.` });
      }
    }
  }
  for (const edge of workflow.edges) issues.push(...validateConnection({ ...workflow, edges: workflow.edges.filter((item) => item.id !== edge.id) }, edge).issues);
  if (hasCycle(workflow)) issues.push({ code: "cycle", message: "The workflow contains a cycle." });
  return { valid: issues.length === 0, issues };
}

const nodeTypes: NodeType[] = ["manual-trigger", "ai-prompt", "condition", "http-request"];

export function parseImportedWorkflow(value: unknown): Workflow | null {
  if (!value || typeof value !== "object") return null;
  const workflow = value as Partial<Workflow>;
  if (typeof workflow.name !== "string" || !Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) return null;
  const nodes = workflow.nodes as WorkflowNode[];
  const edges = workflow.edges as WorkflowEdge[];
  if (!nodes.every((node) => typeof node?.id === "string" && nodeTypes.includes(node.type) && typeof node.position?.x === "number" && typeof node.position?.y === "number" && typeof node.data?.label === "string" && typeof node.data?.description === "string" && typeof node.data?.config === "object" && node.data.config !== null)) return null;
  if (!edges.every((edge) => typeof edge?.id === "string" && typeof edge.source === "string" && typeof edge.target === "string")) return null;
  const now = new Date().toISOString();
  return { id: typeof workflow.id === "string" ? workflow.id : crypto.randomUUID(), name: workflow.name.trim() || "Imported Workflow", description: typeof workflow.description === "string" ? workflow.description : "", status: workflow.status === "published" ? "published" : "draft", nodes, edges, createdAt: typeof workflow.createdAt === "string" ? workflow.createdAt : now, updatedAt: now };
}
