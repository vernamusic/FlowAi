import { create } from "zustand";
import { createVariableKey } from "@/lib/workflow/variables/variable-context";
import {
  deleteSavedWorkflow,
  getSavedWorkflow,
  saveWorkflow,
} from "@/lib/workflow/workflow-storage";
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
import {
  validateConnection,
  validateWorkflow,
  type ValidationResult,
  type WorkflowValidationIssue,
} from "@/lib/workflow/validation";
import {
  getExecutionHistory,
  saveExecution,
} from "@/lib/workflow/execution/execution-storage";
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
  loadWorkflow: (workflowId: string) => boolean;
  saveCurrentWorkflow: () => void;
  deleteWorkflow: (workflowId: string) => void;
  updateWorkflowName: (name: string) => void;
  resetWorkflow: () => void;
  replaceWorkflow: (workflow: Workflow) => void;

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
  duplicateNode: (nodeId: string) => void;

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
  addEdge: (edge: WorkflowEdge) => ValidationResult;
  removeEdge: (edgeId: string) => void;

  editorIssues: WorkflowValidationIssue[];
  clearEditorIssues: () => void;
  validateCurrentWorkflow: () => ValidationResult;

  historyPast: Workflow[];
  historyFuture: Workflow[];
  undo: () => void;
  redo: () => void;

  getAvailableVariables: (nodeId: string) => WorkflowVariable[];

  execution: WorkflowExecution | null;

  isExecutionPanelOpen: boolean;
  isExecutionLogsOpen: boolean;
  runWorkflow: (options?: { dryRun?: boolean }) => Promise<void>;
  cancelWorkflow: () => void;
  retryWorkflow: () => Promise<void>;
  getExecutionReadiness: () => ValidationResult;
  executionHistory: WorkflowExecution[];
  activeExecutionController: AbortController | null;

  closeExecutionPanel: () => void;
  closeExecutionLogs: () => void;
  clearExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: null,
  execution: null,
  executionHistory: [],
  activeExecutionController: null,
  selectedNodeId: null,

  isExecutionPanelOpen: false,
  isExecutionLogsOpen: false,
  editorIssues: [],
  historyPast: [],
  historyFuture: [],

  // --------------------------------------------------
  // Workflow
  // --------------------------------------------------

  setWorkflow: (workflow) =>
    set({
      workflow,
      selectedNodeId: null,
      editorIssues: [],
      historyPast: [],
      historyFuture: [],
    }),

  loadWorkflow: (workflowId) => {
    const workflow = getSavedWorkflow(workflowId);

    if (!workflow) {
      return false;
    }

    set({
      workflow,
      execution: null,
      executionHistory: getExecutionHistory(workflowId),
      selectedNodeId: null,
      editorIssues: validateWorkflow(workflow).issues,
      historyPast: [],
      historyFuture: [],
    });

    return true;
  },

  saveCurrentWorkflow: () => {
    const workflow = get().workflow;

    if (workflow) {
      saveWorkflow(workflow);
    }
  },

  deleteWorkflow: (workflowId) => {
    deleteSavedWorkflow(workflowId);

    if (get().workflow?.id === workflowId) {
      set({
        workflow: null,
        execution: null,
        selectedNodeId: null,
        editorIssues: [],
        historyPast: [],
        historyFuture: [],
      });
    }
  },

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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
      };
    }),

  resetWorkflow: () =>
    set({
      workflow: null,
      execution: null,
      selectedNodeId: null,
      editorIssues: [],
      historyPast: [],
      historyFuture: [],
    }),

  replaceWorkflow: (workflow) =>
    set((state) => ({
      workflow: {
        ...workflow,
        id: state.workflow?.id ?? workflow.id,
        updatedAt: new Date().toISOString(),
      },
      execution: null,
      selectedNodeId: null,
      editorIssues: validateWorkflow(workflow).issues,
      historyPast: state.workflow
        ? [...state.historyPast.slice(-49), state.workflow]
        : [],
      historyFuture: [],
    })),

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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
      };
    }),

  duplicateNode: (nodeId) =>
    set((state) => {
      if (!state.workflow) return state;
      const node = state.workflow.nodes.find((item) => item.id === nodeId);
      if (!node) return state;
      const copy: WorkflowNode = {
        ...node,
        id: crypto.randomUUID(),
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: { ...node.data, label: `${node.data.label} copy`, config: { ...node.data.config } },
      };
      return {
        workflow: { ...state.workflow, nodes: [...state.workflow.nodes, copy], updatedAt: new Date().toISOString() },
        selectedNodeId: copy.id,
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
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

  addEdge: (edge) => {
    const workflow = get().workflow;
    if (!workflow) return { valid: false, issues: [{ code: "no-workflow", message: "Open a workflow before connecting nodes." }] };
    const result = validateConnection(workflow, edge);
    if (!result.valid) {
      set({ editorIssues: result.issues });
      return result;
    }
    set((state) => ({
      workflow: state.workflow ? { ...state.workflow, edges: [...state.workflow.edges, edge], updatedAt: new Date().toISOString() } : null,
      editorIssues: [],
      historyPast: state.workflow ? [...state.historyPast.slice(-49), state.workflow] : state.historyPast,
      historyFuture: [],
    }));
    return result;
  },

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
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
      };
    }),
  clearEditorIssues: () => set({ editorIssues: [] }),
  validateCurrentWorkflow: () => {
    const workflow = get().workflow;
    const result = workflow
      ? validateWorkflow(workflow)
      : { valid: false, issues: [{ code: "no-workflow", message: "No workflow is open." }] };
    set({ editorIssues: result.issues });
    return result;
  },
  undo: () => set((state) => {
    const previous = state.historyPast.at(-1);
    if (!previous || !state.workflow) return state;
    return { workflow: previous, selectedNodeId: null, editorIssues: [], historyPast: state.historyPast.slice(0, -1), historyFuture: [state.workflow, ...state.historyFuture] };
  }),
  redo: () => set((state) => {
    const next = state.historyFuture[0];
    if (!next || !state.workflow) return state;
    return { workflow: next, selectedNodeId: null, editorIssues: [], historyPast: [...state.historyPast, state.workflow], historyFuture: state.historyFuture.slice(1) };
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

    /**
     * Nodes inside a loop body also see the current item and index.
     */
    const loopVariable = findNearestLoopVariable(state.workflow, nodeId);

    if (loopVariable) {
      variables.push(...loopVariable);
    }

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

          /**
           * Parsed values only exist when the node asks for JSON or a
           * structured output, so the variable follows the node config.
           */
          if (
            node.data.config.responseFormat === "json" ||
            node.data.config.responseFormat === "schema"
          ) {
            variables.push({
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.parsed`,
              path: "parsed",
              type: "object",
            });
          }
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

        case "webhook-trigger":
          variables.push(
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.body`,
              path: "body",
              type: "object",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.query`,
              path: "query",
              type: "object",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.method`,
              path: "method",
              type: "string",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.url`,
              path: "url",
              type: "string",
            },
          );
          break;

        case "transform": {
          /**
           * The output name is configurable, so it is read from the node
           * config instead of being fixed per type.
           */
          const name =
            typeof node.data.config.name === "string" &&
            node.data.config.name.trim()
              ? node.data.config.name.trim()
              : "result";
          const valueType =
            typeof node.data.config.valueType === "string"
              ? node.data.config.valueType
              : "string";

          variables.push({
            nodeId: node.id,
            nodeLabel: node.data.label,
            key: `${key}.${name}`,
            path: name,
            type:
              valueType === "number"
                ? "number"
                : valueType === "boolean"
                  ? "boolean"
                  : valueType === "object" || valueType === "array"
                    ? "object"
                    : "string",
          });
          break;
        }

        case "json-parser":
          variables.push(
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.data`,
              path: "data",
              type: "object",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.found`,
              path: "found",
              type: "boolean",
            },
          );
          break;

        case "loop":
          variables.push(
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.count`,
              path: "count",
              type: "number",
            },
            {
              nodeId: node.id,
              nodeLabel: node.data.label,
              key: `${key}.results`,
              path: "results",
              type: "object",
            },
          );
          break;

        case "delay":
          variables.push({
            nodeId: node.id,
            nodeLabel: node.data.label,
            key: `${key}.waitedMs`,
            path: "waitedMs",
            type: "number",
          });
          break;

        case "output":
          variables.push({
            nodeId: node.id,
            nodeLabel: node.data.label,
            key: `${key}.message`,
            path: "message",
            type: "string",
          });
          break;
      }
    }

    return variables;
  },
  getExecutionReadiness: () => {
    const workflow = get().workflow;
    if (!workflow) return { valid: false, issues: [{ code: "no-workflow", message: "Open a workflow before running it." }] };
    return validateWorkflow(workflow);
  },
  runWorkflow: async (options = {}) => {
    const workflow = get().workflow;

    if (!workflow) {
      return;
    }

    const validation = validateWorkflow(workflow);
    if (!validation.valid) {
      set({ editorIssues: validation.issues });
      return;
    }

    const controller = new AbortController();
    set({
      isExecutionPanelOpen: true,
      isExecutionLogsOpen: true,
      execution: null,
      activeExecutionController: controller,
    });

    const result = await executeWorkflow(workflow, (event: ExecutionEvent) => {
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

        case "node-skipped":
          set((state) => state.execution ? {
            execution: {
              ...state.execution,
              nodes: state.execution.nodes.map((node) => node.nodeId === event.nodeId ? { ...node, status: "skipped", error: event.reason } : node),
            },
          } : state);
          break;

        case "node-stream":
          /**
           * Progressive output so the panel can render a response while
           * the model is still writing it.
           */
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
                        output: {
                          ...(node.output ?? {}),
                          response: event.accumulated,
                          streaming: true,
                        },
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
    }, options);
    saveExecution(result);
    set((state) => ({
      execution: result,
      executionHistory: [result, ...state.executionHistory.filter((item) => item.id !== result.id)].slice(0, 20),
      activeExecutionController: null,
    }));
  },
  cancelWorkflow: () => get().activeExecutionController?.abort(),
  retryWorkflow: async () => {
    const last = get().execution;
    if (!last) return;
    await get().runWorkflow({ dryRun: last.mode === "dry-run" });
  },
  // --------------------------------------------------
  // Execution UI
  // --------------------------------------------------

  closeExecutionPanel: () =>
    set({
      isExecutionPanelOpen: false,
    }),

  closeExecutionLogs: () =>
    set({
      isExecutionLogsOpen: false,
    }),

  clearExecution: () =>
    set({
      execution: null,
      isExecutionPanelOpen: false,
      isExecutionLogsOpen: false,
    }),
}));

