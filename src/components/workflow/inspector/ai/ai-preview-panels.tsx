"use client";

import { Copy, FileJson, Terminal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { formatCost, formatTokenCount } from "@/lib/workflow/execution/ai/tokens";
import type { AiRunResult } from "@/lib/workflow/execution/ai/types";

interface AiPreviewPanelsProps {
  /** Prompt with every variable already substituted. */
  resolvedPrompt: string;

  resolvedInstructions: string;

  requestPreview: string;

  /** Last recorded output for this node, if the workflow has run. */
  lastResult: AiRunResult | null;

  lastRunAt?: string;

  /** Variable references that do not match an upstream node yet. */
  unresolvedReferences: string[];

  isRunning: boolean;

  streamingText?: string;
}

export function AiPreviewPanels({
  resolvedPrompt,
  resolvedInstructions,
  requestPreview,
  lastResult,
  lastRunAt,
  unresolvedReferences,
  isRunning,
  streamingText,
}: AiPreviewPanelsProps) {
  const [tab, setTab] = useState<"input" | "output">("input");

  const liveText = streamingText ?? "";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          <TabButton
            isActive={tab === "input"}
            onClick={() => setTab("input")}
            icon={<Terminal className="h-3 w-3" />}
            label="Input"
          />

          <TabButton
            isActive={tab === "output"}
            onClick={() => setTab("output")}
            icon={<FileJson className="h-3 w-3" />}
            label="Output"
          />
        </div>

        {lastResult && !isRunning && (
          <span className="text-[10px] text-zinc-600">
            last run {lastRunAt ? `· ${lastRunAt}` : ""}
          </span>
        )}
      </div>

      {tab === "input" ? (
        <div className="space-y-2">
          {resolvedInstructions.trim() && (
            <PreviewBlock
              title="System instructions"
              value={resolvedInstructions}
              emptyText="No system instructions."
            />
          )}

          <PreviewBlock
            title="Prompt sent to the model"
            value={resolvedPrompt}
            emptyText="Write a prompt to preview what will be sent."
          />

          {unresolvedReferences.length > 0 && (
            <p className="text-[10px] leading-4 text-amber-400">
              {unresolvedReferences.length} placeholder
              {unresolvedReferences.length === 1 ? "" : "s"} not wired to an
              upstream node: {unresolvedReferences.join(", ")}
            </p>
          )}

          <PreviewBlock title="Request body" value={requestPreview} />
        </div>
      ) : (
        <div className="space-y-2">
          {isRunning && liveText ? (
            <PreviewBlock title="Streaming response" value={liveText} live />
          ) : lastResult ? (
            <>
              <PreviewBlock
                title="Response"
                value={
                  typeof lastResult.parsed === "string"
                    ? lastResult.parsed
                    : lastResult.parsed !== undefined
                      ? JSON.stringify(lastResult.parsed, null, 2)
                      : lastResult.response
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <Stat label="Model" value={lastResult.model} />

                <Stat label="Provider" value={lastResult.provider} />

                <Stat
                  label="Tokens"
                  value={
                    lastResult.usage
                      ? `${formatTokenCount(lastResult.usage.totalTokens)}${
                          lastResult.usage.estimated ? " (est.)" : ""
                        }`
                      : "—"
                  }
                />

                <Stat
                  label="Cost"
                  value={
                    lastResult.cost !== undefined
                      ? `${formatCost(lastResult.cost)}${
                          lastResult.costEstimated ? " est." : ""
                        }`
                      : "unavailable"
                  }
                />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center">
              <p className="text-[10px] text-zinc-700">
                Run this node or run the workflow to see its output here.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface TabButtonProps {
  isActive: boolean;

  onClick: () => void;

  icon: ReactNode;

  label: string;
}

function TabButton({ isActive, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] transition ${
        isActive
          ? "bg-zinc-800 text-zinc-200"
          : "text-zinc-600 hover:text-zinc-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface PreviewBlockProps {
  title: string;

  value: string;

  emptyText?: string;

  live?: boolean;
}

function PreviewBlock({
  title,
  value,
  emptyText,
  live,
}: PreviewBlockProps) {
  const [copied, setCopied] = useState(false);
  const isEmpty = !value.trim();

  const handleCopy = () => {
    void navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800 px-2.5 py-1.5">
        <p className="text-[9px] font-medium uppercase tracking-widest text-zinc-600">
          {title}
        </p>

        {!isEmpty && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy ${title}`}
            className="text-zinc-700 transition hover:text-zinc-300"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>

      {isEmpty ? (
        <p className="px-2.5 py-2 text-[10px] text-zinc-700">
          {emptyText ?? "Empty"}
        </p>
      ) : (
        <pre
          className={`max-h-56 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 text-[10px] leading-4 ${
            live ? "text-zinc-300" : "text-zinc-400"
          }`}
        >
          {value}
          {live && (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-violet-400 align-middle" />
          )}
        </pre>
      )}

      {copied && (
        <p className="px-2.5 pb-2 text-[9px] text-emerald-400">Copied</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-widest text-zinc-700">
        {label}
      </p>

      <p className="mt-1 truncate text-[11px] text-zinc-300" title={value}>
        {value}
      </p>
    </div>
  );
}