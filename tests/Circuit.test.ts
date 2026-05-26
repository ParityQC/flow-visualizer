import { describe, it, expect } from 'vitest';
import { Circuit } from '../src/models/Circuit';
import { Gate } from '../src/models/Gates';
import { Moment } from '../src/models/Moments';
import { RzTargetType, XTargetType } from '../src/models/Targets';

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
