// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { Angle } from './Angle';
import { Gate } from './Gates';
import { Moment } from './Moments';

/**
 * A circuit is a list of moments. A moment is a set of gates which are executed in parallel.
 * Each gate knows on which qubit it acts. Gates in the same moment do not overlap on their qubits.
 * We assume we have an infinite number of qubits available, enumerated from 0 to infinity.
 */
export class Circuit {
  private readonly _moments: Moment[] = [];

  constructor(moments: Moment[] = []) {
    for (const moment of moments) {
      this.appendMoment(moment);
    }
  }

  *moments(): IterableIterator<Moment> {
    for (const moments of this._moments) {
      yield moments;
    }
  }

  appendMoment(moment: Moment): void {
    this._moments.push(moment);
  }

  /** Copy of the circuit which shares the moments and gates with the original. */
  public shallowCopy(): Circuit {
    const circuit = new Circuit();
    for (const moment of this.moments()) {
      circuit.appendMoment(moment);
    }
    return circuit;
  }

  public clone(): Circuit {
    const circuit = new Circuit();
    for (const moment of this.moments()) {
      circuit.appendMoment(moment.clone());
    }
    return circuit;
  }

  get depth(): number {
    return this._moments.length;
  }

  /**
   * Give every rotation gate that still lacks one a fresh symbolic angle. A
   * `Gate` cannot name its own angle -- "the next free theta index" is a property
   * of the whole circuit -- so every path that introduces gates (palette drop,
   * QASM import, example load) calls this once afterwards.
   *
   * The next index is `max + 1` rather than the lowest free one: reusing the
   * index of a deleted gate would silently tie a new rotation to whatever else
   * still carries that symbol.
   */
  public assignMissingAngleSymbols(): void {
    let maxIndex = 0;
    for (const moment of this.moments()) {
      for (const gate of moment.gates()) {
        for (const param of gate.params) {
          const match = param.symbol.match(/^theta_(\d+)$/);
          if (match) {
            maxIndex = Math.max(maxIndex, Number(match[1]));
          }
        }
      }
    }

    for (const moment of this.moments()) {
      // Snapshot: replaceGate writes into the array we are iterating.
      for (const gate of [...moment.gates()]) {
        const angle = gate.angle;
        if (gate.isRotation && (angle === undefined || !angle.isNamed)) {
          maxIndex += 1;
          // Keep any value the gate already carries -- an angle read from QASM
          // arrives with a value but no name.
          moment.replaceGate(
            gate,
            gate.withAngle(new Angle(`theta_${maxIndex}`, angle?.value ?? null))
          );
        }
      }
    }
  }

  /**
   * Returns the number of qubits in the circuit, determined by the highest qubit
   * index used in any gate. Returns -1 in case of no gates.
   */
  public maxUsedQubitIndex(): number {
    let maxQubit = -1;
    for (const moment of this.moments()) {
      maxQubit = Math.max(maxQubit, ...moment.qubits());
    }
    return maxQubit;
  }
  public parallelizeGates(): number {
    let totalRemoved = 0;
    let removedThisPass: number;

    do {
      removedThisPass = this.parallelizeGatesOnePass();
      totalRemoved += removedThisPass;
    } while (removedThisPass > 0);

    return totalRemoved;
  }

  // TODO: why does iSWAP not allow to have other gates in between?
  /**
   * iSWAP forbids any single-qubit gate sitting between its two targets in
   * the same moment, and vice versa. Other combinations are free to coexist.
   */
  public hasConflictingGates(moment: Moment, gate: Gate): boolean {
    // If placing an iSWAP, check if any single qubit gate is between its targets
    if (gate.targetType.numTargets === 2 && gate.targetType.name === 'iSWAP') {
      const minQubit = Math.min(gate.targets[0], gate.targets[1]);
      const maxQubit = Math.max(gate.targets[0], gate.targets[1]);

      return Array.from(moment.gates()).some((g) => {
        return (
          g.targetType.numTargets === 1 &&
          !g.isControlled() &&
          g.targets[0] > minQubit &&
          g.targets[0] < maxQubit
        );
      });
    }

    // If placing a single qubit gate, check if any iSWAP has it between its targets
    if (gate.targetType.numTargets === 1 && !gate.isControlled()) {
      const qubit = gate.targets[0];

      return Array.from(moment.gates()).some((g) => {
        if (g.targetType.numTargets === 2 && g.targetType.name === 'iSWAP') {
          const minQubit = Math.min(g.targets[0], g.targets[1]);
          const maxQubit = Math.max(g.targets[0], g.targets[1]);
          return qubit > minQubit && qubit < maxQubit;
        }
        return false;
      });
    }

    return false;
  }

  private parallelizeGatesOnePass(): number {
    let removedCount = 0;

    for (let i = this._moments.length - 1; i > 0; i--) {
      const moment = this._moments[i];
      const gatesToMove = Array.from(moment.gates());

      for (const gate of gatesToMove) {
        if (!this.hasConflictingGates(this._moments[i - 1], gate)) {
          if (this._moments[i - 1].tryAddGate(gate)) {
            moment.removeGate(gate);
          }
        }
      }

      if (moment.empty()) {
        this._moments.splice(i, 1);
        removedCount++;
      }
    }

    return removedCount;
  }

  public deleteCircuit(): void {
    for (let i = this._moments.length - 1; i >= 0; i--) {
      const moment = this._moments[i];
      this.removeMoment(moment);
    }
  }

  /** Get the index of the moment or -1 if not existing. */
  indexOfMoment(moment: Moment): number {
    return this._moments.indexOf(moment);
  }

  /** Get the moment at the index. Or undefined if not existing. */
  momentOfIndex(index: number): Moment | undefined {
    const momentsArr = Array.from(this.moments());
    return momentsArr[index];
  }
  /** makes sure there are enough moments in the circuit and
   * returns the moment at the given index
   */
  getOrInsertMoment(index: number): Moment {
    while (this._moments.length < index + 1) {
      this.appendMoment(new Moment());
    }

    return this.momentOfIndex(index) as Moment;
  }

  public removeMoment(moment: Moment): void {
    const index = this._moments.indexOf(moment);
    if (index === -1) {
      throw new Error(`Moment does not exist in Circuit`);
    }
    this._moments.splice(index, 1);
  }

  /** Insert empty moment before index and return the inserted moment. */
  insertMomentBefore(momentIndex: number): Moment {
    const newMoment = new Moment();
    this._moments.splice(momentIndex, 0, newMoment);
    return newMoment;
  }
}
