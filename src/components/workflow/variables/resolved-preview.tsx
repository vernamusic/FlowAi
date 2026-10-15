"use client";

import { AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";

import { useResolvedVariables } from "@/lib/workflow/variables/use-resolved-variables";

interface ResolvedPreviewProps {
  nodeId: string;

  /** Template text to resolve. */
  value: string;

  label?: string;

  /** Renders the resolved value as JSON. */
  format?: "text" | "json";
}

/**
 * Shows what a template resolves to with the latest run data, plus any
 * reference this node cannot read.
 */
export function ResolvedPreview({
  nodeId,
  value,
  label = "Resolved preview",
  format = "text",
}: ResolvedPreviewProps) {
  const { resolve, unresolved } = useResolvedVariables(nodeId);
  const [copied, setCopied] = useState(false);

  const references = unresolved(value);
  const resolved = resolve(value);
  const hasVariables = references.length > 0 || resolved !== value;

  if (!value.trim() || (!hasVariables && !unresolved.length)) {
    return null;
  }

  const display =
    format === "json" && resolved.trim()
      ? tryFormat(resolved)
      : resolved;

  return (
    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800 px-2.5 py-1.5">
        <p className="text-[9px] font-medium uppercase tracking-widest text-zinc-600">
          {label}
        </p>

        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(display);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copy resolved value"
          className="text-zinc-700 transition hover:text-zinc-300"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>

      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 text-[10px] leading-4 text-zinc-300">
        {display || "Resolves to an empty value."}
      </pre>

      {references.length > 0 && (
        <p className="flex items-start gap-1.5 border-t border-zinc-800 px-2.5 py-1.5 text-[10px] leading-4 text-amber-400">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          <span>
            Not available here: {references.join(", ")}
          </span>
        </p>
      )}
    </div>
  );
}

function tryFormat(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}