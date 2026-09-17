// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
/**
 *  stores hardcoded example circuits
 */
import { Angle } from '../models/Angle';
import { Circuit } from '../models/Circuit';
import { Gate } from '../models/Gates';
import { Moment } from '../models/Moments';
import {
  HTargetType,
  RxTargetType,
  RyTargetType,
  RzTargetType,
  SdgTargetType,
  STargetType,
  XTargetType,
} from '../models/Targets';

function cnot(target: number, control: number): Gate {
  return new Gate({
    targetType: new XTargetType(),
    targets: [target],
    controls: [control],
  });
}

function h(target: number): Gate {
  return new Gate({
    targetType: new HTargetType(),
    targets: [target],
    controls: [],
  });
}

function x(target: number): Gate {
  return new Gate({
    targetType: new XTargetType(),
    targets: [target],
    controls: [],
  });
}

function rx(target: number, angle?: Angle): Gate {
  return new Gate({
    targetType: new RxTargetType(),
    targets: [target],
    controls: [],
    params: angle ? [angle] : [],
  });
}

function ry(target: number, angle?: Angle): Gate {
  return new Gate({
    targetType: new RyTargetType(),
    targets: [target],
    controls: [],
    params: angle ? [angle] : [],
  });
}

function rz(target: number, angle?: Angle): Gate {
  return new Gate({
    targetType: new RzTargetType(),
    targets: [target],
    controls: [],
    params: angle ? [angle] : [],
  });
}

function s(target: number): Gate {
  return new Gate({
    targetType: new STargetType(),
    targets: [target],
    controls: [],
  });
}

function sdg(target: number): Gate {
  return new Gate({
    targetType: new SdgTargetType(),
    targets: [target],
    controls: [],
  });
}
//------------------------------------------//
// Examples
//------------------------------------------//

// A rotation may be given a concrete angle -- `rz(1, new Angle('theta_1', Math.PI / 4))`.
// Left without one, it is named on load by `Circuit.assignMissingAngleSymbols`,
// which is what the examples below rely on.

export const emptyCircuit = new Circuit();

export const testCircuit = new Circuit([
  new Moment([h(1), x(2)]),
  new Moment([cnot(1, 2)]),
  new Moment([x(1)]),
  new Moment([cnot(1, 2)]),
]);

export const twineChain = new Circuit([
  new Moment([cnot(4, 3)]),
  new Moment([cnot(3, 4)]),
  new Moment([cnot(3, 2)]),
  new Moment([cnot(2, 3)]),
  new Moment([cnot(2, 1)]),
  new Moment([cnot(1, 2)]),
  new Moment([cnot(1, 0)]),
  new Moment([cnot(0, 1)]),
]);

export const oneDHeisenberg = new Circuit([
  new Moment([cnot(1, 2)]),
  new Moment([rz(1), rx(2)]),
  new Moment([h(1)]),
  new Moment([cnot(1, 2)]),
  new Moment([h(1), rx(2)]),
  new Moment([s(1)]),
  new Moment([cnot(1, 2)]),
  new Moment([sdg(1), s(2)]),
]);

export const oneDHeisenbergAuxiliary = new Circuit([
  new Moment([cnot(2, 1), s(3)]),
  new Moment([cnot(1, 3)]),
  new Moment([cnot(3, 2)]),
  new Moment([rx(1), rz(2), ry(3)]),
  new Moment([cnot(3, 2)]),
  new Moment([cnot(1, 3)]),
  new Moment([cnot(2, 1), sdg(3)]),
]);

/**
 * QFT on a nearest-neighbor line, after Fig. 14(a) of arXiv:2501.14020, which
 * draws it for six qubits.
 */
function buildTwineQft(numQubits: number): Circuit {
  const quarterTurn = Math.PI / 2;
  const lastQubit = numQubits - 1;

  /** The angles of the rotations in the Rz column at either end. */
  const RzColumnAngle = (qubit: number) =>
    qubit === 0
      ? quarterTurn
      : -Math.PI / 2 ** (qubit + 1) + quarterTurn + (qubit === lastQubit ? 0 : quarterTurn);

  /** The Rz column standing at either end, one gate per qubit, one moment. */
  const RzColumn = () =>
    new Moment(
      Array.from({ length: numQubits }, (_, qubit) =>
        rz(qubit, Angle.unnamed(RzColumnAngle(qubit)))
      )
    );

  // The rounds, compacted on their own so that nothing placed afterwards gets
  // dragged forward into them.
  const rounds = new Circuit();
  const step = (gate: Gate) => rounds.appendMoment(new Moment([gate]));

  for (let round = 0; round < numQubits - 1; round++) {
    for (let qubit = 0; qubit < numQubits - 1 - round; qubit++) {
      step(cnot(qubit, qubit + 1));
      step(cnot(qubit + 1, qubit));
      step(rz(qubit, Angle.unnamed(-Math.PI / 2 ** (qubit + 2))));
      if (qubit === 0 && round < numQubits - 2) {
        step(rx(0, Angle.unnamed(quarterTurn)));
      }
    }
  }

  rounds.parallelizeGates();

  // The decoding chain of CNOT gates.
  const body = [...rounds.moments(), new Moment()];
  for (let control = lastQubit; control >= 1; control--) {
    body[body.length - control].addGate(cnot(control - 1, control));
  }

  const circuit = new Circuit();
  // Opening Hadamard: its trailing Rz is q0's entry in the Rz column.
  circuit.appendMoment(new Moment([rz(0, Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(new Moment([rx(0, Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(RzColumn());
  for (const moment of body) {
    circuit.appendMoment(moment);
  }
  // Closing Hadamard.
  circuit.appendMoment(RzColumn());
  circuit.appendMoment(new Moment([rx(0, Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(new Moment([rz(0, Angle.unnamed(quarterTurn))]));

  return circuit;
}

export const twineQft = buildTwineQft(5);
