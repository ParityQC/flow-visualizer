// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * The equivalent circuit with every rotation commuted to the front, drawn below
 * the main one: one full-height box per logical rotation, then a box for the
 * Clifford left behind.
 *
 * Not a `Circuit`, so it shares no components with `CircuitView` -- only the
 * wire geometry from `LayoutConstants`, so the two views read as one system.
 */
import { useMemo } from 'react';
import { InlineMath } from './InlineMath';
import { Circuit } from '../models/Circuit';
import { formatSignedAngle } from '../models/Angle';
import { useDisplaySettings } from '../utils/DisplaySettings';
import {
  computeLogicalRotations,
  isGlobalPhase,
  LogicalRotation,
  pauliFactorsToLatex,
  pauliWordToLatex,
} from '../utils/logicalRotations';
import { gateAreaLeftMargin, lineHeight, padding, qubitLabelWidth } from '../utils/LayoutConstants';
import './LogicalCircuitView.css';

interface LogicalCircuitViewProps {
  circuit: Circuit;
}

/** Same baseline as `CircuitView`, so both views show the same wires. */
const baselineQubits = 5;

/** Vertical centre of a qubit's wire, matching `CircuitView`. */
const wireY = (qubitIndex: number) => padding + (qubitIndex + 1) * lineHeight;

// `CircuitView` shifts its whole wires area 5px left, so its qubit names sit
// here; mirror that rather than let the two gutters drift apart.
const qubitLabelLeft = padding - 5;

export function LogicalCircuitView({ circuit }: LogicalCircuitViewProps) {
  const { angleDisplay, isLabelXVisible, isLabelZVisible } = useDisplaySettings();

  // The generators follow the reduced labels the circuit shows, so fixing a
  // qubit's initial state drops the Paulis it stabilises out of them too.
  const { rotations, cliffordIsTrivial } = useMemo(
    () =>
      computeLogicalRotations(circuit, (qubit, type) =>
        type === 'X' ? isLabelXVisible(qubit) : isLabelZVisible(qubit)
      ),
    [circuit, isLabelXVisible, isLabelZVisible]
  );

  // A rotation about the identity is a global phase, so it is left undrawn.
  const drawnRotations = rotations.filter((rotation) => !isGlobalPhase(rotation));

  /** The state a qubit was fixed to, for a qubit that was fixed to one. */
  const initialKet = (qubit: number) => (isLabelXVisible(qubit) ? '|0⟩' : '|+⟩');

  /** Why this rotation is not a rotation on the logical qubits. */
  const destabilizedWarning = (rotation: LogicalRotation) =>
    'Leaves the code space: ' +
    rotation.destabilizedQubits
      .map((qubit) => {
        const factor = rotation.generator.factors.find((f) => f.qubit === qubit);
        return `${factor?.pauli}${qubit} does not preserve q${qubit} = ${initialKet(qubit)}`;
      })
      .join('; ') +
    '.';

  const numQubits = Math.max(baselineQubits, circuit.maxUsedQubitIndex() + 1);
  // Boxes span every wire, reaching half a line above the first and below the last.
  const boxTop = wireY(0) - lineHeight / 2;
  const boxHeight = numQubits * lineHeight;
  const canvasHeight = boxTop + boxHeight + padding;
  const isEmpty = circuit.maxUsedQubitIndex() < 0;

  return (
    <div className="panel logical-panel">
      <div className="panel-header">
        <span className="panel-label">Logical Rotations</span>
        <span className="logical-hint">Every rotation commuted to the front of the circuit</span>
      </div>
      <div className="panel-body logical-panel-body">
        <div className="logical-canvas" style={{ minHeight: `${canvasHeight}px` }}>
          <div className="logical-wires">
            {Array.from({ length: numQubits }).map((_, qubitIndex) => (
              <div key={`wire-${qubitIndex}`}>
                <div
                  className="logical-wire"
                  style={{ top: `${wireY(qubitIndex)}px`, left: `${qubitLabelWidth}px` }}
                />
                <span
                  className="logical-qubit-label"
                  style={{
                    top: `${wireY(qubitIndex)}px`,
                    left: `${qubitLabelLeft}px`,
                    width: `${qubitLabelWidth}px`,
                  }}
                >
                  <InlineMath math={`q_{${qubitIndex}}`} />
                </span>
              </div>
            ))}
          </div>

          <div
            className="logical-boxes"
            style={{
              paddingTop: `${boxTop}px`,
              paddingBottom: `${padding}px`,
              paddingLeft: `${padding + qubitLabelWidth + gateAreaLeftMargin}px`,
            }}
          >
            {drawnRotations.map((rotation, index) => {
              const { generator, angle, destabilizedQubits } = rotation;
              const leavesCodeSpace = destabilizedQubits.length > 0;
              // A negative Pauli shows up as a negated angle. With no angle to
              // carry it, the minus has to stay on the word itself.
              const math =
                angle === undefined
                  ? `R_{${pauliWordToLatex(generator)}}`
                  : `R_{${pauliFactorsToLatex(generator)}}(${formatSignedAngle(
                      angle,
                      angleDisplay,
                      generator.sign
                    )})`;
              return (
                <div
                  key={`logical-rotation-${index}`}
                  className={`logical-box ${leavesCodeSpace ? 'leaves-code-space' : ''}`}
                  style={{ height: `${boxHeight}px` }}
                  title={leavesCodeSpace ? destabilizedWarning(rotation) : undefined}
                >
                  <InlineMath math={math} />
                </div>
              );
            })}
            {!isEmpty && (
              <div
                className={`logical-box logical-clifford ${cliffordIsTrivial ? 'is-trivial' : ''}`}
                style={{ height: `${boxHeight}px` }}
              >
                {cliffordIsTrivial ? 'trivial Clifford' : 'non-trivial Clifford'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
