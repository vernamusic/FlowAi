"use client";

import {
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Activity, ChevronDown, MousePointer2 } from "lucide-react";

import { ExecutionLogs } from "@/components/workflow/execution/execution-logs";
import { ExecutionPanel } from "@/components/workflow/execution/execution-panel";
import { WalkthroughTrigger } from "@/components/workflow/onboarding/walkthrough";
import { TemplateGallery } from "@/components/workflow/templates/template-gallery";
import { WorkflowNode } from "@/components/workflow/nodes/workflow-node";

import { createWorkflowNode } from "@/lib/workflow/create-node";

import {
  workflowEdgeToReactFlowEdge,
  workflowNodeToReactFlowNode,
} from "@/lib/workflow/react-flow-adapter";

import { useWorkflowStore } from "@/store/workflow.store";
import { validateConnection } from "@/lib/workflow/validation";

import type { NodeType } from "@/types/workflow";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

export function WorkflowCanvas() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const execution = useWorkflowStore((state) => state.execution);
  const editorIssues = useWorkflowStore((state) => state.editorIssues);
  const [isDockOpen, setIsDockOpen] = useState(false);

  /**
   * The dock covers the bottom of the canvas, so it stays out of the way
   * until a run is happening or the user asks for it.
   */
  const isDockVisible = isDockOpen || execution?.status === "running";
  const hasExecution = Boolean(execution);

  const addNode = useWorkflowStore((state) => state.addNode);
  const addEdge = useWorkflowStore((state) => state.addEdge);
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const removeEdge = useWorkflowStore((state) => state.removeEdge);

  const updateNodePosition = useWorkflowStore(
    (state) => state.updateNodePosition,
  );

  const selectNode = useWorkflowStore((state) => state.selectNode);

  const { screenToFlowPosition } = useReactFlow();

  /**
   * Build React Flow nodes from workflow state.
   *
   * This is the external/source representation.
   */
  const workflowNodes = useMemo<Node[]>(() => {
    return (
      workflow?.nodes.map((node) => {
        const executionNode = execution?.nodes.find(
          (item) => item.nodeId === node.id,
        );

        return workflowNodeToReactFlowNode(node, executionNode?.status);
      }) ?? []
    );
  }, [workflow, execution]);

  /**
   * React Flow keeps its own internal node state.
   *
   * This is important because React Flow needs to store
   * measured width/height of every node.
   */
  const [nodes, setNodes] = useNodesState(workflowNodes);

  /**
   * Sync external workflow changes into React Flow.
   *
   * We intentionally don't recreate nodes on every render.
   * Otherwise React Flow can lose its measured dimensions.
   */
  useEffect(() => {
    setNodes((currentNodes) => {
      return workflowNodes.map((newNode) => {
        const currentNode = currentNodes.find((node) => node.id === newNode.id);

        if (!currentNode) {
          return newNode;
        }

        return {
          ...newNode,

          /**
           * Preserve React Flow's internal measurement.
           */
          width: currentNode.width,
          height: currentNode.height,
          measured: currentNode.measured,

          /**
           * Preserve current React Flow position.
           */
          position: currentNode.position,
        };
      });
    });
  }, [workflowNodes, setNodes]);

  /**
   * Edges
   */
  const edges: Edge[] = useMemo(() => {
    return workflow?.edges.map(workflowEdgeToReactFlowEdge) ?? [];
  }, [workflow]);

  /**
   * Node changes
   */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      /**
       * IMPORTANT:
       *
       * Apply ALL React Flow changes.
       *
       * This includes:
       *
       * - position
       * - dimensions
       * - select
       * - remove
       * - etc.
       *
       * Dimensions are required for MiniMap.
       */
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));

      /**
       * Sync only workflow-related changes to Zustand.
       */
      changes.forEach((change) => {
        /**
         * Position changed
         */
        if (change.type === "position" && change.position) {
          updateNodePosition(change.id, {
            x: change.position.x,
            y: change.position.y,
          });
        }

        /**
         * Node removed
         */
        if (change.type === "remove") {
          removeNode(change.id);
        }
      });
    },
    [setNodes, updateNodePosition, removeNode],
  );

  /**
   * Edge changes
   */
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        if (change.type === "remove") {
          removeEdge(change.id);
        }
      });
    },
    [removeEdge],
  );

  /**
   * Drag over canvas
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    event.dataTransfer.dropEffect = "move";
  }, []);

  /**
   * Drop new node
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData(
        "application/flowai-node",
      ) as NodeType;

      if (!nodeType) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const node = createWorkflowNode({
        type: nodeType,
        position,
      });

      addNode(node);
    },
    [screenToFlowPosition, addNode],
  );

  /**
   * Connect nodes
   */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      addEdge({
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      });
    },
    [addEdge],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!workflow || !connection.source || !connection.target) return false;
      return validateConnection(workflow, {
        id: "connection-preview",
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      }).valid;
    },
    [workflow],
  );

  /**
   * Select node
   */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  /**
   * Deselect node
   */
  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        fitView
        colorMode="dark"
      >
        <Background />

        <Controls />

        <MiniMap
          nodeColor={(node) => {
            const category = (
              node.data as {
                category?: string;
              }
            )?.category;

            switch (category) {
              case "trigger":
                return "#f59e0b";

              case "ai":
                return "#8b5cf6";

              case "logic":
                return "#3b82f6";

              case "action":
                return "#10b981";

              default:
                return "#71717a";
            }
          }}
          nodeStrokeWidth={0}
          maskColor="rgba(0, 0, 0, 0.65)"
          pannable
          zoomable
        />
      </ReactFlow>

      {!workflow?.nodes.length && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950/95 p-5 text-left shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <MousePointer2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Empty canvas</h2>
                <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                  Add a template, or drag a trigger from the node library.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <TemplateGallery variant="compact" limit={3} title="Start from a template" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
              <p className="text-[10px] leading-4 text-zinc-600">
                New here? The tour takes about a minute.
              </p>

              <WalkthroughTrigger className="shrink-0 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:bg-zinc-800 hover:text-white" />
            </div>
          </div>
        </div>
      )}

      {editorIssues.length > 0 && (
        <div className="absolute right-3 top-3 z-20 max-w-sm rounded-xl border border-amber-500/30 bg-zinc-950/95 p-3 shadow-xl backdrop-blur">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs font-medium text-amber-200">Workflow needs attention</p>
              <ul className="mt-1 space-y-1 text-[11px] leading-4 text-zinc-400">
                {editorIssues.slice(0, 3).map((issue, index) => <li key={`${issue.code}-${issue.nodeId ?? index}`}>{issue.message}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {hasExecution && !isDockVisible && (
        <button
          type="button"
          onClick={() => setIsDockOpen(true)}
          aria-label="Show execution details"
          className="absolute bottom-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/95 px-3 py-2 text-[11px] text-zinc-300 shadow-xl backdrop-blur transition hover:border-zinc-700 sm:bottom-4"
        >
          <Activity className="h-3.5 w-3.5" />
          Execution
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              execution?.status === "error" ? "bg-red-400" : "bg-emerald-400"
            }`}
          />
        </button>
      )}

      <div className="absolute bottom-3 left-1/2 z-20 flex max-h-[60vh] w-[calc(100%-1.5rem)] max-w-[460px] -translate-x-1/2 flex-col gap-3 sm:bottom-4 sm:w-[460px]">
        {isDockVisible && (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsDockOpen(false)}
                aria-label="Hide execution details"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/95 px-3 py-1.5 text-[10px] text-zinc-400 shadow-lg backdrop-blur transition hover:text-zinc-100"
              >
                <ChevronDown className="h-3 w-3" />
                Hide
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto">
              <ExecutionLogs />
            </div>

            <ExecutionPanel />
          </>
        )}
      </div>
    </div>
  );
}
