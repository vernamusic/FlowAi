"use client";

import type { WorkflowVariable } from "@/types/workflow";

interface VariablePickerProps {
  variables: WorkflowVariable[];

  onSelect: (variable: WorkflowVariable) => void;
}

export function VariablePicker({ variables, onSelect }: VariablePickerProps) {
  if (variables.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <p className="text-xs text-zinc-600">No variables available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
      {variables.map((variable) => (
        <button
          key={`${variable.nodeId}-${variable.path}`}
          type="button"
          onClick={() => onSelect(variable)}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition hover:bg-zinc-800"
        >
          <div>
            <p className="text-xs font-medium text-zinc-300">{variable.key}</p>

            <p className="text-[10px] text-zinc-600">{variable.nodeLabel}</p>
          </div>

          <span className="text-[10px] text-zinc-600">{variable.type}</span>
        </button>
      ))}
    </div>
  );
}
