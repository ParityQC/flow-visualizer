// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * The parameter of a rotation gate: a symbolic name plus an optional numeric
 * value in radians.
 *
 * The symbol is the identity. Two gates carrying the same symbol are one shared
 * parameter, so giving that symbol a value updates both, and the QASM exporter
 * emits a single `input` declaration for it.
 *
 * Values follow the OpenQASM convention, `rz(theta) = exp(-i Z theta / 2)`: the
 * value stored here *is* the QASM parameter, with no sign conversion anywhere.
 */

/**
 * The symbol of an angle that has a value but no name yet, as parsed out of
 * `rz(pi/4) q[0];`. Not a legal identifier, so no user input can collide with it.
 */
const UNNAMED_ANGLE_SYMBOL = '';

export class Angle {
  readonly _symbol: string;
  readonly _value: number | null;

  /** @param symbol a QASM identifier, so that it can be declared verbatim. */
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
}

/** How a rotation angle is rendered in the circuit grid. */
export type AngleDisplayMode = 'symbolic' | 'pi' | 'decimal';

/**
 * Denominators a multiple of pi is recognised against, smallest first so a match
 * is already in lowest terms. The powers of two run high on purpose: a QFT is
 * built from `pi / 2^k` rotations.
 */
const PI_DENOMINATORS = [1, 2, 3, 4, 6, 8, 12, 16, 32, 64, 128, 256];
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

interface PiFraction {
  numerator: number;
  denominator: number;
}

/** `value` as a reduced multiple of pi, or `null` when no simple fraction fits. */
function piFraction(value: number): PiFraction | null {
  const ratio = value / Math.PI;
  for (const denominator of PI_DENOMINATORS) {
    const numerator = Math.round(ratio * denominator);
    if (Math.abs(ratio - numerator / denominator) < PI_TOLERANCE) {
      return { numerator, denominator };
    }
  }
  return null;
}

function piFractionToLatex({ numerator, denominator }: PiFraction): string {
  if (numerator === 0) {
    return '0';
  }
  const sign = numerator < 0 ? '-' : '';
  const magnitude = Math.abs(numerator);
  const head = magnitude === 1 ? '\\pi' : `${magnitude}\\pi`;
  return denominator === 1 ? `${sign}${head}` : `${sign}\\frac{${head}}{${denominator}}`;
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

/** `value` as a plain decimal, trimmed to four places. */
function decimal(value: number): string {
  return String(Number(value.toFixed(4)));
}

/**
 * Render an angle as a KaTeX string for `InlineMath`.
 *
 * Symbolic mode always shows the symbol, and the other two fall back to it when
 * no value has been assigned. Pi mode falls back to a decimal when the value is
 * not a simple multiple of pi.
 */
export function formatAngle(angle: Angle, mode: AngleDisplayMode): string {
  if (mode === 'symbolic' || angle.value === null) {
    return symbolToLatex(angle.symbol);
  }
  if (mode === 'pi') {
    const fraction = piFraction(angle.value);
    if (fraction !== null) {
      return piFractionToLatex(fraction);
    }
  }
  return decimal(angle.value);
}

/**
 * An angle carrying the sign of the Pauli it rotates about, so that a negative
 * logical Pauli reads `R_{X_0Z_1}(-theta_1)` rather than `R_{-X_0Z_1}(theta_1)`.
 */
export function formatSignedAngle(angle: Angle, mode: AngleDisplayMode, sign: 1 | -1): string {
  if (sign === 1) {
    return formatAngle(angle, mode);
  }
  if (mode !== 'symbolic' && angle.value !== null) {
    return formatAngle(angle.withValue(-angle.value), mode);
  }
  return `-${formatAngle(angle, mode)}`; // assuming symbolic
}

/**
 * Approximate width of the rendered angle, in characters, for sizing the gate
 * box. It has to follow what is actually rendered rather than the mode, since
 * pi mode falls back to a much wider decimal for an awkward value.
 */
export function angleWidthChars(angle: Angle, mode: AngleDisplayMode): number {
  if (mode === 'symbolic' || angle.value === null) {
    return symbolWidthChars(angle.symbol);
  }
  if (mode === 'pi') {
    const fraction = piFraction(angle.value);
    if (fraction !== null) {
      return piFractionWidthChars(fraction);
    }
  }
  return decimal(angle.value).length;
}

/** A greek letter renders as one glyph; a plain name renders in full. */
function symbolWidthChars(symbol: string): number {
  const match = symbol.match(/^([A-Za-z]+)_?(\d*)$/);
  if (match === null) {
    return symbol.length;
  }
  const [, base, index] = match;
  return (GREEK_LETTERS.has(base.toLowerCase()) ? 1 : base.length) + index.length;
}

function piFractionWidthChars({ numerator, denominator }: PiFraction): number {
  if (numerator === 0) {
    return 1;
  }
  const magnitude = Math.abs(numerator);
  // "-3π": sign, coefficient (dropped when it is 1), and the pi glyph.
  const top = (numerator < 0 ? 1 : 0) + (magnitude === 1 ? 0 : String(magnitude).length) + 1;
  if (denominator === 1) {
    return top;
  }
  // A \frac stacks its halves, so it is only as wide as the wider one, plus a
  // little for the fraction rule's own padding.
  return Math.max(top, String(denominator).length) + 1;
}
