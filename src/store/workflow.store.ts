import { create } from "zustand";
import { createVariableKey } from "@/lib/workflow/variables/variable-context";
import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowVariable,
  WorkflowExecution,
} from "@/types/workflow";
import {
  executeWorkflow,
  type ExecutionEvent,
} from "@/lib/workflow/execution/execution-engine";
interface WorkflowState {
  workflow: Workflow | null;

  /**
   * Selected node
   */
  selectedNodeId: string | null;

  /**
   * Workflow
   */
  setWorkflow: (workflow: Workflow) => void;
  updateWorkflowName: (name: string) => void;
  resetWorkflow: () => void;

  /**
   * Node
   */
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  updateNodePosition: (
    nodeId: string,
    position: {
      x: number;
      y: number;
    },
  ) => void;
  removeNode: (nodeId: string) => void;

  /**
   * Node Data
   */
  updateNodeData: (
    nodeId: string,
    updates: Partial<WorkflowNode["data"]>,
  ) => void;

  /**
   * Node Config
   */
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;

  /**
   * Selection
   */
  selectNode: (nodeId: string | null) => void;

  /**
   * Edge
   */
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;

  getAvailableVariables: (nodeId: string) => WorkflowVariable[];

  execution: WorkflowExecution | null;

  runWorkflow: () => Promise<void>;

  clearExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: null,
  execution: null,
  selectedNodeId: null,

  // --------------------------------------------------
  // Workflow
  // --------------------------------------------------

  setWorkflow: (workflow) =>
    set({
      workflow,
      selectedNodeId: null,
    }),

  updateWorkflowName: (name) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,
          name,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  resetWorkflow: () =>
    set({
      workflow: null,
      selectedNodeId: null,
    }),

  // --------------------------------------------------
  // Node
  // --------------------------------------------------

  addNode: (node) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,
          nodes: [...state.workflow.nodes, node],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateNode: (nodeId, updates) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,

          nodes: state.workflow.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  ...updates,
                }
              : node,
          ),

          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateNodePosition: (nodeId, position) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,

          nodes: state.workflow.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  position,
                }
              : node,
          ),

          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeNode: (nodeId) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,

          nodes: state.workflow.nodes.filter((node) => node.id !== nodeId),

          edges: state.workflow.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId,
          ),

          updatedAt: new Date().toISOString(),
        },

        selectedNodeId:
          state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    }),

  // --------------------------------------------------
  // Node Data
  // --------------------------------------------------

  updateNodeData: (nodeId, updates) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,

          nodes: state.workflow.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,

                  data: {
                    ...node.data,
                    ...updates,
                  },
                }
              : node,
          ),

          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // --------------------------------------------------
  // Node Config
  // --------------------------------------------------

  updateNodeConfig: (nodeId, config) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,

          nodes: state.workflow.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,

                  data: {
                    ...node.data,

                    config: {
                      ...node.data.config,
                      ...config,
                    },
                  },
                }
              : node,
          ),

          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // --------------------------------------------------
  // Selection
  // --------------------------------------------------

  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
    }),

  // --------------------------------------------------
  // Edge
  // --------------------------------------------------

  addEdge: (edge) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,

          edges: [...state.workflow.edges, edge],

          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeEdge: (edgeId) =>
    set((state) => {
      if (!state.workflow) {
        return state;
      }

      return {
        workflow: {
          ...state.workflow,

          edges: state.workflow.edges.filter((edge) => edge.id !== edgeId),

          updatedAt: new Date().toISOString(),
        },
      };
    }),
  // --------------------------------------------------
  // Variables
  // --------------------------------------------------

  getAvailableVariables: (nodeId) => {
    const state = useWorkflowStore.getState();

    if (!state.workflow) {
      return [];
    }

    const nodeIndex = state.workflow.nodes.findIndex(
      (node) => node.id === nodeId,
    );

    if (nodeIndex === -1) {
      return [];
    }

    const availableNodes = state.workflow.nodes.slice(0, nodeIndex);

    const variables: WorkflowVariable[] = [];

    for (const node of availableNodes) {
      const key = createVariableKey(node);

      switch (node.type) {
        case "manual-trigger":
          variables.push(
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.name`,
              path: "name",
              type: "string",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.email`,
              path: "email",
              type: "string",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.userId`,
              path: "userId",
              type: "string",
            },
          );
          break;

        case "ai-prompt":
          variables.push({
            nodeId: node.id,
            nodeLabel: node.data.label,
            key: `${key}.response`,
            path: "response",
            type: "string",
          });
          break;

        case "http-request":
          variables.push(
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.status`,
              path: "status",
              type: "number",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.success`,
              path: "success",
              type: "boolean",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.data`,
              path: "data",
              type: "object",
            },
          );
          break;

        case "condition":
          variables.push({
            nodeId: node.id,
            nodeLabel: node.data.label,
            key: `${key}.result`,
            path: "result",
            type: "boolean",
          });
          break;
      }
    }

    return variables;
  },
  runWorkflow: async () => {
    const workflow = get().workflow;

    if (!workflow) {
      return;
    }

    await executeWorkflow(workflow, (event: ExecutionEvent) => {
      switch (event.type) {
        case "workflow-started":
          set({
            execution: event.execution,
          });

          break;

        case "node-started":
          set((state) => {
            if (!state.execution) {
              return state;
            }

            return {
              execution: {
                ...state.execution,

                nodes: state.execution.nodes.map((node) =>
                  node.nodeId === event.nodeId
                    ? {
                        ...node,
                        status: "running",
                        startedAt: new Date().toISOString(),
                      }
                    : node,
                ),
              },
            };
          });

          break;

        case "node-completed":
          set((state) => {
            if (!state.execution) {
              return state;
            }

            return {
              execution: {
                ...state.execution,

                nodes: state.execution.nodes.map((node) =>
                  node.nodeId === event.nodeId
                    ? {
                        ...node,
                        status: "success",
                        output: event.output,
                        completedAt: new Date().toISOString(),
                      }
                    : node,
                ),
              },
            };
          });

          break;

        case "node-failed":
          set((state) => {
            if (!state.execution) {
              return state;
            }

            return {
              execution: {
                ...state.execution,

                status: "error",

                nodes: state.execution.nodes.map((node) =>
                  node.nodeId === event.nodeId
                    ? {
                        ...node,
                        status: "error",
                        error: event.error,
                        completedAt: new Date().toISOString(),
                      }
                    : node,
                ),
              },
            };
          });

          break;

        case "workflow-completed":
          set({
            execution: event.execution,
          });

          break;

        case "log":
          set((state) => {
            if (!state.execution) {
              return state;
            }

            return {
              execution: {
                ...state.execution,

                logs: [...state.execution.logs, event.log],
              },
            };
          });

          break;
      }
    });
  },
  clearExecution: () =>
    set({
      execution: null,
    }),
}));
