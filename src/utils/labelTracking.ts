/**
 * Label-tracking core: Each qubit is assigned a pair (`XZLabelPair`) of labels
 * (`Label`). Labels in turn are composed of individual single pauli operators
 * `SinglePauli`.
 */
import { Circuit } from '../models/Circuit';
import { Gate } from '../models/Gates';
import { simplifyWithAnticommutation } from './labelTrackingUtils';

/** A single Pauli X or Z associated with a qubit (e.g. Z_3). */
export class SinglePauli {
  constructor(
    readonly type: 'X' | 'Z', // X-> blue+brackets Z-> red+plain
    readonly qubit: string // qubit index as string
  ) {}
  equals(other: SinglePauli): boolean {
    return this.type === other.type && this.qubit === other.qubit;
  }
  clone(): SinglePauli {
    return new SinglePauli(this.type, this.qubit);
  }
}
/**
 * A logical Pauli string: ordered SinglePaulis plus a phase mod 4.
 * E.g. −Y₁Z₂X₃ = −i⟨13⟩12 = ([X_1, X_3, Z_1, Z_2], phase=3).
 * Constructor auto-simplifies via anticommutation.
 */
export class Label {
  constructor(
    private _operators: SinglePauli[],
    private _phase: number
  ) {
    const simplified = simplifyWithAnticommutation(this._operators);
    this._phase = (this.phase + simplified.extraPhase) % 4;
    this._operators = simplified.operators;
  }
  equals(other: Label): boolean {
    if (this.phase !== other._phase) return false;
    if (this._operators.length !== other._operators.length) return false; // We assume they are already sorted
    return this._operators.every((op, i) => op.equals(other._operators[i]));
  }
  clone(): Label {
    return new Label(
      this._operators.map((op) => op.clone()),
      this._phase
    );
  }
  get operators(): SinglePauli[] {
    return this._operators;
  }
  get phase(): number {
    return this._phase;
  }
  addToPhase(additionalPhase: number): Label {
    this._phase = (additionalPhase + this.phase) % 4;
    return this;
  }
}

/** The pair of logical labels (X and Z) for one qubit at a given moment. */
export class XZLabelPair {
  constructor(
    readonly physX: Label,
    readonly physZ: Label
  ) {}
  /** Trivial labels: X_i and Z_i for a qubit at its initial state. */
  static fromQubit(qubitIndex: number): XZLabelPair {
    const qubitStr = String(qubitIndex);
    return new XZLabelPair(
      new Label([new SinglePauli('X', qubitStr)], 0),
      new Label([new SinglePauli('Z', qubitStr)], 0)
    );
  }
  equals(other: XZLabelPair): boolean {
    return this.physX.equals(other.physX) && this.physZ.equals(other.physZ);
  }
  clone(): XZLabelPair {
    return new XZLabelPair(this.physX.clone(), this.physZ.clone());
  }
}

export type QubitToXZLabelPair = Map<number, XZLabelPair>;

/** Per-moment, per-qubit labels for a whole circuit. Computed via `computeCircuitLabels`. */
export class LabelTracker {
  readonly labelledMoments: Map<number, QubitToXZLabelPair>;

  constructor(circuit?: Circuit) {
    this.labelledMoments = new Map<number, QubitToXZLabelPair>();
    if (circuit) {
      this.initializeFromCircuit(circuit);
      this.computeCircuitLabels(circuit);
    }
  }

  *[Symbol.iterator](): Generator<[number, number, XZLabelPair], void, unknown> {
    const moments = this.getMomentIndices();
    for (const momentIndex of moments) {
      const qubitsToLabels = this.labelledMoments.get(momentIndex);
      if (!qubitsToLabels) continue;

      const qubitIndices = Array.from(qubitsToLabels.keys()).sort((a, b) => a - b);

      for (const qubitIndex of qubitIndices) {
        const labels = qubitsToLabels.get(qubitIndex);
        if (labels) {
          yield [momentIndex, qubitIndex, labels];
        }
      }
    }
  }

  /** Returns plain object representation of all labels, needed for json
   * serialization and react state. */
  toObject(): { [moment: number]: { [qubit: number]: XZLabelPair } } {
    const result: { [moment: number]: { [qubit: number]: XZLabelPair } } = {};

    for (const [momentIndex, QubitsToLabels] of this.labelledMoments) {
      result[momentIndex] = {};
      for (const [qubitIndex, labels] of QubitsToLabels) {
        result[momentIndex][qubitIndex] = labels;
      }
    }
    return result;
  }

  getMomentIndices(): number[] {
    return Array.from(this.labelledMoments.keys()).sort((a, b) => a - b);
  }

