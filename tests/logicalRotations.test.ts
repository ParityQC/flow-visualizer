// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Circuit } from '../src/models/Circuit';
import { Gate } from '../src/models/Gates';
import { Moment } from '../src/models/Moments';
import {
  HTargetType,
  RxTargetType,
  RyTargetType,
  RzTargetType,
  STargetType,
  TargetType,
  XTargetType,
} from '../src/models/Targets';
import { Label, SinglePauli } from '../src/utils/labelTracking';
import {
  computeLogicalRotations,
  isGlobalPhase,
  labelToPauliWord,
  pauliFactorsToLatex,
  pauliWordToLatex,
  PauliVisibility,
} from '../src/utils/logicalRotations';
import { oneDHeisenberg, oneDHeisenbergAuxiliary } from '../src/utils/exampleCircuits';

function gate(targetType: TargetType, target: number): Gate {
  return new Gate({ targetType, targets: [target], controls: [] });
}

const rx = (target: number) => gate(new RxTargetType(), target);
const ry = (target: number) => gate(new RyTargetType(), target);
const rz = (target: number) => gate(new RzTargetType(), target);
const h = (target: number) => gate(new HTargetType(), target);
const s = (target: number) => gate(new STargetType(), target);
const x = (target: number) => gate(new XTargetType(), target);

const X = (qubit: string) => new SinglePauli('X', qubit);
const Z = (qubit: string) => new SinglePauli('Z', qubit);

/** The generators of a circuit's logical rotations, as KaTeX. */
function generators(circuit: Circuit, isPauliVisible?: PauliVisibility): string[] {
  return computeLogicalRotations(circuit, isPauliVisible).rotations.map((r) =>
    pauliWordToLatex(r.generator)
  );
}

/** Qubit `qubit` starts in |+⟩, so its X stabilises the initial state. */
const plusState =
  (qubit: number): PauliVisibility =>
  (q, type) =>
    !(q === qubit && type === 'X');

/** Qubit `qubit` starts in |0⟩, so its Z stabilises the initial state. */
const zeroState =
  (qubit: number): PauliVisibility =>
  (q, type) =>
    !(q === qubit && type === 'Z');

describe('labelToPauliWord', () => {
  it('reads a qubit carrying both X and Z as Y', () => {
    // i⟨0⟩0 = i X_0 Z_0 = Y_0
    expect(labelToPauliWord(new Label([X('0'), Z('0')], 1))).toEqual({
      sign: 1,
      factors: [{ qubit: 0, pauli: 'Y' }],
    });
  });

  it('keeps the phase as the sign of the word', () => {
    // i³⟨0⟩0 = -Y_0
    expect(pauliWordToLatex(labelToPauliWord(new Label([X('0'), Z('0')], 3)))).toBe('-Y_{0}');
  });

  it('collects the i³ of every Y into the sign', () => {
    // ⟨12⟩12 = X_1X_2Z_1Z_2 = -Y_1Y_2, the case worked through in the paper figure
    const label = new Label([X('1'), X('2'), Z('1'), Z('2')], 0);
    expect(pauliWordToLatex(labelToPauliWord(label))).toBe('-Y_{1}Y_{2}');
  });

  it('orders factors by qubit', () => {
    expect(pauliWordToLatex(labelToPauliWord(new Label([X('3'), Z('0')], 0)))).toBe('Z_{0}X_{3}');
  });

  it('leaves the sign out of the subscript, where the angle carries it', () => {
    const word = labelToPauliWord(new Label([X('0'), Z('0')], 3));
    expect(pauliWordToLatex(word)).toBe('-Y_{0}');
    expect(pauliFactorsToLatex(word)).toBe('Y_{0}');
  });

  it('rejects a label that is not Hermitian', () => {
    // X_0Z_0 without the i is anti-Hermitian, so it generates no rotation.
    expect(() => labelToPauliWord(new Label([X('0'), Z('0')], 0))).toThrow(/not Hermitian/);
  });
});

