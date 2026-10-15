import { NODE_DEFINITIONS } from "@/constants/nodes";
import { createWorkflow } from "@/lib/workflow/create-workflow";

import type {
  NodeCategory,
  NodeType,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "@/types/workflow";

/**
 * A ready made workflow users can start from.
 *
 * `build` returns a brand new workflow every time, so instantiating a
 * template twice never shares node ids.
 */
export interface WorkflowTemplate {
  id: string;

  name: string;

  description: string;

  category: NodeCategory;

  /** Node types the template uses, without duplicates. */
  nodeTypes: NodeType[];

  /** Short list of what the template demonstrates. */
  highlights: string[];

  difficulty: "starter" | "intermediate";

  build: (name?: string) => Workflow;
}

const horizontalStep = 320;

interface DraftNode {
  type: NodeType;

  label: string;

  config?: Record<string, unknown>;

  x: number;

  y: number;
}

interface DraftEdge {
  from: number;

  to: number;

  handle?: string;
}

/**
 * Small builder that keeps template definitions readable.
 */
function createTemplateBuilder(nodes: DraftNode[], edges: DraftEdge[]) {
  const definitions = nodes.map((node) => {
    const definition = NODE_DEFINITIONS.find((item) => item.type === node.type);

    if (!definition) {
      throw new Error(`Unknown node type in template: ${node.type}`);
    }

    return {
      id: crypto.randomUUID(),
      type: node.type,
      position: { x: node.x, y: node.y },
      data: {
        label: node.label,
        description: definition.description,
        category: definition.category,
        config: { ...(node.config ?? {}) },
        outputs: [],
      },
    } satisfies WorkflowNode;
  });

  const templateEdges: WorkflowEdge[] = edges.map((edge) => ({
    id: crypto.randomUUID(),
    source: definitions[edge.from]?.id ?? "",
    target: definitions[edge.to]?.id ?? "",
    sourceHandle: edge.handle,
  }));

  return { definitions, templateEdges };
}

function defineTemplate(options: {
  id: string;

  name: string;

  description: string;

  category: NodeCategory;

  difficulty: "starter" | "intermediate";

  highlights: string[];

  nodes: DraftNode[];

  edges: DraftEdge[];
}): WorkflowTemplate {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: options.category,
    difficulty: options.difficulty,
    highlights: options.highlights,
    nodeTypes: [...new Set(options.nodes.map((node) => node.type))],
    build: (name?: string) => {
      const { definitions, templateEdges } = createTemplateBuilder(
        options.nodes,
        options.edges,
      );

      const workflow = createWorkflow(name ?? options.name);
      const now = new Date().toISOString();

      return {
        ...workflow,
        nodes: definitions,
        edges: templateEdges.filter(
          (edge) => edge.source !== "" && edge.target !== "",
        ),
        createdAt: now,
        updatedAt: now,
      };
    },
  };
}

const SENTIMENT_SCHEMA = JSON.stringify(
  {
    type: "object",
    additionalProperties: false,
    properties: {
      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
      confidence: { type: "number" },
      reason: { type: "string" },
    },
    required: ["sentiment", "confidence", "reason"],
  },
  null,
  2,
);

const CONTACT_SCHEMA = JSON.stringify(
  {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      company: { type: ["string", "null"] },
    },
    required: ["name", "email", "company"],
  },
  null,
  2,
);