  getActiveQubitsAtMoment(moment: number): number[] {
    const momentLabels = this.labelledMoments.get(moment);
    if (!momentLabels) return [];

    return Array.from(momentLabels.keys()).sort((a, b) => a - b);
  }

  getLabelsAtMomentBeforeGate(momentIndex: number): QubitToXZLabelPair | undefined {
    return this.labelledMoments.get(momentIndex);
  }

  /**
   * Initializes trivial labels ⟨j⟩j for each qubit j.
   */
  initializeFromCircuit(circuit: Circuit): this {
    this.labelledMoments.clear();
    const numQubit = circuit.maxUsedQubitIndex();

    for (let i = 0; i <= numQubit; i++) {
      this.setLabelsBeforeMoment(0, i, XZLabelPair.fromQubit(i));
      this.setLabelsBeforeMoment(0, i, XZLabelPair.fromQubit(i));
    }
    return this;
  }

  /** Places the cloned XZLabelPair before the given location. */
  private setLabelsBeforeMoment(
    momentIndex: number,
    qubitIndex: number,
    labels: XZLabelPair
  ): void {
    if (!this.labelledMoments.has(momentIndex)) {
      this.labelledMoments.set(momentIndex, new Map<number, XZLabelPair>());
    }
    const momentLabels = this.labelledMoments.get(momentIndex)!;
    momentLabels.set(qubitIndex, labels.clone());
  }

  /** Places the cloned XZLabelPair after the given location. */
  private setLabelsAfterMoment(momentIndex: number, qubitIndex: number, labels: XZLabelPair): void {
    this.setLabelsBeforeMoment(momentIndex + 1, qubitIndex, labels);
  }

  getLabelsBeforeGate(momentIndex: number, qubitIndex: number): XZLabelPair | undefined {
    const momentLabels = this.labelledMoments.get(momentIndex);
    if (!momentLabels) return undefined;
    return momentLabels.get(qubitIndex);
  }

  /**
   * Computes and sets the labels after the gate from the lables before the gate.
   */
  private applyGate(momentIndex: number, gate: Gate): void {
    if (gate.numQubits === 1) {
      const oldLabels = this.getLabelsBeforeGate(momentIndex, gate.targets[0]) as XZLabelPair;
      const newLabels = gate.computeLabels(oldLabels) as XZLabelPair;
      this.setLabelsAfterMoment(momentIndex, gate.targets[0], newLabels);
    } else if (gate.numQubits === 2) {
      // in qubits first controls come in then targets qubits = [c,t]
      // and in calculatelabels the same order exists
      const qubits = [...gate.qubits()];
      const labels1 = this.getLabelsBeforeGate(momentIndex, qubits[0]);
      const labels2 = this.getLabelsBeforeGate(momentIndex, qubits[1]);
      if (!labels1) return;
      const { labelsAfter1, labelsAfter2 } = gate.computeLabels(labels1, labels2) as {
        labelsAfter1: XZLabelPair;
        labelsAfter2: XZLabelPair;
      };
      this.setLabelsAfterMoment(momentIndex, qubits[0], labelsAfter1);
      this.setLabelsAfterMoment(momentIndex, qubits[1], labelsAfter2);
    } else {
      throw Error('applyGate only supports 1 or 2 qubits.');
    }
  }

  /** Fill missing labels at `toMoment` with the corresponding labels from
   * `fromMoment`. Do nothing for qubits which already have a label. */
  private propagateLabels(fromMoment: number, toMoment: number): void {
    const sourceLabels = this.labelledMoments.get(fromMoment);
    if (sourceLabels) {
      let propagatedLabels = this.labelledMoments.get(toMoment);
      if (!propagatedLabels) {
        propagatedLabels = new Map<number, XZLabelPair>();
        this.labelledMoments.set(toMoment, propagatedLabels);
      }

      for (const [qubitIndex, labels] of sourceLabels) {
        if (!propagatedLabels.has(qubitIndex)) {
          propagatedLabels.set(qubitIndex, labels.clone());
        }
      }
    }
  }

  /** Compute circuit labels assuming the initial labels before moment zero are already set. */
  private computeCircuitLabels(circuit: Circuit): void {
    const moments = circuit.moments();
    const momentsArr = Array.from(moments);
    if (momentsArr.length === 0) return;

    for (let momentIndex = 0; momentIndex < momentsArr.length; momentIndex++) {
      const moment = momentsArr[momentIndex];

      for (const gate of Array.from(moment.gates())) {
        this.applyGate(momentIndex, gate);
      }

      this.propagateLabels(momentIndex, momentIndex + 1);
    }
  }
}
