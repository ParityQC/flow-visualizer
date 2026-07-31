// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import React, { useEffect, useState } from 'react';
import './HelpButton.css';

interface ModalButtonProps {
  buttonLabel: string;
  modalClassName: string;
  children: React.ReactNode;
}

export const ModalButton: React.FC<ModalButtonProps> = ({
  buttonLabel,
  modalClassName,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <>
      <button className="btn" onClick={() => setIsOpen(true)}>
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="help-modal-overlay">
          <button
            className="help-modal-close-overlay"
            onClick={() => setIsOpen(false)}
            aria-label="Close dialog"
          />
          <div className={modalClassName}>
            <button className="help-modal-close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
};

export default ModalButton;
