// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
/**
 * Modal dialog: dimmed overlay, close button and escape key handling.
 *
 * `Modal` is controlled by its parent, for dialogs that are opened
 * programmatically. `ModalButton` bundles it with its own trigger button, for
 * dialogs that are only ever opened by clicking that button.
 */
import React, { useEffect, useState } from 'react';
import './Modal.css';

interface ModalProps {
  /** Class of the dialog panel, sizing it on top of `.modal-panel`. */
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
    <div className="modal-overlay">
      <button className="modal-close-overlay" onClick={onClose} aria-label="Close dialog" />
      <div className={`modal-panel ${className}`}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
};

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

  return (
    <>
      <button className="btn" onClick={() => setIsOpen(true)}>
        {buttonLabel}
      </button>

      {isOpen && (
        <Modal className={modalClassName} onClose={() => setIsOpen(false)}>
          {children}
        </Modal>
      )}
    </>
  );
};
