import { describe, it, expect } from 'vitest';
import { Label, XZLabelPair, SinglePauli } from '../src/utils/labelTracking';
import {
  estimateLabelWidth,
  estimateLabelPairWidth,
  getMonospaceCharWidth,
} from '../src/utils/QubitLabelDisplayUtils';
import { fallbackCharWidth, labelPhaseGap, labelTokenGap } from '../src/utils/LayoutConstants';

// Use a round charWidth so expected pixel widths are easy to read.
const W = 10;

const x = (q: string) => new SinglePauli('X', q);
const z = (q: string) => new SinglePauli('Z', q);

describe('estimateLabelWidth', () => {
  it('treats the identity label as a single "I" character', () => {
    // textChars = 1 (the "I"), no token gaps, empty phase span still adds labelPhaseGap.
    expect(estimateLabelWidth(new Label([], 0), W)).toBe(1 * W + labelPhaseGap);
  });

  it('counts the two angle brackets for an X token', () => {
    // ⟨1⟩ -> 2 braces + 1 digit = 3 chars, one token span (no token gaps).
    expect(estimateLabelWidth(new Label([x('1')], 0), W)).toBe(3 * W + labelPhaseGap);
  });

  it('counts commas and a per-span gap between Z operators', () => {
    // 1,2 -> digits 1+1 + 1 comma = 3 chars; two Z spans -> one labelTokenGap.
    expect(estimateLabelWidth(new Label([z('1'), z('2')], 0), W)).toBe(
      3 * W + labelPhaseGap + labelTokenGap
    );
  });

  it('adds the phase prefix width', () => {
    const noPhase = estimateLabelWidth(new Label([z('1'), z('2')], 0), W);
    const minus = estimateLabelWidth(new Label([z('1'), z('2')], 2), W); // "-"
    const minusI = estimateLabelWidth(new Label([z('1'), z('2')], 3), W); // "-i"
    expect(minus).toBe(noPhase + 1 * W);
    expect(minusI).toBe(noPhase + 2 * W);
  });

  it('grows with multi-digit qubit indices', () => {
    const single = estimateLabelWidth(new Label([z('1')], 0), W);
    const double = estimateLabelWidth(new Label([z('12')], 0), W);
    expect(double).toBe(single + 1 * W);
  });

  it('is monotonic in the number of operators', () => {
    const one = estimateLabelWidth(new Label([z('1')], 0), W);
    const two = estimateLabelWidth(new Label([z('1'), z('2')], 0), W);
    const three = estimateLabelWidth(new Label([z('1'), z('2'), z('3')], 0), W);
    expect(two).toBeGreaterThan(one);
    expect(three).toBeGreaterThan(two);
  });
});

describe('estimateLabelPairWidth', () => {
  it('returns the width of the wider of the two rows', () => {
    const wideX = new Label([x('1'), x('2'), x('3')], 0); // ⟨1,2,3⟩
    const narrowZ = new Label([z('1')], 0); // 1
    const pair = new XZLabelPair(wideX, narrowZ);
    expect(estimateLabelPairWidth(pair, W)).toBe(estimateLabelWidth(wideX, W));
    expect(estimateLabelPairWidth(pair, W)).toBeGreaterThan(estimateLabelWidth(narrowZ, W));
  });
});

describe('getMonospaceCharWidth', () => {
  it('falls back to the calibrated constant when canvas is unavailable', () => {
    // jsdom does not implement canvas 2d context, so this exercises the fallback.
    expect(getMonospaceCharWidth()).toBe(fallbackCharWidth);
  });
});
