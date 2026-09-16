// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDisplaySettings } from '../utils/DisplaySettings';
import { AngleDisplayMode } from '../models/Angle';
import { InlineMath } from './InlineMath';
import './SettingsMenu.css';

/** The three ways an angle can be shown, each with a worked example. */
const ANGLE_DISPLAY_OPTIONS: { mode: AngleDisplayMode; label: string; example: string }[] = [
  { mode: 'symbolic', label: 'Symbolic', example: 'R_z(\\theta_{1})' },
  { mode: 'pi', label: 'Multiple of \u03c0', example: 'R_z(\\frac{\\pi}{4})' },
  { mode: 'decimal', label: 'Decimal', example: 'R_z(0.7854)' },
];

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const {
    state,
    togglePhysX,
    togglePhysZ,
    momentWidth,
    setMomentWidth,
    angleDisplay,
    setAngleDisplay,
  } = useDisplaySettings();

  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Right-align the dropdown to the button so it doesn't clip off the
      // right viewport edge (the button sits in the top-bar right cluster).
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [isOpen]);

  return (
    <div className="settings-menu">
      <button
        ref={buttonRef}
        className="btn settings-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Display settings"
      >
        Settings
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className="menu-backdrop"
              onClick={() => setIsOpen(false)}
              onKeyDown={() => setIsOpen(false)}
              role="presentation"
            />
            <div
              className="settings-dropdown"
              style={{ top: dropdownPos.top, right: dropdownPos.right }}
            >
              <div className="settings-menu-header">Settings</div>
              <button className="dropdown-item" onClick={togglePhysX}>
                <span className="checkbox">{state.showPhysX ? '☑' : '☐'}</span>
                Show all X labels
              </button>
              <button className="dropdown-item" onClick={togglePhysZ}>
                <span className="checkbox">{state.showPhysZ ? '☑' : '☐'}</span>
                Show all Z labels
              </button>
              <div
                className="dropdown-item dropdown-radio-group"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <div className="dropdown-group-label">Rotation angles</div>
                {ANGLE_DISPLAY_OPTIONS.map(({ mode, label, example }) => (
                  <button
                    key={mode}
                    className="dropdown-item dropdown-radio"
                    onClick={() => setAngleDisplay(mode)}
                  >
                    <span className="checkbox">{angleDisplay === mode ? '\u25c9' : '\u25cb'}</span>
                    {label}
                    <span className="dropdown-radio-example">
                      <InlineMath math={example} />
                    </span>
                  </button>
                ))}
              </div>
              <div
                className="dropdown-item dropdown-slider"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <div className="slider-label">
                  <span>Moment width</span>
                  <span className="slider-value">{momentWidth}px</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={300}
                  step={1}
                  value={momentWidth}
                  onChange={(e) => setMomentWidth(Number(e.target.value))}
                />
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
