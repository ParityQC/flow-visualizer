// ParityQC © 2026. See the LICENSE file in the top level directory for details.
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
  XTargetType,
  YTargetType,
  ZTargetType,
} from '../src/models/Targets';
import { circuitToQasm } from '../src/utils/QasmConverter';
import { parseQasm, QasmParseError } from '../src/utils/QasmParser';
import {
  emptyCircuit,
  oneDHeisenberg,
  oneDHeisenbergAuxiliary,
  testCircuit,
  twineChain,
} from '../src/utils/exampleCircuits';

const HEADER = 'OPENQASM 3;\ninclude "stdgates.inc";\n\n';

/** Wrap gate statements in the minimal preamble the parser requires. */
function qasm(body: string, numQubits = 4): string {
  return `${HEADER}qubit[${numQubits}] q;\n\n${body}`;
}

/** Gate descriptors of a parsed circuit, moment by moment. */
function layout(
  circuit: Circuit
): { name: string; controls: number[]; targets: number[]; params: string[] }[][] {
  return Array.from(circuit.moments()).map((moment) =>
    Array.from(moment.gates()).map((gate) => ({
      name: gate.targetType.name,
      controls: [...gate.controls],
      targets: [...gate.targets],
      params: gate.params.map((p) => `${p.symbol}=${p.value ?? 'symbolic'}`),
    }))
  );
}

/**
 * Angle symbols are assigned when gates enter a circuit, which for a hand-built
 * example happens only on export. Compare against a named copy so the round trip
 * is judged on structure and angles, not on when the naming pass ran.
 */
function named(circuit: Circuit): Circuit {
  const copy = circuit.clone();
  copy.assignMissingAngleSymbols();
  return copy;
}

/** The single gate of a single-gate circuit. */
function onlyGate(circuit: Circuit): Gate {
  const gates = Array.from(circuit.moments()).flatMap((moment) => Array.from(moment.gates()));
  expect(gates).toHaveLength(1);
  return gates[0];
}

describe('parseQasm — round trip with circuitToQasm', () => {
  it.each([
    ['emptyCircuit', emptyCircuit],
    ['testCircuit', testCircuit],
    ['twineChain', twineChain],
    ['oneDHeisenberg', oneDHeisenberg],
    ['oneDHeisenbergAuxiliary', oneDHeisenbergAuxiliary],
  ])('re-emits identical QASM for %s', (_name, circuit) => {
    const exported = circuitToQasm(circuit);
    expect(circuitToQasm(parseQasm(exported))).toBe(exported);
  });

  it('re-emits identical QASM for a circuit using every supported gate', () => {
    const circuit = new Circuit([
      new Moment([
        new Gate({ targetType: new XTargetType(), controls: [], targets: [0] }),
        new Gate({ targetType: new YTargetType(), controls: [], targets: [1] }),
        new Gate({ targetType: new ZTargetType(), controls: [], targets: [2] }),
        new Gate({ targetType: new HTargetType(), controls: [], targets: [3] }),
      ]),
      new Moment([
        new Gate({ targetType: new STargetType(), controls: [], targets: [0] }),
        new Gate({ targetType: new SdgTargetType(), controls: [], targets: [1] }),
        new Gate({ targetType: new SqrtXTargetType(), controls: [], targets: [2] }),
        new Gate({ targetType: new SqrtYTargetType(), controls: [], targets: [3] }),
      ]),
      new Moment([
        new Gate({ targetType: new RxTargetType(), controls: [], targets: [0] }),
        new Gate({ targetType: new RyTargetType(), controls: [], targets: [1] }),
        new Gate({ targetType: new RzTargetType(), controls: [], targets: [2] }),
      ]),
      new Moment([
        new Gate({ targetType: new XTargetType(), controls: [0], targets: [1] }),
        new Gate({ targetType: new ZTargetType(), controls: [2], targets: [3] }),
      ]),
      new Moment([new Gate({ targetType: new SWAPTargetType(), controls: [], targets: [0, 1] })]),
      new Moment([new Gate({ targetType: new ISWAPTargetType(), controls: [], targets: [2, 3] })]),
    ]);

    const exported = circuitToQasm(circuit);
    expect(circuitToQasm(parseQasm(exported))).toBe(exported);
  });
});

