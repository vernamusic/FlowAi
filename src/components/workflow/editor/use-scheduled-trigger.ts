"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  intervalToMs,
  readIntervalTriggerConfig,
} from "@/lib/workflow/execution/nodes/schedule-trigger";
import { useWorkflowStore } from "@/store/workflow.store";
import type { Workflow } from "@/types/workflow";

/**
 * Runs a workflow that starts itself.
 *
 * Everything is still in the browser, so both triggers only fire while
 * the editor is on screen: a page load fires once, and an interval keeps
 * firing until the editor closes. Anything else would need a server.
 */
export function useScheduledTrigger(workflow: Workflow | null) {
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);

  /**
   * Only the facts that should restart the timer are read out of the
   * workflow. Depending on the workflow itself would restart it, and
   * re-run the page load trigger, on every keystroke.
   */
  const schedule = useMemo(() => {
    const trigger = workflow?.nodes.find((node) =>
      ["page-load-trigger", "interval-trigger"].includes(node.type),
    );

    if (!trigger) return null;

    const config = readIntervalTriggerConfig(trigger.data.config);

    return {
      id: trigger.id,
      type: trigger.type,
      intervalMs: intervalToMs(config.intervalMinutes),
      dryRun: trigger.type === "page-load-trigger" || config.mode === "dry-run",
    };
  }, [workflow]);

  const running = useRef(false);

  useEffect(() => {
    if (!schedule) return;

    /**
     * A run in progress is left alone. Interval triggers repeat, and a
     * slow workflow would otherwise queue up behind itself.
     */
    const run = () => {
      if (running.current) return;

      running.current = true;

      void runWorkflow({ dryRun: schedule.dryRun }).finally(() => {
        running.current = false;
      });
    };

    if (schedule.type === "page-load-trigger") {
      run();

      return;
    }

    const timer = setInterval(run, schedule.intervalMs);

    return () => clearInterval(timer);
  }, [runWorkflow, schedule]);
}