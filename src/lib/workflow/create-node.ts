import { NODE_DEFINITIONS } from "@/constants/nodes";

import type {
  NodeType,
  WorkflowNode,
  WorkflowVariable,
} from "@/types/workflow";

interface CreateNodeOptions {
  type: NodeType;

  position: {
    x: number;
    y: number;
  };
}

function getDefaultOutputs(
  type: NodeType,
  nodeId: string,
  label: string,
): WorkflowVariable[] {
  if (type === "manual-trigger") {
    return [
      {
        nodeId,
        nodeLabel: label,
        key: "name",
        path: "trigger.name",
        type: "string",
      },

      {
        nodeId,
        nodeLabel: label,
        key: "email",
        path: "trigger.email",
        type: "string",
      },

      {
        nodeId,
        nodeLabel: label,
        key: "userId",
        path: "trigger.userId",
        type: "string",
      },
    ];
  }

  return [];
}

export function createWorkflowNode({
  type,
  position,
}: CreateNodeOptions): WorkflowNode {
  const definition = NODE_DEFINITIONS.find((node) => node.type === type);

  if (!definition) {
    throw new Error(`Unknown node type: ${type}`);
  }

  const id = crypto.randomUUID();

  return {
    id,

    type,

    position,

    data: {
      label: definition.label,

      description: definition.description,

      category: definition.category,

      config: {},

      outputs: getDefaultOutputs(type, id, definition.label),
    },
  };
}
