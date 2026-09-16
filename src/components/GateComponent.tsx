// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
/**
 * Renders a single gate cell (single-qubit box, controlled-gate stem,
 * SWAP/iSWAP/CNOT marks) for a given `Gate`.
 */
import './GateComponent.css';
import { InlineMath } from './InlineMath';
import { Gate } from '../models/Gates';
import { formatAngle } from '../models/Angle';
import { useDisplaySettings } from '../utils/DisplaySettings';
import { gateWidth, lineHeight } from '../utils/LayoutConstants';

interface GateProps {
  gate: Gate;
}

export function GateComponent({ gate }: GateProps) {
  const { angleDisplay } = useDisplaySettings();

  // Single qubit gates
  if (gate.numControls === 0 && gate.targetType.numTargets === 1) {
    const angle = gate.angle;
    // A rotation shows its angle: `R_z(\theta_1)`, `R_z(\frac{\pi}{4})`, ...
    const gateLabel =
      angle === undefined
        ? gate.targetType.latexName
        : `${gate.targetType.latexName}(${formatAngle(angle, angleDisplay)})`;
    return (
      <div className="gate-wrapper-single">
        {/* Both this box and the label geometry in QubitLabelDisplayUtils size
            rotations from `gateWidth`, so the two cannot drift. */}
        <div className="gate-box" style={{ width: `${gateWidth(gate, angleDisplay)}px` }}>
          <InlineMath math={gateLabel} />
        </div>
      </div>
    );
  }

  // Two-qubit gates (controlled or SWAP-type)
  if (gate.numControls === 1 || gate.targetType.numTargets === 2) {
    const qubit1 = gate.numControls === 1 ? gate.controls[0] : gate.targets[0];
    const qubit2 = gate.numControls === 1 ? gate.targets[0] : gate.targets[1];
    const minQubit = Math.min(qubit1, qubit2);
    const relPos1 = (qubit1 - minQubit) * lineHeight;
    const relPos2 = (qubit2 - minQubit) * lineHeight;
    const lineSpan = Math.abs(qubit1 - qubit2) * lineHeight;

    const renderGateSymbols = () => {
      switch (gate.targetType.name) {
        case 'X':
          return (
            <>
              <div className="cnot-control" style={{ top: `${relPos1}px` }}></div>
              <div className="cnot-target" style={{ top: `${relPos2}px` }}></div>
            </>
          );
        case 'Z': // CZ
          return (
            <>
              <div className="cnot-control" style={{ top: `${relPos1}px` }}></div>
              <div className="cnot-control" style={{ top: `${relPos2}px` }}></div>
            </>
          );
        case 'SWAP':
          return (
            <>
              <div className="swap-x" style={{ top: `${relPos1}px` }}></div>
              <div className="swap-x" style={{ top: `${relPos2}px` }}></div>
            </>
          );
        case 'iSWAP':
          return (
            <>
              <div className="swap-x" style={{ top: `${relPos1}px` }}></div>
              <div className="swap-x" style={{ top: `${relPos2}px` }}></div>
              <div className="iswap-label">
                <InlineMath math={'i'} />
              </div>
            </>
          );
        default:
          return null;
      }
    };

    return (
      <div className="gate-wrapper-double" style={{ height: `${lineSpan}px` }}>
        <div className="gate-line" style={{ height: `${lineSpan}px` }}></div>
        {renderGateSymbols()}
      </div>
    );
  }

  return null;
}
