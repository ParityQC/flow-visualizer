// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * Parser for the angle expressions a user types and the ones that appear inside
 * QASM parentheses. One parser serves both, so `pi/4` means the same thing typed
 * into the gate menu as read from a file.
 *
 * The grammar is deliberately small -- a signed product/quotient chain:
 *
 *     expr   := ['-'] factor (('*' | '/') factor)*
 *     factor := number | 'pi'
 *
 * No addition and no parentheses. That covers every angle anyone writes on a
 * circuit diagram (`pi/4`, `3*pi/4`, `-pi/2`, plain decimals) while keeping the
 * implementation free of operator-precedence surface and giving one error
 * message instead of a family of them. Widening it later is purely additive.
 */

export class AngleExpressionError extends Error {
  constructor(text: string) {
    super(
      `Cannot read "${text}" as an angle. Use forms like pi/4, -pi/2, 3*pi/4, 0.5*pi or 0.7854.`
    );
    this.name = 'AngleExpressionError';
  }
}

/** A number (`2`, `0.5`, `.25`, `1e-3`) or the constant `pi`, case-insensitive. */
const FACTOR = /^(pi|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/i;

/** Parse an angle expression into radians, or throw `AngleExpressionError`. */
export function parseAngleExpression(text: string): number {
  const source = text.replace(/\s+/g, '');
  let rest = source;

  const readFactor = (): number => {
    const match = rest.match(FACTOR);
    if (match === null) {
      throw new AngleExpressionError(text);
    }
    const token = match[0];
    rest = rest.slice(token.length);
    return token.toLowerCase() === 'pi' ? Math.PI : Number(token);
  };

  let sign = 1;
  if (rest.startsWith('-')) {
    sign = -1;
    rest = rest.slice(1);
  }

  let value = readFactor();

  while (rest.length > 0) {
    const operator = rest[0];
    if (operator !== '*' && operator !== '/') {
      throw new AngleExpressionError(text);
    }
    rest = rest.slice(1);
    const factor = readFactor();
    if (operator === '/' && factor === 0) {
      throw new AngleExpressionError(text);
    }
    value = operator === '*' ? value * factor : value / factor;
  }

  const result = sign * value;
  if (!Number.isFinite(result)) {
    throw new AngleExpressionError(text);
  }
  return result;
}

/** True when `text` parses; useful for live validation in an input field. */
export function isValidAngleExpression(text: string): boolean {
  try {
    parseAngleExpression(text);
    return true;
  } catch {
    return false;
  }
}
