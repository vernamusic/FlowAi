import type { Workflow, WorkflowEdge, WorkflowNode } from "@/types/workflow";
import { isTriggerNode } from "@/types/workflow";
import { CONDITION_HANDLES, LOOP_HANDLES } from "@/constants/edges";
import { getAiProvider, normalizeBaseUrl } from "./execution/ai/providers";
import { parseJsonSchema } from "./execution/ai/response-format";
import { evaluateExpression } from "./execution/nodes/math-expression";
import { readSwitchConfig, switchHandles } from "./execution/nodes/switch";
import { readTextConfig } from "./execution/nodes/text";
import { COMPARISON_OPERATORS } from "./execution/nodes/comparison";
import {
  MAX_RETRIES,
  MAX_TIMEOUT_MS,
} from "./execution/nodes/resilience";
import { auditWorkflowVariables } from "./variables/variable-audit";
import { MAX_DELAY_MS, MIN_DELAY_MS } from "./execution/nodes/delay";

/**
 * Whether a connection is leaving through one of these named outputs.
 *
 * A missing handle means the default output, which only exists on nodes
 * that have a single one.
 */
function isHandleOf(handle: string | undefined, handles: readonly string[]) {
  return handle !== undefined && handles.includes(handle);
}

function readComparisonOperator(value: string) {
  return COMPARISON_OPERATORS.find((item) => item.value === value);
}

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

/**
 * Problems that would make an AI node fail at run time.
 */
export function validateAiConfig(
  config: Record<string, unknown>,
): WorkflowValidationIssue | null {
  const providerId =
    typeof config.providerId === "string" && config.providerId
      ? config.providerId
      : undefined;
  const provider = getAiProvider(providerId);

  if (provider.supportsCustomBaseUrl && !normalizeBaseUrl(String(config.baseUrl ?? "")) && !provider.defaultBaseUrl) {
    return {
      code: "missing-base-url",
      message: `${provider.label} needs a base URL such as https://api.example.com/v1.`,
    };
  }

  if (config.responseFormat === "schema") {
    const parsed = parseJsonSchema(
      typeof config.jsonSchema === "string" ? config.jsonSchema : "",
    );

    if (parsed.error) {
      return {
        code: "invalid-schema",
        message: `The structured output schema is not usable: ${parsed.error}`,
      };
    }
  }

  return null;
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
    const aiIssue = validateAiConfig(config);
    if (aiIssue) {
      return [{ ...aiIssue, nodeId: node.id }];
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
  if (node.type === "transform") {
    const issues: WorkflowValidationIssue[] = [];
    const name = typeof config.name === "string" ? config.name.trim() : "";

    if (!name) {
      issues.push({ code: "missing-variable-name", nodeId: node.id, message: `${node.data.label} needs a variable name.` });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      issues.push({
        code: "invalid-variable-name",
        nodeId: node.id,
        message: `"${name}" cannot be a variable name. Use letters, numbers, and underscores, starting with a letter.`,
      });
    }

    if (typeof config.value !== "string") {
      issues.push({ code: "missing-variable-value", nodeId: node.id, message: `${node.data.label} needs a value.` });
    }

    return issues;
  }
  if (node.type === "json-parser") {
    if (typeof config.input !== "string" || !config.input.trim()) {
      return [{ code: "missing-json-input", nodeId: node.id, message: `${node.data.label} needs an input value to parse.` }];
    }
  }
  if (node.type === "loop") {
    if (typeof config.items !== "string" || !config.items.trim()) {
      return [{ code: "missing-loop-items", nodeId: node.id, message: `${node.data.label} needs a list of items to iterate over.` }];
    }
  }
  if (node.type === "delay") {
    const duration = config.durationMs;
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration < MIN_DELAY_MS || duration > MAX_DELAY_MS) {
      return [{ code: "invalid-delay", nodeId: node.id, message: `${node.data.label} needs a duration between ${MIN_DELAY_MS}ms and ${MAX_DELAY_MS}ms.` }];
    }
  }
  if (node.type === "output") {
    if (typeof config.message !== "string" || !config.message.trim()) {
      return [{ code: "missing-output-message", nodeId: node.id, message: `${node.data.label} needs a message.` }];
    }
  }
  if (node.type === "webhook-trigger") {
    const payload = typeof config.payload === "string" ? config.payload.trim() : "";
    if (payload) {
      try {
        JSON.parse(payload);
      } catch (error) {
        return [{
          code: "invalid-webhook-payload",
          nodeId: node.id,
          message: `${node.data.label} payload is not valid JSON${error instanceof Error ? `: ${error.message}` : "."}`,
        }];
      }
    }
  }
  if (node.type === "math") {
    const expression = typeof config.expression === "string" ? config.expression.trim() : "";
    if (!expression) {
      return [{ code: "missing-expression", nodeId: node.id, message: `${node.data.label} needs an expression to calculate.` }];
    }

    /**
     * The formula is checked here as well as at run time, because a
     * syntax mistake should be visible before the run rather than after.
     */
    try {
      evaluateExpression(expression);
    } catch (error) {
      return [{
        code: "invalid-expression",
        nodeId: node.id,
        message: error instanceof Error ? error.message : `${node.data.label} has an expression it cannot read.`,
      }];
    }
  }
  if (node.type === "switch") {
    const issues: WorkflowValidationIssue[] = [];
    const switchConfig = readSwitchConfig(config);

    for (const rule of switchConfig.rules) {
      const operator = readComparisonOperator(rule.operator);
      const left = typeof rule.leftOperand === "string" ? rule.leftOperand.trim() : "";

      if (!left) {
        issues.push({
          code: "incomplete-switch-case",
          nodeId: node.id,
          message: `${node.data.label} case “${rule.label}” needs a value to compare.`,
        });
        continue;
      }

      if (operator?.needsValue && !String(rule.rightOperand ?? "").trim()) {
        issues.push({
          code: "incomplete-switch-case",
          nodeId: node.id,
          message: `${node.data.label} case “${rule.label}” needs a value to compare against.`,
        });
      }
    }

    return issues;
  }
  if (node.type === "text") {
    const operation = readTextConfig(config).operation;

    if (operation === "join") {
      return [];
    }

    if (operation === "remove" && !String(config.second ?? "").trim()) {
      return [{
        code: "missing-remove-value",
        nodeId: node.id,
        message: `${node.data.label} needs the characters to remove.`,
      }];
    }

    return [];
  }

  return validateResilience(node, config);
}

