// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * The parameter of a rotation gate: a symbolic name plus an optional numeric
 * value in radians.
 *
 * The **symbol is the identity**. Two gates carrying the same symbol are one
 * shared parameter, so giving that symbol a value must update both. This is the
 * only way to express a tied angle, and it is what lets the QASM exporter emit
 * a single `input` declaration per symbol.
 *
 * Angles follow the OpenQASM convention, `rz(theta) = exp(-i Z theta / 2)`: the
 * value stored here *is* the QASM parameter, with no sign conversion anywhere.
 */
/**
 * Symbol of an angle that carries a value but has not been named yet -- the
 * state an angle parsed out of `rz(pi/4) q[0];` is in until
 * `Circuit.assignMissingAngleSymbols` gives it a theta index. The empty string
 * is deliberately not a legal identifier, so no user input can collide with it.
 */
export const UNNAMED_ANGLE_SYMBOL = '';

export class Angle {
  readonly _symbol: string;
  readonly _value: number | null;

  /**
   * @param symbol identifier, e.g. `theta_1`. Must be a valid QASM identifier
   *   so that it can be emitted as an `input` declaration verbatim.
   * @param value angle in radians, or `null` for a purely symbolic angle.
   */
  constructor(symbol: string, value: number | null = null) {
    if (symbol !== UNNAMED_ANGLE_SYMBOL && !Angle.isValidSymbol(symbol)) {
      throw new Error(`Invalid angle symbol: "${symbol}"`);
    }
    if (value !== null && !Number.isFinite(value)) {
      throw new Error(`Angle value must be finite, got ${value}`);
    }
    this._symbol = symbol;
    this._value = value;
  }

  /** An angle with a value but no symbol yet; named at the circuit boundary. */
  static unnamed(value: number): Angle {
    return new Angle(UNNAMED_ANGLE_SYMBOL, value);
  }

  static isValidSymbol(symbol: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol);
  }

  get symbol(): string {
    return this._symbol;
  }

  get value(): number | null {
    return this._value;
  }

  /** True while no numeric value has been assigned. */
  get isSymbolic(): boolean {
    return this._value === null;
  }

  /** False only for an angle still waiting for a theta index. */
  get isNamed(): boolean {
    return this._symbol !== UNNAMED_ANGLE_SYMBOL;
  }

  withValue(value: number | null): Angle {
    return new Angle(this._symbol, value);
  }

  withSymbol(symbol: string): Angle {
    return new Angle(symbol, this._value);
  }

  equals(other: Angle): boolean {
    return this._symbol === other._symbol && this._value === other._value;
  }

  /** `Angle` is immutable, so a clone may share the instance. */
  clone(): Angle {
    return this;
  }
}

/** How a rotation angle is rendered in the circuit grid. */
export type AngleDisplayMode = 'symbolic' | 'pi' | 'decimal';

/**
 * Denominators we are willing to recognise a multiple of pi against. The powers
 * of two run high on purpose: a QFT is built from `pi / 2^k` rotations.
 */
const PI_DENOMINATORS = [1, 2, 3, 4, 6, 8, 12, 16, 32, 64, 128, 256];

/** Smallest denominator first, so the match is already in lowest terms. */
const PI_TOLERANCE = 1e-9;

const GREEK_LETTERS = new Set([
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'eta',
  'theta',
  'iota',
  'kappa',
  'lambda',
  'mu',
  'nu',
  'xi',
  'rho',
  'sigma',
  'tau',
  'upsilon',
  'phi',
  'chi',
  'psi',
  'omega',
]);

/** `theta_1` -> `\theta_{1}`, `beta` -> `\beta`, anything else -> upright text. */
function symbolToLatex(symbol: string): string {
  const match = symbol.match(/^([A-Za-z]+)_?(\d*)$/);
  if (match !== null) {
    const [, base, index] = match;
    const head = GREEK_LETTERS.has(base.toLowerCase())
      ? `\\${base.toLowerCase()}`
      : `\\mathrm{${base}}`;
    return index === '' ? head : `${head}_{${index}}`;
  }
  return `\\mathrm{${symbol.replace(/_/g, '\\_')}}`;
}

