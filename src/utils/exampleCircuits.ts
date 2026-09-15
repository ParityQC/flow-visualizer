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
 *
 * The figure's wire `w` (1 at the bottom) is qubit `numQubits - w` here, so the
 * twine still runs upwards across the grid.
 *
 * Round `r` walks a parity label up the chain: the pair `CX(k+1 -> k)`,
 * `CX(k -> k+1)` leaves wire `k` carrying the parity of qubit `r` with the qubit
 * `k` steps along it, so the controlled phase between those two qubits is the
 * single `Rz(-pi/2^(k+1))` sitting right there. Each round is one shorter than
 * the last, and together they cover all `n(n-1)/2` controlled phases.
 *
 * A controlled phase also has two one-qubit halves. Those are diagonal and
 * commute with everything diagonal, so they are collected into the `Rz` columns
 * at either end -- before a qubit's own Hadamard for the partners below it,
 * after it for the ones above. The Hadamard itself is the `Rx(pi/2)` on the
 * bottom wire, using `H = i Rz(pi/2) Rx(pi/2) Rz(pi/2)` with the two `Rz(pi/2)`
 * absorbed into those same columns -- which is why a column entry reads
 * `pi - pi/2^w` rather than just the collected `pi/2 - pi/2^w`. The first and
 * last qubit keep a literal `H` and so contribute no `pi/2`.
 *
 * The closing CNOT ladder divides the leftover single-qubit label back out of
 * every wire. What is left is the register in reverse order -- exactly the bit
 * reversal the QFT ends on.
 */
function buildTwineQft(numQubits: number): Circuit {
  const qubit = (wire: number) => numQubits - wire;
  const circuit = new Circuit();
  const step = (gate: Gate) => circuit.appendMoment(new Moment([gate]));

  /** The end column on `wire`, identical at both ends of the circuit. */
  const columnAngle = (wire: number) =>
    Math.PI / 2 - Math.PI / 2 ** wire + (wire === numQubits ? 0 : Math.PI / 2);

  step(h(qubit(1)));
  for (let wire = 2; wire <= numQubits; wire++) {
    step(rz(qubit(wire), Angle.unnamed(columnAngle(wire))));
  }

  for (let round = 1; round < numQubits; round++) {
    for (let k = 1; k <= numQubits - round; k++) {
      step(cnot(qubit(k), qubit(k + 1)));
      step(cnot(qubit(k + 1), qubit(k)));
      step(rz(qubit(k), Angle.unnamed(-Math.PI / 2 ** (k + 1))));
      // The Hadamard opening the next round. The last round is followed by the
      // closing `H` instead, so it needs none.
      if (k === 1 && round < numQubits - 1) {
        step(rx(qubit(1), Angle.unnamed(Math.PI / 2)));
      }
    }
  }

  for (let wire = numQubits - 1; wire >= 1; wire--) {
    step(cnot(qubit(wire), qubit(wire + 1)));
  }

  for (let wire = numQubits; wire >= 2; wire--) {
    step(rz(qubit(wire), Angle.unnamed(columnAngle(wire))));
  }
  step(h(qubit(1)));

  circuit.parallelizeGates();
  return circuit;
}

export const twineQft = buildTwineQft(5);
