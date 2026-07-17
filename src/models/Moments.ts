// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { Gate } from './Gates';

/**
 * A moment is a set of gates of a circuit which are executed in parallel in a certain time step.
 */
export class Moment {
  private readonly _gates: Gate[] = [];
  private readonly _qubitToGate: Map<number, Gate> = new Map();

  constructor(gates: Gate[] = []) {
    this._qubitToGate = new Map<number, Gate>();
    for (const gate of gates) {
      this.addGate(gate);
    }
  }

  addGate(gate: Gate): void {
    if (gate.overlaps(this)) {
      const overlappingQubits = gate.overlap(this);
      throw new Error(
        `Cannot add Gate: Gate overlaps with existing Gate on qubit(s): [${Array.from(overlappingQubits).join(', ')}]`
      );
    }

    this._gates.push(gate);

    for (const qubit of gate.qubits()) {
      this._qubitToGate.set(qubit, gate);
    }
  }

  tryAddGate(gate: Gate): boolean {
    if (gate.overlaps(this)) {
      return false;
    } else {
      this.addGate(gate);
      return true;
    }
  }

  empty(): boolean {
    if (this._gates.length === 0) {
      return true;
    }
    return false;
  }

  /** Get the gate at the qubit if there is one. Undefined otherwise. */
  getGate(qubit: number): Gate | undefined {
    return this._qubitToGate.get(qubit);
  }

  /** Remove the gate from the moment or throw an error if moment does not contain the gate. */
  removeGate(gate: Gate): void {
    const index = this._gates.findIndex((g) => g === gate);

    if (index === -1) {
      throw new Error(`Gate does not exist in current Moment`);
    }
    this._gates.splice(index, 1);

    for (const qubit of gate.qubits()) {
      this._qubitToGate.delete(qubit);
    }
  }

  clone(): Moment {
    const m = new Moment();
    for (const g of this.gates()) {
      m.addGate(g.clone());
    }
    return m;
  }

  *gates(): IterableIterator<Gate> {
    for (const gates of this._gates) {
      yield gates;
    }
  }

  *qubits(): IterableIterator<number> {
    for (const qubits of this._qubitToGate.keys()) {
      yield qubits;
    }
  }

  *[Symbol.iterator](): Iterator<Gate> {
    for (const gate of this._gates) {
      yield gate;
    }
  }
}
