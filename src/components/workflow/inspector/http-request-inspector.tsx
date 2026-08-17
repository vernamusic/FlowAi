"use client";

import { Plus, Trash2 } from "lucide-react";

import { useWorkflowStore } from "@/store/workflow.store";
import { VariableInput } from "../variables/variable-input";
import type { WorkflowVariable } from "@/types/workflow";
interface HTTPRequestInspectorProps {
  nodeId: string;
}

interface KeyValueItem {
  id: string;
  key: string;
  value: string;
}

export function HTTPRequestInspector({ nodeId }: HTTPRequestInspectorProps) {
  const workflow = useWorkflowStore((state) => state.workflow);

  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const getAvailableVariables = useWorkflowStore(
    (state) => state.getAvailableVariables,
  );

  const node = workflow?.nodes.find((item) => item.id === nodeId);

  if (!node) {
    return null;
  }

  const config = node.data.config;

  const method = typeof config.method === "string" ? config.method : "GET";

  const url = typeof config.url === "string" ? config.url : "";

  const body = typeof config.body === "string" ? config.body : "";

  const authType =
    typeof config.authType === "string" ? config.authType : "none";

  const headers = Array.isArray(config.headers)
    ? (config.headers as KeyValueItem[])
    : [];

  const queryParams = Array.isArray(config.queryParams)
    ? (config.queryParams as KeyValueItem[])
    : [];

  const variables = getAvailableVariables(nodeId);

  const updateConfig = (key: string, value: unknown) => {
    updateNodeConfig(nodeId, {
      [key]: value,
    });
  };

  const updateListItem = (
    listName: "headers" | "queryParams",
    id: string,
    key: keyof KeyValueItem,
    value: string,
  ) => {
    const list = listName === "headers" ? headers : queryParams;

    const nextList = list.map((item) =>
      item.id === id
        ? {
            ...item,
            [key]: value,
          }
        : item,
    );

    updateConfig(listName, nextList);
  };

  const addListItem = (listName: "headers" | "queryParams") => {
    const list = listName === "headers" ? headers : queryParams;

    updateConfig(listName, [
      ...list,
      {
        id: crypto.randomUUID(),
        key: "",
        value: "",
      },
    ]);
  };

  const removeListItem = (listName: "headers" | "queryParams", id: string) => {
    const list = listName === "headers" ? headers : queryParams;

    updateConfig(
      listName,
      list.filter((item) => item.id !== id),
    );
  };

  return (
    <div className="space-y-7">
      {/* Request */}

      <section className="space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-300">Request</p>

          <p className="mt-1 text-[10px] leading-4 text-zinc-600">
            Configure the HTTP request endpoint.
          </p>
        </div>

        {/* Method */}

        <div>
          <label className="mb-2 block text-[11px] font-medium text-zinc-400">
            Method
          </label>

          <select
            value={method}
            onChange={(event) => updateConfig("method", event.target.value)}
            className="
              w-full
              rounded-lg
              border
              border-zinc-800
              bg-zinc-900
              px-3
              py-2.5
              text-xs
              text-zinc-200
              outline-none
              focus:border-zinc-600
            "
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        {/* URL */}

        <div>
          <label className="mb-2 block text-[11px] font-medium text-zinc-400">
            URL
          </label>

          <VariableInput
            value={url}
            variables={variables}
            onChange={(value) => updateConfig("url", value)}
            placeholder="https://api.example.com/users/{{...}}"
            rows={3}
          />
        </div>
      </section>

      {/* Query Params */}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-300">Query Params</p>

            <p className="mt-1 text-[10px] text-zinc-600">
              Parameters added to the request URL.
            </p>
          </div>

          <button
            type="button"
            onClick={() => addListItem("queryParams")}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {queryParams.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center">
            <p className="text-[10px] text-zinc-700">No query parameters</p>
          </div>
        )}

        {queryParams.map((item) => (
          <KeyValueRow
            key={item.id}
            item={item}
            variables={variables}
            onChange={(key, value) =>
              updateListItem("queryParams", item.id, key, value)
            }
            onRemove={() => removeListItem("queryParams", item.id)}
          />
        ))}
      </section>

      {/* Headers */}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-300">Headers</p>

            <p className="mt-1 text-[10px] text-zinc-600">
              HTTP request headers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => addListItem("headers")}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {headers.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center">
            <p className="text-[10px] text-zinc-700">No headers</p>
          </div>
        )}

        {headers.map((item) => (
          <KeyValueRow
            key={item.id}
            item={item}
            variables={variables}
            onChange={(key, value) =>
              updateListItem("headers", item.id, key, value)
            }
            onRemove={() => removeListItem("headers", item.id)}
          />
        ))}
      </section>

      {/* Authentication */}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-medium text-zinc-300">Authentication</p>
        </div>

        <select
          value={authType}
          onChange={(event) => updateConfig("authType", event.target.value)}
          className="
            w-full
            rounded-lg
            border
            border-zinc-800
            bg-zinc-900
            px-3
            py-2.5
            text-xs
            text-zinc-200
            outline-none
            focus:border-zinc-600
          "
        >
          <option value="none">None</option>

          <option value="bearer">Bearer Token</option>

          <option value="basic">Basic Auth</option>
        </select>

        {authType === "bearer" && (
          <VariableInput
            value={typeof config.token === "string" ? config.token : ""}
            variables={variables}
            onChange={(value) => updateConfig("token", value)}
            placeholder="Bearer token"
            rows={2}
          />
        )}
      </section>

      {/* Body */}

      {["POST", "PUT", "PATCH"].includes(method) && (
        <section className="space-y-3">
          <div>
            <p className="text-xs font-medium text-zinc-300">Request Body</p>

            <p className="mt-1 text-[10px] text-zinc-600">
              JSON payload sent with the request.
            </p>
          </div>

          <VariableInput
            value={body}
            variables={variables}
            onChange={(value) => updateConfig("body", value)}
            placeholder={`{
  "userId": "{{manual_trigger.userId}}"
}`}
            rows={8}
          />
        </section>
      )}
    </div>
  );
}

interface KeyValueRowProps {
  item: KeyValueItem;

  variables: WorkflowVariable[];

  onChange: (key: keyof KeyValueItem, value: string) => void;

  onRemove: () => void;
}

function KeyValueRow({
  item,
  variables,
  onChange,
  onRemove,
}: KeyValueRowProps) {
  return (
    <div className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
      <div className="flex items-start gap-2">
        <input
          value={item.key}
          onChange={(event) => onChange("key", event.target.value)}
          placeholder="Key"
          className="
            min-w-0
            flex-1
            rounded-md
            border
            border-zinc-800
            bg-zinc-950
            px-2.5
            py-2
            text-[11px]
            text-zinc-300
            outline-none
            placeholder:text-zinc-700
            focus:border-zinc-600
          "
        />

        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-700 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2">
        <VariableInput
          value={item.value}
          variables={variables}
          onChange={(value) => onChange("value", value)}
          placeholder="Value"
          rows={2}
        />
      </div>
    </div>
  );
}
