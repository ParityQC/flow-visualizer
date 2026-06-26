/**
 * Handles the right click on a qubit, leading to a toggle between the label visibility of X or Z label
 */
import { useEffect } from 'react';
import './QubitContextMenu.css';
import { useLabelVisibility } from '../utils/LabelVisibility';

interface QubitContextMenuProps {
  qubitIndex: number;
  position: { x: number; y: number };
  onClose: () => void;
}

export function QubitContextMenu({ qubitIndex, position, onClose }: QubitContextMenuProps) {
  const { setAuxLabelX, setAuxLabelZ, isLabelXVisible, isLabelZVisible } = useLabelVisibility();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };
    // Delay to prevent immediate close on right-click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      className="qubit-context-menu"
      style={{
        top: position.y,
        left: position.x,
      }}
    >
      <div className="context-menu-header">
        Qubit q<sub>{qubitIndex}</sub>
      </div>

      <button
        className="context-menu-item"
        onClick={() => {
          if (isLabelZVisible(qubitIndex)) {
            setAuxLabelX(qubitIndex, !isLabelXVisible(qubitIndex));
          } else {
            // Currently |0⟩: transition to |+⟩
            setAuxLabelX(qubitIndex, false);
            setAuxLabelZ(qubitIndex, true);
          }
          onClose();
        }}
      >
        Toggle X<sub>{qubitIndex}</sub>
      </button>

      <button
        className="context-menu-item"
        onClick={() => {
          if (isLabelXVisible(qubitIndex)) {
            setAuxLabelZ(qubitIndex, !isLabelZVisible(qubitIndex));
          } else {
            // Currently |+⟩: transition to |0⟩
            setAuxLabelZ(qubitIndex, false);
            setAuxLabelX(qubitIndex, true);
          }
          onClose();
        }}
      >
        Toggle Z<sub>{qubitIndex}</sub>
      </button>
    </div>
  );
}
