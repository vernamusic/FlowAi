import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatEstimatedCost,
  formatRunDuration,
  formatWhen,
  pluralize,
  prettyJson,
  statusClass,
} from "@/lib/workflow/execution/execution-format";

describe("formatRunDuration", () => {
  it.each([
    [undefined, "—"],
    [0, "0ms"],
    [12, "12ms"],
    [999, "999ms"],
    [1500, "1.50s"],
    [45_000, "45.0s"],
    [90_000, "1m 30s"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatRunDuration(input as number | undefined)).toBe(expected);
  });
});

describe("formatWhen", () => {
  it("says just now for something seconds old", () => {
    expect(formatWhen(new Date().toISOString())).toBe("just now");
  });

  it("counts up through minutes, hours and days", () => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

    expect(formatWhen(ago(5 * 60_000))).toBe("5m ago");
    expect(formatWhen(ago(3 * 3_600_000))).toBe("3h ago");
    expect(formatWhen(ago(2 * 86_400_000))).toBe("2d ago");
  });

  it("falls back to a date for anything older than a week", () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);

    expect(formatWhen(old.toISOString())).not.toContain("ago");
  });

  it("survives missing and unparseable values", () => {
    expect(formatWhen(undefined)).toBe("—");
    expect(formatWhen("not a date")).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });
});

describe("formatEstimatedCost", () => {
  it("is unavailable rather than zero when nothing was priced", () => {
    expect(formatEstimatedCost(null, false)).toBe("—");
  });

  it("marks a locally counted estimate", () => {
    expect(formatEstimatedCost(0.0002, true)).toBe("$0.00020*");
  });

  it("leaves a reported cost unmarked", () => {
    expect(formatEstimatedCost(0.0002, false)).toBe("$0.00020");
  });
});

describe("pluralize", () => {
  it("keeps the singular for one", () => {
    expect(pluralize(1, "node")).toBe("1 node");
    expect(pluralize(2, "node")).toBe("2 nodes");
    expect(pluralize(0, "node")).toBe("0 nodes");
  });
});

describe("prettyJson", () => {
  it("indents an object", () => {
    expect(prettyJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("falls back to the raw value when it cannot be serialised", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(prettyJson(circular)).toBe("[object Object]");
  });
});

describe("statusClass", () => {
  it("colours known statuses and falls back for anything else", () => {
    expect(statusClass("success")).toContain("emerald");
    expect(statusClass("error")).toContain("red");
    expect(statusClass("something-new")).toContain("zinc");
    expect(statusClass(undefined)).toContain("zinc");
  });
});