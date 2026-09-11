// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * The circuit rewritten with every rotation commuted to the front.
 *
 * A circuit `U = A · R₂ · B · R₁ · C` (Clifford A, B, C; rightmost applied
 * first) can be rewritten by pushing each rotation through the Cliffords before
 * it, `R C = C · R_{C†PC}`, which leaves
 *
 *     U = (A·B·C) · R_{L₂} · R_{L₁}
 *
 * -- the same rotations in the same order, now acting on logical Paulis, plus
 * one leftover Clifford at the end.
 *
 * No new physics is needed for this: `C†PC` is exactly the label the tracker
 * already shows in front of the rotation. Rotations are transparent to the
 * tracker (`Rx/Ry/Rz.computeLabels` returns its input), so the tracked frame is
 * the frame of the Cliffords alone -- precisely the `C` above.
 */
import { Angle } from '../models/Angle';
import { Circuit } from '../models/Circuit';
import { Gate } from '../models/Gates';
import { Label, LabelTracker, SinglePauli, XZLabelPair } from './labelTracking';
import { combineLabels } from './labelTrackingUtils';

/** One Pauli of a logical rotation's generator, e.g. the `Y₂` of `-Y₁Y₂`. */
export interface PauliFactor {
  qubit: number;
  pauli: 'X' | 'Y' | 'Z';
}

/** A signed Pauli word `±P_q ··· P_r`, its factors ordered by qubit. */
export interface PauliWord {
  sign: 1 | -1;
  factors: PauliFactor[];
}

/**
 * Whether a single Pauli still carries information, given the initial state
 * fixed for its qubit. A qubit prepared in `|+⟩` is stabilised by its X, so
 * every X on it is redundant and drops out of the labels; `|0⟩` does the same
 * for Z. This is the per-qubit toggle behind `isLabelXVisible`/`isLabelZVisible`.
 */
export type PauliVisibility = (_qubit: number, _type: 'X' | 'Z') => boolean;

/** A rotation of the front-loaded circuit: `R_{generator}(angle)`. */
export interface LogicalRotation {
  generator: PauliWord;
  /** Shared with the gate it came from, so both render the same angle. */
  angle: Angle | undefined;
}

export interface LogicalCircuit {
  /** In circuit order; the order they have to be applied in. */
  rotations: LogicalRotation[];
  /** True when the leftover Clifford is the identity (up to a global phase). */
  cliffordIsTrivial: boolean;
}

/**
 * The label of the Pauli a rotation generates, read off the labels in front of
 * it: `Rz` rotates about the qubit's Z, `Rx` about its X, and `Ry` about
 * `Y = iXZ`, whose label is `i · (X label) · (Z label)` -- in that order, since
 * conjugation preserves the order of a product and the two labels anticommute.
 */
export function generatorLabel(gate: Gate, labels: XZLabelPair): Label {
  switch (gate.targetType.name) {
    case 'Rz':
      return labels.physZ.clone();
    case 'Rx':
      return labels.physX.clone();
    case 'Ry':
      // `combineLabels` returns a fresh label, so mutating its phase is safe.
      return combineLabels(labels.physX, labels.physZ).addToPhase(1);
    default:
      throw new Error(`Not a rotation: ${gate.targetType.name}`);
  }
}

/**
 * A label as a signed Pauli word: `i^p · X_S · Z_T` regrouped per qubit, where a
 * qubit carrying both gives `X_q Z_q = i³Y_q`.
 *
 * The remaining prefactor is `±1`, never `±i`, for any Hermitian label -- which
 * every conjugated Pauli is. `null` reports the exception: a *reduced* label can
 * come out anti-Hermitian, which is how an illegitimate reduction shows up (see
 * `computeLogicalRotations`).
 */
export function tryLabelToPauliWord(label: Label): PauliWord | null {
  const paulis = new Map<number, { x: boolean; z: boolean }>();

  for (const op of label.operators) {
    const qubit = Number(op.qubit);
    const entry = paulis.get(qubit) ?? { x: false, z: false };
    if (op.type === 'X') entry.x = true;
    else entry.z = true;
    paulis.set(qubit, entry);
  }

  const factors: PauliFactor[] = [];
  let phase = label.phase;

  for (const [qubit, { x, z }] of paulis) {
    if (x && z) {
      factors.push({ qubit, pauli: 'Y' });
      phase += 3; // X_q Z_q = i³Y_q
    } else {
      factors.push({ qubit, pauli: x ? 'X' : 'Z' });
    }
  }
  phase %= 4;

  if (phase % 2 !== 0) return null;

  factors.sort((a, b) => a.qubit - b.qubit);
  return { sign: phase === 0 ? 1 : -1, factors };
}

