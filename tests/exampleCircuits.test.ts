// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Circuit } from '../src/models/Circuit';
import { twineQft } from '../src/utils/exampleCircuits';

/**
 * A state vector over `numQubits` qubits, as separate real and imaginary parts.
 * Qubit `q` is bit `q` of the basis index, so the bottom row of the circuit grid
 * carries the most significant bit -- which is the figure's wire 1, the qubit the
 * QFT Hadamards first.
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
 * Run `circuit` on the basis state `basis`. Only the gate types the examples use
 * are implemented; anything else is a bug in the test's reading of the circuit.
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

  it('spans exactly five qubits', () => {
    expect(twineQft.usedQubits()).toEqual([0, 1, 2, 3, 4]);
  });

  it('uses one CNOT pair per label step plus the closing ladder', () => {
    let cnots = 0;
    let rotations = 0;
    for (const moment of twineQft.moments()) {
      for (const gate of moment.gates()) {
        if (gate.isControlled()) cnots += 1;
        if (gate.isRotation) rotations += 1;
      }
    }
    // Two CNOTs per label step, n - 1 rounds of n - r steps each, then the ladder.
    expect(cnots).toBe(2 * ((numQubits * (numQubits - 1)) / 2) + (numQubits - 1));
    // One Rz per controlled phase, the two end columns, and the Rx Hadamards.
    expect(rotations).toBe(
      (numQubits * (numQubits - 1)) / 2 + 2 * (numQubits - 1) + (numQubits - 2)
    );
  });

  it('implements the quantum Fourier transform up to a global phase', () => {
    // The QFT maps |x> to the uniform superposition with phases exp(2 pi i x y / N),
    // so the circuit may differ from it only by one phase shared by every entry.
    let phase: [number, number] | null = null;

    for (let x = 0; x < dim; x++) {
      const state = simulate(twineQft, numQubits, x);
      for (let y = 0; y < dim; y++) {
        const angle = (2 * Math.PI * x * y) / dim;
        const [qftRe, qftIm] = [Math.cos(angle) / Math.sqrt(dim), Math.sin(angle) / Math.sqrt(dim)];
        // state[y] / qft[y], which is well defined since |qft[y]| = 1 / sqrt(N).
        const ratio: [number, number] = [
          (state.re[y] * qftRe + state.im[y] * qftIm) * dim,
          (state.im[y] * qftRe - state.re[y] * qftIm) * dim,
        ];
        phase ??= ratio;
        expect(Math.hypot(ratio[0] - phase[0], ratio[1] - phase[1])).toBeLessThan(1e-9);
      }
    }
  });
});
