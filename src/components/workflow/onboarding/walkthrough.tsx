"use client";

import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const storageKey = "flowai:walkthrough";

/**
 * Bumped whenever the copy changes so returning users see the new tour.
 */
const walkthroughVersion = 1;

export interface WalkthroughStep {
  title: string;

  body: string;

  tip?: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: "Welcome to FlowAI",
    body: "A workflow is a set of nodes connected in order. FlowAI runs them in your browser and shows you every step as it happens.",
    tip: "Nothing leaves this machine unless a node sends it somewhere on purpose.",
  },
  {
    title: "Add nodes from the library",
    body: "Drag a node onto the canvas, or use one of the starter templates to get a finished workflow in one click.",
  },
  {
    title: "Connect them",
    body: "Drag from the dot at the bottom of a node to the dot at the top of the next one. Condition nodes branch into True and False.",
    tip: "A workflow needs exactly one trigger, and the run button stays disabled until the graph is valid.",
  },
  {
    title: "Configure and use variables",
    body: "The inspector on the right configures the selected node. Type {{ to pull a value from any node connected above it, such as {{manual_trigger.name}}.",
    tip: "The Variables tab lists every value in the workflow and shows what it resolved to after the last run.",
  },
  {
    title: "Run it",
    body: "Press Run Workflow to execute. Live output streams into the panel at the bottom, and the Output node raises a notification.",
    tip: "Dry run uses sample data, so you can check the shape of a workflow before spending an API call.",
  },
];

function readWalkthroughState(): "pending" | "done" | "skipped" {
  if (typeof window === "undefined") {
    return "pending";
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return "pending";
    }

    const parsed = JSON.parse(raw) as { version?: number; state?: string };

    if (parsed.version !== walkthroughVersion) {
      return "pending";
    }

    return parsed.state === "done" || parsed.state === "skipped"
      ? parsed.state
      : "pending";
  } catch {
    return "pending";
  }
}

function writeWalkthroughState(state: "done" | "skipped") {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ version: walkthroughVersion, state }),
    );
  } catch {
    /**
     * Private browsing can refuse writes, which only means the tour shows
     * again next time.
     */
  }
}

export function resetWalkthrough() {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignored
  }
}

interface WalkthroughProps {
  /**
   * Show automatically when the editor is opened for the first time.
   */
  autoStart?: boolean;

  /** Open even when the tour was already completed or skipped. */
  force?: boolean;

  onFinished?: () => void;
}

export function Walkthrough({
  autoStart = false,
  force = false,
  onFinished,
}: WalkthroughProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!autoStart) {
      return;
    }

    /**
     * Deferred so the decision never happens during hydration.
     */
    const timer = window.setTimeout(() => {
      if (force || readWalkthroughState() === "pending") {
        setIsOpen(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoStart, force]);

  const finish = useCallback(
    (state: "done" | "skipped") => {
      writeWalkthroughState(state);
      setIsOpen(false);
      setStepIndex(0);
      onFinished?.();
    },
    [onFinished],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finish("skipped");
      }

      if (event.key === "ArrowRight") {
        setStepIndex((current) => Math.min(current + 1, WALKTHROUGH_STEPS.length - 1));
      }

      if (event.key === "ArrowLeft") {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finish, isOpen]);

  if (!isOpen) {
    return null;
  }

  const step = WALKTHROUGH_STEPS[stepIndex];
  const isLast = stepIndex === WALKTHROUGH_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Product tour"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />

            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Quick tour · {stepIndex + 1} of {WALKTHROUGH_STEPS.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => finish("skipped")}
            aria-label="Skip the tour"
            className="text-zinc-600 transition hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <h2 className="text-base font-semibold text-white">{step.title}</h2>

          <p className="mt-2 text-xs leading-6 text-zinc-400">{step.body}</p>

          {step.tip && (
            <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px] leading-5 text-zinc-500">
              {step.tip}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {WALKTHROUGH_STEPS.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === stepIndex ? "bg-violet-400" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((current) => current - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={() => finish("done")}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-violet-400"
              >
                Start building
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((current) => current + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-violet-400"
              >
                Next
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Button that replays the tour at any time.
 */
export function WalkthroughTrigger({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        Take the tour
      </button>

      <Walkthrough autoStart={open} force onFinished={() => setOpen(false)} />
    </>
  );
}