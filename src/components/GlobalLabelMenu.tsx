import { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLabelVisibility } from '../utils/LabelVisibility';
import './GlobalLabelMenu.css';

export function GlobalLabelMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { state, togglePhysX, togglePhysZ, momentWidth, setMomentWidth } = useLabelVisibility();

  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Right-align the dropdown to the button so it doesn't clip off the
      // right viewport edge (the button sits in the top-bar right cluster).
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [isOpen]);

  return (
    <div className="global-label-menu">
      <button
        ref={buttonRef}
        className="btn global-label-menu-button"
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
              className="global-label-dropdown"
              style={{ top: dropdownPos.top, right: dropdownPos.right }}
            >
              <div className="label-menu-header">Settings</div>
              <button className="dropdown-item" onClick={togglePhysX}>
                <span className="checkbox">{state.showPhysX ? '☑' : '☐'}</span>
                Show all X labels
              </button>
              <button className="dropdown-item" onClick={togglePhysZ}>
                <span className="checkbox">{state.showPhysZ ? '☑' : '☐'}</span>
                Show all Z labels
              </button>
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
