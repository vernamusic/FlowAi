"use client";

import { useReactFlow } from "@xyflow/react";

import { NODE_DEFINITIONS } from "@/constants/nodes";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { useWorkflowStore } from "@/store/workflow.store";
import type { NodeType } from "@/types/workflow";

import { HelpTip } from "@/components/ui/help-tip";

const categories = [
  {
    id: "trigger",
    label: "Triggers",
  },
  {
    id: "ai",
    label: "AI",
  },
  {
    id: "logic",
    label: "Logic",
  },
  {
    id: "action",
    label: "Actions",
  },
] as const;

interface NodeLibraryProps {
  className?: string;
}

export function NodeLibrary({ className = "" }: NodeLibraryProps) {
  const { screenToFlowPosition } = useReactFlow();
  const addNodeToWorkflow = useWorkflowStore((state) => state.addNode);
  const selectNodeInWorkflow = useWorkflowStore((state) => state.selectNode);

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    type: string,
  ) => {
    event.dataTransfer.setData("application/flowai-node", type);

    event.dataTransfer.effectAllowed = "move";
  };

  /**
   * Clicking adds the node in the middle of the view, which is the only
   * way to build a workflow on a touch device.
   */
  const handleAdd = (type: NodeType) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const node = createWorkflowNode({
      type,
      position: {
        x: position.x - 128,
        y: position.y - 60,
      },
    });

    addNodeToWorkflow(node);
    selectNodeInWorkflow(node.id);
  };

  return (
    <aside
      className={`h-full w-64 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 ${className}`}
    >
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Node Library</h2>

          <HelpTip label="About the node library">
            Drag a node onto the canvas, or click it to add the node to the
            middle of your view. Ten node types cover triggers, AI, logic, and
            actions.
          </HelpTip>
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          Drag nodes onto the canvas.
        </p>
      </div>

      <div className="space-y-6 p-4">
        {categories.map((category) => {
          const nodes = NODE_DEFINITIONS.filter(
            (node) => node.category === category.id,
          );

          return (
            <div key={category.id}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                {category.label}
              </p>

              <div className="space-y-1">
                {nodes.map((node) => {
                  const Icon = node.icon;

                  return (
                    <div
                      key={node.type}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => handleDragStart(event, node.type)}
                      onClick={() => handleAdd(node.type)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleAdd(node.type);
                        }
                      }}
                      title={`Add ${node.label} to the canvas`}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-zinc-800 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:cursor-grabbing"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
                        <Icon className="h-4 w-4 text-zinc-400" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">
                          {node.label}
                        </p>

                        <p className="truncate text-xs text-zinc-600">
                          {node.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
