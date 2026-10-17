import { create } from "zustand";
import { getAvailableVariables as resolveAvailableVariables } from "@/lib/workflow/variables/variable-scope";
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

  /**
   * Node position
   *
   * Moving a node reports a change for every step of the drag, so the
   * position is applied without touching history. `beginNodeDrag` and
   * `endNodeDrag` bracket the drag and record a single undo step for it,
   * and only if the node actually ended up somewhere else.
   */
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  beginNodeDrag: () => void;
  endNodeDrag: () => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;

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
  selectedEdgeId: string | null;
  selectEdge: (edgeId: string | null) => void;
  addEdge: (edge: WorkflowEdge) => ValidationResult;
  removeEdge: (edgeId: string) => void;

  editorIssues: WorkflowValidationIssue[];
  validateCurrentWorkflow: () => ValidationResult;

  historyPast: Workflow[];
  historyFuture: Workflow[];
  undo: () => void;
  redo: () => void;

  getAvailableVariables: (nodeId: string) => WorkflowVariable[];

  execution: WorkflowExecution | null;

  runWorkflow: (options?: { dryRun?: boolean }) => Promise<void>;
  cancelWorkflow: () => void;
  retryWorkflow: () => Promise<void>;
  getExecutionReadiness: () => ValidationResult;
  executionHistory: WorkflowExecution[];
  activeExecutionController: AbortController | null;

  clearExecution: () => void;
}

/**
 * The workflow as it was before a drag started.
 *
 * Kept outside the store state on purpose: it is only read once, when the
 * drag ends, and nothing renders from it.
 */
let dragSnapshot: Workflow | null = null;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: null,
  execution: null,
  executionHistory: [],
  activeExecutionController: null,
  selectedNodeId: null,
  selectedEdgeId: null,

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

  /**
   * One undo step per drag, taken before the first movement, so undo
   * takes the node back to where the drag started rather than one
   * pixel at a time.
   */
  beginNodeDrag: () => {
    dragSnapshot = get().workflow;
  },

  endNodeDrag: () =>
    set((state) => {
      const before = dragSnapshot;

      dragSnapshot = null;

      if (!before || !state.workflow) {
        return state;
      }

      /**
       * A click on a node is a drag that ends where it started, and it
       * shouldn't cost the user an undo press.
       */
      const moved = before.nodes.some((node) => {
        const current = state.workflow?.nodes.find(
          (item) => item.id === node.id,
        );

        return (
          !current ||
          current.position.x !== node.position.x ||
          current.position.y !== node.position.y
        );
      });

      if (!moved) {
        return state;
      }

      return {
        historyPast: [...state.historyPast.slice(-49), before],
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

      /**
       * Only one thing can be selected at a time, so the Delete key
       * always has an unambiguous target.
       */
      selectedEdgeId: null,
    }),

  selectEdge: (edgeId) =>
    set({
      selectedEdgeId: edgeId,
      selectedNodeId: null,
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
        selectedEdgeId:
          state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
        historyPast: [...state.historyPast.slice(-49), state.workflow],
        historyFuture: [],
      };
    }),
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
    const workflow = get().workflow;

    /**
     * Availability follows the graph, not the node order, so only
     * variables that are actually wired above the node are offered.
     */
    return workflow ? resolveAvailableVariables(workflow, nodeId) : [];
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

  clearExecution: () =>
    set({
      execution: null,
    }),
}));

if (typeof window !== "undefined") {
  useWorkflowStore.subscribe((state, previousState) => {
    if (state.workflow && state.workflow !== previousState.workflow) {
      saveWorkflow(state.workflow);
    }
  });
}