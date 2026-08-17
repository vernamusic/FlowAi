"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

import { useCallback } from "react";
import { ExecutionLogs } from "@/components/workflow/execution/execution-logs";
import { WorkflowNode } from "@/components/workflow/nodes/workflow-node";
import { ExecutionPanel } from "@/components/workflow/execution/execution-panel";

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
   * React Flow Nodes
   *
   * Execution status is injected
   * into every node.
   */
  const nodes: Node[] =
    workflow?.nodes.map((node) => {
      const executionNode = execution?.nodes.find(
        (item) => item.nodeId === node.id,
      );

      return workflowNodeToReactFlowNode(node, executionNode?.status);
    }) ?? [];

  /**
   * React Flow Edges
   */
  const edges: Edge[] = workflow?.edges.map(workflowEdgeToReactFlowEdge) ?? [];

  /**
   * Node changes
   */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        /**
         * Node position changed
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
    [updateNodePosition, removeNode],
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

        <MiniMap />
      </ReactFlow>

      <ExecutionPanel />
      <div className="absolute bottom-4 right-4 z-20 w-[420px]">
        <ExecutionLogs />
      </div>
    </div>
  );
}
