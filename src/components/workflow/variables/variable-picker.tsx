"use client";

import { Braces, Check, Hash, Type, ToggleLeft, Box } from "lucide-react";

import type { WorkflowVariable } from "@/types/workflow";

interface VariablePickerProps {
  variables: WorkflowVariable[];
  onSelect: (variable: WorkflowVariable) => void;
}

function getVariableIcon(type: WorkflowVariable["type"]) {
  switch (type) {
    case "number":
      return Hash;

    case "boolean":
      return ToggleLeft;

    case "object":
      return Box;

    default:
      return Type;
  }
}

export function VariablePicker({ variables, onSelect }: VariablePickerProps) {
  if (variables.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Braces className="h-3.5 w-3.5" />

          <span>No variables available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="border-b border-zinc-800 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Variables
        </p>
      </div>

      <div className="p-1">
        {variables.map((variable) => {
          const Icon = getVariableIcon(variable.type);

          return (
            <button
              key={`${variable.nodeId}-${variable.key}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => onSelect(variable)}
              className="group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition hover:bg-zinc-900"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-zinc-500 group-hover:text-zinc-300">
                <Icon className="h-3.5 w-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-zinc-300">
                  {variable.path}
                </p>

                <p className="truncate text-[10px] text-zinc-600">
                  {variable.nodeLabel}
                </p>
              </div>

              <span className="text-[9px] text-zinc-700">{variable.type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
