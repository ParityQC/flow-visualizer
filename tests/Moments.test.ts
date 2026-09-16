// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Moment } from '../src/models/Moments';
import { Gate } from '../src/models/Gates';
import { RzTargetType, XTargetType } from '../src/models/Targets';
import { Angle } from '../src/models/Angle';

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

describe('Moment.replaceGate', () => {
  function rotationMoment() {
    const moment = new Moment();
    const gate = new Gate({ targetType: new RzTargetType(), controls: [], targets: [1] });
    moment.addGate(gate);
    return { moment, gate };
  }

  it('swaps the gate while keeping the qubit index consistent', () => {
    const { moment, gate } = rotationMoment();
    const replacement = gate.withAngle(new Angle('theta_1', 0.5));

    moment.replaceGate(gate, replacement);

    expect([...moment.gates()]).toEqual([replacement]);
    expect(moment.getGate(1)).toBe(replacement);
  });

  it('keeps the gate at its original position in the moment', () => {
    const moment = new Moment();
    const first = new Gate({ targetType: new XTargetType(), controls: [], targets: [0] });
    const second = new Gate({ targetType: new RzTargetType(), controls: [], targets: [1] });
    const third = new Gate({ targetType: new XTargetType(), controls: [], targets: [2] });
    moment.addGate(first);
    moment.addGate(second);
    moment.addGate(third);

    const replacement = second.withAngle(new Angle('theta_1'));
    moment.replaceGate(second, replacement);

    expect([...moment.gates()]).toEqual([first, replacement, third]);
  });

  it('throws for a gate that is not in the moment', () => {
    const { moment } = rotationMoment();
    const foreign = new Gate({ targetType: new XTargetType(), controls: [], targets: [7] });

    expect(() => moment.replaceGate(foreign, foreign)).toThrow(
      'Gate does not exist in current Moment'
    );
  });

  it('refuses a replacement that would move the gate', () => {
    const { moment, gate } = rotationMoment();
    const moved = gate.cloneShifted(1);

    expect(() => moment.replaceGate(gate, moved)).toThrow(/must not move a gate/);
    expect(moment.getGate(1)).toBe(gate);
  });
});
