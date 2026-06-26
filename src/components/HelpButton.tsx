/**
 * The "Help" modal and the corresponding button to access it.
 */
import React, { useEffect, useState } from 'react';
import './HelpButton.css';

export const HelpButton: React.FC = () => {
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
        Help
      </button>

      {isOpen && (
        <div className="help-modal-overlay">
          <button
            className="help-modal-close-overlay"
            onClick={() => setIsOpen(false)}
            aria-label="Close dialog"
          />
          <div className="help-modal">
            <button className="help-modal-close" onClick={() => setIsOpen(false)}>
              ✕
            </button>

            <h2>Help</h2>

            <div>
              <h3>Getting Started</h3>
              <p>
                To place a single qubit gate on the circuit, drag it from the toolbox on the left
                side, and drop the desired gate at the desired moment and qubit in the circuit.
              </p>
              <p>
                To place a double qubit gate, first drop the gate symbol on the desired location,
                this will be your target. Then place your control or your second target on a
                different qubit in the same moment.
              </p>
              <p>
                When placing a gate on top of another gate, the old gate and all subsequent elements
                of the circuit get pushed one moment to the right.
              </p>
              <p>
                To generate simplified QASM 3 Code from your circuit, either copy it to your
                clipboard or download a text document containing the code.
              </p>
              <h3>Features</h3>
              <p>To remove gates, right click on them.</p>
              <p>
                To choose a hardcoded Circuit, select one from the &quot;Load Example Circuit&quot;
                button located at the top left of the page.
              </p>
              <p>
                If more qubits are needed drop a gate below the last qubit and the gate is
                automatically assigned to the next qubit.
              </p>
              <p>
                To parallelize a Circuit, press the &quot;Compact Circuit&quot; button located at
                the bottom left of the page.
              </p>
              <p>
                To delete the current circuit, press the &quot;Delete Circuit&quot; button located
                at the bottom left of the page.
              </p>
              <p>
                To toggle the global Label Visibility of X and Z labels, choose from the &quot;Label
                Settings&quot; button at the bottom of the page.
              </p>
              <p>
                To toggle the Label Visibility of single qubits, right click on the desired qubit
                label (q1, q2, ...) and select if the X or Z label should be visible.
                <br />
                This corresponds to initializing the qubit in the |0{'>'} resp. |+{'>'} state.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpButton;
