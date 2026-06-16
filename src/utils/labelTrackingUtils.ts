/**
 * Pure label arithmetic: combining Pauli operators, anticommutation
 * tracking, and the X·X = Z·Z = I cancellations.
 */
import { XZLabelPair, Label, SinglePauli } from './labelTracking';

/**
 * Simplify operators by removing duplicate pairs
 * Rules:
 * - X[i] * X[i] = I (identity)
 * - Z[i] * Z[i] = I (identity)
 * Also orders labels from low to high
 */
export function simplifyOperators(operators: SinglePauli[]): SinglePauli[] {
  const result: SinglePauli[] = [];

  for (const op of operators) {
    const existingIndex = result.findIndex(
      (existing) => existing.type === op.type && existing.qubit === op.qubit
    );
    if (existingIndex !== -1) {
      result.splice(existingIndex, 1);
    } else {
      result.push(op);
    }
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'X' ? -1 : 1;
    }
    const qa = parseInt(a.qubit, 10);
    const qb = parseInt(b.qubit, 10);
    return qa - qb;
  });
}

/**
 * Simplify operators with anticommutation rules
 * X_i and Z_i anticommute: XZ = -ZX (adds phase 2)
 * X_i and Z_j (i≠j) commute: no extra phase
 * orders X single Paulis to the left and Z singlePaulis to the right
 */
export function simplifyWithAnticommutation(operators: SinglePauli[]): {
  operators: SinglePauli[];
  extraPhase: number;
} {
  let extraPhase = 0;
  const simplified = [...operators];

  // Sort operators while tracking phase from anticommutations
  for (let i = 0; i < simplified.length - 1; i++) {
    for (let j = i + 1; j < simplified.length; j++) {
      const op1 = simplified[i];
      const op2 = simplified[j];
      // only anticommute if Z labels are to the left and X labels are to the right
      if (op1.qubit === op2.qubit && op1.type === 'Z' && op2.type === 'X') {
        [simplified[i], simplified[j]] = [simplified[j], simplified[i]];
        extraPhase = (extraPhase + 2) % 4;
      }
    }
  }
  const finalOperators = simplifyOperators(simplified);
  return { operators: finalOperators, extraPhase };
}

/**
 * Compute label corresponding to product of operator of label 1 and operator of
 * label 2 corresponds to add second label after first label and then reordering
 * and adapting phase if necessary (anticommuting)
 */
export function combineLabels(label1: Label, label2: Label): Label {
  const combinedOperators = [...label1.operators, ...label2.operators];
  const combinedPhase = (label1.phase + label2.phase) % 4;
  return new Label(combinedOperators, combinedPhase);
}

export function labelsAfterCX(
  controlLabels: XZLabelPair,
  targetLabels: XZLabelPair
): { control: XZLabelPair; target: XZLabelPair } {
  return {
    control: new XZLabelPair(
      combineLabels(controlLabels.physX, targetLabels.physX),
      controlLabels.physZ.clone()
    ),
    target: new XZLabelPair(
      targetLabels.physX.clone(),
      combineLabels(targetLabels.physZ, controlLabels.physZ)
    ),
  };
}

export function labelsAfterCZ(
  controlLabels: XZLabelPair,
  targetLabels: XZLabelPair
): { control: XZLabelPair; target: XZLabelPair } {
  return {
    control: new XZLabelPair(
      combineLabels(controlLabels.physX, targetLabels.physZ),
      controlLabels.physZ.clone()
    ),
    target: new XZLabelPair(
      combineLabels(targetLabels.physX, controlLabels.physZ),
      targetLabels.physZ.clone()
    ),
  };
}
