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
import { getInitialState, useDisplaySettings } from '../utils/DisplaySettings';
import {
  computeLogicalRotations,
  isGlobalPhase,
  LogicalRotation,
  splitRegister,
  pauliFactorsToLatex,
  pauliWordToLatex,
} from '../utils/logicalRotations';
import {
  gateAreaLeftMargin,
  logicalLineHeight,
  padding,
  qubitLabelWidth,
} from '../utils/LayoutConstants';
import './LogicalCircuitView.css';

interface LogicalCircuitViewProps {
  circuit: Circuit;
}

/**
 * Vertical centre of the wire in row `row`. Rows are positions in the drawn
 * register, not qubit indices: only qubits carrying a gate get a wire, so q_5
 * can sit directly under q_0. The wire's own label says which qubit it is.
 */
const rowY = (row: number) => padding + (row + 1) * logicalLineHeight;

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

  // Only the qubits the circuit actually touches: a qubit with no gate cannot
  // appear in any generator, and the leftover Clifford is the identity on it.
  const qubits = useMemo(() => circuit.usedQubits(), [circuit]);
  // Auxiliaries are prepared, not handed in, so they get no wire until the
  // Clifford; they are drawn below the logical qubits, which keeps the rows a
  // rotation box spans contiguous.
  const { logical, auxiliary } = splitRegister(qubits, (qubit, type) =>
    type === 'X' ? isLabelXVisible(qubit) : isLabelZVisible(qubit)
  );

  // Boxes start half a row above the first wire. Rotations reach down over the
  // logical qubits; the Clifford reaches over the whole register.
  const boxTop = rowY(0) - logicalLineHeight / 2;
  const rotationHeight = logical.length * logicalLineHeight;
  const cliffordHeight = qubits.length * logicalLineHeight;
  const canvasHeight = boxTop + cliffordHeight + padding;
  /** Centre of a row, measured inside a box that starts at `boxTop`. */
  const rowCentreInBox = (row: number) => row * logicalLineHeight + logicalLineHeight / 2;

  return (
    <div className="panel logical-panel">
      <div className="panel-header">
        <span className="panel-label">Logical Rotations</span>
        <span className="logical-hint">Every rotation commuted to the front of the circuit</span>
      </div>
      <div className="panel-body logical-panel-body">
        {qubits.length === 0 ? (
          <p className="logical-empty">No gates yet.</p>
        ) : (
          <div className="logical-canvas" style={{ minHeight: `${canvasHeight}px` }}>
            <div className="logical-wires">
              {logical.map((qubitIndex, row) => (
                <div key={`wire-${qubitIndex}`}>
                  <div
                    className="logical-wire"
                    style={{ top: `${rowY(row)}px`, left: `${qubitLabelWidth}px` }}
                  />
                  <span
                    className="logical-qubit-label"
                    style={{
                      top: `${rowY(row)}px`,
                      left: `${qubitLabelLeft}px`,
                      width: `${qubitLabelWidth}px`,
                    }}
                  >
                    <InlineMath math={`q_{${qubitIndex}}`} />
                    {/* Only shows where the register could not be split, and the
                        prepared qubits are drawn as inputs after all. */}
                    {getInitialState(isLabelXVisible(qubitIndex), isLabelZVisible(qubitIndex))}
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
                    style={{ height: `${rotationHeight}px` }}
                    title={leavesCodeSpace ? destabilizedWarning(rotation) : undefined}
                  >
                    <InlineMath math={math} />
                  </div>
                );
              })}
              {auxiliary.length > 0 && (
                <div className="logical-aux-lead" style={{ height: `${cliffordHeight}px` }}>
                  {auxiliary.map((qubitIndex, index) => (
                    <span
                      key={`aux-in-${qubitIndex}`}
                      className="logical-aux-input"
                      style={{ top: `${rowCentreInBox(logical.length + index)}px` }}
                    >
                      <InlineMath math={`q_{${qubitIndex}}`} />
                      {getInitialState(isLabelXVisible(qubitIndex), isLabelZVisible(qubitIndex))}
                      <span className="logical-aux-stub" />
                    </span>
                  ))}
                </div>
              )}
              <div
                className={`logical-box logical-clifford ${cliffordIsTrivial ? 'is-trivial' : ''}`}
                style={{ height: `${cliffordHeight}px` }}
              >
                {cliffordIsTrivial ? 'trivial Clifford' : 'non-trivial Clifford'}
              </div>
              {auxiliary.length > 0 && (
                // The auxiliaries leave the Clifford as ordinary outputs; their
                // wires exist only from here on, so they are drawn in this tail
                // rather than in the full-width wires layer.
                <div className="logical-tail" style={{ height: `${cliffordHeight}px` }}>
                  {auxiliary.map((qubitIndex, index) => (
                    <span
                      key={`aux-out-${qubitIndex}`}
                      className="logical-aux-output"
                      style={{ top: `${rowCentreInBox(logical.length + index)}px` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
