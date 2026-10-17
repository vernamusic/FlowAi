"use client";

import type { DailyUsage } from "@/lib/workflow/execution/execution-metrics";
import {
  formatEstimatedCost,
  formatTokenCount,
} from "@/lib/workflow/execution/execution-format";
import { useState } from "react";

type Metric = "tokens" | "cost";

/**
 * A small bar chart, built from divs.
 *
 * The history holds at most twenty runs, so a plotting library would be
 * more code than the chart.
 */
export function UsageChart({ days }: { days: DailyUsage[] }) {
  const [metric, setMetric] = useState<Metric>("tokens");

  const values = days.map((day) =>
    metric === "tokens" ? day.totalTokens : (day.cost ?? 0),
  );

  const peak = Math.max(...values, 0);
  const hasCost = days.some((day) => day.cost !== null);

  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {metric === "tokens" ? "Tokens per day" : "Cost per day"}
          </h2>

          <p className="mt-0.5 text-[11px] text-zinc-600">
            Last {days.length} days
            {metric === "tokens"
              ? ` · ${formatTokenCount(total)} in total`
              : hasCost
                ? ` · ${formatEstimatedCost(total, false)} in total`
                : " · no published pricing for these models"}
          </p>
        </div>

        {hasCost && (
          <div
            role="group"
            aria-label="Chart metric"
            className="flex rounded-lg border border-zinc-800 p-0.5"
          >
            {(["tokens", "cost"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMetric(option)}
                aria-pressed={metric === option}
                className={`rounded-md px-2.5 py-1 text-[11px] capitalize transition ${
                  metric === option
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex h-24 items-end gap-1">
        {days.map((day, index) => {
          const value = values[index];
          const height = peak > 0 ? Math.max((value / peak) * 100, 2) : 0;
          const label =
            metric === "tokens"
              ? `${day.date}: ${formatTokenCount(day.totalTokens)} tokens`
              : `${day.date}: ${formatEstimatedCost(day.cost, day.costEstimated)}`;

          return (
            <div
              key={day.date}
              title={label}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className={`absolute inset-x-0 bottom-0 rounded-t ${
                  day.runs > 0 ? "bg-violet-500/70" : "bg-zinc-800"
                }`}
                style={{ height: `${height}%` }}
              />

              {day.runs > 0 && (
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 group-hover:block">
                  {metric === "tokens"
                    ? formatTokenCount(value)
                    : formatEstimatedCost(day.cost, day.costEstimated)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-zinc-700">
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
    </div>
  );
}