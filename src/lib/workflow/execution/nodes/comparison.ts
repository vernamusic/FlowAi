/**
 * Comparison shared by Condition and Switch.
 *
 * Both nodes route on the same operators, so the meaning of
 * "is greater than" has to live in one place.
 */

export interface ComparisonOperator {
  value: string;
  label: string;

  /** Unary operators take no right hand value. */
  needsValue: boolean;
}

export const COMPARISON_OPERATORS: ComparisonOperator[] = [
  { value: "equals", label: "is equal to", needsValue: true },
  { value: "not_equals", label: "is not equal to", needsValue: true },
  { value: "contains", label: "contains", needsValue: true },
  { value: "not_contains", label: "does not contain", needsValue: true },
  { value: "greater_than", label: "is greater than", needsValue: true },
  { value: "less_than", label: "is less than", needsValue: true },
  { value: "is_empty", label: "is empty", needsValue: false },
  { value: "is_not_empty", label: "is not empty", needsValue: false },
  { value: "is_true", label: "is true", needsValue: false },
  { value: "is_false", label: "is false", needsValue: false },
];

export function evaluateCondition(
  leftOperand: unknown,
  operator: unknown,
  rightOperand: unknown,
): boolean {
  const left = String(leftOperand ?? "");
  const right = String(rightOperand ?? "");

  switch (operator) {
    case "not_equals":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "not_contains":
      return !left.includes(right);
    case "greater_than":
      return Number(left) > Number(right);
    case "less_than":
      return Number(left) < Number(right);
    case "is_empty":
      return left.trim().length === 0;
    case "is_not_empty":
      return left.trim().length > 0;
    case "is_true":
      return left === "true";
    case "is_false":
      return left === "false";
    case "equals":
    default:
      return left === right;
  }
}