// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Circuit } from '../src/models/Circuit';
import { Gate } from '../src/models/Gates';
import { Moment } from '../src/models/Moments';
import { RzTargetType, XTargetType } from '../src/models/Targets';
import { Angle } from '../src/models/Angle';

function parameterizedTestCircuit() {
  const circuit = new Circuit();
  const moment1 = new Moment();
  const moment2 = new Moment();
  const xgate = new XTargetType();
  const rzgate = new RzTargetType();

  const gate1 = new Gate({ targetType: xgate, controls: [0], targets: [1] });
  const gate2 = new Gate({ targetType: rzgate, controls: [], targets: [2] });
  const gate3 = new Gate({ targetType: xgate, controls: [2], targets: [4] });
  const gate4 = new Gate({ targetType: rzgate, controls: [], targets: [3] });
  const gate5 = new Gate({ targetType: rzgate, controls: [], targets: [3] });

  moment1.addGate(gate1);
  moment1.addGate(gate2);
  moment2.addGate(gate3);
  moment2.addGate(gate4);

  circuit.appendMoment(moment1);
  circuit.appendMoment(moment2);

  return { circuit, moment1, moment2, gate5 };
}

describe('Circuit', () => {
  describe('depth', () => {
    it('Should get the correct depth', () => {
      const { circuit } = parameterizedTestCircuit();
      expect(circuit.depth).toBe(2);
    });
  });
  describe('AppendMoment', () => {
    it('Should append a moment to the circuit', () => {
      const { circuit, gate5 } = parameterizedTestCircuit();
      const moment3 = new Moment();
      moment3.addGate(gate5);

      expect(circuit.depth).toBe(2);

      circuit.appendMoment(moment3);

      expect(circuit.depth).toBe(3);
    });
  });

  describe('addMomentBehind', () => {
    it('Should insert a moment in the middle of the circuit', () => {
      const { circuit, gate5 } = parameterizedTestCircuit();
      const moment3 = new Moment();
      moment3.addGate(gate5);

      circuit.insertMomentBefore(2);

      expect(circuit.depth).toBe(3);
    });
  });

  describe('removeMoment', () => {
    it('should remove one of the two existing momentsin the circuit', () => {
      const { circuit, moment1 } = parameterizedTestCircuit();
      expect(circuit.depth).toBe(2);
      circuit.removeMoment(moment1);
      expect(circuit.depth).toBe(1);
    });
  });
  describe('clone', () => {
    it('should properly clone a circuit', () => {
      const { circuit } = parameterizedTestCircuit();

      expect(circuit.clone()).toEqual(circuit);
    });
  });
});

describe('Circuit.assignMissingAngleSymbols', () => {
  function rz(target: number, angle?: Angle) {
    return new Gate({
      targetType: new RzTargetType(),
      controls: [],
      targets: [target],
      params: angle ? [angle] : [],
    });
  }

  function symbolsOf(circuit: Circuit): string[] {
    return [...circuit.moments()].flatMap((m) =>
      [...m.gates()].flatMap((g) => g.params.map((p) => p.symbol))
    );
  }

  it('numbers unnamed rotations in circuit order', () => {
    const circuit = new Circuit([new Moment([rz(0), rz(1)]), new Moment([rz(0)])]);

    circuit.assignMissingAngleSymbols();

    expect(symbolsOf(circuit)).toEqual(['theta_1', 'theta_2', 'theta_3']);
  });

  it('leaves gates that already have an angle untouched', () => {
    const existing = new Angle('theta_1', 0.5);
    const circuit = new Circuit([new Moment([rz(0, existing), rz(1)])]);

    circuit.assignMissingAngleSymbols();

    const [first, second] = [...[...circuit.moments()][0].gates()];
    expect(first.angle).toBe(existing);
    expect(second.angle?.symbol).toBe('theta_2');
    expect(second.angle?.value).toBeNull();
  });

  it('continues from the highest existing index rather than filling gaps', () => {
    const circuit = new Circuit([new Moment([rz(0, new Angle('theta_3'))]), new Moment([rz(0)])]);

    circuit.assignMissingAngleSymbols();

    expect(symbolsOf(circuit)).toEqual(['theta_3', 'theta_4']);
  });

  it('ignores symbols that are not of the theta_n form when numbering', () => {
    const circuit = new Circuit([new Moment([rz(0, new Angle('beta'))]), new Moment([rz(0)])]);

    circuit.assignMissingAngleSymbols();

    expect(symbolsOf(circuit)).toEqual(['beta', 'theta_1']);
  });

  it('does not touch gates that take no angle', () => {
    const xGate = new Gate({ targetType: new XTargetType(), controls: [], targets: [0] });
    const circuit = new Circuit([new Moment([xGate])]);

    circuit.assignMissingAngleSymbols();

    expect([...[...circuit.moments()][0].gates()][0]).toBe(xGate);
  });

  it('is idempotent', () => {
    const circuit = new Circuit([new Moment([rz(0), rz(1)])]);

    circuit.assignMissingAngleSymbols();
    circuit.assignMissingAngleSymbols();

    expect(symbolsOf(circuit)).toEqual(['theta_1', 'theta_2']);
  });
});