describe('parseQasm — angle round trip', () => {
  it('preserves a numeric angle exactly', () => {
    const circuit = new Circuit([
      new Moment([
        new Gate({
          targetType: new RzTargetType(),
          controls: [],
          targets: [0],
          params: [new Angle('theta_1', Math.PI / 4)],
        }),
      ]),
    ]);

    const reparsed = parseQasm(circuitToQasm(circuit));

    // Exact equality, not toBeCloseTo: the float must survive the text form.
    expect(onlyGate(reparsed).angle?.value).toBe(Math.PI / 4);
  });

  it('preserves a shared symbol and declares it once', () => {
    const shared = new Angle('theta_1');
    const circuit = new Circuit([
      new Moment([
        new Gate({
          targetType: new RzTargetType(),
          controls: [],
          targets: [0],
          params: [shared],
        }),
        new Gate({
          targetType: new RxTargetType(),
          controls: [],
          targets: [1],
          params: [shared],
        }),
      ]),
    ]);

    const exported = circuitToQasm(circuit);
    expect(exported.match(/input float\[64\] theta_1;/g)).toHaveLength(1);

    const symbols = Array.from(parseQasm(exported).moments()).flatMap((m) =>
      Array.from(m.gates()).map((g) => g.angle?.symbol)
    );
    expect(symbols).toEqual(['theta_1', 'theta_1']);
    expect(circuitToQasm(parseQasm(exported))).toBe(exported);
  });

  it.each([0, 2, -0.125, Math.PI / 3, 1e-7])('round trips the value %s unchanged', (value) => {
    const circuit = new Circuit([
      new Moment([
        new Gate({
          targetType: new RzTargetType(),
          controls: [],
          targets: [0],
          params: [new Angle('theta_1', value)],
        }),
      ]),
    ]);

    expect(onlyGate(parseQasm(circuitToQasm(circuit))).angle?.value).toBe(value);
  });

  it('reads back an angle exported in pi mode', () => {
    const circuit = new Circuit([
      new Moment([
        new Gate({
          targetType: new RzTargetType(),
          controls: [],
          targets: [0],
          params: [new Angle('theta_1', (3 * Math.PI) / 4)],
        }),
      ]),
    ]);

    const exported = circuitToQasm(circuit, 'pi');
    expect(exported).toContain('rz(3*pi/4) q[0];');
    expect(onlyGate(parseQasm(exported)).angle?.value).toBeCloseTo((3 * Math.PI) / 4, 12);
  });
});

describe('parseQasm — input declarations', () => {
  it.each([
    'input float[64] theta_1;',
    'input float[32] theta_1;',
    'input float theta_1;',
    'input   float [ 64 ]   theta_1;',
  ])('accepts "%s"', (declaration) => {
    const source = `${HEADER}qubit[4] q;\n\n${declaration}\n\nrz(theta_1) q[0];\n`;
    expect(onlyGate(parseQasm(source)).angle?.symbol).toBe('theta_1');
  });

  it('accepts a declaration that no gate references', () => {
    const source = `${HEADER}qubit[4] q;\n\ninput float[64] unused;\n\nh q[0];\n`;
    expect(parseQasm(source).depth).toBe(1);
  });

  it.each([
    ['a non-float input', 'input int[32] n;'],
    ['a missing name', 'input float[64];'],
  ])('rejects %s', (_name, declaration) => {
    const source = `${HEADER}qubit[4] q;\n\n${declaration}\n\nh q[0];\n`;
    expect(() => parseQasm(source)).toThrow(/only 'input float\[n\] name;' declarations/);
  });

  it('still rejects a bare float declaration with its own message', () => {
    const source = `${HEADER}qubit[4] q;\n\nfloat x = 3;\n\nh q[0];\n`;
    expect(() => parseQasm(source)).toThrow(/classical variables are not supported/);
  });
});

describe('parseQasm — moment reconstruction', () => {
  it('rebuilds the moment layout of testCircuit exactly', () => {
    expect(layout(parseQasm(circuitToQasm(testCircuit)))).toEqual(layout(named(testCircuit)));
  });

  it('rebuilds the moment layout of oneDHeisenberg exactly', () => {
    expect(layout(parseQasm(circuitToQasm(oneDHeisenberg)))).toEqual(layout(named(oneDHeisenberg)));
  });

  it('compacts oneDHeisenbergAuxiliary, pulling rx q[1] one moment earlier', () => {
    const parsed = layout(parseQasm(circuitToQasm(oneDHeisenbergAuxiliary)));
    expect(parsed).toHaveLength(oneDHeisenbergAuxiliary.depth);
    expect(parsed[2]).toEqual([
      { name: 'X', controls: [2], targets: [3], params: [] },
      { name: 'Rx', controls: [], targets: [1], params: ['theta_1=symbolic'] },
    ]);
    expect(parsed[3]).toEqual([
      { name: 'Rz', controls: [], targets: [2], params: ['theta_2=symbolic'] },
      { name: 'Ry', controls: [], targets: [3], params: ['theta_3=symbolic'] },
    ]);
  });

  it('packs non-overlapping gates into a single moment', () => {
    const circuit = parseQasm(qasm('h q[0];\nx q[1];\n'));
    expect(circuit.depth).toBe(1);
  });

  it('splits overlapping gates into separate moments', () => {
    const circuit = parseQasm(qasm('h q[0];\nx q[0];\n'));
    expect(circuit.depth).toBe(2);
  });

  it('keeps a single-qubit gate out of an iSWAP moment when it sits between the targets', () => {
    const circuit = parseQasm(qasm('iswap q[0], q[2];\nx q[1];\n'));
    expect(circuit.depth).toBe(2);
  });

  it('produces an empty circuit when there are no gate statements', () => {
    expect(parseQasm(`${HEADER}qubit[0] q;\n\n`).depth).toBe(0);
  });
});

