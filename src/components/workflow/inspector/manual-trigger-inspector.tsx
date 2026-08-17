"use client";

interface ManualTriggerInspectorProps {
  nodeId: string;
}

export function ManualTriggerInspector({
  nodeId,
}: ManualTriggerInspectorProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium text-zinc-300">Manual Trigger</p>

        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Starts the workflow manually.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-[11px] text-zinc-500">No configuration required.</p>
      </div>
    </div>
  );
}
