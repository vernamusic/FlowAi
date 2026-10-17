"use client";

import { Calculator } from "lucide-react";

import { MATH_FUNCTIONS, evaluateExpression } from "@/lib/workflow/execution/nodes/math-expression";
import { readMathConfig } from "@/lib/workflow/execution/nodes/math";
import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";

interface MathInspectorProps {
  nodeId: string;
}

export function MathInspector({ nodeId }: MathInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readMathConfig(node.data.config);
  const variables = getAvailableVariables(nodeId);
  const update = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  /**
   * Checked while typing, so a formula that cannot be read says so here
   * rather than only when the run fails.
   */
  const problem = config.expression
    ? (() => {
        try {
          evaluateExpression(config.expression);

          return null;
        } catch (error) {
          return error instanceof Error ? error.message : "This formula cannot be read.";
        }
      })()
    : null;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Calculate</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Work out a number from values earlier in the run, such as a price
          with tax or a cost per item.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="math-expression"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Expression
          </label>

          <VariableInput
            id="math-expression"
            value={config.expression}
            variables={variables}
            onChange={(value) => update({ expression: value })}
            placeholder="(120 * 0.2) + round(4.6)"
            rows={3}
          />

          {problem && (
            <p
              role="alert"
              className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 text-[10px] leading-4 text-red-300"
            >
              {problem}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="math-name"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Call the result
          </label>

          <input
            id="math-name"
            type="text"
            value={config.name}
            onChange={(event) => update({ name: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          />
        </div>
      </section>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex gap-2">
          <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />

          <p className="text-[10px] leading-5 text-zinc-400">
            Supports <code className="text-zinc-300">+ - * / % ^</code>,
            parentheses, and{" "}
            {MATH_FUNCTIONS.map((name) => (
              <span key={name}>
                <code className="text-zinc-300">{name}()</code>{" "}
              </span>
            ))}
            . A formula is arithmetic only: it cannot call anything else in
            the browser.
          </p>
        </div>
      </div>
    </div>
  );
}