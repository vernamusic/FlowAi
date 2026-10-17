import { evaluateExpression } from "./math-expression";

/**
 * Math
 *
 * Calculates one number from an expression. Variables written as `{{…}}`
 * are substituted before this runs, so what arrives is an ordinary
 * formula such as `(120 * 0.2) + round(4.6)`.
 */

export interface MathConfig {
  expression: string;

  /** What the result is called, which is also the key it lands under. */
  name: string;
}

export interface MathResult {
  expression: string;

  result: number;
}

export const DEFAULT_MATH_RESULT_NAME = "result";

export function readMathConfig(
  raw: Record<string, unknown> | undefined,
): MathConfig {
  const config = raw ?? {};

  return {
    expression: typeof config.expression === "string" ? config.expression : "",

    name:
      typeof config.name === "string" && config.name.trim()
        ? config.name.trim().replace(/\s+/g, "_")
        : DEFAULT_MATH_RESULT_NAME,
  };
}

export function executeMath(
  config: MathConfig,
  scope: Record<string, unknown> = {},
): MathResult {
  return {
    expression: config.expression,
    result: evaluateExpression(config.expression, scope),
  };
}

/** How many decimal places to keep, for the inspector preview. */
export function roundResult(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}