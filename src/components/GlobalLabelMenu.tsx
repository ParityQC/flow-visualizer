import { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLabelVisibility } from '../utils/LabelVisibility';
import { minColumnWidth, maxColumnWidth } from '../utils/LayoutConstants';
import './GlobalLabelMenu.css';

export function GlobalLabelMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { state, togglePhysX, togglePhysZ, setColumnWidth } = useLabelVisibility();

  useLayoutEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isOpen]);

  return (
    <div className="global-label-menu">
      <button
        ref={buttonRef}
        className="btn global-label-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Label visibility settings"
      >
        Label Settings
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
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <div className="label-menu-header">Global Label Visibility</div>
              <button className="dropdown-item" onClick={togglePhysX}>
                <span className="checkbox">{state.showPhysX ? '☑' : '☐'}</span>
                Show all X labels
              </button>
              <button className="dropdown-item" onClick={togglePhysZ}>
                <span className="checkbox">{state.showPhysZ ? '☑' : '☐'}</span>
                Show all Z labels
              </button>
              <div className="label-menu-header">Column width</div>
              <div className="dropdown-slider">
                <input
                  type="range"
                  min={minColumnWidth}
                  max={maxColumnWidth}
                  step={5}
                  value={state.columnWidth}
                  onChange={(e) => setColumnWidth(Number(e.target.value))}
                  aria-label="Gate column width"
                />
                <span className="slider-value">{state.columnWidth}px</span>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
