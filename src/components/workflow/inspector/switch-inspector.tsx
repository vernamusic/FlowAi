"use client";

import { ListTree, Plus, Trash2 } from "lucide-react";

import { COMPARISON_OPERATORS } from "@/lib/workflow/execution/nodes/comparison";
import {
  MAX_SWITCH_RULES,
  defaultSwitchRules,
  readSwitchConfig,
  switchHandle,
  type SwitchRule,
} from "@/lib/workflow/execution/nodes/switch";
import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";

interface SwitchInspectorProps {
  nodeId: string;
}

export function SwitchInspector({ nodeId }: SwitchInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const removeEdge = useWorkflowStore((state) => state.removeEdge);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readSwitchConfig(node.data.config);
  const variables = getAvailableVariables(nodeId);

  const writeRules = (rules: SwitchRule[]) =>
    updateNodeConfig(nodeId, { rules });

  const updateRule = (index: number, patch: Partial<SwitchRule>) =>
    writeRules(
      config.rules.map((rule, position) =>
        position === index ? { ...rule, ...patch } : rule,
      ),
    );

  /**
   * Handles are positional, so removing a case renumbers the ones after
   * it. What was connected to the removed case cannot survive that: the
   * handle it was on now belongs to a different case, so its edge goes
   * with it rather than quietly re-pointing at the wrong branch.
   */
  const removeRule = (index: number) => {
    const removedHandle = config.rules[index].handle;

    for (const edge of workflow?.edges ?? []) {
      if (edge.source === nodeId && edge.sourceHandle === removedHandle) {
        removeEdge(edge.id);
      }
    }

    writeRules(
      config.rules
        .filter((_, position) => position !== index)
        .map((rule, position) => ({ ...rule, handle: switchHandle(position) })),
    );
  };

  const addRule = () => {
    if (config.rules.length >= MAX_SWITCH_RULES) return;

    writeRules([
      ...config.rules,
      {
        ...defaultSwitchRules()[0],
        handle: switchHandle(config.rules.length),
        label: `Case ${config.rules.length + 1}`,
      },
    ]);
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Cases</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Each case is checked from the top down, and the first one that
          matches takes the run. If none match, the default branch continues.
        </p>
      </div>

      {config.rules.map((rule, index) => {
        const operator =
          COMPARISON_OPERATORS.find((item) => item.value === rule.operator) ??
          COMPARISON_OPERATORS[0];

        return (
          <section
            key={index}
            className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-[10px] font-medium text-zinc-400">
                {index + 1}
              </span>

              <input
                type="text"
                value={rule.label}
                onChange={(event) => updateRule(index, { label: event.target.value })}
                aria-label={`Case ${index + 1} name`}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] font-medium text-zinc-200 outline-none focus:border-violet-400"
              />

              {config.rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  aria-label={`Remove ${rule.label}`}
                  title={`Remove ${rule.label} and anything connected to it`}
                  className="shrink-0 rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>

            <label className="block">
              <span className="text-[10px] text-zinc-500">Value</span>

              <select
                value={
                  variables.some(
                    (variable) => `{{${variable.key}}}` === String(rule.leftOperand),
                  )
                    ? String(rule.leftOperand)
                    : ""
                }
                onChange={(event) =>
                  updateRule(index, { leftOperand: event.target.value })
                }
                aria-label={`${rule.label} value`}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200 outline-none focus:border-violet-400"
              >
                <option value="">Select a variable</option>

                {variables.map((variable) => (
                  <option key={`${variable.nodeId}-${variable.key}`} value={`{{${variable.key}}}`}>
                    {variable.nodeLabel} · {variable.path}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] text-zinc-500">Rule</span>

              <select
                value={rule.operator}
                onChange={(event) => updateRule(index, { operator: event.target.value })}
                aria-label={`${rule.label} rule`}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-200 outline-none focus:border-violet-400"
              >
                {COMPARISON_OPERATORS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {operator.needsValue && (
              <label className="block">
                <span className="text-[10px] text-zinc-500">Compared with</span>

                <VariableInput
                  value={String(rule.rightOperand ?? "")}
                  variables={variables}
                  onChange={(value) => updateRule(index, { rightOperand: value })}
                  placeholder="Enter a value or type {{ to use a variable"
                  rows={2}
                />
              </label>
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={addRule}
        disabled={config.rules.length >= MAX_SWITCH_RULES}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-800 py-2 text-[11px] text-zinc-400 transition hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        {config.rules.length >= MAX_SWITCH_RULES
          ? `Up to ${MAX_SWITCH_RULES} cases`
          : "Add a case"}
      </button>

      <div>
        <label
          htmlFor="switch-default-label"
          className="mb-2 block text-[11px] font-medium text-zinc-400"
        >
          Default branch name
        </label>

        <input
          id="switch-default-label"
          type="text"
          value={config.defaultLabel}
          onChange={(event) =>
            updateNodeConfig(nodeId, { defaultLabel: event.target.value })
          }
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
        />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <ListTree className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p className="text-[10px] leading-5 text-zinc-400">
            Each case adds a handle to the right of the node, named after its
            position. The run reports the case it took as{" "}
            <code className="text-zinc-300">matched</code>, so a later node can
            branch on it.
          </p>
        </div>
      </div>
    </div>
  );
}