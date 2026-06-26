/**
 * Handles conversion of gate data into qasm text
 */
import { Circuit } from '../models/Circuit';
import { Gate } from '../models/Gates';

export function circuitToQasm(circuit: Circuit): string {
  let qasm = 'OPENQASM 3;\ninclude "stdgates.inc";\n\n';

  const numQubits = circuit.maxUsedQubitIndex();
  qasm += `qubit[${numQubits + 1}] q;\n\n`;

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
  for (const moment of circuit.moments()) {
    for (const gate of moment.gates()) {
      addGateDefinition(gate.targetType.name);
    }
  }

  qasm += customGateDefs;

  for (const moment of circuit.moments()) {
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
    return `${targetType.name.toLowerCase()} q[${gate.targets[0]}];`;
  }
  throw new Error(
    `QASM conversion: unsupported gate "${gate.targetType.name}" at targets ${gate.targets.join(', ')}`
  );
}
