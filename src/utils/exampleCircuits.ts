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
 * Every Hadamard here is an `Rx(pi/2)` on the bottom wire, written out rather
 * than dropped in as an `H`: the app tracks `H` as a Clifford and folds it into
 * the labels, while it leaves a rotation alone, so spelling it out keeps CNOTs
 * as the only label-moving gates and every label a plain parity word. The two
 * `Rz(pi/2)` that `H = i Rz(pi/2) Rx(pi/2) Rz(pi/2)` needs on either side are
 * diagonal, so they travel out to the `Rz` columns at the two ends.
 *
 * Those columns also collect the one-qubit halves of the controlled phases,
 * which are diagonal as well: the halves from a qubit's partners below it land
 * in the opening column, the ones from above in the closing column. So a column
 * entry on wire `w` reads `pi/2 - pi/2^w` collected plus `pi/2` for a Hadamard
 * half. Wire 1 collects nothing and carries only the half; wire `n` is the one
 * slot at each end with no half to carry, because the Hadamards at the very
 * edges of the circuit have to spend their outer `Rz(pi/2)` on a moment of
 * their own -- an `Rz` on wire 1 does not commute past the CNOT that targets it.
 *
 * The closing CNOT ladder divides the leftover single-qubit label back out of
 * every wire. What is left is the register in reverse order -- exactly the bit
 * reversal the QFT ends on.
 */
function buildTwineQft(numQubits: number): Circuit {
  const qubit = (wire: number) => numQubits - wire;
  const quarterTurn = Math.PI / 2;

  const columnAngle = (wire: number) =>
    Math.PI / 2 - Math.PI / 2 ** wire + (wire === numQubits ? 0 : Math.PI / 2);

  /** The `Rz` column standing at either end, one gate per wire, one moment. */
  const endColumn = () =>
    new Moment(
      Array.from({ length: numQubits }, (_, index) =>
        rz(qubit(index + 1), Angle.unnamed(columnAngle(index + 1)))
      )
    );

  // The twine itself, compacted on its own so that the end columns stay put.
  const body = new Circuit();
  const step = (gate: Gate) => body.appendMoment(new Moment([gate]));

  for (let round = 1; round < numQubits; round++) {
    for (let k = 1; k <= numQubits - round; k++) {
      step(cnot(qubit(k), qubit(k + 1)));
      step(cnot(qubit(k + 1), qubit(k)));
      step(rz(qubit(k), Angle.unnamed(-Math.PI / 2 ** (k + 1))));
      // The Hadamard opening the next round. After the last round the closing
      // one takes over, so that round needs none.
      if (k === 1 && round < numQubits - 1) {
        step(rx(qubit(1), Angle.unnamed(quarterTurn)));
      }
    }
  }

  for (let wire = numQubits - 1; wire >= 1; wire--) {
    step(cnot(qubit(wire), qubit(wire + 1)));
  }

  body.parallelizeGates();

  const circuit = new Circuit();
  // Opening Hadamard: its trailing Rz(pi/2) is wire 1's entry in the column,
  // which is why the column comes third and the twine starts against a full one.
  circuit.appendMoment(new Moment([rz(qubit(1), Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(new Moment([rx(qubit(1), Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(endColumn());
  for (const moment of body.moments()) {
    circuit.appendMoment(moment);
  }
  // Closing Hadamard, the mirror image: the column supplies its leading Rz(pi/2).
  circuit.appendMoment(endColumn());
  circuit.appendMoment(new Moment([rx(qubit(1), Angle.unnamed(quarterTurn))]));
  circuit.appendMoment(new Moment([rz(qubit(1), Angle.unnamed(quarterTurn))]));

  return circuit;
}

export const twineQft = buildTwineQft(5);
