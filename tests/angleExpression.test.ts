// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { describe, it, expect } from 'vitest';
import {
  parseAngleExpression,
  isValidAngleExpression,
  AngleExpressionError,
} from '../src/utils/angleExpression';

describe('parseAngleExpression', () => {
  it.each<[string, number]>([
    ['pi', Math.PI],
    ['PI', Math.PI],
    ['pi/4', Math.PI / 4],
    ['-pi/2', -Math.PI / 2],
    ['2*pi', 2 * Math.PI],
    ['3*pi/4', (3 * Math.PI) / 4],
    ['0.5*pi', Math.PI / 2],
    ['pi/2/2', Math.PI / 4],
    ['pi*pi', Math.PI * Math.PI],
    ['0.7853981634', 0.7853981634],
    ['-1.5', -1.5],
    ['0', 0],
    ['.25', 0.25],
    ['1e-3', 0.001],
    ['  pi / 4  ', Math.PI / 4],
    ['-pi', -Math.PI],
  ])('parses "%s"', (text, expected) => {
    expect(parseAngleExpression(text)).toBeCloseTo(expected, 12);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['addition', 'pi+1'],
    ['subtraction between factors', 'pi-1'],
    ['parentheses', '(pi)'],
    ['function call', 'sin(1)'],
    ['implicit multiplication', '4pi'],
    ['double sign', '--1'],
    ['leading plus', '+1'],
    ['trailing operator', 'pi/'],
    ['bare identifier', 'theta_1'],
    ['division by zero', 'pi/0'],
    ['unknown constant', 'tau'],
  ])('rejects %s: "%s"', (_name, text) => {
    expect(() => parseAngleExpression(text)).toThrow(AngleExpressionError);
  });

  it('reports the offending text with a hint', () => {
    expect(() => parseAngleExpression('pi+1')).toThrow(
      'Cannot read "pi+1" as an angle. Use forms like pi/4, -pi/2, 3*pi/4, 0.5*pi or 0.7854.'
    );
  });

  it('isValidAngleExpression mirrors the parser without throwing', () => {
    expect(isValidAngleExpression('pi/4')).toBe(true);
    expect(isValidAngleExpression('4pi')).toBe(false);
  });
});