describe('computeLogicalRotations', () => {
  it('reads Rz off the Z label and Rx off the X label', () => {
    const circuit = new Circuit([new Moment([rz(0), rx(1)])]);
    expect(generators(circuit)).toEqual(['Z_{0}', 'X_{1}']);
  });

  it('reads Ry as i * (X label) * (Z label)', () => {
    expect(generators(new Circuit([new Moment([ry(0)])]))).toEqual(['Y_{0}']);
    // After S the labels are i³⟨0⟩0 and 0, so i·(i³X_0Z_0)·Z_0 = X_0 -- which is
    // S†YS, the sign check that fixes the order of the two labels.
    expect(generators(new Circuit([new Moment([s(0)]), new Moment([ry(0)])]))).toEqual(['X_{0}']);
    // H swaps the two labels, so i·Z_0·X_0 = -i·X_0Z_0 = -Y_0 = H†YH. Taking the
    // labels in the other order would give +Y_0 here.
    expect(generators(new Circuit([new Moment([h(0)]), new Moment([ry(0)])]))).toEqual(['-Y_{0}']);
  });

  it('keeps rotations in circuit order, signs included', () => {
    const circuit = new Circuit([
      new Moment([rz(0)]),
      new Moment([x(0)]), // flips the sign of the Z label
      new Moment([rz(0)]),
    ]);
    expect(generators(circuit)).toEqual(['Z_{0}', '-Z_{0}']);
  });

  it('has no rotations and a trivial Clifford for an empty circuit', () => {
    expect(computeLogicalRotations(new Circuit())).toEqual({
      rotations: [],
      cliffordIsTrivial: true,
    });
  });

  it('reports a Clifford that does not cancel', () => {
    expect(computeLogicalRotations(new Circuit([new Moment([h(0)])])).cliffordIsTrivial).toBe(
      false
    );
  });

  it('counts a leftover Pauli as non-trivial', () => {
    // X leaves the labels' operators alone but negates the Z label.
    expect(computeLogicalRotations(new Circuit([new Moment([x(0)])])).cliffordIsTrivial).toBe(
      false
    );
  });

  it('reproduces the worked example from the paper', () => {
    // `oneDHeisenberg` is the circuit of Fig. 1 (src/assets/FlowFormalism.png),
    // whose three rotations are R̄_{Z₁Z₂}, R̄_{X₁X₂} and R̄_{-Y₁Y₂}, and whose
    // labels are back to their initial values at the end.
    const logical = computeLogicalRotations(oneDHeisenberg);
    expect(logical.rotations.map((r) => pauliWordToLatex(r.generator))).toEqual([
      'Z_{1}Z_{2}',
      'X_{1}X_{2}',
      '-Y_{1}Y_{2}',
    ]);
    expect(logical.cliffordIsTrivial).toBe(true);
  });

  it('transforms an Ry sitting behind several Cliffords', () => {
    // `oneDHeisenbergAuxiliary` is the interesting case: its Ry follows
    // CNOT/S/CNOT/CNOT, so its generator picks up two other qubits and a sign.
    // Checked independently against direct conjugation of the 3-qubit matrices:
    // C†X₁C = X₁X₂, C†Z₂C = Z₁Z₂, C†Y₃C = -Y₁Y₂X₃ (not +Y₁Y₂X₃).
    const logical = computeLogicalRotations(oneDHeisenbergAuxiliary);
    expect(logical.rotations.map((r) => pauliWordToLatex(r.generator))).toEqual([
      'X_{1}X_{2}',
      'Z_{1}Z_{2}',
      '-Y_{1}Y_{2}X_{3}',
    ]);
    expect(logical.cliffordIsTrivial).toBe(true);
  });

  it('drops the Paulis fixed by an initial state', () => {
    // Qubit 3 of the auxiliary circuit is the |+⟩ auxiliary: the label in front
    // of its Ry reduces from -i⟨123⟩3 to -i⟨12⟩3, and the generator with it,
    // since -Y₁Y₂X₃ · X₃ = -Y₁Y₂.
    expect(generators(oneDHeisenbergAuxiliary, plusState(3))).toEqual([
      'X_{1}X_{2}',
      'Z_{1}Z_{2}',
      '-Y_{1}Y_{2}',
    ]);
  });

  it('reduces a rotation about a stabiliser to the identity', () => {
    // Rx on |+⟩ and Rz on |0⟩ are global phases on the state declared.
    expect(generators(new Circuit([new Moment([rx(0)])]), plusState(0))).toEqual(['I']);
    expect(generators(new Circuit([new Moment([rz(0)])]), zeroState(0))).toEqual(['I']);
    // The stabiliser of the *other* basis state is untouched.
    expect(generators(new Circuit([new Moment([rz(0)])]), plusState(0))).toEqual(['Z_{0}']);
  });

  it('keeps the full generator where the reduction is not allowed', () => {
    // Ry on a |+⟩ qubit rotates out of the X₀ = +1 subspace -- Y₀ anticommutes
    // with the stabiliser -- so X₀ cannot be dropped. Reducing anyway would give
    // the anti-Hermitian iZ₀, which generates no rotation.
    expect(generators(new Circuit([new Moment([ry(0)])]), plusState(0))).toEqual(['Y_{0}']);
  });

  it('marks a rotation that does not preserve a fixed initial state', () => {
    const destabilized = (circuit: Circuit, isPauliVisible: PauliVisibility) =>
      computeLogicalRotations(circuit, isPauliVisible).rotations.map((r) => r.destabilizedQubits);
    const only = (targetType: TargetType) => new Circuit([new Moment([gate(targetType, 0)])]);

    // |0> is fixed by Z, so X and Y move it -- and Y only reaches the word
    // through the fallback, since reducing it would break Hermiticity.
    expect(destabilized(only(new RxTargetType()), zeroState(0))).toEqual([[0]]);
    expect(destabilized(only(new RyTargetType()), zeroState(0))).toEqual([[0]]);
    // ... while Z is the stabilizer itself, which reduces away entirely.
    expect(destabilized(only(new RzTargetType()), zeroState(0))).toEqual([[]]);

    // |+> is fixed by X, so the roles swap.
    expect(destabilized(only(new RzTargetType()), plusState(0))).toEqual([[0]]);
    expect(destabilized(only(new RxTargetType()), plusState(0))).toEqual([[]]);

    // A qubit with no initial state fixed is never flagged.
    expect(destabilized(only(new RyTargetType()), () => true)).toEqual([[]]);
  });

  it('reports a rotation about the identity as a global phase', () => {
    const first = (circuit: Circuit, isPauliVisible: PauliVisibility) =>
      computeLogicalRotations(circuit, isPauliVisible).rotations[0];

    // Rx on |+> reduces to the identity: a global phase, which the panel drops.
    expect(isGlobalPhase(first(new Circuit([new Moment([rx(0)])]), plusState(0)))).toBe(true);
    expect(isGlobalPhase(first(new Circuit([new Moment([rz(0)])]), zeroState(0)))).toBe(true);
    expect(isGlobalPhase(first(new Circuit([new Moment([rz(0)])]), plusState(0)))).toBe(false);
  });

  it('carries the angle of the gate it came from', () => {
    const circuit = new Circuit([new Moment([rz(0)])]);
    circuit.assignMissingAngleSymbols();
    expect(computeLogicalRotations(circuit).rotations[0].angle?.symbol).toBe('theta_1');
  });
});
