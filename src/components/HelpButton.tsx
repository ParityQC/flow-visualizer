/**
 * Handles the User Guide. Basically an instruction manual.
 */
import React, { useEffect, useState } from 'react';

export const HelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          cursor: 'pointer',
          borderRadius: '4px',
          border: '1px solid #ccc',
          backgroundColor: '#f0f0f0',
          maxHeight: '20px',
          position: 'fixed',
          bottom: '30px',
          right: '20px',
        }}
      >
        Help
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close dialog"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'default',
            }}
          />
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                border: 'none',
                background: 'none',
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <h2>User Guide</h2>

            {/* Your guide content goes here */}
            <div>
              <h3>Getting Started</h3>
              <p>
                To place a single qubit gate on the circuit, drag it from the toolbox on the left
                side, and drop the desired gate at the desired moment and qubit in the circuit
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
              <p> To remove gates, right click on them. </p>
              <p>
                {' '}
                To choose a hardcoded Circuit, select one from the &quot;Load Circuit&quot; button
                located at the top left of the page.{' '}
              </p>
              <p>
                {' '}
                If more qubits are needed drop a gate below the last qubit and the gate is
                automatically assigned to the next qubit.{' '}
              </p>
              <p>
                {' '}
                To parallelize a Circuit, press the &quot;Compact Circuit&quot; button located at
                the bottom left of the page.{' '}
              </p>
              <p>
                {' '}
                To delete the current circuit, press the &quot;Delete Circuit&quot; button located
                at the bottom left of the page.{' '}
              </p>
              <p>
                {' '}
                To toggle the global Label Visibility of X and Z labels, choose from the &quot;Label
                Settings&quot; button at the bottom of the page.{' '}
              </p>
              <p>
                {' '}
                To toggle the Label Visibility of single qubits, right click on the desired qubit
                label (q1, q2, ...) and select if the X or Z label should be visible.
                <br /> This corresponds to initializing the qubit in the |0{'>'} resp. |+{'>'}{' '}
                state.{' '}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpButton;