if (typeof window !== "undefined") {
  useWorkflowStore.subscribe((state, previousState) => {
    if (state.workflow && state.workflow !== previousState.workflow) {
      saveWorkflow(state.workflow);
    }
  });
}

/**
 * Item variables exposed by the closest loop upstream of a node.
 *
 * They only exist while the node runs inside an iteration, so they are
 * not tied to a node id and must not be nested under its output key.
 */
function findNearestLoopVariable(
  workflow: Workflow,
  nodeId: string,
): WorkflowVariable[] | null {
  const visited = new Set<string>();
  const queue = workflow.edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);

  while (queue.length > 0) {
    const currentNodeId = queue.shift();

    if (!currentNodeId || visited.has(currentNodeId)) {
      continue;
    }

    visited.add(currentNodeId);

    const node = workflow.nodes.find((item) => item.id === currentNodeId);

    if (!node) {
      continue;
    }

    if (node.type === "loop") {
      const itemName =
        typeof node.data.config.itemName === "string" &&
        node.data.config.itemName.trim()
          ? node.data.config.itemName.trim()
          : "item";
      const indexName =
        typeof node.data.config.indexName === "string" &&
        node.data.config.indexName.trim()
          ? node.data.config.indexName.trim()
          : "index";

      return [
        {
          nodeId: node.id,
          nodeLabel: node.data.label,
          key: itemName,
          path: itemName,
          type: "string",
        },
        {
          nodeId: node.id,
          nodeLabel: node.data.label,
          key: indexName,
          path: indexName,
          type: "number",
        },
        {
          nodeId: node.id,
          nodeLabel: node.data.label,
          key: `${itemName}Count`,
          path: `${itemName}Count`,
          type: "number",
        },
      ];
    }

    for (const edge of workflow.edges) {
      if (edge.target === node.id) {
        queue.push(edge.source);
      }
    }
  }

  return null;
}
