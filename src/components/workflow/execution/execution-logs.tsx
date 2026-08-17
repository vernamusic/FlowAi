"use client";

import { Check, ChevronDown, ChevronRight, Info, X } from "lucide-react";

import { useState } from "react";

import { useWorkflowStore } from "@/store/workflow.store";

export function ExecutionLogs() {
  const execution = useWorkflowStore((state) => state.execution);

  const selectNode = useWorkflowStore((state) => state.selectNode);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!execution) {
    return null;
  }

  const getStatusIcon = (level: string) => {
    if (level === "info") {
      return <Info className="h-3.5 w-3.5 text-blue-400" />;
    }

    if (level === "success") {
      return <Check className="h-3.5 w-3.5 text-emerald-400" />;
    }

    if (level === "error") {
      return <X className="h-3.5 w-3.5 text-red-400" />;
    }

    return null;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-white">Execution Logs</p>

          <p className="mt-0.5 text-[10px] text-zinc-600">
            {execution.logs.length} events
          </p>
        </div>

        <div
          className={`
            rounded-full px-2 py-1 text-[10px] font-medium
            ${
              execution.status === "running"
                ? "bg-blue-500/10 text-blue-400"
                : execution.status === "success"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
            }
          `}
        >
          {execution.status}
        </div>
      </div>

      {/* Logs */}

      <div className="max-h-72 overflow-y-auto">
        {execution.logs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-zinc-600">No execution logs yet.</p>
          </div>
        ) : (
          execution.logs.map((log) => {
            const isExpanded = expandedLogId === log.id;

            const hasDetails = Boolean(log.input || log.output || log.error);

            const handleClick = () => {
              /**
               * Select related node
               */
              if (log.nodeId) {
                selectNode(log.nodeId);
              }

              /**
               * Expand details
               */
              if (hasDetails) {
                setExpandedLogId(isExpanded ? null : log.id);
              }
            };

            return (
              <div
                key={log.id}
                className="border-b border-zinc-900 last:border-b-0"
              >
                {/* Log Row */}

                <button
                  type="button"
                  onClick={handleClick}
                  className={`
                      flex w-full gap-3 px-4 py-2.5 text-left
                      transition
                      hover:bg-zinc-900/70
                      ${log.nodeId ? "cursor-pointer" : "cursor-default"}
                    `}
                >
                  {/* Expand icon */}

                  <div className="flex w-3.5 shrink-0 items-center justify-center pt-0.5">
                    {hasDetails ? (
                      isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-zinc-600" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                      )
                    ) : null}
                  </div>

                  {/* Status */}

                  <div className="shrink-0 pt-0.5">
                    {getStatusIcon(log.level)}
                  </div>

                  {/* Content */}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[11px] text-zinc-400">
                        {log.message}
                      </p>

                      <span className="shrink-0 text-[10px] text-zinc-700">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      {log.nodeId && (
                        <span className="text-[9px] text-zinc-700">Node</span>
                      )}

                      {log.duration !== undefined && (
                        <span className="text-[10px] text-zinc-700">
                          {log.duration}
                          ms
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Details */}

                {isExpanded && hasDetails && (
                  <div className="border-t border-zinc-900 bg-black/30 px-4 py-3">
                    {/* Input */}

                    {log.input && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                          Input
                        </p>

                        <pre className="max-h-32 overflow-auto rounded-lg border border-zinc-900 bg-zinc-950 p-3 text-[10px] leading-5 text-zinc-500">
                          {JSON.stringify(log.input, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Output */}

                    {log.output && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                          Output
                        </p>

                        <pre className="max-h-32 overflow-auto rounded-lg border border-zinc-900 bg-zinc-950 p-3 text-[10px] leading-5 text-zinc-500">
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error */}

                    {log.error && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-red-500/70">
                          Error
                        </p>

                        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3 text-[10px] leading-5 text-red-400">
                          {log.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
