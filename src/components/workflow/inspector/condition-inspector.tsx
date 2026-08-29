"use client";

import { GitBranch } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";

interface ConditionInspectorProps {
  nodeId: string;
}

const operators = [
  { value: "equals", label: "is equal to", needsValue: true },
  { value: "not_equals", label: "is not equal to", needsValue: true },
  { value: "contains", label: "contains", needsValue: true },
  { value: "not_contains", label: "does not contain", needsValue: true },
  { value: "greater_than", label: "is greater than", needsValue: true },
  { value: "less_than", label: "is less than", needsValue: true },
  { value: "is_empty", label: "is empty", needsValue: false },
  { value: "is_not_empty", label: "is not empty", needsValue: false },
  { value: "is_true", label: "is true", needsValue: false },
  { value: "is_false", label: "is false", needsValue: false },
] as const;

export function ConditionInspector({ nodeId }: ConditionInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );
  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const leftOperand =
    typeof node.data.config.leftOperand === "string"
      ? node.data.config.leftOperand
      : "";
  const operator =
    typeof node.data.config.operator === "string"
      ? node.data.config.operator
      : "equals";
  const rightOperand =
    typeof node.data.config.rightOperand === "string"
      ? node.data.config.rightOperand
      : "";
  const variables = getAvailableVariables(nodeId);
  const selectedOperator =
    operators.find((item) => item.value === operator) ?? operators[0];
  const hasValue = selectedOperator.needsValue;
  const updateConfig = (config: Record<string, string>) =>
    updateNodeConfig(nodeId, config);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Condition</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Evaluate data from an earlier node and route the workflow through a true or false branch.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label htmlFor="condition-variable" className="mb-2 block text-[11px] font-medium text-zinc-400">
            Value to evaluate
          </label>
          <select
            id="condition-variable"
            value={leftOperand}
            onChange={(event) => updateConfig({ leftOperand: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            <option value="">Select a variable</option>
            {variables.map((variable) => (
              <option key={`${variable.nodeId}-${variable.key}`} value={`{{${variable.key}}}`}>
                {variable.nodeLabel} · {variable.path}
              </option>
            ))}
          </select>
          {variables.length === 0 && (
            <p className="mt-2 text-[10px] leading-4 text-amber-400/80">
              Add and connect a node before this condition to evaluate its output.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="condition-operator" className="mb-2 block text-[11px] font-medium text-zinc-400">
            Rule
          </label>
          <select
            id="condition-operator"
            value={operator}
            onChange={(event) => updateConfig({ operator: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            {operators.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>

        {hasValue && (
          <div>
            <label htmlFor="condition-value" className="mb-2 block text-[11px] font-medium text-zinc-400">
              Comparison value
            </label>
            <VariableInput
              id="condition-value"
              value={rightOperand}
              variables={variables}
              onChange={(value) => updateConfig({ rightOperand: value })}
              placeholder="Enter a value or type {{ to use a variable"
              rows={2}
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Rule preview</p>
        <p className="mt-2 break-words text-xs leading-5 text-zinc-300">
          {leftOperand || "Select a variable"} {selectedOperator.label}{hasValue ? ` ${rightOperand || "a value"}` : ""}
        </p>
      </section>

      <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 p-3">
        <div className="flex gap-2">
          <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
          <p className="text-[10px] leading-5 text-zinc-400">
            Connect downstream nodes from the <span className="text-emerald-300">True</span> or <span className="text-red-300">False</span> handle on this node.
          </p>
        </div>
      </div>
    </div>
  );
}
