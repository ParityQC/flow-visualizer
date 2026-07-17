// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Gate } from '../src/models/Gates';
import { XTargetType } from '../src/models/Targets';

describe('Gate constructor', () => {
  it('Should construct correctly with valid params', () => {
    const gate = new Gate({
      targetType: new XTargetType(),
      controls: [0, 1],
      targets: [2],
    });

    expect(gate.targetType).toBeInstanceOf(XTargetType);
    expect(gate.controls).toEqual([0, 1]);
    expect(gate.targets).toEqual([2]);
    expect([...gate.qubits()].sort()).toEqual([0, 1, 2]);
  });

  it('Should throw an error when constructing with wrong number of targets', () => {
    expect(() => {
      new Gate({
        targetType: new XTargetType(),
        targets: [0, 1, 2],
        controls: [],
      });
    }).toThrow(`Wrong target size: X gate requires 1 target(s) got 3 instead.`);
  });

  it('Should throw an error if target and control overlap', () => {
    expect(() => {
      new Gate({
        targetType: new XTargetType(),
        targets: [0],
        controls: [0],
      });
    }).toThrow(`Control and target overlap on qubit(s): 0`);
  });
});
