// ParityQC © 2026. See the LICENSE file in the top level directory for details.
import React, { useState } from 'react';
import { Modal } from './Modal';
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

export default ModalButton;
