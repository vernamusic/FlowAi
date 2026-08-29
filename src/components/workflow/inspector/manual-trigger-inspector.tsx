"use client";

import { Play, Sparkles } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";

interface ManualTriggerInspectorProps {
  nodeId: string;
}

const fields = [
  {
    key: "name",
    label: "Name",
    placeholder: "Ada Lovelace",
    autoComplete: "name",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "ada@example.com",
    autoComplete: "email",
  },
  {
    key: "userId",
    label: "User ID",
    placeholder: "user_123",
    autoComplete: "off",
  },
] as const;

const defaults: Record<(typeof fields)[number]["key"], string> = {
  name: "Amir",
  email: "amir@example.com",
  userId: "user_123",
};

export function ManualTriggerInspector({ nodeId }: ManualTriggerInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) {
    return null;
  }

  const updateValue = (key: (typeof fields)[number]["key"], value: string) => {
    updateNodeConfig(nodeId, { [key]: value });
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Manual Trigger</p>

        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Starts the workflow when you select Run Workflow. Use these values to test downstream nodes.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-300">Test data</p>

          <p className="mt-1 text-[10px] leading-4 text-zinc-600">
            This payload is available to every connected node during execution.
          </p>
        </div>

        <div className="space-y-3">
          {fields.map((field) => {
            const configuredValue = node.data.config[field.key];
            const value =
              typeof configuredValue === "string"
                ? configuredValue
                : defaults[field.key];

            return (
              <div key={field.key}>
                <label
                  htmlFor={`manual-trigger-${field.key}`}
                  className="mb-2 block text-[11px] font-medium text-zinc-400"
                >
                  {field.label}
                </label>

                <input
                  id={`manual-trigger-${field.key}`}
                  value={value}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-400"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Available variables
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {fields.map((field) => (
            <code
              key={field.key}
              className="rounded-md bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400"
            >
              {`{{manual_trigger.${field.key}}}`}
            </code>
          ))}
        </div>
      </section>

      <div className="flex gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3 text-[10px] leading-5 text-zinc-400">
        <Play className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
        <p>
          This is a start node. It has no inputs and can begin a workflow immediately.
        </p>
      </div>
    </div>
  );
}
