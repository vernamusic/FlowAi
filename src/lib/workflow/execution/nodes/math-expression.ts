/**
 * A small arithmetic evaluator.
 *
 * Deliberately not `eval` or `new Function`: a formula is text a user
 * types into a box, and that text must never be able to reach the
 * JavaScript runtime. This only knows numbers, the arithmetic operators,
 * parentheses, a fixed list of functions, and names resolved from a
 * scope.
 */

export class MathExpressionError extends Error {}

/**
 * Functions a formula may call, with how many values each one takes.
 *
 * The arity is checked because JavaScript would quietly ignore an extra
 * argument, and `round(1, 2)` should be a mistake rather than `round(1)`.
 */
const functions: Record<
  string,
  { min: number; max: number; apply: (args: number[]) => number }
> = {
  abs: { min: 1, max: 1, apply: ([value]) => Math.abs(value) },
  ceil: { min: 1, max: 1, apply: ([value]) => Math.ceil(value) },
  floor: { min: 1, max: 1, apply: ([value]) => Math.floor(value) },
  max: { min: 1, max: 8, apply: (args) => Math.max(...args) },
  min: { min: 1, max: 8, apply: (args) => Math.min(...args) },
  pow: { min: 2, max: 2, apply: ([base, exponent]) => base ** exponent },
  round: { min: 1, max: 1, apply: ([value]) => Math.round(value) },
  sqrt: { min: 1, max: 1, apply: ([value]) => Math.sqrt(value) },
};

export const MATH_FUNCTIONS = Object.keys(functions);

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "operator"; value: string }
  | { kind: "open" }
  | { kind: "close" }
  | { kind: "comma" }
  | { kind: "end" };

const OPERATOR_CHARACTERS = new Set(["+", "-", "*", "/", "%", "^"]);

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    const numberMatch = expression
      .slice(index)
      .match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/);

    if (numberMatch) {
      tokens.push({ kind: "number", value: Number(numberMatch[0]) });
      index += numberMatch[0].length;
      continue;
    }

    const nameMatch = expression.slice(index).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);

    if (nameMatch) {
      tokens.push({ kind: "name", value: nameMatch[0] });
      index += nameMatch[0].length;
      continue;
    }

    if (character === "(") {
      tokens.push({ kind: "open" });
    } else if (character === ")") {
      tokens.push({ kind: "close" });
    } else if (character === ",") {
      tokens.push({ kind: "comma" });
    } else if (OPERATOR_CHARACTERS.has(character)) {
      tokens.push({ kind: "operator", value: character });
    } else {
      throw new MathExpressionError(
        `“${character}” is not allowed in a formula. Use numbers, + - * / % ^, parentheses, or one of ${MATH_FUNCTIONS.join(", ")}.`,
      );
    }

    index += 1;
  }

  tokens.push({ kind: "end" });

  return tokens;
}

class Parser {
  private position = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly scope: Record<string, unknown>,
  ) {}

  parse(): number {
    const value = this.expression();

    if (this.peek().kind !== "end") {
      throw new MathExpressionError("There is more formula here than one value.");
    }

    return value;
  }

  private peek() {
    return this.tokens[this.position];
  }

  private next() {
    return this.tokens[this.position++];
  }

  private expression(): number {
    let value = this.term();

    while (true) {
      const token = this.peek();

      if (token.kind !== "operator" || (token.value !== "+" && token.value !== "-")) {
        return value;
      }

      this.next();

      const right = this.term();

      value = token.value === "+" ? value + right : value - right;
    }
  }

  private term(): number {
    let value = this.unary();

    while (true) {
      const token = this.peek();

      if (
        token.kind !== "operator" ||
        !["*", "/", "%"].includes(token.value)
      ) {
        return value;
      }

      this.next();

      const right = this.unary();

      if ((token.value === "/" || token.value === "%") && right === 0) {
        throw new MathExpressionError("Cannot divide by zero.");
      }

      value =
        token.value === "*"
          ? value * right
          : token.value === "/"
            ? value / right
            : value % right;
    }
  }

  private unary(): number {
    const token = this.peek();

    if (token.kind === "operator" && (token.value === "-" || token.value === "+")) {
      this.next();

      const value = this.unary();

      return token.value === "-" ? -value : value;
    }

    return this.power();
  }

  private power(): number {
    const base = this.primary();
    const token = this.peek();

    if (token.kind === "operator" && token.value === "^") {
      this.next();

      /**
       * Right associative, and the exponent may itself be negated, so
       * this recurses through unary.
       */
      const exponent = this.unary();

      return base ** exponent;
    }

    return base;
  }

  private primary(): number {
    const token = this.next();

    if (token.kind === "number") {
      return token.value;
    }

    if (token.kind === "open") {
      const value = this.expression();

      if (this.next().kind !== "close") {
        throw new MathExpressionError("A bracket is never closed.");
      }

      return value;
    }

    if (token.kind === "name") {
      if (this.peek().kind === "open") {
        return this.call(token.value);
      }

      return this.readName(token.value);
    }

    throw new MathExpressionError("A value was expected here.");
  }

  private call(name: string): number {
    const definition = functions[name.toLowerCase()];

    if (!definition) {
      throw new MathExpressionError(`“${name}” is not a known function.`);
    }

    this.next();

    const args: number[] = [];

    if (this.peek().kind !== "close") {
      args.push(this.expression());

      while (this.peek().kind === "comma") {
        this.next();
        args.push(this.expression());
      }
    }

    if (this.next().kind !== "close") {
      throw new MathExpressionError(`The brackets for ${name}() are not closed.`);
    }

    if (args.length < definition.min || args.length > definition.max) {
      const expected =
        definition.min === definition.max
          ? `${definition.min}`
          : `${definition.min} to ${definition.max}`;

      throw new MathExpressionError(
        `${name}() takes ${expected} value${definition.max === 1 ? "" : "s"}, not ${args.length}.`,
      );
    }

    const result = definition.apply(args);

    if (!Number.isFinite(result)) {
      throw new MathExpressionError(`${name}() did not produce a number.`);
    }

    return result;
  }

  private readName(name: string): number {
    if (!(name in this.scope)) {
      throw new MathExpressionError(
        `“${name}” is not a value in this workflow. Write variables as {{…}}, or use one of ${MATH_FUNCTIONS.join(", ")}.`,
      );
    }

    return toNumber(this.scope[name]);
  }
}

/**
 * Calculate a formula.
 *
 * Variables written as `{{…}}` arrive already substituted, so a bare
 * name here is something the formula can still read from the scope, such
 * as the fields of the item a loop is on.
 */
export function evaluateExpression(
  expression: string,
  scope: Record<string, unknown> = {},
): number {
  const source = expression.trim();

  if (!source) {
    throw new MathExpressionError("Add an expression to calculate.");
  }

  const result = new Parser(tokenize(source), scope).parse();

  if (!Number.isFinite(result)) {
    throw new MathExpressionError("That formula did not produce a number.");
  }

  return result;
}

/**
 * Read a value as a number, so "42" and true are usable in a formula.
 */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "boolean") return value ? 1 : 0;

  if (typeof value === "string") {
    const parsed = Number(value.trim());

    if (Number.isFinite(parsed)) return parsed;

    throw new MathExpressionError(`“${value}” is not a number.`);
  }

  throw new MathExpressionError("That value is not a number.");
}