/**
 * Starter workflows shipped with the app.
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  defineTemplate({
    id: "ai-assistant",
    name: "AI assistant",
    description:
      "Send a prompt to a model and hand the answer to a notification. The smallest useful AI workflow.",
    category: "ai",
    difficulty: "starter",
    highlights: [
      "One trigger, one AI call, one output",
      "Variables flow from node to node",
      "Text response format",
    ],
    nodes: [
      {
        type: "manual-trigger",
        label: "Manual Trigger",
        config: { name: "Amir", email: "amir@example.com", userId: "user_123" },
        x: 0,
        y: 80,
      },
      {
        type: "ai-prompt",
        label: "Write a reply",
        config: {
          providerId: "openai",
          apiStyle: "responses",
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 400,
          responseFormat: "text",
          stream: true,
          instructions: "You are a concise assistant.",
          prompt:
            "Write a short, friendly reply to a note from {{manual_trigger.name}}.\n\nNote: {{manual_trigger.email}} asked for a follow up.",
        },
        x: horizontalStep,
        y: 80,
      },
      {
        type: "output",
        label: "Send reply",
        config: {
          message: "Draft reply: {{write_a_reply.response}}",
          level: "info",
          channel: "both",
        },
        x: horizontalStep * 2,
        y: 80,
      },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
  }),

  defineTemplate({
    id: "http-request",
    name: "Call an API",
    description:
      "Fetch a public API, parse the JSON, and show the part you care about.",
    category: "action",
    difficulty: "starter",
    highlights: [
      "HTTP request with variables in the URL",
      "JSON parsing with a path",
      "Output node reports the result",
    ],
    nodes: [
      {
        type: "manual-trigger",
        label: "Manual Trigger",
        config: { name: "Amir" },
        x: 0,
        y: 80,
      },
      {
        type: "http-request",
        label: "Fetch user",
        config: {
          method: "GET",
          url: "https://jsonplaceholder.typicode.com/users/1",
          headers: [],
          timeout: 10000,
          authType: "none",
        },
        x: horizontalStep,
        y: 80,
      },
      {
        type: "json-parser",
        label: "Read name",
        config: {
          input: "{{fetch_user.data}}",
          path: "name",
        },
        x: horizontalStep * 2,
        y: 80,
      },
      {
        type: "output",
        label: "Report name",
        config: {
          message: "Fetched {{read_name.data}} (found: {{read_name.found}})",
          level: "success",
          channel: "log",
        },
        x: horizontalStep * 3,
        y: 80,
      },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
  }),

  defineTemplate({
    id: "condition-routing",
    name: "Route with a condition",
    description:
      "Check whether a score passes a threshold, then take a different path for each outcome.",
    category: "logic",
    difficulty: "intermediate",
    highlights: [
      "True and False branches",
      "Numeric comparison",
      "Different output per branch",
    ],
    nodes: [
      {
        type: "manual-trigger",
        label: "Manual Trigger",
        config: { name: "Amir" },
        x: 0,
        y: 160,
      },
      {
        type: "transform",
        label: "Score",
        config: { name: "score", value: "72", valueType: "number" },
        x: horizontalStep,
        y: 160,
      },
      {
        type: "condition",
        label: "Score above 50",
        config: {
          leftOperand: "{{score.score}}",
          operator: "greater_than",
          rightOperand: "50",
        },
        x: horizontalStep * 2,
        y: 160,
      },
      {
        type: "output",
        label: "Pass",
        config: {
          message: "Score {{score.score}} passed the check.",
          level: "success",
          channel: "both",
        },
        x: horizontalStep * 3,
        y: 60,
      },
      {
        type: "output",
        label: "Fail",
        config: {
          message: "Score {{score.score}} did not pass the check.",
          level: "warning",
          channel: "log",
        },
        x: horizontalStep * 3,
        y: 260,
      },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3, handle: "true" },
      { from: 2, to: 4, handle: "false" },
    ],
  }),

  defineTemplate({
    id: "loop-batch",
    name: "Batch process with a loop",
    description:
      "Run the same AI call once per item and summarise the run afterwards.",
    category: "logic",
    difficulty: "intermediate",
    highlights: [
      "Body and After handles",
      "Item and index variables",
      "Results collected after the loop",
    ],
    nodes: [
      {
        type: "manual-trigger",
        label: "Manual Trigger",
        config: { name: "Amir" },
        x: 0,
        y: 140,
      },
      {
        type: "json-parser",
        label: "Read topics",
        config: {
          input:
            '["pricing feedback", "onboarding questions", "billing confusion"]',
          path: "",
        },
        x: horizontalStep,
        y: 140,
      },
      {
        type: "loop",
        label: "For each topic",
        config: {
          items: "{{read_topics.data}}",
          itemName: "topic",
          indexName: "index",
          maxIterations: 10,
          stopOnError: true,
        },
        x: horizontalStep * 2,
        y: 140,
      },
      {
        type: "ai-prompt",
        label: "Summarize topic",
        config: {
          providerId: "openai",
          apiStyle: "responses",
          model: "gpt-4o-mini",
          temperature: 0.4,
          maxTokens: 160,
          responseFormat: "text",
          stream: true,
          prompt:
            "Summarize the feedback about {{topic}} in one sentence. Topic {{index}} of {{topicCount}}.",
        },
        x: horizontalStep * 3,
        y: 140,
      },
      {
        type: "output",
        label: "Batch done",
        config: {
          message:
            "Processed {{for_each_topic.count}} topics. Last one: {{summarize_topic.response}}",
          level: "success",
          channel: "both",
        },
        x: horizontalStep * 4,
        y: 140,
      },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3, handle: "body" },
      { from: 2, to: 4, handle: "after" },
    ],
  }),

  defineTemplate({
    id: "structured-extraction",
    name: "Extract structured data",
    description:
      "Turn messy text into a JSON object that matches a schema you define.",
    category: "ai",
    difficulty: "intermediate",
    highlights: [
      "Structured output with a JSON schema",
      "Parsed value is a variable",
      "Validation before the run",
    ],
    nodes: [
      {
        type: "manual-trigger",
        label: "Manual Trigger",
        config: { name: "Amir" },
        x: 0,
        y: 80,
      },
      {
        type: "ai-prompt",
        label: "Extract contact",
        config: {
          providerId: "openai",
          apiStyle: "responses",
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokens: 300,
          responseFormat: "schema",
          jsonSchema: CONTACT_SCHEMA,
          instructions: "You extract data verbatim and return null when a value is missing.",
          prompt:
            'Extract the contact details from this note:\n\n"Hi, I am Dana from Northwind. Reach me at dana@northwind.example."',
        },
        x: horizontalStep,
        y: 80,
      },
      {
        type: "transform",
        label: "Company",
        config: {
          name: "company",
          value: "{{extract_contact.parsed.company}}",
          valueType: "string",
        },
        x: horizontalStep * 2,
        y: 80,
      },
      {
        type: "output",
        label: "Report contact",
        config: {
          message:
            "{{extract_contact.parsed.name}} works at {{company.company}} ({{extract_contact.parsed.email}})",
          level: "info",
          channel: "both",
        },
        x: horizontalStep * 3,
        y: 80,
      },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
  }),

  defineTemplate({
    id: "sentiment-triage",
    name: "Webhook triage",
    description:
      "Replay a webhook payload, judge the sentiment, and route urgent messages.",
    category: "logic",
    difficulty: "intermediate",
    highlights: [
      "Simulated webhook payload",
      "JSON mode response",
      "Condition on a parsed value",
    ],
    nodes: [
      {
        type: "webhook-trigger",
        label: "Webhook Trigger",
        config: {
          method: "POST",
          path: "/hooks/feedback?source=app",
          payload:
            '{\n  "message": "Billing charged twice this month",\n  "email": "amir@example.com"\n}',
        },
        x: 0,
        y: 140,
      },
      {
        type: "ai-prompt",
        label: "Judge sentiment",
        config: {
          providerId: "openai",
          apiStyle: "responses",
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokens: 200,
          responseFormat: "schema",
          jsonSchema: SENTIMENT_SCHEMA,
          instructions: "You are a support triage classifier.",
          prompt:
            "Classify the sentiment of this customer message from {{webhook_trigger.body.email}}:\n\n{{webhook_trigger.body.message}}",
        },
        x: horizontalStep,
        y: 140,
      },
      {
        type: "condition",
        label: "Negative sentiment",
        config: {
          leftOperand: "{{judge_sentiment.parsed.sentiment}}",
          operator: "equals",
          rightOperand: "negative",
        },
        x: horizontalStep * 2,
        y: 140,
      },
      {
        type: "output",
        label: "Escalate",
        config: {
          message:
            "Escalate to a human: {{judge_sentiment.parsed.reason}}",
          level: "error",
          channel: "both",
        },
        x: horizontalStep * 3,
        y: 60,
      },
      {
        type: "output",
        label: "Close ticket",
        config: {
          message: "No escalation needed: {{judge_sentiment.parsed.sentiment}}",
          level: "info",
          channel: "log",
        },
        x: horizontalStep * 3,
        y: 240,
      },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3, handle: "true" },
      { from: 2, to: 4, handle: "false" },
    ],
  }),
];

export function findWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((template) => template.id === id);
}

/**
 * Instantiate a template as a brand new workflow.
 */
