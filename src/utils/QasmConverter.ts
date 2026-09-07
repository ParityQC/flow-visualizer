// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * Handles conversion of gate data into qasm text
 */
import { Circuit } from '../models/Circuit';
import { Angle } from '../models/Angle';
import { Gate } from '../models/Gates';

export function circuitToQasm(circuit: Circuit): string {
  // A copy, so rendering the panel cannot mutate the circuit mid-render. The
  // pass is idempotent, so it is a no-op for a circuit that is already named.
  const named = circuit.clone();
  named.assignMissingAngleSymbols();

  let qasm = 'OPENQASM 3;\ninclude "stdgates.inc";\n\n';

  const numQubits = named.maxUsedQubitIndex();
  qasm += `qubit[${numQubits + 1}] q;\n\n`;

  qasm += inputDeclarations(named);

  const definedCustomGates = new Set<string>();
  let customGateDefs = '';

  const addGateDefinition = (gateName: string) => {
    if (definedCustomGates.has(gateName)) {
      return;
    }

    if (gateName === 'iSWAP') {
      customGateDefs += `gate iswap q0, q1 {
  s q0;
  s q1;
  h q0;
  cx q0, q1;
  cx q1, q0;
  h q1;
}\n\n`;
      definedCustomGates.add(gateName);
    } else if (gateName === 'SDG') {
      customGateDefs += `gate sdg q {
  s q;
  s q;
  s q;
}\n\n`;
      definedCustomGates.add(gateName);
    } else if (gateName === 'SY') {
      addGateDefinition('SDG');

      customGateDefs += `gate sy q {
  s q;
  sx q;
  sdg q;
}\n\n`;
      definedCustomGates.add(gateName);
    }
  };
  for (const moment of named.moments()) {
    for (const gate of moment.gates()) {
      addGateDefinition(gate.targetType.name);
    }
  }

  qasm += customGateDefs;

  for (const moment of named.moments()) {
    for (const gate of moment.gates()) {
      qasm += `${gateToQasm(gate)}\n`;
    }

    if (moment.empty()) {
      qasm += '\n';
    }
  }

  return qasm;
}

function gateToQasm(gate: Gate): string {
  const targetType = gate.targetType;
  if (gate.numTargets === 2) {
    return `${targetType.name.toLowerCase()} q[${gate.targets[0]}], q[${gate.targets[1]}];`;
  } else if (gate.numControls === 1) {
    return `c${targetType.name.toLowerCase()} q[${gate.controls[0]}], q[${gate.targets[0]}];`;
  } else if (!gate.isControlled() && gate.isSingleTarget()) {
    const params = gate.params.map(qasmParam).join(', ');
    const paramList = params === '' ? '' : `(${params})`;
    return `${targetType.name.toLowerCase()}${paramList} q[${gate.targets[0]}];`;
  }
  throw new Error(
    `QASM conversion: unsupported gate "${gate.targetType.name}" at targets ${gate.targets.join(', ')}`
  );
}

/**
 * `input float[64] theta_1;` for every angle with no numeric value. A symbol is
 * the identity of a parameter, so two gates sharing one are declared once.
 */
function inputDeclarations(circuit: Circuit): string {
  const symbols = new Set<string>();

  for (const moment of circuit.moments()) {
    for (const gate of moment.gates()) {
      for (const param of gate.params) {
        if (param.isSymbolic) {
          symbols.add(param.symbol);
        }
      }
    }
  }

  if (symbols.size === 0) {
    return '';
  }
  return [...symbols].map((symbol) => `input float[64] ${symbol};`).join('\n') + '\n\n';
}

/**
 * A symbolic angle becomes its symbol; a valued one becomes a float literal.
 * `String` prints the shortest decimal that parses back to the same double,
 * which is what makes the round trip lossless; integers get a decimal point so
 * they read as floats rather than ints.
 */
function qasmParam(angle: Angle): string {
  if (angle.value === null) {
    return angle.symbol;
  }
  return Number.isInteger(angle.value) ? angle.value.toFixed(1) : String(angle.value);
}
