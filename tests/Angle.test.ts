// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Angle, formatAngle, formatSignedAngle, angleWidthChars } from '../src/models/Angle';

describe('Angle', () => {
  it('is symbolic until a value is assigned', () => {
    const angle = new Angle('theta_1');

    expect(angle.symbol).toBe('theta_1');
    expect(angle.value).toBeNull();
    expect(angle.isSymbolic).toBe(true);
  });

  it('carries a numeric value in radians', () => {
    const angle = new Angle('theta_1', Math.PI / 4);

    expect(angle.value).toBeCloseTo(Math.PI / 4, 12);
    expect(angle.isSymbolic).toBe(false);
  });

  it.each(['theta_1', 'theta', '_x', 'a0', 'A_1_b'])('accepts the symbol "%s"', (symbol) => {
    expect(new Angle(symbol).symbol).toBe(symbol);
  });

  it.each(['1theta', 'a b', 'a-b', 'θ', 'a.b'])('rejects the symbol "%s"', (symbol) => {
    expect(() => new Angle(symbol)).toThrow(/Invalid angle symbol/);
  });

  it('treats the empty symbol as the unnamed state, not an error', () => {
    const pending = Angle.unnamed(Math.PI / 4);

    expect(pending.isNamed).toBe(false);
    expect(pending.value).toBeCloseTo(Math.PI / 4, 12);
    expect(new Angle('theta_1').isNamed).toBe(true);
    expect(Angle.isValidSymbol('')).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity])('rejects the non-finite value %s', (value) => {
    expect(() => new Angle('theta_1', value)).toThrow(/must be finite/);
  });

  it('distinguishes a zero value from no value', () => {
    expect(new Angle('theta_1', 0).value).toBe(0);
    expect(new Angle('theta_1', 0).isSymbolic).toBe(false);
    expect(new Angle('theta_1', 0.5).withValue(null).isSymbolic).toBe(true);
  });

  it('withValue and withSymbol return new angles and leave the original alone', () => {
    const original = new Angle('theta_1');
    const valued = original.withValue(0.5);
    const renamed = original.withSymbol('theta_2');

    expect(valued.symbol).toBe('theta_1');
    expect(valued.value).toBe(0.5);
    expect(renamed.symbol).toBe('theta_2');
    expect(renamed.value).toBeNull();
    expect(original.value).toBeNull();
    expect(original.symbol).toBe('theta_1');
  });

  it('compares by symbol and value', () => {
    expect(new Angle('theta_1', 0.5).equals(new Angle('theta_1', 0.5))).toBe(true);
    expect(new Angle('theta_1').equals(new Angle('theta_1'))).toBe(true);
    expect(new Angle('theta_1', 0.5).equals(new Angle('theta_2', 0.5))).toBe(false);
    expect(new Angle('theta_1', 0.5).equals(new Angle('theta_1', 0.25))).toBe(false);
    expect(new Angle('theta_1').equals(new Angle('theta_1', 0.5))).toBe(false);
  });
});

describe('formatAngle', () => {
  const valued = (value: number) => new Angle('theta_1', value);

  it('shows the symbol in symbolic mode regardless of the value', () => {
    expect(formatAngle(new Angle('theta_1'), 'symbolic')).toBe('\\theta_{1}');
    expect(formatAngle(valued(Math.PI / 4), 'symbolic')).toBe('\\theta_{1}');
  });

  it.each<['pi' | 'decimal']>([['pi'], ['decimal']])(
    'falls back to the symbol in %s mode when there is no value',
    (mode) => {
      expect(formatAngle(new Angle('theta_2'), mode)).toBe('\\theta_{2}');
    }
  );

  // The worked table from the plan: value -> pi form -> decimal form.
  it.each<[number, string, string]>([
    [0, '0', '0'],
    [Math.PI / 4, '\\frac{\\pi}{4}', '0.7854'],
    [(3 * Math.PI) / 4, '\\frac{3\\pi}{4}', '2.3562'],
    [Math.PI, '\\pi', '3.1416'],
    [2 * Math.PI, '2\\pi', '6.2832'],
    [-Math.PI / 2, '-\\frac{\\pi}{2}', '-1.5708'],
    [-Math.PI, '-\\pi', '-3.1416'],
    [Math.PI / 64, '\\frac{\\pi}{64}', '0.0491'],
    [Math.PI / 3, '\\frac{\\pi}{3}', '1.0472'],
  ])('renders %s as "%s" in pi mode and "%s" in decimal mode', (value, pi, decimal) => {
    expect(formatAngle(valued(value), 'pi')).toBe(pi);
    expect(formatAngle(valued(value), 'decimal')).toBe(decimal);
  });

  it('falls back to a decimal in pi mode when no simple fraction fits', () => {
    expect(formatAngle(valued(0.9273), 'pi')).toBe('0.9273');
  });

  it('renders greek and plain symbol names', () => {
    expect(formatAngle(new Angle('beta'), 'symbolic')).toBe('\\beta');
    expect(formatAngle(new Angle('gamma_2'), 'symbolic')).toBe('\\gamma_{2}');
    expect(formatAngle(new Angle('myAngle'), 'symbolic')).toBe('\\mathrm{myAngle}');
    expect(formatAngle(new Angle('a_b_c'), 'symbolic')).toBe('\\mathrm{a\\_b\\_c}');
  });

  it('trims decimals to four places without trailing zeros', () => {
    expect(formatAngle(valued(1.5), 'decimal')).toBe('1.5');
    expect(formatAngle(valued(0.12345678), 'decimal')).toBe('0.1235');
  });
});