/**
 * Retry, deadline and continue-on-error apply to every node, so a value
 * outside the allowed range is worth catching before the run.
 */
function validateResilience(
  node: WorkflowNode,
  config: Record<string, unknown>,
): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];

  const retries = config.retries;

  if (
    retries !== undefined &&
    (typeof retries !== "number" || retries < 0 || retries > MAX_RETRIES)
  ) {
    issues.push({
      code: "invalid-retries",
      nodeId: node.id,
      message: `${node.data.label} can retry between 0 and ${MAX_RETRIES} times.`,
    });
  }

  const timeout = config.timeoutMs;

  if (
    timeout !== undefined &&
    (typeof timeout !== "number" || timeout < 0 || timeout > MAX_TIMEOUT_MS)
  ) {
    issues.push({
      code: "invalid-timeout",
      nodeId: node.id,
      message: `${node.data.label} needs a timeout between 0 and ${MAX_TIMEOUT_MS}ms.`,
    });
  }

  return issues;
}

export function validateConnection(workflow: Workflow, edge: WorkflowEdge): ValidationResult {
  const source = workflow.nodes.find((node) => node.id === edge.source);
  const target = workflow.nodes.find((node) => node.id === edge.target);
  const issues: WorkflowValidationIssue[] = [];
  if (!source || !target) issues.push({ code: "missing-node", message: "Both ends of a connection must exist." });
  if (edge.source === edge.target) issues.push({ code: "self-connection", message: "A node cannot connect to itself." });
  if (target && isTriggerNode(target.type)) issues.push({ code: "trigger-input", nodeId: target.id, message: `A ${target.data.label} cannot have an incoming connection.` });
  if (source?.type === "condition" && !isHandleOf(edge.sourceHandle, CONDITION_HANDLES)) issues.push({ code: "condition-handle", nodeId: source.id, message: "Conditions must use their True or False branch." });
  if (source?.type === "loop" && !isHandleOf(edge.sourceHandle, LOOP_HANDLES)) issues.push({ code: "loop-handle", nodeId: source.id, message: "Loops must use their Body handle to repeat, or the After handle to continue once." });
  if (source?.type === "switch" && !isHandleOf(edge.sourceHandle, switchHandles(readSwitchConfig(source.data.config)).map((handle) => handle.id))) issues.push({ code: "switch-handle", nodeId: source.id, message: `${source.data.label} only has the handles for its own cases and its default branch.` });
  if (source && source.type !== "condition" && source.type !== "loop" && source.type !== "switch" && edge.sourceHandle) issues.push({ code: "unexpected-handle", nodeId: source.id, message: "This node does not have named output branches." });
  if (workflow.edges.some((item) => item.source === edge.source && item.target === edge.target && item.sourceHandle === edge.sourceHandle)) issues.push({ code: "duplicate-edge", message: "That connection already exists." });
  if (source?.type === "condition" && workflow.edges.some((item) => item.source === edge.source && item.sourceHandle === edge.sourceHandle)) issues.push({ code: "duplicate-branch", nodeId: source.id, message: `The ${edge.sourceHandle === "true" ? "True" : "False"} branch is already connected.` });
  if (source?.type === "switch" && workflow.edges.some((item) => item.source === edge.source && item.sourceHandle === edge.sourceHandle)) issues.push({ code: "duplicate-branch", nodeId: source.id, message: `That ${edge.sourceHandle} branch is already connected.` });
  if (source?.type === "loop" && edge.sourceHandle === "after" && workflow.edges.some((item) => item.source === edge.source && item.sourceHandle === "after")) issues.push({ code: "duplicate-after", nodeId: source.id, message: "The After handle is already connected." });
  if (!issues.length && hasCycle({ ...workflow, edges: [...workflow.edges, edge] })) issues.push({ code: "cycle", message: "Connections cannot create a cycle." });
  return { valid: issues.length === 0, issues };
}

