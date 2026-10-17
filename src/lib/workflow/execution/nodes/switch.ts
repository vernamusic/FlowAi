import { evaluateCondition } from "./comparison";

/**
 * Switch
 *
 * A condition with more than two ways out. Each rule is compared in
 * order and the first match takes the branch, so the order of the rules
 * is the order of precedence. Anything that matches nothing falls to the
 * default branch, which is why there is always somewhere for a run to go.
 */

export interface SwitchRule {
  /** Handle id on the node, which is what an edge connects to. */
  handle: string;

  label: string;

  leftOperand: unknown;

  operator: string;

  rightOperand: unknown;
}

export interface SwitchConfig {
  rules: SwitchRule[];

  defaultLabel: string;
}

/** Handles are generated from the rule index, so they have to be stable. */
export const DEFAULT_SWITCH_HANDLE = "default";
export const MAX_SWITCH_RULES = 6;

export function switchHandle(index: number) {
  return `case-${index + 1}`;
}

export function defaultSwitchRules(): SwitchRule[] {
  return [
    {
      handle: switchHandle(0),
      label: "Case 1",
      leftOperand: "",
      operator: "equals",
      rightOperand: "",
    },
    {
      handle: switchHandle(1),
      label: "Case 2",
      leftOperand: "",
      operator: "equals",
      rightOperand: "",
    },
  ];
}

function readRule(value: unknown, index: number): SwitchRule {
  const rule = (value ?? {}) as Partial<SwitchRule>;

  return {
    handle:
      typeof rule.handle === "string" && rule.handle
        ? rule.handle
        : switchHandle(index),

    label:
      typeof rule.label === "string" && rule.label.trim()
        ? rule.label.trim()
        : `Case ${index + 1}`,

    leftOperand: rule.leftOperand ?? "",
    operator: typeof rule.operator === "string" ? rule.operator : "equals",
    rightOperand: rule.rightOperand ?? "",
  };
}

export function readSwitchConfig(
  raw: Record<string, unknown> | undefined,
): SwitchConfig {
  const config = raw ?? {};

  const stored = Array.isArray(config.rules) ? config.rules : [];
  const rules = (stored.length > 0 ? stored : defaultSwitchRules())
    .slice(0, MAX_SWITCH_RULES)
    .map(readRule);

  return {
    rules,
    defaultLabel:
      typeof config.defaultLabel === "string" && config.defaultLabel.trim()
        ? config.defaultLabel.trim()
        : "Default",
  };
}

export interface SwitchResult {
  [key: string]: unknown;

  /** Which case matched, or the default. */
  matched: string;

  /** Handle of the branch to follow. */
  branch: string;

  /** The label of the branch, which reads better than the handle. */
  label: string;

  /** How many rules were checked before this one matched. */
  evaluated: number;

  matchedRule: boolean;
}

/**
 * The first rule that matches wins. Rules after it are never checked,
 * which is what makes the list ordered rather than a set.
 */
export function executeSwitch(config: SwitchConfig): SwitchResult {
  for (let index = 0; index < config.rules.length; index += 1) {
    const rule = config.rules[index];

    if (
      evaluateCondition(rule.leftOperand, rule.operator, rule.rightOperand)
    ) {
      return {
        matched: rule.handle,
        branch: rule.handle,
        label: rule.label,
        evaluated: index + 1,
        matchedRule: true,
      };
    }
  }

  return {
    matched: DEFAULT_SWITCH_HANDLE,
    branch: DEFAULT_SWITCH_HANDLE,
    label: config.defaultLabel,
    evaluated: config.rules.length,
    matchedRule: false,
  };
}

/**
 * Handles a switch node offers: one per rule, plus the default.
 */
export function switchHandles(config: SwitchConfig) {
  return [
    ...config.rules.map((rule, index) => ({
      id: rule.handle,
      label: rule.label,
      /** Spread down the right edge, with the default left at the end. */
      top: `${((index + 1) / (config.rules.length + 1)) * 80 + 10}%`,
    })),
    {
      id: DEFAULT_SWITCH_HANDLE,
      label: config.defaultLabel,
      top: "90%",
    },
  ];
}