describe('formatSignedAngle', () => {
  const valued = (value: number) => new Angle('theta_1', value);

  it('is the plain angle for a positive sign', () => {
    expect(formatSignedAngle(valued(Math.PI / 4), 'pi', 1)).toBe('\\frac{\\pi}{4}');
    expect(formatSignedAngle(new Angle('theta_1'), 'symbolic', 1)).toBe('\\theta_{1}');
  });

  it('negates the value rather than prefixing a minus', () => {
    expect(formatSignedAngle(valued(Math.PI / 4), 'pi', -1)).toBe('-\\frac{\\pi}{4}');
    expect(formatSignedAngle(valued(0.7854), 'decimal', -1)).toBe('-0.7854');
  });

  it('cancels a minus against an already negative angle', () => {
    expect(formatSignedAngle(valued(-Math.PI / 4), 'pi', -1)).toBe('\\frac{\\pi}{4}');
    expect(formatSignedAngle(valued(-0.7854), 'decimal', -1)).toBe('0.7854');
  });

  it('prefixes a minus where there is no value to negate', () => {
    expect(formatSignedAngle(new Angle('theta_1'), 'symbolic', -1)).toBe('-\\theta_{1}');
    // A symbol is what pi and decimal mode fall back to as well.
    expect(formatSignedAngle(new Angle('theta_1'), 'pi', -1)).toBe('-\\theta_{1}');
    // ... and symbolic mode ignores a value it does have.
    expect(formatSignedAngle(valued(Math.PI / 4), 'symbolic', -1)).toBe('-\\theta_{1}');
  });

  it('leaves a zero angle unsigned', () => {
    expect(formatSignedAngle(valued(0), 'pi', -1)).toBe('0');
    expect(formatSignedAngle(valued(0), 'decimal', -1)).toBe('0');
  });
});

describe('angleWidthChars', () => {
  it('sizes a symbolic angle from its rendered name', () => {
    expect(angleWidthChars(new Angle('theta_9'), 'symbolic')).toBe(2);
    expect(angleWidthChars(new Angle('theta_10'), 'symbolic')).toBe(3);
    expect(angleWidthChars(new Angle('myAngle'), 'symbolic')).toBe(7);
  });

  it('sizes a stacked fraction by its wider half, not the flat form', () => {
    // `\frac{3\pi}{4}` renders two rows deep, so it is only as wide as `3pi`.
    expect(angleWidthChars(new Angle('t', (3 * Math.PI) / 4), 'pi')).toBe(3);
    expect(angleWidthChars(new Angle('t', Math.PI / 4), 'pi')).toBe(2);
    expect(angleWidthChars(new Angle('t', Math.PI), 'pi')).toBe(1);
    expect(angleWidthChars(new Angle('t', 2 * Math.PI), 'pi')).toBe(2);
  });

  it('sizes a pi-mode fallback as the decimal it actually renders', () => {
    // 0.9273 is not a simple multiple of pi, so pi mode shows six characters.
    expect(angleWidthChars(new Angle('t', 0.9273), 'pi')).toBe(6);
    expect(angleWidthChars(new Angle('t', 0.9273), 'decimal')).toBe(6);
  });

  it('sizes a valueless angle by its symbol in every mode', () => {
    const symbolic = new Angle('theta_9');

    expect(angleWidthChars(symbolic, 'pi')).toBe(2);
    expect(angleWidthChars(symbolic, 'decimal')).toBe(2);
  });
});
