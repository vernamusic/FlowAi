import { describe, expect, it } from "vitest";

import {
  MathExpressionError,
  evaluateExpression,
  toNumber,
} from "@/lib/workflow/execution/nodes/math-expression";

describe("evaluateExpression", () => {
  it("adds, subtracts, multiplies and divides", () => {
    expect(evaluateExpression("1 + 2")).toBe(3);
    expect(evaluateExpression("10 - 4")).toBe(6);
    expect(evaluateExpression("3 * 7")).toBe(21);
    expect(evaluateExpression("10 / 4")).toBe(2.5);
    expect(evaluateExpression("10 % 3")).toBe(1);
  });

  it("respects precedence and parentheses", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(512);
    expect(evaluateExpression("(2 ^ 3) ^ 2")).toBe(64);
  });

  it("handles negative numbers and fractions", () => {
    expect(evaluateExpression("-5 + 3")).toBe(-2);
    expect(evaluateExpression("-.5 * 4")).toBe(-2);
    expect(evaluateExpression("10 - -3")).toBe(13);
    expect(evaluateExpression("3 / -2")).toBe(-1.5);
  });

  it("reads decimals and exponents", () => {
    expect(evaluateExpression("0.1 + 0.2")).toBeCloseTo(0.3, 10);
    expect(evaluateExpression("1.5e2")).toBe(150);
  });

  it("calls the functions it knows", () => {
    expect(evaluateExpression("round(4.6)")).toBe(5);
    expect(evaluateExpression("floor(4.6)")).toBe(4);
    expect(evaluateExpression("ceil(4.2)")).toBe(5);
    expect(evaluateExpression("abs(-3)")).toBe(3);
    expect(evaluateExpression("max(2, 9)")).toBe(9);
    expect(evaluateExpression("min(2, 9)")).toBe(2);
    expect(evaluateExpression("pow(2, 10)")).toBe(1024);
    expect(evaluateExpression("sqrt(81)")).toBe(9);
  });

  it("nests calls and arithmetic", () => {
    expect(evaluateExpression("round(max(1.2, 7) / 2)")).toBe(4);
    expect(evaluateExpression("max(1 + 1, 2 * 2)")).toBe(4);
  });

  it("reads names from the scope", () => {
    expect(evaluateExpression("price * quantity", { price: 12, quantity: 3 })).toBe(36);
    expect(evaluateExpression("score + bonus", { score: "70", bonus: 5 })).toBe(75);
  });

  it("reads a substituted value that is not quoted", () => {
    expect(evaluateExpression("42 * 2")).toBe(84);
  });

  it("refuses to divide by zero", () => {
    expect(() => evaluateExpression("5 / 0")).toThrow(/divide by zero/i);
    expect(() => evaluateExpression("5 % 0")).toThrow(/divide by zero/i);
  });

  it("refuses an empty formula", () => {
    expect(() => evaluateExpression("   ")).toThrow(/add an expression/i);
  });

  it("refuses text that is not arithmetic", () => {
    expect(() => evaluateExpression("alert(1)")).toThrow(/not a known function/i);
    expect(() => evaluateExpression("total")).toThrow(
      /not a value in this workflow/i,
    );
    expect(() => evaluateExpression("1 +")).toThrow(/value was expected/i);
    expect(() => evaluateExpression("(1 + 2")).toThrow(/never closed/i);
    expect(() => evaluateExpression("1 + 2)")).toThrow(/more formula/i);
  });

  it("refuses the JavaScript it was built to keep out", () => {
    for (const attempt of [
      "constructor",
      "globalThis",
      "process.exit(1)",
      "fetch('https://example.com')",
      "1; 2",
      "[]",
      "'x'",
      "$",
    ]) {
      expect(() => evaluateExpression(attempt)).toThrow(MathExpressionError);
    }
  });

  it("refuses a name it was not given", () => {
    expect(() => evaluateExpression("missing + 1", { other: 1 })).toThrow(
      /not a value in this workflow/i,
    );
  });

  it("refuses a function with the wrong number of values", () => {
    expect(() => evaluateExpression("sqrt()")).toThrow(/takes 1 value/);
    expect(() => evaluateExpression("round(1, 2)")).toThrow(/takes 1 value/);
    expect(() => evaluateExpression("pow(2)")).toThrow(/takes 2 values/);
  });
});

describe("toNumber", () => {
  it("reads numbers, numeric strings and booleans", () => {
    expect(toNumber(4)).toBe(4);
    expect(toNumber("4.5")).toBe(4.5);
    expect(toNumber(" 7 ")).toBe(7);
    expect(toNumber(true)).toBe(1);
    expect(toNumber(false)).toBe(0);
  });

  it("refuses anything else with a readable message", () => {
    expect(() => toNumber("abc")).toThrow(/“abc” is not a number/);
    expect(() => toNumber(null)).toThrow(/not a number/);
    expect(() => toNumber({})).toThrow(/not a number/);
  });
});