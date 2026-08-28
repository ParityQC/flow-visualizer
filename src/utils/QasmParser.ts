// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * Parses a deliberately small subset of OpenQASM 3 back into a `Circuit`.
 *
 * Supported: flat circuits over a single qubit register using the gates of the
 * tool box. Everything else (control flow, subroutines, gate modifiers,
 * measurements, classical registers) is rejected with a `QasmParseError`.
 *
 * QASM carries no notion of moments, so gates are appended one per moment and
 * the circuit is compacted afterwards via `Circuit.parallelizeGates()`.
 */
import { Circuit } from '../models/Circuit';
import { Gate } from '../models/Gates';
import { Moment } from '../models/Moments';
import { instantiateTargetType, TargetType } from '../models/Targets';

export class QasmParseError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(`Line ${line}: ${message}`);
    this.name = 'QasmParseError';
    this.line = line;
  }
}

/** How a QASM gate name maps onto our `Gate` model. */
interface GateSpec {
  /** Key for `instantiateTargetType`, which is case sensitive. */
  targetTypeName: string;
  /** Number of qubit operands the call must have. */
  numOperands: number;
  /** True if the first operand is a control rather than a target. */
  hasControl: boolean;
  /** True if a (discarded) rotation angle may be given. */
  takesParams: boolean;
}

function single(targetTypeName: string, takesParams = false): GateSpec {
  return { targetTypeName, numOperands: 1, hasControl: false, takesParams };
}

function controlled(targetTypeName: string): GateSpec {
  return { targetTypeName, numOperands: 2, hasControl: true, takesParams: false };
}

function twoTarget(targetTypeName: string): GateSpec {
  return { targetTypeName, numOperands: 2, hasControl: false, takesParams: false };
}

/**
 * Lower case QASM gate name -> gate spec. Only `cx`/`cz` are accepted in
 * controlled form because label tracking supports no other controlled gate.
 */
const gateSpecs: Record<string, GateSpec> = {
  x: single('X'),
  y: single('Y'),
  z: single('Z'),
  h: single('H'),
  s: single('S'),
  sdg: single('SDG'),
  sx: single('SX'),
  sy: single('SY'),
  rx: single('Rx', true),
  ry: single('Ry', true),
  rz: single('Rz', true),
  cx: controlled('X'),
  cnot: controlled('X'),
  cz: controlled('Z'),
  swap: twoTarget('SWAP'),
  iswap: twoTarget('iSWAP'),
};

const supportedGateNames = Object.keys(gateSpecs).join(', ');

/** Gate definitions our own converter emits, which are skipped when re-read. */
const knownGateDefinitions = new Set(['iswap', 'sdg', 'sy']);

/** First tokens we reject with a tailored message instead of "unsupported gate". */
const rejectedKeywords: Record<string, string> = {
  if: 'control flow is not supported',
  else: 'control flow is not supported',
  for: 'control flow is not supported',
  while: 'control flow is not supported',
  switch: 'control flow is not supported',
  def: 'subroutine definitions are not supported',
  defcal: 'subroutine definitions are not supported',
  opaque: 'opaque gate declarations are not supported',
  gphase: 'global phase statements are not supported',
  measure: 'measurements are not supported',
  reset: 'qubit reset is not supported',
  bit: 'classical registers are not supported',
  cbit: 'classical registers are not supported',
  creg: 'classical registers are not supported',
  int: 'classical variables are not supported',
  float: 'classical variables are not supported',
  angle: 'classical variables are not supported',
  const: 'classical variables are not supported',
  qreg: "QASM 2 style 'qreg' is not supported; use 'qubit[n] q;'",
};

interface Statement {
  /** Statement text without the terminating semicolon, comments removed. */
  text: string;
  /** 1-based line the statement starts on. */
  line: number;
}

/** A single qubit register, the only declaration form we accept. */
interface Register {
  name: string;
  size: number;
}

/**
 * Parse QASM source into a circuit. Throws `QasmParseError` on anything
 * outside the supported subset; the caller's circuit is never touched.
 */
export function parseQasm(source: string): Circuit {
  const circuit = new Circuit();
  let register: Register | undefined;

  for (const statement of splitStatements(stripComments(source))) {
    const keyword = firstToken(statement.text);

    if (keyword === 'openqasm') {
      checkVersion(statement);
    } else if (keyword === 'include') {
      // Includes only pull in standard gate definitions, which we know already.
    } else if (keyword === 'barrier') {
      // Barriers carry no information our model can hold.
    } else if (keyword === 'qubit') {
      if (register !== undefined) {
        throw new QasmParseError('only a single qubit register is supported', statement.line);
      }
      register = parseRegister(statement);
    } else if (keyword === 'gate') {
      checkGateDefinition(statement);
    } else if (keyword in rejectedKeywords) {
      throw new QasmParseError(rejectedKeywords[keyword], statement.line);
    } else {
      circuit.appendMoment(new Moment([parseGateCall(statement, register)]));
    }
  }

  circuit.parallelizeGates();
  return circuit;
}

/** Replace comments by equivalent whitespace, keeping newlines for line numbers. */
function stripComments(source: string): string {
  let result = '';

  for (let i = 0; i < source.length; i++) {
    if (source.startsWith('//', i)) {
      while (i < source.length && source[i] !== '\n') i++;
      result += '\n';
    } else if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      const comment = end === -1 ? source.slice(i) : source.slice(i, end + 2);
      // Keep the newlines so later statements report the right line.
      result += comment.replace(/[^\n]/g, ' ');
      i += comment.length - 1;
    } else {
      result += source[i];
    }
  }

  return result;
}

/**
 * Split into statements. A statement ends at a semicolon, or at the closing
 * brace of a block (so a `gate foo q { ... }` definition stays one statement).
 */
