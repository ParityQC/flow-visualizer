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
import { Label, LabelTracker, XZLabelPair } from './labelTracking';
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
 * The remaining prefactor is always `±1`, never `±i`: a label is a conjugated
 * Pauli and so is Hermitian, which forces `p + 3k` to be even.
 */
export function labelToPauliWord(label: Label): PauliWord {
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

  if (phase % 2 !== 0) {
    throw new Error(`Label is not Hermitian, so it generates no rotation: phase i^${phase}`);
  }

  factors.sort((a, b) => a.qubit - b.qubit);
  return { sign: phase === 0 ? 1 : -1, factors };
}

/** `-X_{0}Z_{3}` as KaTeX, for the subscript of `R_{...}`. */
export function pauliWordToLatex(word: PauliWord): string {
  const sign = word.sign === -1 ? '-' : '';
  return sign + word.factors.map((f) => `${f.pauli}_{${f.qubit}}`).join('');
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

/** The equivalent circuit of logical rotations, plus the Clifford left behind. */
export function computeLogicalRotations(circuit: Circuit): LogicalCircuit {
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
      rotations.push({
        generator: labelToPauliWord(generatorLabel(gate, labels)),
        angle: gate.angle,
      });
    }
    momentIndex += 1;
  }

  return { rotations, cliffordIsTrivial: isCliffordTrivial(tracker, circuit) };
}
