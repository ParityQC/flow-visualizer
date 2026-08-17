// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * Presentational modal dialog: dimmed overlay, close button and escape key
 * handling. Use `ModalButton` when the dialog is opened by its own button.
 */
import React, { useEffect } from 'react';
import './HelpButton.css';

interface ModalProps {
  className: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ className, onClose, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="help-modal-overlay">
      <button className="help-modal-close-overlay" onClick={onClose} aria-label="Close dialog" />
      <div className={className}>
        <button className="help-modal-close" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