/** As `tryLabelToPauliWord`, for a label that is known to be Hermitian. */
export function labelToPauliWord(label: Label): PauliWord {
  const word = tryLabelToPauliWord(label);
  if (word === null) {
    throw new Error(`Label is not Hermitian, so it generates no rotation: ${label.phase}`);
  }
  return word;
}

/** `-X_{0}Z_{3}` as KaTeX, for the subscript of `R_{...}`. */
export function pauliWordToLatex(word: PauliWord): string {
  const sign = word.sign === -1 ? '-' : '';
  // Everything cancelled: the rotation is a global phase on the states declared.
  if (word.factors.length === 0) return `${sign}I`;
  return sign + word.factors.map((f) => `${f.pauli}_{${f.qubit}}`).join('');
}

/**
 * A label with the Paulis fixed by the initial states struck out, matching the
 * reduced labels the circuit itself shows. Filtering keeps the order the
 * operators were in, so no anticommutation phase comes out of the rebuild.
 */
function reduceLabel(label: Label, isPauliVisible: PauliVisibility): Label {
  const kept = label.operators.filter((op: SinglePauli) =>
    isPauliVisible(Number(op.qubit), op.type)
  );
  if (kept.length === label.operators.length) return label;
  return new Label(kept, label.phase);
}

/**
 * True when every label is back to the `⟨q⟩`/`q` it started as. The leftover
 * Clifford then commutes with the whole Pauli group, which leaves only the
 * identity up to a global phase. Same operators but a different phase means a
 * Pauli is left over, which counts as non-trivial.
 */
function isCliffordTrivial(tracker: LabelTracker, circuit: Circuit): boolean {
  const finalLabels = tracker.getLabelsAtMomentBeforeGate(circuit.depth);
  if (finalLabels === undefined) return true; // no gates, nothing to undo

  for (let qubit = 0; qubit <= circuit.maxUsedQubitIndex(); qubit++) {
    const labels = finalLabels.get(qubit);
    if (labels === undefined || !labels.equals(XZLabelPair.fromQubit(qubit))) return false;
  }
  return true;
}

/**
 * The equivalent circuit of logical rotations, plus the Clifford left behind.
 *
 * `isPauliVisible` carries the initial states the user has fixed per qubit, and
 * the generators are read off the same reduced labels the circuit displays: an
 * auxiliary qubit prepared in `|+⟩` contributes no X, so `-Y₁Y₂X₃` is shown as
 * `-Y₁Y₂`.
 *
 * That reduction -- multiplying the generator by a stabiliser of the initial
 * state -- only leaves the rotation unchanged where the two commute. Where they
 * do not, the rotation genuinely rotates out of the stabilised subspace, and
 * dropping the Pauli is not allowed. Such a reduction always lands on an
 * anti-Hermitian word, which generates no rotation at all, so it is caught by
 * asking for the Pauli word and falling back to the full generator.
 */
export function computeLogicalRotations(
  circuit: Circuit,
  isPauliVisible: PauliVisibility = () => true
): LogicalCircuit {
  const tracker = new LabelTracker(circuit);
  const rotations: LogicalRotation[] = [];

  let momentIndex = 0;
  for (const moment of circuit.moments()) {
    // Rotations in one moment act on disjoint qubits and are conjugated by the
    // same Clifford, so they commute and their order within the moment is free.
    for (const gate of moment.gates()) {
      if (!gate.isRotation) {
        continue;
      }
      const labels = tracker.getLabelsBeforeGate(momentIndex, gate.targets[0]);
      if (labels === undefined) continue;
      const reduced = new XZLabelPair(
        reduceLabel(labels.physX, isPauliVisible),
        reduceLabel(labels.physZ, isPauliVisible)
      );
      rotations.push({
        generator:
          tryLabelToPauliWord(generatorLabel(gate, reduced)) ??
          labelToPauliWord(generatorLabel(gate, labels)),
        angle: gate.angle,
      });
    }
    momentIndex += 1;
  }

  return { rotations, cliffordIsTrivial: isCliffordTrivial(tracker, circuit) };
}
