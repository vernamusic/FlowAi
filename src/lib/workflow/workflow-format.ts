import { NODE_DEFINITIONS } from "@/constants/nodes";

import type { NodeType, Workflow, WorkflowNode } from "@/types/workflow";

/**
 * The file format for an exported workflow.
 *
 * Exports carry a version so that a file written by an older FlowAI can
 * still be opened by a newer one, and so that a file written by a newer
 * one is refused rather than half-read.
 */

export const WORKFLOW_FORMAT_KIND = "flowai-workflow";

/**
 * Version 1 was a bare workflow object with no envelope at all.
 * Version 2 wraps it and says so.
 */
export const WORKFLOW_FORMAT_VERSION = 2;

export interface WorkflowExportFile {
  kind: typeof WORKFLOW_FORMAT_KIND;

  /** Schema version of the workflow inside. */
  version: number;

  exportedAt: string;

  /**
   * Which FlowAI wrote it. Useful when a file turns up somewhere
   * unexpected, and harmless to ignore on import.
   */
  exportedBy?: string;

  workflow: Workflow;
}

export interface WorkflowImportResult {
  workflow: Workflow | null;

  /**
   * The version the file was written with, when it was not the current
   * one. The UI says so rather than migrating silently.
   */
  migratedFrom?: number;

  error?: string;
}

export function createWorkflowExport(
  workflow: Workflow,
  exportedBy = "FlowAI",
): WorkflowExportFile {
  return {
    kind: WORKFLOW_FORMAT_KIND,
    version: WORKFLOW_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    workflow,
  };
}

/**
 * Which node types this build understands.
 *
 * Read from the node registry rather than a second list, because a list
 * that can fall behind is exactly how an import starts rejecting files
 * that are perfectly valid.
 */
function isKnownNodeType(type: unknown): type is NodeType {
  return NODE_DEFINITIONS.some((definition) => definition.type === type);
}

/**
 * Bring any accepted shape up to the current model.
 *
 * Everything optional is filled in here rather than being required of the
 * file, because the whole point of a version number is that a file does
 * not have to be written by this build.
 */
function normalizeWorkflow(value: unknown): Workflow | null {
  if (!value || typeof value !== "object") return null;

  const workflow = value as Partial<Workflow>;

  if (
    typeof workflow.name !== "string" ||
    !Array.isArray(workflow.nodes) ||
    !Array.isArray(workflow.edges)
  ) {
    return null;
  }

  const nodes = workflow.nodes as WorkflowNode[];

  if (
    !nodes.every(
      (node) =>
        typeof node?.id === "string" &&
        isKnownNodeType(node.type) &&
        typeof node.position?.x === "number" &&
        typeof node.position?.y === "number" &&
        typeof node.data?.label === "string" &&
        typeof node.data?.description === "string" &&
        typeof node.data?.config === "object" &&
        node.data.config !== null,
    )
  ) {
    return null;
  }

  const edges = workflow.edges;

  if (
    !edges.every(
      (edge) =>
        typeof edge?.id === "string" &&
        typeof edge.source === "string" &&
        typeof edge.target === "string",
    )
  ) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id:
      typeof workflow.id === "string" && workflow.id
        ? workflow.id
        : crypto.randomUUID(),

    name: workflow.name.trim() || "Imported Workflow",

    description: typeof workflow.description === "string" ? workflow.description : "",

    status: workflow.status === "published" ? "published" : "draft",

    /**
     * An older file may have carried per-node output lists that the
     * current model discovers at run time.
     */
    nodes: nodes.map((node) => ({
      ...node,
      data: { ...node.data, outputs: node.data.outputs ?? [] },
    })),

    edges: edges.map((edge) => ({
      ...edge,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
    })),

    createdAt:
      typeof workflow.createdAt === "string" ? workflow.createdAt : now,

    /**
     * An imported workflow has just changed, whatever the file said.
     */
    updatedAt: now,
  };
}

/**
 * Read a file that may have been written by any earlier version.
 */
export function readWorkflowImport(value: unknown): WorkflowImportResult {
  if (!value || typeof value !== "object") {
    return { workflow: null, error: "That file does not contain a workflow." };
  }

  const envelope = value as Partial<WorkflowExportFile>;
  const isEnvelope = envelope.kind === WORKFLOW_FORMAT_KIND;

  if (isEnvelope && typeof envelope.version !== "number") {
    return {
      workflow: null,
      error: "This export does not say which format version it is.",
    };
  }

  const version = isEnvelope ? (envelope.version as number) : 1;

  if (version > WORKFLOW_FORMAT_VERSION) {
    return {
      workflow: null,
      error: `This file was written by a newer FlowAI (format v${version}, this build reads up to v${WORKFLOW_FORMAT_VERSION}). Update FlowAI to open it.`,
    };
  }

  const payload = isEnvelope ? envelope.workflow : value;
  const workflow = normalizeWorkflow(payload);

  if (!workflow) {
    return {
      workflow: null,
      error: "The file is not a valid FlowAI workflow, or it uses a node this build does not have.",
    };
  }

  return {
    workflow,
    migratedFrom: version < WORKFLOW_FORMAT_VERSION ? version : undefined,
  };
}