/** Plain-text stand-in for `symbolToLatex`, for sizing. `theta_1` -> `t1`. */
function symbolToText(symbol: string): string {
  const match = symbol.match(/^([A-Za-z]+)_?(\d*)$/);
  if (match !== null) {
    const [, base, index] = match;
    // A greek letter renders as a single glyph; a plain name renders in full.
    const head = GREEK_LETTERS.has(base.toLowerCase()) ? 'x' : base;
    return `${head}${index}`;
  }
  return symbol;
}

/** `value` as a reduced multiple of pi, or `null` when no simple fraction fits. */
function piFraction(value: number): { numerator: number; denominator: number } | null {
  const ratio = value / Math.PI;
  for (const denominator of PI_DENOMINATORS) {
    const numerator = Math.round(ratio * denominator);
    if (Math.abs(ratio - numerator / denominator) < PI_TOLERANCE) {
      return { numerator, denominator };
    }
  }
  return null;
}

function piFractionToLatex(numerator: number, denominator: number): string {
  if (numerator === 0) {
    return '0';
  }
  const sign = numerator < 0 ? '-' : '';
  const magnitude = Math.abs(numerator);
  const head = magnitude === 1 ? '\\pi' : `${magnitude}\\pi`;
  return denominator === 1 ? `${sign}${head}` : `${sign}\\frac{${head}}{${denominator}}`;
}

function piFractionToText(numerator: number, denominator: number): string {
  if (numerator === 0) {
    return '0';
  }
  const sign = numerator < 0 ? '-' : '';
  const magnitude = Math.abs(numerator);
  const head = magnitude === 1 ? 'x' : `${magnitude}x`;
  return denominator === 1 ? `${sign}${head}` : `${sign}${head}/${denominator}`;
}

/** Render `value` as a multiple of pi, or `null` when no simple fraction fits. */
export function piFractionLatex(value: number): string | null {
  const fraction = piFraction(value);
  return fraction === null ? null : piFractionToLatex(fraction.numerator, fraction.denominator);
}

/**
 * An editable expression for `value`, preferring the pi form so that what the
 * user typed comes back as they typed it: `pi/4`, `3*pi/4`, `-pi/2`.
 */
export function formatAngleExpression(value: number): string {
  const fraction = piFraction(value);
  if (fraction === null) {
    return String(value);
  }
  const { numerator, denominator } = fraction;
  if (numerator === 0) {
    return '0';
  }
  const sign = numerator < 0 ? '-' : '';
  const magnitude = Math.abs(numerator);
  const head = magnitude === 1 ? 'pi' : `${magnitude}*pi`;
  return denominator === 1 ? `${sign}${head}` : `${sign}${head}/${denominator}`;
}

/** Render `value` as a plain decimal, trimmed to four places. */
export function decimalLatex(value: number): string {
  return String(Number(value.toFixed(4)));
}

/**
 * Render an angle as a KaTeX string for `InlineMath`.
 *
 * Symbolic mode always shows the symbol. The other two fall back to the symbol
 * when no value has been assigned, since there is nothing else to show, and the
 * pi mode falls back to a decimal when the value is not a simple multiple of pi.
 */
export function formatAngle(angle: Angle, mode: AngleDisplayMode): string {
  if (mode === 'symbolic' || angle.value === null) {
    return symbolToLatex(angle.symbol);
  }
  if (mode === 'pi') {
    return piFractionLatex(angle.value) ?? decimalLatex(angle.value);
  }
  return decimalLatex(angle.value);
}

/**
 * Approximate width of the rendered angle, in characters, for sizing the gate
 * box.
 *
 * Sizing has to follow what is actually rendered, not the mode: in pi mode an
 * angle that is not a simple fraction falls back to a decimal, which is far
 * wider. A `\frac` renders stacked, so its width is that of its wider half
 * rather than of the flat `3x/4` form.
 */
export function angleWidthChars(angle: Angle, mode: AngleDisplayMode): number {
  if (mode === 'symbolic' || angle.value === null) {
    return symbolToText(angle.symbol).length;
  }
  if (mode === 'pi') {
    const fraction = piFraction(angle.value);
    if (fraction !== null) {
      const flat = piFractionToText(fraction.numerator, fraction.denominator);
      const slash = flat.indexOf('/');
      if (slash === -1) {
        return flat.length;
      }
      // Stacked: as wide as the wider of numerator and denominator, plus a
      // little for the fraction rule's own padding.
      return Math.max(slash, flat.length - slash - 1) + 1;
    }
  }
  return decimalLatex(angle.value).length;
}
