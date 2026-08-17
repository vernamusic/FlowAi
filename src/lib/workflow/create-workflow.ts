import type { Workflow } from "@/types/workflow";

export function createWorkflow(name = "Untitled Workflow"): Workflow {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),

    name,

    description: "",

    status: "draft",

    nodes: [],

    edges: [],

    createdAt: now,

    updatedAt: now,
  };
}
