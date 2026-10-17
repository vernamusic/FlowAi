import { describe, expect, it } from "vitest";

import {
  executeMerge,
  readMergeConfig,
  type MergeInput,
} from "@/lib/workflow/execution/nodes/merge";
import {
  DEFAULT_SWITCH_HANDLE,
  executeSwitch,
  readSwitchConfig,
  switchHandle,
  switchHandles,
} from "@/lib/workflow/execution/nodes/switch";
import {
  executeText,
  readTextConfig,
} from "@/lib/workflow/execution/nodes/text";
import { executeMath, readMathConfig } from "@/lib/workflow/execution/nodes/math";

const inputs: MergeInput[] = [
  { nodeId: "a", label: "True branch", output: { score: 90, verdict: "high" } },
  { nodeId: "b", label: "False branch", output: { summary: "looked fine", note: "low" } },
];

describe("merge", () => {
  it("combines what the branches produced", () => {
    const result = executeMerge(readMergeConfig({ mode: "combine" }), inputs);

    expect(result.score).toBe(90);
    expect(result.verdict).toBe("high");
    expect(result.summary).toBe("looked fine");
    expect(result.note).toBe("low");
    expect(result.sources).toBe(2);
    expect(result.labels).toEqual(["True branch", "False branch"]);
  });

  it("lets a later branch fill in a key an earlier one also set", () => {
    const result = executeMerge(readMergeConfig({ mode: "combine" }), [
      { nodeId: "a", label: "First", output: { owner: "amir" } },
      { nodeId: "b", label: "Second", output: { owner: "team" } },
    ]);

    expect(result.owner).toBe("team");
  });

  it("collects each branch as its own item", () => {
    const result = executeMerge(readMergeConfig({ mode: "collect" }), inputs);

    expect(result.count).toBe(2);
    expect(Array.isArray(result.items)).toBe(true);
    expect((result.items as unknown[])[0]).toEqual(inputs[0].output);
  });

  it("takes the first branch that produced something", () => {
    const result = executeMerge(readMergeConfig({ mode: "first" }), [
      { nodeId: "a", label: "Empty", output: {} },
      { nodeId: "b", label: "Has data", output: { value: 1 } },
    ]);

    expect(result.found).toBe(true);
    expect(result.from).toBe("Has data");
    expect(result.item).toEqual({ value: 1 });
  });

  it("says so when no branch produced anything", () => {
    const result = executeMerge(readMergeConfig({ mode: "first" }), [
      { nodeId: "a", label: "Empty", output: {} },
    ]);

    expect(result.found).toBe(false);
    expect(result.from).toBeNull();
  });

  it("falls back to combine for an unknown mode", () => {
    expect(readMergeConfig({ mode: "nonsense" }).mode).toBe("combine");
    expect(readMergeConfig(undefined).mode).toBe("combine");
  });
});

