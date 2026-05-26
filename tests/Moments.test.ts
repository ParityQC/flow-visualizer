import { describe, it, expect } from 'vitest';
import { Moment } from '../src/models/Moments';
import { Gate } from '../src/models/Gates';
import { RzTargetType, XTargetType } from '../src/models/Targets';

function parameterizedTestMoment() {
  const moments = new Moment();
  const xgate = new XTargetType();
  const rzgate = new RzTargetType();

  const gate1 = new Gate({ targetType: xgate, controls: [0], targets: [1] });
  const gate2 = new Gate({ targetType: rzgate, controls: [0], targets: [1] });

  return { moments, gate1, gate2 };
}

describe('Moments', () => {
  it('Basic functionality', () => {
    const moment = new Moment();
    const gate = new Gate({
      targetType: new XTargetType(),
      controls: [0],
      targets: [2],
    });
    expect(() => {
      moment.addGate(gate);
    }).not.toThrow();
  });

  it('Should throw an error when Gates overlap on qubit(s)', () => {
    const { moments, gate1, gate2 } = parameterizedTestMoment();
    moments.addGate(gate1);
    expect(() => {
      moments.addGate(gate2);
    }).toThrow('Cannot add Gate: Gate overlaps with existing Gate on qubit(s): [0, 1]');
  });

  it('addGate', () => {
    const { moments, gate1 } = parameterizedTestMoment();
    const gate = new Gate({
      targetType: new RzTargetType(),
      controls: [],
      targets: [2],
    });
    moments.addGate(gate1); // addGate iteratets over gates and qubits
    expect([...moments]).toEqual([gate1]);
    moments.addGate(gate);
    expect([...moments]).toEqual([gate1, gate]);

    expect([...moments.qubits()].sort()).toEqual([0, 1, 2]);
  });

  it('should clone properly', () => {
    const { moments, gate1 } = parameterizedTestMoment();
    moments.addGate(gate1);
    const clonedMoment = moments.clone();
    expect(clonedMoment).toEqual(moments);
  });
});
