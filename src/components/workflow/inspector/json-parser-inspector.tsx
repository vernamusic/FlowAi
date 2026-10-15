"use client";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";
import { ResolvedPreview } from "../variables/resolved-preview";

import {
  getByPath,
  readJsonParserConfig,
} from "@/lib/workflow/execution/nodes/json-parser";

interface JsonParserInspectorProps {
  nodeId: string;
}

export function JsonParserInspector({ nodeId }: JsonParserInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readJsonParserConfig(node.data.config);
  const variables = getAvailableVariables(nodeId);
  const updateConfig = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  let error: string | null = null;
  let preview: string | null = null;

  if (config.input.trim()) {
    try {
      const parsed = JSON.parse(config.input);
      const value = config.path ? getByPath(parsed, config.path) : parsed;

      preview = JSON.stringify(value ?? null, null, 2);
    } catch (parseError) {
      error =
        parseError instanceof Error
          ? parseError.message
          : "The input is not valid JSON.";
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">JSON Parser</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Turn a JSON payload into a value the rest of the workflow can use,
          optionally picking a single field out of it.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="json-input"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Input
          </label>

          <VariableInput
            id="json-input"
            value={config.input}
            variables={variables}
            onChange={(value) => updateConfig({ input: value })}
            placeholder="{{http_request.data}}"
            rows={5}
          />

          <ResolvedPreview
            nodeId={nodeId}
            value={config.input}
            format="json"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Paste JSON directly or point at a variable that holds it.
          </p>
        </div>

        <div>
          <label
            htmlFor="json-path"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Path <span className="font-normal text-zinc-600">(optional)</span>
          </label>

          <input
            id="json-path"
            value={config.path}
            onChange={(event) => updateConfig({ path: event.target.value })}
            placeholder="data.items[0].id"
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-400"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Dot notation with array indexes. Leave it empty to keep the whole
            payload.
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-3">
          <p className="text-[10px] leading-4 text-red-300">{error}</p>
        </div>
      ) : (
        preview !== null && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Result preview
            </p>

            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-zinc-300">
              {preview}
            </pre>
          </section>
        )
      )}

      <p className="text-[10px] leading-4 text-zinc-600">
        Downstream nodes read the parsed value as{" "}
        <code className="text-zinc-400">data</code> and a{" "}
        <code className="text-zinc-400">found</code> flag, so you can branch on
        a missing path instead of failing.
      </p>
    </div>
  );
}