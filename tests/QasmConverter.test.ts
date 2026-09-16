// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { describe, it, expect } from 'vitest';
import { Circuit } from '../src/models/Circuit';
import { Gate } from '../src/models/Gates';
import { Angle } from '../src/models/Angle';
import { Moment } from '../src/models/Moments';
import {
  HTargetType,
  ISWAPTargetType,
  RxTargetType,
  RyTargetType,
  RzTargetType,
  SdgTargetType,
  SqrtXTargetType,
  SqrtYTargetType,
  STargetType,
  SWAPTargetType,
  TargetType,
  XTargetType,
  YTargetType,
  ZTargetType,
} from '../src/models/Targets';
import { XZLabelPair } from '../src/utils/labelTracking';
import { circuitToQasm } from '../src/utils/QasmConverter';

const HEADER = 'OPENQASM 3;\ninclude "stdgates.inc";\n\n';

function singleGateCircuit(targetType: TargetType, targets: number[], controls: number[] = []) {
  const circuit = new Circuit();
  const moment = new Moment();
  moment.addGate(new Gate({ targetType, controls, targets }));
  circuit.appendMoment(moment);
  return circuit;
}

describe('circuitToQasm — header & qubit declaration', () => {
  it('emits header and zero-length qubit register for an empty circuit', () => {
    const circuit = new Circuit();
    expect(circuitToQasm(circuit)).toBe(`${HEADER}qubit[0] q;\n\n`);
  });

  it('sizes the qubit register from the highest qubit index used', () => {
    const circuit = singleGateCircuit(new XTargetType(), [3]);
    expect(circuitToQasm(circuit)).toContain('qubit[4] q;');
  });
});

describe('circuitToQasm — single-qubit gates', () => {
  it.each([
    [new XTargetType(), 'x'],
    [new YTargetType(), 'y'],
    [new ZTargetType(), 'z'],
    [new HTargetType(), 'h'],
    [new STargetType(), 's'],
    [new SqrtXTargetType(), 'sx'],
  ])('emits %s as "%s q[0];"', (targetType, qasmName) => {
    const circuit = singleGateCircuit(targetType, [0]);
    expect(circuitToQasm(circuit)).toContain(`${qasmName} q[0];`);
  });

  // Rotations carry a parameter. `rz q[0];` is not legal against stdgates.inc,
  // where rz is declared `gate rz(theta) q`.
  it.each([
    [new RxTargetType(), 'rx'],
    [new RyTargetType(), 'ry'],
    [new RzTargetType(), 'rz'],
  ])('emits %s with its angle as "%s(theta_1) q[0];"', (targetType, qasmName) => {
    const qasm = circuitToQasm(singleGateCircuit(targetType, [0]));

    expect(qasm).toContain(`${qasmName}(theta_1) q[0];`);
    expect(qasm).toContain('input float[64] theta_1;');
  });
});

describe('circuitToQasm — rotation angles', () => {
  function rotationCircuit(...angles: (Angle | undefined)[]) {
    const circuit = new Circuit();
    const moment = new Moment();
    angles.forEach((angle, index) => {
      moment.addGate(
        new Gate({
          targetType: new RzTargetType(),
          controls: [],
          targets: [index],
          params: angle ? [angle] : [],
        })
      );
    });
    circuit.appendMoment(moment);
    return circuit;
  }

  it('emits a valued angle as a float literal and declares nothing', () => {
    const qasm = circuitToQasm(rotationCircuit(new Angle('theta_1', Math.PI / 4)));

    expect(qasm).toContain('rz(0.7853981633974483) q[0];');
    expect(qasm).not.toContain('input float');
  });

  it('writes an integer value with a decimal point so it reads as a float', () => {
    expect(circuitToQasm(rotationCircuit(new Angle('theta_1', 2)))).toContain('rz(2.0) q[0];');
    expect(circuitToQasm(rotationCircuit(new Angle('theta_1', 0)))).toContain('rz(0.0) q[0];');
  });

  it('declares a shared symbol exactly once', () => {
    const qasm = circuitToQasm(rotationCircuit(new Angle('theta_1'), new Angle('theta_1')));

    expect(qasm).toContain('rz(theta_1) q[0];');
    expect(qasm).toContain('rz(theta_1) q[1];');
    expect(qasm.match(/input float\[64\] theta_1;/g)).toHaveLength(1);
  });

  it("names unnamed rotations without mutating the caller's circuit", () => {
    const circuit = rotationCircuit(undefined);
    const gateBefore = [...[...circuit.moments()][0].gates()][0];

    expect(circuitToQasm(circuit)).toContain('rz(theta_1) q[0];');
    expect(gateBefore.params).toEqual([]);
  });

  it('writes a multiple of pi as such in pi mode', () => {
    const pi = (angle: Angle) => circuitToQasm(rotationCircuit(angle), 'pi');

    expect(pi(new Angle('theta_1', Math.PI / 2))).toContain('rz(pi/2) q[0];');
    expect(pi(new Angle('theta_1', (3 * Math.PI) / 4))).toContain('rz(3*pi/4) q[0];');
    expect(pi(new Angle('theta_1', -Math.PI))).toContain('rz(-pi) q[0];');
  });

  it('falls back to the float literal in pi mode when no simple fraction fits', () => {
    expect(circuitToQasm(rotationCircuit(new Angle('theta_1', 0.5)), 'pi')).toContain(
      'rz(0.5) q[0];'
    );
    expect(circuitToQasm(rotationCircuit(new Angle('theta_1', 0)), 'pi')).toContain(
      'rz(0.0) q[0];'
    );
  });

  it('keeps the float literal in the other display modes', () => {
    const angle = new Angle('theta_1', Math.PI / 2);

    expect(circuitToQasm(rotationCircuit(angle), 'symbolic')).toContain(
      'rz(1.5707963267948966) q[0];'
    );
    expect(circuitToQasm(rotationCircuit(angle), 'decimal')).toContain(
      'rz(1.5707963267948966) q[0];'
    );
  });

  it('puts the input block after the qubit declaration', () => {
    const qasm = circuitToQasm(rotationCircuit(new Angle('theta_1')));

    expect(qasm.indexOf('qubit[1] q;')).toBeLessThan(qasm.indexOf('input float[64] theta_1;'));
    expect(qasm.indexOf('input float[64] theta_1;')).toBeLessThan(qasm.indexOf('rz(theta_1)'));
  });
});

