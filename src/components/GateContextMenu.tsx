// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * Right-click menu for a gate: edit a rotation's angle, or delete the gate.
 * Right-clicking used to delete outright, but a left click is already spoken for
 * by two-step placement of multi-qubit gates, so the delete moved in here
 * alongside the angle fields -- mirroring the qubit right-click menu.
 */
import { useEffect, useRef, useState } from 'react';
import './QubitContextMenu.css';
import './GateContextMenu.css';
import { Gate } from '../models/Gates';
import { Angle, formatAngleExpression } from '../models/Angle';
import { parseAngleExpression } from '../utils/angleExpression';
import { InlineMath } from './InlineMath';

interface GateContextMenuProps {
  gate: Gate;
  position: { x: number; y: number };
  /** How many gates in the circuit share this gate's angle symbol. */
  boundGateCount: number;
  onAngleChange: (_angle: Angle) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function GateContextMenu({
  gate,
  position,
  boundGateCount,
  onAngleChange,
  onDelete,
  onClose,
}: GateContextMenuProps) {
  const angle = gate.angle;

  const symbolRef = useRef<HTMLInputElement>(null);
  const [symbol, setSymbol] = useState(angle?.symbol ?? '');
  const [valueText, setValueText] = useState(
    angle?.value === null || angle === undefined ? '' : formatAngleExpression(angle.value)
  );

  // Focus the first field on open. Done here rather than with `autoFocus`,
  // which jsx-a11y disallows.
  useEffect(() => {
    symbolRef.current?.focus();
    symbolRef.current?.select();
  }, []);

  // Close on Escape, discarding whatever is half-typed.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside. Delayed so the right-click that opened the menu
  // does not immediately close it again.
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  const symbolValid = Angle.isValidSymbol(symbol);
  const parsedValue = parseValue(valueText.trim());
  const valueValid = parsedValue !== 'invalid';

  const commit = () => {
    if (!symbolValid || !valueValid) return;
    const next = new Angle(symbol, parsedValue);
    if (angle !== undefined && next.equals(angle)) return;
    onAngleChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
      onClose();
    }
  };

  return (
    <div
      className="qubit-context-menu gate-context-menu"
      style={{ top: position.y, left: position.x }}
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div className="context-menu-header">
        <InlineMath math={gate.targetType.latexName} /> on {describeQubits(gate)}
      </div>

      {angle !== undefined && (
        <div className="gate-angle-editor">
          <label className="gate-angle-field">
            <span className="gate-angle-label">Symbol</span>
            <input
              type="text"
              className={`gate-angle-input ${symbolValid ? '' : 'gate-angle-input-invalid'}`}
              ref={symbolRef}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
            />
          </label>

          <label className="gate-angle-field">
            <span className="gate-angle-label">Value</span>
            <input
              type="text"
              className={`gate-angle-input ${valueValid ? '' : 'gate-angle-input-invalid'}`}
              value={valueText}
              placeholder="symbolic"
              onChange={(e) => setValueText(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
            />
          </label>

          <div
            className={`gate-angle-hint ${symbolValid && valueValid ? '' : 'gate-angle-hint-invalid'}`}
          >
            {hintFor(symbolValid, parsedValue, boundGateCount)}
          </div>
        </div>
      )}

      <button className="context-menu-item context-menu-item-danger" onClick={onDelete}>
        Delete gate
      </button>
    </div>
  );
}

/** Names every qubit the gate acts on, control included: "qubits 0, 2". */
function describeQubits(gate: Gate): string {
  const qubits = [...gate.qubits()];
  return `${qubits.length === 1 ? 'qubit' : 'qubits'} ${qubits.join(', ')}`;
}

/** An empty field means symbolic, so it parses to `null` rather than failing. */
function parseValue(text: string): number | null | 'invalid' {
  if (text === '') return null;
  try {
    return parseAngleExpression(text);
  } catch {
    return 'invalid';
  }
}

function hintFor(
  symbolValid: boolean,
  parsedValue: number | null | 'invalid',
  boundGateCount: number
): string {
  if (!symbolValid) {
    return 'Symbols: letters, digits and underscore; no leading digit.';
  }
  if (parsedValue === 'invalid') {
    return 'Try pi/4, -pi/2, 3*pi/4 or 0.7854.';
  }
  if (parsedValue !== null) {
    // Editing a shared symbol is action at a distance, so say so up front.
    const shared = boundGateCount > 1 ? ` · shared by ${boundGateCount} gates` : '';
    return `= ${parsedValue.toFixed(6)}${shared}`;
  }
  return boundGateCount > 1
    ? `Shared by ${boundGateCount} gates.`
    : 'Leave empty to stay symbolic.';
}
