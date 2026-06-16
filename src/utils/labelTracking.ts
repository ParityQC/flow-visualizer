/**
 * This is the centerpiece of the label calculation. A label consists of multiple nested classes with individual methods.
 */
import { Circuit } from '../models/Circuit';
import { Gate } from '../models/Gates';
import { simplifyWithAnticommutation } from './labelTrackingUtils';

// Each qubit's logical label is maintained as an ordered array of tokens, whenever the labels get updated,
// the array gets rebuilt into a renderable string. At render time these tokens get joined
export class SinglePauli {
  constructor(
    readonly _type: 'X' | 'Z', // X-> blue+brackets Z-> red+plain
    readonly _name: string // qubitIndex as string
  ) {}
  equals(other: SinglePauli): boolean {
    return this._type === other._type && this._name === other._name;
  }
  clone(): SinglePauli {
    return new SinglePauli(this._type, this._name);
  }
}
// A Label signifies the logical meaning of a physical Pauli operator that may consist of
// multiple different single Paulis (logical operators) and a phase, e.g. -Y_1Z_2X_3 = -i<13>12
// = ([SinglePauli('X','1'), SinglePauli('X','3'), SinglePauli('Z','1'), SinglePauli('Z','2')], 3)
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

// Labels specify the PhysX and PhysZ of the qubit at a specific moment

export class XZLabelPair {
  constructor(
    readonly _PhysX: Label,
    readonly _PhysZ: Label
  ) {}
  // initialzes a Labelpair when circuit is constructed
  static forQubit(qubitIndex: number): XZLabelPair {
    const qubitStr = String(qubitIndex);
    return new XZLabelPair(
      new Label([new SinglePauli('X', qubitStr)], 0),
      new Label([new SinglePauli('Z', qubitStr)], 0)
    );
  }
  equals(other: XZLabelPair): boolean {
    return this._PhysX.equals(other._PhysX) && this._PhysZ.equals(other._PhysZ);
  }
  clone(): XZLabelPair {
    return new XZLabelPair(this._PhysX.clone(), this._PhysZ.clone());
  }
}

// a map where the qubitIndex is the key and the Labels are the value
export type QubitToXZLabelPair = Map<number, XZLabelPair>;

// LabelTracker keeps track of Moments that are labelled in a map where the key
// is the momentIndex and the value QubitsToLabels
export class LabelTracker {
  readonly labelledMoments: Map<number, QubitToXZLabelPair>;
  constructor(circuit?: Circuit) {
    this.labelledMoments = new Map<number, QubitToXZLabelPair>();
    if (circuit) {
      this.initializeFromCircuit(circuit);
      this.computeCircuitLabels(circuit);
    }
  }
  /**
   *
   * @param circuit
   *
   * @returns new LabelTracker instance with initial Labels at moment 0
   */
  fromCircuit(circuit: Circuit): LabelTracker {
    return new LabelTracker().initializeFromCircuit(circuit);
  }

  /**
   * initializes trivial labels according to their qubits
   * @param circuit
   *
   * @returns this
   */
  initializeFromCircuit(circuit: Circuit): this {
    this.labelledMoments.clear();
    const numQubit = circuit.maxUsedQubitIndex();

    for (let i = 0; i <= numQubit; i++) {
      this.setLabelsBeforeMoment(0, i, XZLabelPair.forQubit(i));
      this.setLabelsBeforeMoment(0, i, XZLabelPair.forQubit(i));
    }
    return this;
  }
  /**
   * places the cloned XZLabelPair at given location
   * @param momentIndex
   * @param qubitIndex
   * @param labels
   */
  setLabelsBeforeMoment(momentIndex: number, qubitIndex: number, labels: XZLabelPair): void {
    if (!this.labelledMoments.has(momentIndex)) {
      this.labelledMoments.set(momentIndex, new Map<number, XZLabelPair>());
    }
    const momentLabels = this.labelledMoments.get(momentIndex)!;
    momentLabels.set(qubitIndex, labels.clone());
  }
  setLabelsAfterMoment(momentIndex: number, qubitIndex: number, labels: XZLabelPair): void {
    this.setLabelsBeforeMoment(momentIndex + 1, qubitIndex, labels);
  }
  /**
   *
   * @param momentIndex
   * @param qubitIndex
   * @returns XZLabelPair at MomentIndex which is before (to the left) of the gate.
   */
  getLabelsBeforeGate(momentIndex: number, qubitIndex: number): XZLabelPair | undefined {
    const momentLabels = this.labelledMoments.get(momentIndex);
    if (!momentLabels) return undefined;
    return momentLabels.get(qubitIndex);
  }

  /**
   * overwrites labels with new labels depending on which gate is applied
   */
  applyGate(momentIndex: number, gate: Gate): void {
    if (gate.numQubits === 2) {
      // in qubits first controls come in then targets qubits = [c,t]
      // and in calculatelabels the same order exists
      const qubits = [...gate.qubits()];
      const labels1 = this.getLabelsBeforeGate(momentIndex, qubits[0]);
      const labels2 = this.getLabelsBeforeGate(momentIndex, qubits[1]);
      if (!labels1) return;
      const { labelsAfter1, labelsAfter2 } = gate.calculateLabels(labels1, labels2) as {
        labelsAfter1: XZLabelPair;
        labelsAfter2: XZLabelPair;
      };
      this.setLabelsAfterMoment(momentIndex, qubits[0], labelsAfter1);
      this.setLabelsAfterMoment(momentIndex, qubits[1], labelsAfter2);
    } else {
      const oldLabels = this.getLabelsBeforeGate(momentIndex, gate.targets[0]) as XZLabelPair;
      const newLabels = gate.calculateLabels(oldLabels) as XZLabelPair;
      this.setLabelsAfterMoment(momentIndex, gate.targets[0], newLabels);
    }
  }
  /**
   * propagates labels from one moment to the next without overwriting existing ones.
   */
  propagateLabels(fromMoment: number, toMoment: number): void {
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

  getLabelsAtMomentBeforeGate(momentIndex: number): QubitToXZLabelPair | undefined {
    return this.labelledMoments.get(momentIndex);
  }

  removeMoment(momentIndex: number): void {
    this.labelledMoments.delete(momentIndex);
  }

  getAllLabels(): Map<number, QubitToXZLabelPair> {
    return new Map(this.labelledMoments);
  }
  /**
   *
   * @returns plain object representation of all labels,
   * needed for json serialization and react state
   */
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

  /**
   *
   * @returns array of active moment indices in ascending order
   */
  getMomentIndices(): number[] {
    return Array.from(this.labelledMoments.keys()).sort((a, b) => a - b);
  }

  getActiveQubitsAtMoment(moment: number): number[] {
    const momentLabels = this.labelledMoments.get(moment);
    if (!momentLabels) return [];

    return Array.from(momentLabels.keys()).sort((a, b) => a - b);
  }
  /**
   * computes the circuits labels by first propagating through all available moments and qubits,
   * without overwriting previous ones and then applies the applyGate function for every gate, overwriting previous labels
   * the new labels get propagated forward again the next time computeCircuitLabels is called, which is everytime the circuit is altered
   */
  computeCircuitLabels(circuit: Circuit): void {
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
}
