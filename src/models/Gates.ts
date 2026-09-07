// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { TargetType } from './Targets';
import { Angle } from './Angle';
import { XZLabelPair } from '../utils/labelTracking';
import { combineLabels } from '../utils/labelTrackingUtils';

/**
 * A gate is characterized by its target type, the control qubits and the target qubits.
 *
 * For example a CNOT gate has target type "X-Gate", one control, and one target qubit.
 *
 * Rotation gates additionally carry one `Angle` in `params`. Params are optional
 * because a gate cannot name its own angle -- "the next free theta index" is a
 * property of the whole circuit. A rotation constructed without params is
 * therefore legal but incomplete; `Circuit.assignMissingAngleSymbols` closes the
 * gap whenever gates enter a circuit.
 */
export class Gate implements QubitIterable {
  readonly _targetType: TargetType;
  readonly _controls: number[];
  readonly _targets: number[];
  readonly _params: readonly Angle[];

  constructor({
    targetType,
    controls,
    targets,
    params = [],
  }: {
    targetType: TargetType;
    controls: number[];
    targets: number[];
    params?: readonly Angle[];
  }) {
    if (targets.length !== targetType.numTargets) {
      throw new Error(
        `Wrong target size: ${targetType.name} gate requires ${targetType.numTargets} target(s) got ${targets.length} instead.`
      );
    }
    if (params.length > 0 && params.length !== targetType.numParams) {
      throw new Error(
        `Wrong param size: ${targetType.name} gate requires ${targetType.numParams} param(s) got ${params.length} instead.`
      );
    }
    const overlappingQubits = new Set<number>();

    for (const i of targets) {
      for (const j of controls) {
        if (j === i) {
          overlappingQubits.add(i);
        }
      }
    }

    if (overlappingQubits.size > 0) {
      const overlappedQubits = [...overlappingQubits].join(',');
      throw new Error(`Control and target overlap on qubit(s): ${overlappedQubits}`);
    }

    this._targetType = targetType;
    this._controls = controls;
    this._targets = targets;
    this._params = params;
  }

  get targetType(): TargetType {
    return this._targetType;
  }

  get params(): readonly Angle[] {
    return this._params;
  }

  /** The rotation angle, or `undefined` for a gate that takes none (or has none yet). */
  get angle(): Angle | undefined {
    return this._params[0];
  }

  /** True for Rx/Ry/Rz -- the gate types that carry an angle. */
  get isRotation(): boolean {
    return this._targetType.numParams > 0;
  }

  /** Copy of this gate with its single param replaced. */
  withAngle(angle: Angle): Gate {
    return new Gate({
      targetType: this.targetType,
      controls: [...this.controls],
      targets: [...this.targets],
      params: [angle],
    });
  }

  get controls(): readonly number[] {
    return this._controls;
  }

  get targets(): readonly number[] {
    return this._targets;
  }

  get numQubits(): number {
    return this.numControls + this.numTargets;
  }

  get numControls(): number {
    return this._controls.length;
  }

  get numTargets(): number {
    return this._targets.length;
  }

  cloneShifted(offset: number): Gate {
    return new Gate({
      targetType: this.targetType,
      controls: this.controls.map((c) => c + offset),
      targets: this.targets.map((t) => t + offset),
      // `Angle` is immutable, so sharing the instances is safe -- and a moved
      // gate must keep its symbol, or dragging would silently retie it.
      params: this.params,
    });
  }

  clone(): Gate {
    return new Gate({
      targetType: this.targetType.clone(),
      controls: [...this.controls],
      targets: [...this.targets],
      params: [...this.params],
    });
  }

  *qubits(): IterableIterator<number> {
    for (const c of this.controls) yield c;
    for (const t of this.targets) yield t;
  }

  /** Returns true if there is a qubit  in the same momenton which both gates act. */
  overlaps(other: QubitIterable): boolean {
    return this.overlap(other).size > 0;
  }

  /** Return the set of qubits which is in this and the other gate. */
  overlap(other: QubitIterable): Set<number> {
    const otherSupport = new Set(other.qubits());
    const result = new Set<number>();

    for (const q of this.qubits()) {
      if (otherSupport.has(q)) {
        result.add(q);
      }
    }

    return result;
  }

  isControlled() {
    return this.controls.length === 1 && this.targets.length === 1;
  }

  isSingleTarget() {
    return this.targets.length === 1;
  }

  computeLabels(
    labels1: XZLabelPair,
    labels2?: XZLabelPair
  ): XZLabelPair | { labelsAfter1: XZLabelPair; labelsAfter2: XZLabelPair } {
    if (this.isControlled() && labels2) {
      // controlled gate with one control and one target

      const controlLabels = labels1;
      const targetLabels = labels2;
      if (this.targetType.name === 'X') {
        // CX
        return {
          labelsAfter1: new XZLabelPair(
            combineLabels(controlLabels.physX, targetLabels.physX),
            controlLabels.physZ.clone()
          ),
          labelsAfter2: new XZLabelPair(
            targetLabels.physX.clone(),
            combineLabels(controlLabels.physZ, targetLabels.physZ)
          ),
        };
      } else if (this.targetType.name === 'Z') {
        // CZ
        return {
          labelsAfter1: new XZLabelPair(
            combineLabels(controlLabels.physX, targetLabels.physZ),
            controlLabels.physZ.clone()
          ),
          labelsAfter2: new XZLabelPair(
            combineLabels(targetLabels.physX, controlLabels.physZ),
            targetLabels.physZ.clone()
          ),
        };
      } else {
        throw new Error('controlled gate targetType not supported');
      }
    } else if (this.targetType.numTargets === 2 && labels2 !== undefined) {
      // (i)SWAP
      return this.targetType.computeLabels(labels1, labels2);
    } else if (this.targetType.numTargets === 1) {
      // single qubit gates
      return this.targetType.computeLabels(labels1);
    } else {
      throw new Error(
        'second input label missing or calculateLabels not implemented for this gate type'
      );
    }
  }
}

interface QubitIterable {
  qubits(): IterableIterator<number>;
}
