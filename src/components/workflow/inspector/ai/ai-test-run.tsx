"use client";

import { Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { runAiPrompt } from "@/lib/workflow/execution/ai/run-ai-prompt";
import { formatCost, formatTokenCount } from "@/lib/workflow/execution/ai/tokens";
import type { AiPromptConfig, AiRunResult } from "@/lib/workflow/execution/ai/types";

interface AiTestRunProps {
  /** Fully resolved config, variables already substituted. */
  config: AiPromptConfig;

  blockedReason?: string;

  onResult: (result: AiRunResult | null) => void;

  onStreamingChange: (text: string) => void;
}

type RunStatus = "idle" | "running" | "success" | "error";

export function AiTestRun({
  config,
  blockedReason,
  onResult,
  onStreamingChange,
}: AiTestRunProps) {
  const controllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  const [status, setStatus] = useState<RunStatus>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiRunResult | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  /**
   * A pending request must not keep streaming into an unmounted panel.
   */
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    const element = outputRef.current;

    if (element && status === "running") {
      element.scrollTop = element.scrollHeight;
    }
  }, [text, status]);

  const handleRun = async () => {
    const controller = new AbortController();

    controllerRef.current = controller;
    setStatus("running");
    setText("");
    setError(null);
    setResult(null);
    setElapsedMs(0);

    const startedAt = Date.now();

    try {
      const runResult = await runAiPrompt(config, {
        signal: controller.signal,
        onDelta: (_delta, accumulated) => {
          setText(accumulated);
          setElapsedMs(Date.now() - startedAt);
        },
      });

      setResult(runResult);
      setStatus("success");
      setElapsedMs(Date.now() - startedAt);
      onResult(runResult);
      onStreamingChange("");
    } catch (runError) {
      const aborted =
        runError instanceof DOMException && runError.name === "AbortError";

      if (aborted) {
        setStatus("idle");
      } else {
        setStatus("error");
        setError(
          runError instanceof Error ? runError.message : "The request failed.",
        );
      }

      onResult(null);
      onStreamingChange("");
    } finally {
      controllerRef.current = null;
    }
  };

  const handleStop = () => {
    controllerRef.current?.abort();
    onStreamingChange("");
  };

  const isRunning = status === "running";
  const isDisabled = Boolean(blockedReason) || isRunning;
  const streamed = text || result?.response || "";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-300">Try it</p>

          <p className="mt-1 text-[10px] leading-4 text-zinc-600">
            Sends the prompt exactly as previewed, without running the workflow.
          </p>
        </div>

        <button
          type="button"
          onClick={isRunning ? handleStop : () => void handleRun()}
          disabled={!isRunning && isDisabled}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isRunning
              ? "border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              : "bg-violet-500 text-white hover:bg-violet-400"
          }`}
        >
          {isRunning ? (
            <>
              <Square className="h-3 w-3" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Run
            </>
          )}
        </button>
      </div>

      {blockedReason && !isRunning && (
        <p className="text-[10px] leading-4 text-amber-400">{blockedReason}</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/20 p-2.5">
          <p className="text-[10px] leading-4 text-red-300">{error}</p>
        </div>
      )}

      {streamed ? (
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
          <pre
            ref={outputRef}
            className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 text-[10px] leading-4 text-zinc-300"
          >
            {streamed}
            {isRunning && (
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-violet-400 align-middle" />
            )}
          </pre>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-800 px-2.5 py-1.5 text-[9px] text-zinc-600">
            <span>{(elapsedMs / 1000).toFixed(1)}s</span>

            {result && (
              <>
                <span>{result.model}</span>

                {result.usage && (
                  <span>
                    {formatTokenCount(result.usage.totalTokens)} tokens
                    {result.usage.estimated ? " (est.)" : ""}
                  </span>
                )}

                <span>
                  {result.cost !== undefined
                    ? `${formatCost(result.cost)}${result.costEstimated ? " est." : ""}`
                    : "cost unavailable"}
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        !isRunning &&
        !error && (
          <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center">
            <p className="text-[10px] text-zinc-700">
              The response appears here as it streams in.
            </p>
          </div>
        )
      )}
    </section>
  );
}