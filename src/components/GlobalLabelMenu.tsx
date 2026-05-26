/**
 * Handles Global Label Menu: Global Label Visibility settings are set here.
 */
import { useState } from 'react';
import { useLabelVisibility } from '../utils/LabelVisibility';
import './GlobalLabelMenu.css';

export function GlobalLabelMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { state, togglePhysX, togglePhysZ } = useLabelVisibility();

  return (
    <div className="global-label-menu">
      <button
        className="global-label-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Label visibility settings"
      >
        Label Settings
      </button>

      {isOpen && (
        <>
          <div
            className="menu-backdrop"
            onClick={() => setIsOpen(false)}
            onKeyDown={() => setIsOpen(false)}
            role="presentation"
          />
          <div className="global-label-dropdown">
            <div className="dropdown-header">Global Label Visibility</div>
            <button className="dropdown-item" onClick={togglePhysX}>
              <span className="checkbox">{state.showPhysX ? '☑' : '☐'}</span>
              Show all X labels
            </button>
            <button className="dropdown-item" onClick={togglePhysZ}>
              <span className="checkbox">{state.showPhysZ ? '☑' : '☐'}</span>
              Show all Z labels
            </button>
          </div>
        </>
      )}
    </div>
  );
}
