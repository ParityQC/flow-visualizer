// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Gate } from '../src/models/Gates';
import { Angle } from '../src/models/Angle';
import { RzTargetType, XTargetType } from '../src/models/Targets';

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

describe('Gate params', () => {
  it('defaults to no params, so a rotation may be built before it is named', () => {
    const gate = new Gate({ targetType: new RzTargetType(), controls: [], targets: [0] });

    expect(gate.params).toEqual([]);
    expect(gate.angle).toBeUndefined();
    expect(gate.isRotation).toBe(true);
  });

  it('reports isRotation false for a gate that takes no angle', () => {
    const gate = new Gate({ targetType: new XTargetType(), controls: [], targets: [0] });

    expect(gate.isRotation).toBe(false);
  });

  it('stores a supplied angle', () => {
    const angle = new Angle('theta_1', Math.PI / 2);
    const gate = new Gate({
      targetType: new RzTargetType(),
      controls: [],
      targets: [0],
      params: [angle],
    });

    expect(gate.params).toEqual([angle]);
    expect(gate.angle).toBe(angle);
  });

  it('throws when the number of params does not match numParams', () => {
    expect(() => {
      new Gate({
        targetType: new XTargetType(),
        controls: [],
        targets: [0],
        params: [new Angle('theta_1')],
      });
    }).toThrow('Wrong param size: X gate requires 0 param(s) got 1 instead.');
  });

  it('withAngle returns a new gate and leaves the original alone', () => {
    const gate = new Gate({ targetType: new RzTargetType(), controls: [], targets: [0] });
    const named = gate.withAngle(new Angle('theta_1'));

    expect(named.angle?.symbol).toBe('theta_1');
    expect(named.targets).toEqual([0]);
    expect(gate.angle).toBeUndefined();
  });

  it('carries the angle through clone and cloneShifted', () => {
    const gate = new Gate({
      targetType: new RzTargetType(),
      controls: [],
      targets: [0],
      params: [new Angle('theta_1', 0.25)],
    });

    expect(gate.clone().angle?.equals(new Angle('theta_1', 0.25))).toBe(true);

    const shifted = gate.cloneShifted(3);
    expect(shifted.targets).toEqual([3]);
    // A moved gate must keep its symbol, or dragging would silently retie it.
    expect(shifted.angle?.equals(new Angle('theta_1', 0.25))).toBe(true);
  });
});
