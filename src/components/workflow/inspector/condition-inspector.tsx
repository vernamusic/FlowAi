"use client";

interface ConditionInspectorProps {
  nodeId: string;
}

export function ConditionInspector({ nodeId }: ConditionInspectorProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-zinc-300">Condition</p>

        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Evaluate a condition and control workflow branching.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-[11px] text-zinc-500">
          Condition configuration coming next.
        </p>
      </div>
    </div>
  );
}