describe('parseQasm — gates', () => {
  it.each([
    ['x q[0];', 'X'],
    ['y q[0];', 'Y'],
    ['z q[0];', 'Z'],
    ['h q[0];', 'H'],
    ['s q[0];', 'S'],
    ['sdg q[0];', 'SDG'],
    ['sx q[0];', 'SX'],
    ['sy q[0];', 'SY'],
    ['rx q[0];', 'Rx'],
    ['ry q[0];', 'Ry'],
    ['rz q[0];', 'Rz'],
  ])('parses "%s" as a %s gate on qubit 0', (statement, name) => {
    const gate = onlyGate(parseQasm(qasm(statement)));
    expect(gate.targetType.name).toBe(name);
    expect(gate.controls).toEqual([]);
    expect(gate.targets).toEqual([0]);
  });

  it.each([
    ['cx q[0], q[1];', 'X'],
    ['cnot q[0], q[1];', 'X'],
    ['cz q[0], q[1];', 'Z'],
  ])('parses "%s" with the control first', (statement, name) => {
    const gate = onlyGate(parseQasm(qasm(statement)));
    expect(gate.targetType.name).toBe(name);
    expect(gate.controls).toEqual([0]);
    expect(gate.targets).toEqual([1]);
  });

  it.each([
    ['swap q[0], q[2];', 'SWAP'],
    ['iswap q[0], q[2];', 'iSWAP'],
  ])('parses "%s" as a two-target gate', (statement, name) => {
    const gate = onlyGate(parseQasm(qasm(statement)));
    expect(gate.targetType.name).toBe(name);
    expect(gate.controls).toEqual([]);
    expect(gate.targets).toEqual([0, 2]);
  });

  it.each<[string, number]>([
    ['rz(pi/2) q[0];', Math.PI / 2],
    ['rz(0.5) q[0];', 0.5],
    ['rz( 2 * pi ) q[0];', 2 * Math.PI],
    ['rz(-pi/4) q[0];', -Math.PI / 4],
    ['rz(3*pi/4) q[0];', (3 * Math.PI) / 4],
  ])('reads the angle out of "%s"', (statement, expected) => {
    const gate = onlyGate(parseQasm(qasm(statement)));

    expect(gate.targetType.name).toBe('Rz');
    expect(gate.angle?.value).toBeCloseTo(expected, 12);
    // A value read from QASM still gets a theta index at the circuit boundary.
    expect(gate.angle?.symbol).toBe('theta_1');
  });

  it('gives a rotation written without a parameter a symbolic angle', () => {
    const gate = onlyGate(parseQasm(qasm('rz q[0];')));

    expect(gate.angle?.symbol).toBe('theta_1');
    expect(gate.angle?.value).toBeNull();
  });

  it('treats a bare identifier as a reference to a symbol', () => {
    const source = `${HEADER}qubit[4] q;\n\ninput float[64] beta;\n\nrz(beta) q[0];\n`;
    const gate = onlyGate(parseQasm(source));

    expect(gate.angle?.symbol).toBe('beta');
    expect(gate.angle?.value).toBeNull();
  });

  it('accepts an identifier that was never declared', () => {
    const gate = onlyGate(parseQasm(qasm('rz(gamma) q[0];')));

    expect(gate.angle?.symbol).toBe('gamma');
  });

  it('ties two gates that reference the same symbol', () => {
    const circuit = parseQasm(qasm('rz(theta_1) q[0];\nrz(theta_1) q[1];\n'));
    const symbols = Array.from(circuit.moments()).flatMap((m) =>
      Array.from(m.gates()).map((g) => g.angle?.symbol)
    );

    expect(symbols).toEqual(['theta_1', 'theta_1']);
  });

  it.each([
    ['empty parameter list', 'rz() q[0];', /empty parameter list/],
    ['two parameters', 'rz(pi, pi) q[0];', /takes a single parameter/],
    ['an unparseable angle', 'rz(pi+1) q[0];', /Cannot read "pi\+1" as an angle/],
  ])('rejects %s', (_name, body, message) => {
    expect(() => parseQasm(qasm(body))).toThrow(message);
  });

  it('accepts a bare "qubit q;" declaration as a one-qubit register', () => {
    expect(onlyGate(parseQasm(`${HEADER}qubit q;\n\nh q[0];\n`)).targets).toEqual([0]);
  });
});

