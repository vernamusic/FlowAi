import { describe, expect, it } from "vitest";

import {
  hasVariables,
  parseVariable,
  parseVariables,
} from "@/lib/workflow/variables/variable-parser";
import {
  resolveTemplate,
  resolveValue,
  resolveVariable,
} from "@/lib/workflow/variables/variable-resolver";
import type { VariableContext } from "@/lib/workflow/variables/variable-context";

const context: VariableContext = {
  manual_trigger: { name: "Amir", email: "amir@example.com", age: 31 },
  orders: {
    total: 42,
    items: [
      { id: 1, title: "First", tags: ["new", "paid"] },
      { id: 2, title: "Second" },
    ],
    meta: { "order-id": "abc", nested: { deep: true } },
  },
  customer: null,
  text: "hello",
  blank: "",
  flag: false,
};

describe("parsing", () => {
  it("parses a simple reference", () => {
    const parsed = parseVariable("{{manual_trigger.email}}");

    expect(parsed?.key).toBe("manual_trigger");
    expect(parsed?.path).toEqual(["email"]);
  });

  it("parses array indexes, including negative ones", () => {
    expect(parseVariable("{{orders.items[0].title}}")?.path).toEqual([
      "items",
      "0",
      "title",
    ]);
    expect(
      parseVariable("{{orders.items[-1]}}")?.segments.at(-1),
    ).toEqual({ kind: "index", index: -1 });
  });

  it("parses bracket keys", () => {
    expect(
      parseVariable('{{orders.meta["order-id"]}}')?.segments.at(-1),
    ).toEqual({ kind: "key", name: "order-id", optional: false });
  });

  it("parses optional segments", () => {
    expect(parseVariable("{{customer?.email}}")?.segments.at(-1)).toEqual({
      kind: "key",
      name: "email",
      optional: true,
    });
  });

  it("parses fallbacks", () => {
    expect(parseVariable('{{orders.total ?? "unknown"}}')?.fallback).toBe(
      '"unknown"',
    );
  });

  it("returns null for malformed input", () => {
    expect(parseVariable("{{unclosed")).toBeNull();
    expect(parseVariable("{{ }}")).toBeNull();
    expect(parseVariable("no variables")).toBeNull();
    expect(parseVariable("{{.leadingDot}}")).toBeNull();
    expect(parseVariable("{{a.[0]}}")).toBeNull();
  });

  it("finds every reference in a text", () => {
    const found = parseVariables("Hi {{a.name}} and {{a.email}} plus {{b.c}}");

    expect(found.map((item) => item.key)).toEqual(["a", "a", "b"]);
  });

  it("does not stop at braces inside a quoted fallback", () => {
    const found = parseVariables('{{a.b ?? "}}"}} and {{c.d}}');

    expect(found).toHaveLength(2);
    expect(found[0].key).toBe("a");
    expect(found[1].key).toBe("c");
  });

  it("skips a malformed expression and keeps going", () => {
    expect(parseVariables("{{broken {{a.b}}")).toHaveLength(1);
  });

  it("detects whether a text has variables", () => {
    expect(hasVariables("{{a.b}}")).toBe(true);
    expect(hasVariables("plain")).toBe(false);
  });
});

describe("resolving", () => {
  it("resolves properties", () => {
    expect(resolveVariable("{{manual_trigger.email}}", context)).toBe(
      "amir@example.com",
    );
  });

  it("resolves array indexes and nested arrays", () => {
    expect(resolveVariable("{{orders.items[0].title}}", context)).toBe("First");
    expect(resolveVariable("{{orders.items[1].title}}", context)).toBe("Second");
    expect(resolveVariable("{{orders.items[-1].title}}", context)).toBe("Second");
    expect(resolveVariable("{{orders.items[0].tags[1]}}", context)).toBe("paid");
  });

  it("resolves bracket keys and deep nesting", () => {
    expect(resolveVariable('{{orders.meta["order-id"]}}', context)).toBe("abc");
    expect(resolveVariable("{{orders.meta.nested.deep}}", context)).toBe(true);
  });

  it("resolves lengths", () => {
    expect(resolveVariable("{{orders.items.length}}", context)).toBe(2);
    expect(resolveVariable("{{text.length}}", context)).toBe(5);
  });

  it("returns undefined for out of range and missing values", () => {
    expect(resolveVariable("{{orders.items[9]}}", context)).toBeUndefined();
    expect(resolveVariable("{{orders.missing}}", context)).toBeUndefined();
    expect(resolveVariable("{{missing.root}}", context)).toBeUndefined();
    expect(resolveVariable("{{customer.email}}", context)).toBeUndefined();
  });

  it("applies fallbacks for missing and empty values", () => {
    expect(resolveVariable('{{orders.nope ?? "n/a"}}', context)).toBe("n/a");
    expect(resolveVariable('{{blank ?? "empty"}}', context)).toBe("empty");
    expect(resolveVariable("{{customer ?? 0}}", context)).toBe(0);
    expect(resolveVariable("{{orders.nope ?? true}}", context)).toBe(true);
    expect(resolveVariable("{{orders.nope ?? null}}", context)).toBeNull();
  });

  it("ignores a fallback when a value exists", () => {
    expect(resolveVariable('{{orders.total ?? "n/a"}}', context)).toBe(42);
    expect(resolveVariable("{{flag ?? true}}", context)).toBe(false);
  });

  it("treats a bare word fallback as text", () => {
    expect(resolveVariable("{{orders.nope ?? unknown}}", context)).toBe(
      "unknown",
    );
  });

  it("resolves templates", () => {
    expect(
      resolveTemplate(
        "Hi {{manual_trigger.name}}, order {{orders.items[0].id}} for {{orders.total}}",
        context,
      ),
    ).toBe("Hi Amir, order 1 for 42");
  });

  it("replaces every occurrence of the same reference", () => {
    expect(
      resolveTemplate("{{manual_trigger.name}} / {{manual_trigger.name}}", context),
    ).toBe("Amir / Amir");
  });

  it("leaves text without variables untouched", () => {
    expect(resolveTemplate("nothing to do", context)).toBe("nothing to do");
  });

  it("resolves unknown references to an empty string", () => {
    expect(resolveTemplate("value: {{nope.here}}", context)).toBe("value: ");
  });

  it("resolves nested objects and arrays", () => {
    const resolved = resolveValue(
      {
        text: "Hi {{manual_trigger.name}}",
        list: ["{{manual_trigger.age}}", 7],
        nested: { deep: { value: "{{orders.total}}" } },
        keep: true,
      },
      context,
    );

    expect(resolved).toEqual({
      text: "Hi Amir",
      list: ["31", 7],
      nested: { deep: { value: "42" } },
      keep: true,
    });
  });
});