describe("switch", () => {
  it("takes the first case that matches", () => {
    const config = readSwitchConfig({
      rules: [
        { handle: switchHandle(0), label: "High", leftOperand: 90, operator: "greater_than", rightOperand: 80 },
        { handle: switchHandle(1), label: "Any", leftOperand: 90, operator: "is_not_empty", rightOperand: "" },
      ],
    });

    expect(executeSwitch(config)).toMatchObject({
      matched: switchHandle(0),
      label: "High",
      evaluated: 1,
      matchedRule: true,
    });
  });

  it("skips a case that does not match", () => {
    const config = readSwitchConfig({
      rules: [
        { handle: switchHandle(0), label: "High", leftOperand: 42, operator: "greater_than", rightOperand: 80 },
        { handle: switchHandle(1), label: "Low", leftOperand: 42, operator: "less_than", rightOperand: 50 },
      ],
    });

    expect(executeSwitch(config)).toMatchObject({
      matched: switchHandle(1),
      label: "Low",
      evaluated: 2,
    });
  });

  it("falls through to the default when nothing matches", () => {
    const config = readSwitchConfig({
      defaultLabel: "Everything else",
      rules: [
        { handle: switchHandle(0), label: "High", leftOperand: 42, operator: "greater_than", rightOperand: 80 },
      ],
    });

    expect(executeSwitch(config)).toMatchObject({
      matched: DEFAULT_SWITCH_HANDLE,
      branch: DEFAULT_SWITCH_HANDLE,
      label: "Everything else",
      matchedRule: false,
    });
  });

  it("stops at the first match even when a later one would also match", () => {
    const config = readSwitchConfig({
      rules: [
        { handle: switchHandle(0), label: "First", leftOperand: "x", operator: "is_not_empty", rightOperand: "" },
        { handle: switchHandle(1), label: "Second", leftOperand: "x", operator: "is_not_empty", rightOperand: "" },
      ],
    });

    expect(executeSwitch(config).evaluated).toBe(1);
  });

  it("gives a new node two cases it can use immediately", () => {
    const config = readSwitchConfig({});

    expect(config.rules).toHaveLength(2);
    expect(config.rules.map((rule) => rule.handle)).toEqual(["case-1", "case-2"]);
  });

  it("offers a handle per case plus a default", () => {
    const handles = switchHandles(
      readSwitchConfig({
        rules: [
          { handle: switchHandle(0), label: "One", leftOperand: "a", operator: "equals", rightOperand: "1" },
          { handle: switchHandle(1), label: "Two", leftOperand: "a", operator: "equals", rightOperand: "2" },
        ],
      }),
    );

    expect(handles.map((handle) => handle.id)).toEqual([
      "case-1",
      "case-2",
      DEFAULT_SWITCH_HANDLE,
    ]);
  });

  it("refuses more cases than the node can show", () => {
    const rules = Array.from({ length: 9 }, (_, index) => ({
      label: `Case ${index + 1}`,
      leftOperand: "a",
      operator: "equals",
      rightOperand: String(index),
    }));

    expect(readSwitchConfig({ rules }).rules).toHaveLength(6);
  });
});

describe("text", () => {
  it("leaves a value alone by default", () => {
    expect(executeText(readTextConfig({}), { a: "  hello  " }).text).toBe(
      "  hello  ",
    );
  });

  it("works on the whole input or on one field", () => {
    expect(executeText(readTextConfig({ operation: "upper" }), { a: "hi" }).text).toBe("HI");
    expect(
      executeText(readTextConfig({ operation: "upper", field: "a" }), { a: "hi", b: "no" }).text,
    ).toBe("HI");
  });

  it("trims, changes case and slugs", () => {
    expect(executeText(readTextConfig({ operation: "trim" }), { a: "  x  " }).text).toBe("x");
    expect(executeText(readTextConfig({ operation: "lower" }), { a: "LOUD" }).text).toBe("loud");
    expect(
      executeText(readTextConfig({ operation: "slug" }), { a: "Hello, World! 2024" }).text,
    ).toBe("hello-world-2024");
  });

  it("joins a list with the separator it was given", () => {
    const config = readTextConfig({ operation: "join", field: "tags", second: " / " });

    expect(executeText(config, { tags: ["a", "b", "c"] }).text).toBe("a / b / c");
  });

  it("refuses to join something that is not a list", () => {
    const config = readTextConfig({ operation: "join", field: "title" });

    expect(() => executeText(config, { title: "not a list" })).toThrow(
      /Join needs a list/,
    );
  });

  it("pretty prints an object", () => {
    expect(executeText(readTextConfig({ operation: "json" }), { a: { b: 1 } }).text).toBe(
      '{\n  "a": {\n    "b": 1\n  }\n}',
    );
  });

  it("removes the characters it was given", () => {
    const config = readTextConfig({ operation: "remove", second: "0 1" });

    expect(executeText(config, { a: "phone 0123" }).text).toBe("phone 23");
  });

  it("reports a field that was not there instead of failing quietly", () => {
    const result = executeText(readTextConfig({ field: "missing" }), { a: 1 });

    expect(result.missingField).toBe(true);
  });
});

describe("math node", () => {
  it("returns the calculated value", () => {
    expect(executeMath({ expression: "2 * 3", name: "result" }).result).toBe(6);
  });

  it("defaults the result name and tidies a typed one", () => {
    expect(readMathConfig({}).name).toBe("result");
    expect(readMathConfig({ name: "total cost" }).name).toBe("total_cost");
  });
});