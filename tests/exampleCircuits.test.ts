// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Circuit } from '../src/models/Circuit';
import { twineQft } from '../src/utils/exampleCircuits';

/**
 * A state vector over `numQubits` qubits, as separate real and imaginary parts.
 * Qubit `q` is bit `q` of the basis index. Which qubit counts as the most
 * significant bit is a reading imposed afterwards, not a property of the state.
 */
interface State {
  re: Float64Array;
  im: Float64Array;
}

/** Apply a one-qubit matrix [[a, b], [c, d]], each entry given as [re, im]. */
function applyOneQubit(state: State, qubit: number, [a, b, c, d]: [number, number][]): void {
  const bit = 1 << qubit;
  for (let i = 0; i < state.re.length; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const [r0, i0, r1, i1] = [state.re[i], state.im[i], state.re[j], state.im[j]];
    state.re[i] = a[0] * r0 - a[1] * i0 + b[0] * r1 - b[1] * i1;
    state.im[i] = a[0] * i0 + a[1] * r0 + b[0] * i1 + b[1] * r1;
    state.re[j] = c[0] * r0 - c[1] * i0 + d[0] * r1 - d[1] * i1;
    state.im[j] = c[0] * i0 + c[1] * r0 + d[0] * i1 + d[1] * r1;
  }
}

function applyCnot(state: State, control: number, target: number): void {
  const controlBit = 1 << control;
  const targetBit = 1 << target;
  for (let i = 0; i < state.re.length; i++) {
    if (!(i & controlBit) || i & targetBit) continue;
    const j = i | targetBit;
    [state.re[i], state.re[j]] = [state.re[j], state.re[i]];
    [state.im[i], state.im[j]] = [state.im[j], state.im[i]];
  }
}

/**
 * Run `circuit` on the basis state `basis`. Covers the gate types the examples
 * reach for; anything else throws rather than being silently skipped.
 */
function simulate(circuit: Circuit, numQubits: number, basis: number): State {
  const state: State = {
    re: new Float64Array(1 << numQubits),
    im: new Float64Array(1 << numQubits),
  };
  state.re[basis] = 1;

  for (const moment of circuit.moments()) {
    for (const gate of moment.gates()) {
      const target = gate.targets[0];
      const theta = gate.angle?.value ?? NaN;
      const [cos, sin] = [Math.cos(theta / 2), Math.sin(theta / 2)];
      switch (gate.targetType.name) {
        case 'H': {
          const s = Math.SQRT1_2;
          applyOneQubit(state, target, [
            [s, 0],
            [s, 0],
            [s, 0],
            [-s, 0],
          ]);
          break;
        }
        case 'Rz':
          applyOneQubit(state, target, [
            [cos, -sin],
            [0, 0],
            [0, 0],
            [cos, sin],
          ]);
          break;
        case 'Rx':
          applyOneQubit(state, target, [
            [cos, 0],
            [0, -sin],
            [0, -sin],
            [cos, 0],
          ]);
          break;
        case 'X':
          expect(gate.controls).toHaveLength(1);
          applyCnot(state, gate.controls[0], target);
          break;
        default:
          throw new Error(`Unsupported gate in test simulator: ${gate.targetType.name}`);
      }
    }
  }
  return state;
}

describe('twineQft', () => {
  const numQubits = 5;
  const dim = 1 << numQubits;
  const moments = [...twineQft.moments()];

  it('spans exactly five qubits', () => {
    expect(twineQft.usedQubits()).toEqual([0, 1, 2, 3, 4]);
  });

  it('is built from CNOTs and rotations only', () => {
    const counts = new Map<string, number>();
    for (const moment of moments) {
      for (const gate of moment.gates()) {
        const name = gate.isControlled() ? `C${gate.targetType.name}` : gate.targetType.name;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    const pairs = (numQubits * (numQubits - 1)) / 2;
    expect(counts).toEqual(
      new Map([
        // Two CNOTs per label step, one step per controlled phase, then the chain.
        ['CX', 2 * pairs + (numQubits - 1)],
        // One Hadamard per qubit, none of them left as a Clifford `H`.
        ['Rx', numQubits],
        // One Rz per controlled phase, the two full end columns, and the outer
        // halves of the two Hadamards written out at the circuit's edges.
        ['Rz', pairs + 2 * numQubits + 2],
      ])
    );
  });

  it('keeps each end column in a single moment', () => {
    // Third from the front and third from the back; the Hadamard on q0 takes the
    // two moments outside each of them.
    for (const column of [moments[2], moments[moments.length - 3]]) {
      expect([...column.qubits()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
      expect([...column.gates()].every((gate) => gate.targetType.name === 'Rz')).toBe(true);
    }
  });

  it('runs the decoding chain straight into the closing column', () => {
    // As late as the dependencies allow: one link per moment, the last of them
    // in the moment just before the column, so the chain reads as one diagonal.
    const closingColumn = moments.length - 3;
    for (let link = 1; link < numQubits; link++) {
      const moment = moments[closingColumn - numQubits + link];
      const control = numQubits - link;
      const gate = moment.getGate(control);
      expect(gate?.controls).toEqual([control]);
      expect(gate?.targets).toEqual([control - 1]);
    }
  });

  it('maps |x> to the phases exp(-2 pi i x y / N) up to a global phase', () => {
    // Angles are QASM angles, R_z(alpha) = exp(-i alpha Z / 2), negated against the
    // ones the paper's figure prints so that the circuit performs the figure's
    // unitary. That is the forward QFT under the classical DFT's sign convention and
    // the inverse one under the exp(+2 pi i x y / N) convention, so the phase is
    // asserted directly rather than named. Wire 1 of the figure is q0, the most
    // significant bit.
    const weight = (qubit: number) => 1 << (numQubits - 1 - qubit);
    const value = (basis: number) => {
      let total = 0;
      for (let qubit = 0; qubit < numQubits; qubit++) {
        if (basis & (1 << qubit)) total += weight(qubit);
      }
      return total;
    };

    let phase: [number, number] | null = null;
    for (let basis = 0; basis < dim; basis++) {
      const state = simulate(twineQft, numQubits, basis);
      const x = value(basis);
      for (let out = 0; out < dim; out++) {
        const angle = (-2 * Math.PI * x * value(out)) / dim;
        const [re, im] = [Math.cos(angle) / Math.sqrt(dim), Math.sin(angle) / Math.sqrt(dim)];
        // state[out] / expected[out], well defined since |expected| = 1 / sqrt(N).
        const ratio: [number, number] = [
          (state.re[out] * re + state.im[out] * im) * dim,
          (state.im[out] * re - state.re[out] * im) * dim,
        ];
        phase ??= ratio;
        expect(Math.hypot(ratio[0] - phase[0], ratio[1] - phase[1])).toBeLessThan(1e-9);
      }
    }
  });
});
