"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

import { createWorkflowNode } from "@/lib/workflow/create-node";
import { useWorkflowStore } from "@/store/workflow.store";
import type { NodeType } from "@/types/workflow";

/**
 * Adds a node in the middle of what the user is looking at, and selects
 * it so the inspector opens on it.
 *
 * Shared by the node library and the command palette.
 */
export function useAddNodeAtCenter() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkflowStore((state) => state.addNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);

  return useCallback(
    (type: NodeType) => {
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const node = createWorkflowNode({
        type,
        position: {
          x: center.x - 128,
          y: center.y - 60,
        },
      });

      addNode(node);
      selectNode(node.id);
    },
    [addNode, screenToFlowPosition, selectNode],
  );
}