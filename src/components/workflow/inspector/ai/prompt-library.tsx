"use client";

import {
  ChevronDown,
  LayoutTemplate,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  PROMPT_TEMPLATES,
  PROMPT_TEMPLATE_CATEGORIES,
  SYSTEM_INSTRUCTION_PRESETS,
  type PromptTemplate,
  type SystemInstructionPreset,
} from "@/lib/workflow/execution/ai/prompt-templates";

interface PromptLibraryProps {
  onApplyTemplate: (template: PromptTemplate) => void;

  onApplyInstructions: (preset: SystemInstructionPreset) => void;
}

export function PromptLibrary({
  onApplyTemplate,
  onApplyInstructions,
}: PromptLibraryProps) {
  const [openSection, setOpenSection] = useState<
    "templates" | "instructions" | null
  >("templates");

  const toggle = (section: "templates" | "instructions") =>
    setOpenSection((current) => (current === section ? null : section));

  return (
    <div className="space-y-2">
      <LibrarySection
        icon={<LayoutTemplate className="h-3.5 w-3.5" />}
        title="Prompt templates"
        hint="Start from a reusable prompt"
        isOpen={openSection === "templates"}
        onToggle={() => toggle("templates")}
      >
        <div className="space-y-3">
          {PROMPT_TEMPLATE_CATEGORIES.map((category) => (
            <div key={category.id}>
              <p className="mb-1.5 text-[9px] font-medium uppercase tracking-widest text-zinc-700">
                {category.label}
              </p>

              <div className="space-y-1">
                {PROMPT_TEMPLATES.filter(
                  (template) => template.category === category.id,
                ).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onApplyTemplate(template)}
                    title={template.description}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-2 text-left transition hover:border-violet-500/40 hover:bg-zinc-900"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] text-zinc-300">
                        {template.label}
                      </span>

                      <span className="block truncate text-[10px] text-zinc-600">
                        {template.description}
                      </span>
                    </span>

                    <Sparkles className="h-3 w-3 shrink-0 text-zinc-700" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </LibrarySection>

      <LibrarySection
        icon={<UserRoundCog className="h-3.5 w-3.5" />}
        title="System instructions"
        hint="Reusable instructions for any node"
        isOpen={openSection === "instructions"}
        onToggle={() => toggle("instructions")}
      >
        <div className="grid grid-cols-1 gap-1">
          {SYSTEM_INSTRUCTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyInstructions(preset)}
              title={preset.instructions}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-2 text-left transition hover:border-violet-500/40 hover:bg-zinc-900"
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-zinc-300">
                  {preset.label}
                </span>

                <span className="block truncate text-[10px] text-zinc-600">
                  {preset.description}
                </span>
              </span>

              <Sparkles className="h-3 w-3 shrink-0 text-zinc-700" />
            </button>
          ))}
        </div>
      </LibrarySection>
    </div>
  );
}

interface LibrarySectionProps {
  icon: ReactNode;

  title: string;

  hint: string;

  isOpen: boolean;

  onToggle: () => void;

  children: ReactNode;
}

function LibrarySection({
  icon,
  title,
  hint,
  isOpen,
  onToggle,
  children,
}: LibrarySectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-zinc-900/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-violet-300">{icon}</span>

          <span className="min-w-0">
            <span className="block text-[11px] font-medium text-zinc-300">
              {title}
            </span>

            <span className="block truncate text-[10px] text-zinc-600">
              {hint}
            </span>
          </span>
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-600 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-zinc-800 p-2.5">{children}</div>
      )}
    </div>
  );
}