describe('parseQasm — lexical handling', () => {
  it('ignores line comments, block comments and blank lines', () => {
    const source = `${HEADER}qubit[2] q; // the register

// a leading comment
h q[0];
/* a block
   comment */
x q[1];
`;
    expect(layout(parseQasm(source))).toEqual([
      [
        { name: 'H', controls: [], targets: [0], params: [] },
        { name: 'X', controls: [], targets: [1], params: [] },
      ],
    ]);
  });

  it('accepts several statements on one line and a statement split across lines', () => {
    const circuit = parseQasm(qasm('h q[0]; x q[1];\ncx q[0],\n   q[1];\n'));
    expect(layout(circuit)).toEqual([
      [
        { name: 'H', controls: [], targets: [0], params: [] },
        { name: 'X', controls: [], targets: [1], params: [] },
      ],
      [{ name: 'X', controls: [0], targets: [1], params: [] }],
    ]);
  });

  it('skips the custom gate definitions our own converter emits', () => {
    const source = `${HEADER}qubit[2] q;

gate sdg q {
  s q;
  s q;
  s q;
}

gate iswap q0, q1 {
  s q0;
  s q1;
  h q0;
  cx q0, q1;
  cx q1, q0;
  h q1;
}

sdg q[0];
`;
    expect(layout(parseQasm(source))).toEqual([
      [{ name: 'SDG', controls: [], targets: [0], params: [] }],
    ]);
  });

  it('parses without the optional version and include statements', () => {
    expect(onlyGate(parseQasm('qubit[1] q;\nh q[0];\n')).targetType.name).toBe('H');
  });
});

describe('parseQasm — rejected input', () => {
  it.each([
    ['unknown gate', 'ccx q[0], q[1], q[2];', /unsupported gate 'ccx'/],
    ['wrong arity', 'h q[0], q[1];', /gate 'h' expects 1 qubit\(s\) but got 2/],
    ['whole register operand', 'h q;', /whole register are not supported/],
    ['repeated qubit', 'cx q[0], q[0];', /uses the same qubit more than once/],
    ['index out of range', 'h q[9];', /qubit index 9 is out of range/],
    ['unknown register', 'h r[0];', /unknown qubit register 'r'/],
    ['parameters on a plain gate', 'h(0.5) q[0];', /gate 'h' does not take parameters/],
    ['control flow', 'if (c == 1) { x q[0]; }', /control flow is not supported/],
    ['loop', 'for int i in [0:2] { x q[0]; }', /control flow is not supported/],
    ['measurement', 'measure q[0];', /measurements are not supported/],
    ['measurement into a bit', 'c[0] = measure q[0];', /measurements are not supported/],
    ['reset', 'reset q[0];', /qubit reset is not supported/],
    ['gate modifier', 'ctrl @ x q[0], q[1];', /gate modifiers .* are not supported/],
    ['user-defined gate', 'gate foo q { x q; }', /user-defined gate 'foo' is not supported/],
    ['missing semicolon', 'h q[0]', /missing ';'/],
    ['unterminated block', 'gate sdg q { s q;', /unterminated block/],
    ['stray closing brace', 'h q[0]; }', /unexpected '}'/],
    ['missing operands', 'h;', /missing qubit operands/],
  ])('rejects %s', (_name, body, expected) => {
    expect(() => parseQasm(qasm(body))).toThrow(expected);
  });

  it.each([
    ['classical register', 'bit[2] c;', /classical registers are not supported/],
    ['qasm 2 register', 'qreg r[2];', /'qreg' is not supported/],
    ['second qubit register', 'qubit[2] r;', /only a single qubit register is supported/],
  ])('rejects %s', (_name, body, expected) => {
    expect(() => parseQasm(qasm(body))).toThrow(expected);
  });

  it('rejects a gate statement before any register declaration', () => {
    expect(() => parseQasm(`${HEADER}h q[0];\n`)).toThrow(/missing qubit register declaration/);
  });

  it('rejects OpenQASM 2 source', () => {
    expect(() => parseQasm('OPENQASM 2.0;\nqreg q[2];\n')).toThrow(/OpenQASM 2 is not supported/);
  });

  it('reports the line number of the offending statement', () => {
    const attempt = () => parseQasm(qasm('h q[0];\nx q[1];\nccx q[0], q[1], q[2];\n'));
    expect(attempt).toThrow(QasmParseError);
    // The preamble occupies lines 1-5, so the two good gates are on 6 and 7.
    expect(attempt).toThrow(/^Line 8:/);
  });

  it('leaves no partial circuit behind — parsing is all or nothing', () => {
    expect(() => parseQasm(qasm('h q[0];\nccx q[0], q[1], q[2];\n'))).toThrow();
    expect(circuitToQasm(testCircuit)).toContain('h q[1];');
  });
});
