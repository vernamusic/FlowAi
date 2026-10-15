"use client";

import { ArrowRight, Check, LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NODE_DEFINITIONS } from "@/constants/nodes";
import {
  WORKFLOW_TEMPLATES,
  addTemplateToWorkflow,
  createWorkflowFromTemplate,
  type WorkflowTemplate,
} from "@/lib/workflow/templates/workflow-templates";
import { useWorkflowStore } from "@/store/workflow.store";

interface TemplateGalleryProps {
  /** Compact rows for empty states, full cards for the gallery page. */
  variant?: "page" | "compact";

  limit?: number;

  /** Optional heading for the compact variant. */
  title?: string;

  /** Called after a template is added to the current workflow. */
  onAddToWorkflow?: () => void;
}

const categoryLabels: Record<string, string> = {
  trigger: "Triggers",
  ai: "AI",
  logic: "Logic",
  action: "Actions",
};

export function TemplateGallery({
  variant = "page",
  limit,
  title = "Start from a template",
  onAddToWorkflow,
}: TemplateGalleryProps) {
  const router = useRouter();
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
  const replaceWorkflow = useWorkflowStore((state) => state.replaceWorkflow);
  const saveCurrentWorkflow = useWorkflowStore(
    (state) => state.saveCurrentWorkflow,
  );

  const [busyId, setBusyId] = useState<string | null>(null);
  const [usedId, setUsedId] = useState<string | null>(null);

  const templates = limit ? WORKFLOW_TEMPLATES.slice(0, limit) : WORKFLOW_TEMPLATES;

  /**
   * Create a brand new workflow from the template and open it.
   */
  const handleUse = (template: WorkflowTemplate) => {
    const workflow = createWorkflowFromTemplate(template.id);

    if (!workflow) {
      return;
    }

    setBusyId(template.id);
    setWorkflow(workflow);
    saveCurrentWorkflow();

    if (variant === "compact") {
      setUsedId(template.id);
      setBusyId(null);

      return;
    }

    router.push(`/workflows/${workflow.id}`);
  };

  /**
   * Drop the template into the workflow that is already open.
   */
  const handleAddHere = (template: WorkflowTemplate) => {
    const workflow = useWorkflowStore.getState().workflow;

    if (!workflow) {
      handleUse(template);

      return;
    }

    const next = addTemplateToWorkflow(workflow, template.id);

    if (!next) {
      return;
    }

    replaceWorkflow(next);
    setUsedId(template.id);
    onAddToWorkflow?.();
  };

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          <LayoutTemplate className="h-3 w-3" />
          {title}
        </p>

        <div className="space-y-1.5">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleAddHere(template)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-left transition hover:border-violet-500/40 hover:bg-zinc-900"
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-zinc-200">
                  {template.name}
                </span>

                <span className="block truncate text-[10px] text-zinc-600">
                  {template.description}
                </span>
              </span>

              {usedId === template.id ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <article
          key={template.id}
          className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                <LayoutTemplate className="h-4 w-4" />
              </div>

              <div>
                <h2 className="text-sm font-medium text-zinc-100">
                  {template.name}
                </h2>

                <p className="text-[10px] text-zinc-600">
                  {categoryLabels[template.category]} ·{" "}
                  {template.difficulty === "starter" ? "Starter" : "Intermediate"}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-zinc-400">
            {template.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {templateNodes(template).map((definition) => {
              const Icon = definition.icon;

              return (
                <span
                  key={definition.type}
                  title={definition.label}
                  className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[9px] text-zinc-500"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {definition.label}
                </span>
              );
            })}
          </div>

          <ul className="mt-3 space-y-1">
            {template.highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-1.5 text-[10px] leading-4 text-zinc-500"
              >
                <Check className="mt-px h-3 w-3 shrink-0 text-zinc-700" />
                {highlight}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => handleUse(template)}
            disabled={busyId === template.id}
            className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-400 disabled:opacity-60"
          >
            {busyId === template.id ? "Creating…" : "Use this template"}
          </button>
        </article>
      ))}
    </div>
  );
}

/**
   * Node types a template uses, without duplicates.
 */
function templateNodes(template: WorkflowTemplate) {
  return NODE_DEFINITIONS.filter((definition) =>
    template.nodeTypes.includes(definition.type),
  );
}