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
 * QFT on a nearest-neighbour line, after Fig. 14(a) of arXiv:2501.14020, which
 * draws it for six qubits.
 */
function buildTwineQft(numQubits: number): Circuit {
  const qubit = (wire: number) => wire - 1;
  const quarterTurn = Math.PI / 2;

  /**
   * Wire `wire`'s entry in either end column: the collected one-qubit halves of
   * the controlled phases, plus the `Rz` half of the wire's Hadamard. Wire 1
   * carries no collected phases and belongs to an edge Hadamard, so it is that
   * Hadamard's positive `Rz` alone.
   */
  const columnAngle = (wire: number) =>
    wire === 1
      ? quarterTurn
      : Math.PI / 2 ** wire - quarterTurn - (wire === numQubits ? 0 : quarterTurn);

  /** The `Rz` column standing at either end, one gate per wire, one moment. */
  const endColumn = () =>
    new Moment(
      Array.from({ length: numQubits }, (_, index) =>
        rz(qubit(index + 1), Angle.unnamed(columnAngle(index + 1)))
      )
    );

  // The rounds, compacted on their own so that nothing placed afterwards gets
  // dragged forward into them.
  const rounds = new Circuit();
  const step = (gate: Gate) => rounds.appendMoment(new Moment([gate]));

  for (let round = 1; round < numQubits; round++) {
    for (let k = 1; k <= numQubits - round; k++) {
      step(cnot(qubit(k), qubit(k + 1)));
      step(cnot(qubit(k + 1), qubit(k)));
      step(rz(qubit(k), Angle.unnamed(Math.PI / 2 ** (k + 1))));
      // The Hadamard opening the next round. After the last round the closing
      // one takes over, so that round needs none.
      if (k === 1 && round < numQubits - 1) {
        step(rx(qubit(1), Angle.unnamed(-quarterTurn)));
      }
    }
  }

  rounds.parallelizeGates();

  // The decoding chain, as late as the rounds allow. Its last CNOT needs a
  // moment of its own -- the rounds end on an `Rz` on wire 1, which it follows
  // -- and each earlier link sits one moment ahead of its successor, which is
  // exactly the free diagonal the rounds leave behind. `addGate` throws rather
  // than silently misplacing a link if that ever stops being true.
  const body = [...rounds.moments(), new Moment()];
  for (let link = 1; link < numQubits; link++) {
    const wire = numQubits - link;
    body[body.length - numQubits + link].addGate(cnot(qubit(wire), qubit(wire + 1)));
  }

  const circuit = new Circuit();
  // Opening Hadamard: its trailing Rz is wire 1's entry in the column, which is
  // why the column comes third and the twine starts against a full one.
  circuit.appendMoment(new Moment([rz(qubit(1), Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(new Moment([rx(qubit(1), Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(endColumn());
  for (const moment of body) {
    circuit.appendMoment(moment);
  }
  // Closing Hadamard, the mirror image: the column supplies its leading Rz.
  circuit.appendMoment(endColumn());
  circuit.appendMoment(new Moment([rx(qubit(1), Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(new Moment([rz(qubit(1), Angle.unnamed(quarterTurn))]));

  return circuit;
}

export const twineQft = buildTwineQft(5);
