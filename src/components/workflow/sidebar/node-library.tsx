"use client";

import { NODE_DEFINITIONS } from "@/constants/nodes";

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

export function NodeLibrary() {
  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    type: string,
  ) => {
    event.dataTransfer.setData("application/flowai-node", type);

    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <h2 className="text-sm font-semibold">Node Library</h2>

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
                      draggable
                      onDragStart={(event) => handleDragStart(event, node.type)}
                      className="flex cursor-grab items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-zinc-800 hover:bg-zinc-900 active:cursor-grabbing"
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
