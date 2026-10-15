"use client";

import { Webhook } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";

import {
  readWebhookTriggerConfig,
  type WebhookMethod,
} from "@/lib/workflow/execution/nodes/webhook-trigger";

interface WebhookTriggerInspectorProps {
  nodeId: string;
}

const methods: WebhookMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const samplePayload = `{
  "event": "order.created",
  "orderId": "ord_1024",
  "customer": {
    "email": "amir@example.com",
    "plan": "pro"
  },
  "items": 3
}`;

export function WebhookTriggerInspector({
  nodeId,
}: WebhookTriggerInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) return null;

  const config = readWebhookTriggerConfig(node.data.config);
  const updateConfig = (patch: Record<string, unknown>) =>
    updateNodeConfig(nodeId, patch);

  let payloadError: string | null = null;

  if (config.payload.trim()) {
    try {
      JSON.parse(config.payload);
    } catch (error) {
      payloadError =
        error instanceof Error ? error.message : "The payload is not valid JSON.";
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-medium text-zinc-300">Webhook Trigger</p>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">
          Simulate an incoming webhook. Paste the body a service would send and
          the rest of the workflow treats it like a real request.
        </p>
      </div>

      <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 p-3">
        <div className="flex gap-2">
          <Webhook className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
          <p className="text-[10px] leading-5 text-zinc-400">
            FlowAI runs in your browser, so nothing is listening on a public
            URL. Use this node to replay a real payload while you build, then
            swap in a hosted trigger when you deploy.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <label
            htmlFor="webhook-method"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Method
          </label>

          <select
            id="webhook-method"
            value={config.method}
            onChange={(event) => updateConfig({ method: event.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-violet-400"
          >
            {methods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="webhook-path"
            className="mb-2 block text-[11px] font-medium text-zinc-400"
          >
            Path
          </label>

          <input
            id="webhook-path"
            value={config.path}
            onChange={(event) => updateConfig({ path: event.target.value })}
            placeholder="/webhooks/orders?source=stripe"
            spellCheck={false}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-violet-400"
          />

          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            A query string becomes the <code className="text-zinc-400">query</code>{" "}
            variable.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="webhook-payload"
              className="text-[11px] font-medium text-zinc-400"
            >
              Request body
            </label>

            <button
              type="button"
              onClick={() => updateConfig({ payload: samplePayload })}
              className="text-[10px] text-zinc-500 underline decoration-zinc-700 underline-offset-2 transition hover:text-zinc-300"
            >
              Use sample
            </button>
          </div>

          <textarea
            id="webhook-payload"
            value={config.payload}
            onChange={(event) => updateConfig({ payload: event.target.value })}
            rows={10}
            spellCheck={false}
            placeholder={samplePayload}
            className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-[11px] leading-5 text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-zinc-600"
          />

          {payloadError ? (
            <p className="mt-2 text-[10px] leading-4 text-red-400">
              Invalid JSON: {payloadError}
            </p>
          ) : (
            <p className="mt-2 text-[10px] leading-4 text-zinc-600">
              Downstream nodes read it as{" "}
              <code className="text-zinc-400">body</code>, for example{" "}
              <code className="text-zinc-400">
                {`{{${"webhook_trigger"}.customer.email}}`}
              </code>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}