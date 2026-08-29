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

import { useCallback, useEffect, useMemo } from "react";

import { ExecutionLogs } from "@/components/workflow/execution/execution-logs";
import { ExecutionPanel } from "@/components/workflow/execution/execution-panel";
import { WorkflowNode } from "@/components/workflow/nodes/workflow-node";

import { createWorkflowNode } from "@/lib/workflow/create-node";

import {
  workflowEdgeToReactFlowEdge,
  workflowNodeToReactFlowNode,
} from "@/lib/workflow/react-flow-adapter";

import { useWorkflowStore } from "@/store/workflow.store";

import type { NodeType } from "@/types/workflow";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

export function WorkflowCanvas() {
  const workflow = useWorkflowStore((state) => state.workflow);
  const execution = useWorkflowStore((state) => state.execution);

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

      <div className="absolute bottom-4 left-1/2 z-20 flex w-[460px] -translate-x-1/2 flex-col gap-3">
        <ExecutionLogs />

        <ExecutionPanel />
      </div>
    </div>
  );
}
