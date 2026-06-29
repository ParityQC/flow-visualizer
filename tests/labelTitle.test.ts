import { describe, it, expect } from 'vitest';
import { Label, XZLabelPair, SinglePauli } from '../src/utils/labelTracking';
import { pairToTitle } from '../src/utils/QubitLabelDisplay';

const x = (q: string) => new SinglePauli('X', q);
const z = (q: string) => new SinglePauli('Z', q);

describe('pairToTitle', () => {
  it('renders the identity as I on both rows', () => {
    const pair = new XZLabelPair(new Label([], 0), new Label([], 0));
    expect(pairToTitle(pair)).toBe('X: I\nZ: I');
  });

  it('brackets X operators and leaves Z operators plain', () => {
    const pair = new XZLabelPair(new Label([x('1')], 0), new Label([z('1'), z('2')], 0));
    expect(pairToTitle(pair)).toBe('X: ⟨1⟩\nZ: 1,2');
  });

  it('includes the phase prefix', () => {
    const pair = new XZLabelPair(new Label([z('1'), z('2')], 2), new Label([x('1')], 1));
    expect(pairToTitle(pair)).toBe('X: -1,2\nZ: i⟨1⟩');
  });

  it('renders combined X and Z operators in one row', () => {
    const pair = new XZLabelPair(new Label([x('1'), x('2'), z('3'), z('4')], 0), new Label([], 0));
    expect(pairToTitle(pair)).toBe('X: ⟨1,2⟩3,4\nZ: I');
  });
});