export function createWorkflowFromTemplate(
  templateId: string,
  name?: string,
): Workflow | null {
  const template = findWorkflowTemplate(templateId);

  return template ? template.build(name) : null;
}

/**
 * Add a template to an existing workflow.
 *
 * The nodes are placed to the right of whatever is already on the canvas.
 * When the workflow already has a trigger, the template's trigger is
 * dropped and its first step is wired to the existing one, because a
 * workflow can only have a single entry point.
 */
export function addTemplateToWorkflow(
  workflow: Workflow,
  templateId: string,
): Workflow | null {
  const template = findWorkflowTemplate(templateId);

  if (!template) {
    return null;
  }

  const source = template.build();
  const existingTriggers = workflow.nodes.filter((node) =>
    isTriggerType(node.type),
  );

  const dropTriggers = existingTriggers.length > 0;
  const droppedTriggerIds = new Set(
    source.nodes.filter((node) => isTriggerType(node.type)).map((node) => node.id),
  );
  const keptNodes = dropTriggers
    ? source.nodes.filter((node) => !droppedTriggerIds.has(node.id))
    : source.nodes;

  /**
   * Rewire the first step of the template onto the existing trigger.
   */
  const adoptedIds = new Set(
    source.edges
      .filter(
        (edge) =>
          droppedTriggerIds.has(edge.source) &&
          keptNodes.some((node) => node.id === edge.target),
      )
      .map((edge) => edge.target),
  );

  const anchor = existingTriggers[0];
  const offsetX = workflow.nodes.length
    ? Math.max(...workflow.nodes.map((node) => node.position.x)) + horizontalStep * 1.6
    : 0;
  const offsetY = workflow.nodes.length
    ? Math.round(
        workflow.nodes.reduce((total, node) => total + node.position.y, 0) /
          workflow.nodes.length,
      )
    : 0;

  /**
   * Fresh ids for the copied nodes, so the template can be added more
   * than once and never collides with what is already there.
   */
  const idMap = new Map(keptNodes.map((node) => [node.id, crypto.randomUUID()]));
  const now = new Date().toISOString();

  return {
    ...workflow,
    nodes: [
      ...workflow.nodes,
      ...keptNodes.map((node) => ({
        ...node,
        id: idMap.get(node.id)!,
        position: { x: node.position.x + offsetX, y: node.position.y + offsetY },
      })),
    ],
    edges: [
      ...workflow.edges,
      ...source.edges
        .filter(
          (edge) =>
            keptNodes.some((node) => node.id === edge.source) &&
            keptNodes.some((node) => node.id === edge.target),
        )
        .map((edge) => ({
          ...edge,
          id: crypto.randomUUID(),
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
        })),
      ...(anchor && dropTriggers
        ? [...adoptedIds].map((targetNodeId) => ({
            id: crypto.randomUUID(),
            source: anchor.id,
            target: idMap.get(targetNodeId)!,
          }))
        : []),
    ],
    updatedAt: now,
  };
}

function isTriggerType(type: NodeType): boolean {
  return type === "manual-trigger" || type === "webhook-trigger";
}