export function validateWorkflow(workflow: Workflow): ValidationResult {
  const issues: WorkflowValidationIssue[] = [];
  const triggers = workflow.nodes.filter((node) => isTriggerNode(node.type));
  if (workflow.nodes.length === 0) issues.push({ code: "empty", message: "Add a trigger to start building your workflow." });
  if (triggers.length !== 1) issues.push({ code: "trigger-count", message: "A workflow needs exactly one trigger, such as Manual Trigger or Webhook Trigger." });
  for (const node of workflow.nodes) {
    issues.push(...validateNodeConfig(node));
    /**
     * Variables are checked per node so the issue points at the node the
     * user has to fix.
     */
    for (const variableIssue of auditWorkflowVariables(workflow)) {
      if (variableIssue.nodeId === node.id) {
        issues.push({
          code: variableIssue.code,
          nodeId: variableIssue.nodeId,
          message: variableIssue.message,
        });
      }
    }

    if (node.type === "condition") {
      const branches = workflow.edges.filter((edge) => edge.source === node.id);
      if (!branches.some((edge) => edge.sourceHandle === "true") || !branches.some((edge) => edge.sourceHandle === "false")) {
        issues.push({ code: "missing-condition-branch", nodeId: node.id, message: `${node.data.label} needs both True and False branches.` });
      }
    }
    if (node.type === "loop") {
      const body = workflow.edges.filter((edge) => edge.source === node.id && edge.sourceHandle === "body");
      if (!body.length) {
        issues.push({ code: "empty-loop-body", nodeId: node.id, message: `${node.data.label} needs at least one node connected to its Body handle.` });
      }
    }
  }
  for (const edge of workflow.edges) {
    const others = validateConnection({ ...workflow, edges: workflow.edges.filter((item) => item.id !== edge.id) }, edge).issues;

    /**
     * Duplicates are reported once per connection below.
     */
    issues.push(...others.filter((issue) => issue.code !== "duplicate-edge"));
  }
  /**
   * `validateConnection` always receives the candidate edge on its own,
   * so an already saved duplicate has to be checked here.
   */
  const reportedDuplicates = new Set<string>();

  for (const edge of workflow.edges) {
    const key = `${edge.source}|${edge.target}|${edge.sourceHandle ?? ""}`;

    if (reportedDuplicates.has(key)) {
      continue;
    }

    const duplicate = workflow.edges.some(
      (item) =>
        item.id !== edge.id &&
        `${item.source}|${item.target}|${item.sourceHandle ?? ""}` === key,
    );

    if (duplicate) {
      reportedDuplicates.add(key);

      issues.push({
        code: "duplicate-edge",
        edgeId: edge.id,
        message: "The workflow contains the same connection twice.",
      });
    }
  }
  if (hasCycle(workflow)) issues.push({ code: "cycle", message: "The workflow contains a cycle." });
  return { valid: issues.length === 0, issues };
}