describe('circuitToQasm — gates with custom definitions', () => {
  it('emits sdg call plus its custom gate definition', () => {
    const circuit = singleGateCircuit(new SdgTargetType(), [0]);
    const qasm = circuitToQasm(circuit);
    expect(qasm).toContain('gate sdg q {');
    expect(qasm).toContain('sdg q[0];');
  });

  it('emits sy call plus both sy and sdg definitions (sy depends on sdg)', () => {
    const circuit = singleGateCircuit(new SqrtYTargetType(), [0]);
    const qasm = circuitToQasm(circuit);
    expect(qasm).toContain('gate sdg q {');
    expect(qasm).toContain('gate sy q {');
    expect(qasm).toContain('sy q[0];');
  });

  it('emits iswap call plus its custom gate definition (lowercase)', () => {
    const circuit = singleGateCircuit(new ISWAPTargetType(), [0, 1]);
    const qasm = circuitToQasm(circuit);
    expect(qasm).toContain('gate iswap q0, q1 {');
    expect(qasm).toContain('iswap q[0], q[1];');
  });

  it('emits each custom gate definition exactly once even if used multiple times', () => {
    const circuit = new Circuit();
    const moment1 = new Moment();
    const moment2 = new Moment();
    moment1.addGate(new Gate({ targetType: new SdgTargetType(), controls: [], targets: [0] }));
    moment2.addGate(new Gate({ targetType: new SdgTargetType(), controls: [], targets: [1] }));
    circuit.appendMoment(moment1);
    circuit.appendMoment(moment2);
    const qasm = circuitToQasm(circuit);
    const occurrences = qasm.split('gate sdg q {').length - 1;
    expect(occurrences).toBe(1);
  });
});

describe('circuitToQasm — controlled gates', () => {
  it('emits CNOT as "cx q[control], q[target];"', () => {
    const circuit = singleGateCircuit(new XTargetType(), [1], [0]);
    expect(circuitToQasm(circuit)).toContain('cx q[0], q[1];');
  });

  it('emits CZ as "cz q[control], q[target];"', () => {
    const circuit = singleGateCircuit(new ZTargetType(), [2], [0]);
    expect(circuitToQasm(circuit)).toContain('cz q[0], q[2];');
  });
});

describe('circuitToQasm — two-target gates', () => {
  it('emits SWAP as "swap q[a], q[b];"', () => {
    const circuit = singleGateCircuit(new SWAPTargetType(), [0, 1]);
    expect(circuitToQasm(circuit)).toContain('swap q[0], q[1];');
  });
});

describe('circuitToQasm — moment composition', () => {
  it('emits all gates in a moment, one per line', () => {
    const circuit = new Circuit();
    const moment = new Moment();
    moment.addGate(new Gate({ targetType: new XTargetType(), controls: [], targets: [0] }));
    moment.addGate(new Gate({ targetType: new HTargetType(), controls: [], targets: [1] }));
    circuit.appendMoment(moment);
    const qasm = circuitToQasm(circuit);
    expect(qasm).toContain('x q[0];');
    expect(qasm).toContain('h q[1];');
  });

  it('emits a blank line for an empty moment', () => {
    const circuit = new Circuit();
    circuit.appendMoment(new Moment());
    const qasm = circuitToQasm(circuit);
    // The header ends with "\n\n"; an empty moment should add an additional "\n".
    expect(qasm.endsWith('\n\n\n')).toBe(true);
  });
});

describe('circuitToQasm — error path', () => {
  it('throws on a gate type that does not match any QASM emission branch', () => {
    class UnknownTargetType implements TargetType {
      readonly name = 'WEIRD';
      readonly numTargets = 3;
      readonly numParams = 0;
      clone(): TargetType {
        return new UnknownTargetType();
      }
      computeLabels(labels: XZLabelPair): XZLabelPair {
        return labels;
      }
    }
    const circuit = singleGateCircuit(new UnknownTargetType(), [0, 1, 2]);
    expect(() => circuitToQasm(circuit)).toThrow(/unsupported gate "WEIRD"/);
  });
});