function splitStatements(source: string): Statement[] {
  const statements: Statement[] = [];
  let current = '';
  let line = 1;
  let startLine = 1;
  let braceDepth = 0;

  const flush = () => {
    if (current.trim() !== '') {
      statements.push({ text: current.trim(), line: startLine });
    }
    current = '';
    startLine = line;
  };

  for (const char of source) {
    if (char === '{') {
      braceDepth++;
      current += char;
    } else if (char === '}') {
      if (braceDepth === 0) {
        throw new QasmParseError("unexpected '}'", line);
      }
      braceDepth--;
      current += char;
      if (braceDepth === 0) flush();
    } else if (char === ';' && braceDepth === 0) {
      flush();
    } else {
      if (current.trim() === '') startLine = line;
      current += char;
    }

    if (char === '\n') line++;
  }

  if (braceDepth > 0) {
    throw new QasmParseError("unterminated block, missing '}'", startLine);
  }
  if (current.trim() !== '') {
    throw new QasmParseError(`missing ';' after "${current.trim()}"`, startLine);
  }

  return statements;
}

function firstToken(text: string): string {
  return (text.match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0] ?? '').toLowerCase();
}

function checkVersion(statement: Statement): void {
  const match = statement.text.match(/^openqasm\s+(\d+)(?:\.\d+)?$/i);
  if (!match) {
    throw new QasmParseError(`malformed version statement "${statement.text}"`, statement.line);
  }
  if (match[1] !== '3') {
    throw new QasmParseError(
      `OpenQASM ${match[1]} is not supported; expected 'OPENQASM 3;'`,
      statement.line
    );
  }
}

function parseRegister(statement: Statement): Register {
  const sized = statement.text.match(/^qubit\s*\[\s*(\d+)\s*\]\s+([A-Za-z_][A-Za-z0-9_]*)$/);
  if (sized) {
    return { name: sized[2], size: Number(sized[1]) };
  }

  const bare = statement.text.match(/^qubit\s+([A-Za-z_][A-Za-z0-9_]*)$/);
  if (bare) {
    return { name: bare[1], size: 1 };
  }

  throw new QasmParseError(
    `malformed qubit declaration "${statement.text}"; expected 'qubit[n] q;'`,
    statement.line
  );
}

function checkGateDefinition(statement: Statement): void {
  const name = statement.text.match(/^gate\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
  if (name === undefined) {
    throw new QasmParseError(`malformed gate definition "${statement.text}"`, statement.line);
  }
  if (!knownGateDefinitions.has(name.toLowerCase())) {
    throw new QasmParseError(`user-defined gate '${name}' is not supported`, statement.line);
  }
  // The body only re-states a gate we already know, so it is ignored.
}

function parseGateCall(statement: Statement, register: Register | undefined): Gate {
  const { text, line } = statement;

  if (text.includes('@')) {
    throw new QasmParseError('gate modifiers (ctrl @, inv @) are not supported', line);
  }
  if (/\bmeasure\b/.test(text)) {
    throw new QasmParseError('measurements are not supported', line);
  }

  const match = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(\((.*)\))?\s*([\s\S]*)$/);
  if (!match) {
    throw new QasmParseError(`cannot parse statement "${text}"`, line);
  }
  const [, name, paramGroup, , operandText] = match;

  const spec = gateSpecs[name.toLowerCase()];
  if (spec === undefined) {
    throw new QasmParseError(
      `unsupported gate '${name}'; supported gates are: ${supportedGateNames}`,
      line
    );
  }
  if (paramGroup !== undefined && !spec.takesParams) {
    throw new QasmParseError(`gate '${name}' does not take parameters`, line);
  }
  // A rotation angle has nowhere to live in our model, so it is discarded.

  const qubits = parseOperands(operandText, register, line);
  if (qubits.length !== spec.numOperands) {
    throw new QasmParseError(
      `gate '${name}' expects ${spec.numOperands} qubit(s) but got ${qubits.length}`,
      line
    );
  }
  if (new Set(qubits).size !== qubits.length) {
    throw new QasmParseError(`gate '${name}' uses the same qubit more than once`, line);
  }

  const targetType: TargetType = instantiateTargetType(spec.targetTypeName);
  const controls = spec.hasControl ? [qubits[0]] : [];
  const targets = spec.hasControl ? qubits.slice(1) : qubits;

  try {
    return new Gate({ targetType, controls, targets });
  } catch (err) {
    throw new QasmParseError(err instanceof Error ? err.message : String(err), line);
  }
}

function parseOperands(
  operandText: string,
  register: Register | undefined,
  line: number
): number[] {
  if (operandText.trim() === '') {
    throw new QasmParseError('missing qubit operands', line);
  }

  return operandText.split(',').map((operand) => parseOperand(operand.trim(), register, line));
}

function parseOperand(operand: string, register: Register | undefined, line: number): number {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(operand)) {
    throw new QasmParseError(
      `operations on a whole register are not supported; index the qubit, e.g. 'h ${operand}[0];'`,
      line
    );
  }

  const match = operand.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]$/);
  if (!match) {
    throw new QasmParseError(`cannot parse qubit operand "${operand}"`, line);
  }

  if (register === undefined) {
    throw new QasmParseError(
      "missing qubit register declaration (expected e.g. 'qubit[4] q;')",
      line
    );
  }

  const [, name, indexText] = match;
  if (name !== register.name) {
    throw new QasmParseError(
      `unknown qubit register '${name}'; the declared register is '${register.name}'`,
      line
    );
  }

  const index = Number(indexText);
  if (index >= register.size) {
    throw new QasmParseError(
      `qubit index ${index} is out of range for '${register.name}[${register.size}]'`,
      line
    );
  }

  return index;
}
