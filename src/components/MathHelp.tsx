/**
 * This file is responsible for the Math Background button. Here everything corresponding to understanding labels is explained with a link to the original paper.
 * How to read off rotations is also explained
 **/
import React, { useEffect, useState } from 'react';
import FlowFormalism from '../assets/FlowFormalism.png';
import LabelUpdates from '../assets/LabelUpdates.png';
import CnotLabels from '../assets/CnotLabels.png';
import { InlineMath } from 'react-katex';

export const MathHelp: React.FC = () => {
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
          bottom: '60px',
          right: '20px',
        }}
      >
        Math Background
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
              maxWidth: '1800px',
              maxHeight: '90vh',
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

            <div>
              <h3 style={{ textAlign: 'center' }}>Math Background</h3>
              <h4 style={{ textAlign: 'center' }}>Core Concept</h4>

              <p>
                The labels in the <strong> parity flow formalism</strong> track how quantum
                information evolves throughout a circuit. <br />
              </p>
              <p>
                This GUI is based on the following paper:{' '}
                <a
                  href="https://link.aps.org/doi/10.1103/6xlb-l92j"
                  target="_blank"
                  rel="noreferrer"
                >
                  {' '}
                  Parity Flow Formalism
                </a>
              </p>
              <p>
                The blue labels with the brackets <InlineMath math="\color{#2563eb}{⟨i⟩}" /> denote
                the logical Pauli X Operator <InlineMath>X_i</InlineMath> and the red labels without
                brackets <InlineMath math="\color{#dc2626}{i}" /> denote the logical Pauli Z
                Operator <InlineMath>Z_i</InlineMath>.
                <br />
                <InlineMath> X_1 </InlineMath> corresponds to{' '}
                <InlineMath math="\color{#2563eb}{⟨1⟩}" />; <InlineMath> Z_1 </InlineMath>{' '}
                corresponds to <InlineMath math="\color{#dc2626}{1}" />; {''}
                <InlineMath> Y_1 = i*X_1*Z_1</InlineMath> which corresponds to{' '}
                <InlineMath math="i\color{#2563eb}{⟨1⟩}\color{#dc2626}{1}" />.
              </p>
              <p>
                {' '}
                Clifford Gates map Pauli Eigenstates to Pauli Eigenstates. This gives the physical X
                or Z label of the ith qubit after the Clifford circuit C as{' '}
                <InlineMath math="C^\dagger X_i C" /> resp. <InlineMath math="C^\dagger Z_i C" />.
                <br />
                The X label is denoted above the qubit wire, the Z label below.
                <br />
                The labels indicate the current &quot;frame&quot; of the quantum information stored
                in the qubit.
              </p>

              <h4 style={{ textAlign: 'center' }}>Gate-Specific Label Updates</h4>
              <p>Different quantum gates update the qubit labels dynamically as they operate:</p>
              <ul style={{ display: 'inline-block', textAlign: 'left' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    margin: '0 auto 20px auto',
                  }}
                >
                  <img
                    style={{
                      width: '15%',
                      height: 'auto',
                      margin: '0 auto',
                    }}
                    src={LabelUpdates}
                    alt="single-qubit label updates"
                  />
                  <p>
                    {' '}
                    <InlineMath math="H^\dagger X_1H = Z_1" /> <br />
                    <InlineMath math="H^\dagger Z_1H=X_1" />
                    <br />
                    <br />
                    <br />
                    <InlineMath math="S^\dagger X_1S = -iX_1Z_1" />
                    <br />
                    <InlineMath math="S^\dagger Z_1S=Z_1" />
                    <br />
                    <br />
                    <br />
                    <InlineMath math="Z^\dagger X_1Z = -X_1" />
                    <br />
                    <InlineMath math="Z^\dagger Z_1Z=Z_1" />
                  </p>
                  <img
                    style={{
                      width: '15%',
                      height: 'auto',

                      margin: '0 auto',
                    }}
                    src={CnotLabels}
                    alt="CNOT Label Updates"
                  />
                  <p>
                    {' '}
                    <InlineMath math="CNOT^\dagger X_1CNOT = X_1" /> <br />
                    <InlineMath math="CNOT^\dagger Z_1CNOT=Z_1Z_2" />
                    <br />
                    <br />
                    <br />
                    <br />
                    <InlineMath math="CNOT^\dagger X_2CNOT = X_1X_2" />
                    <br />
                    <InlineMath math="CNOT^\dagger Z_2CNOT=Z_2" />
                  </p>
                </div>
                <br />
              </ul>
              <p>
                These updates propagate dynamically as gates are applied, combining labels by the
                update rule of the gate, using the (anti-)commutation rules stated below.
              </p>
              <p>
                <h4 style={{ textAlign: 'center' }}>Interpretation of rotations</h4> Refer to the
                image below for a visual representation of how physical rotations can be interpreted
                with the help of the labels. <br />
                The Pauli Rotations below are defined as{' '}
                <InlineMath math="R_P (\alpha) = \exp(iP \alpha/2)" />. <br />
                For example for the first <InlineMath math="R_Z(2\gamma)" /> rotation, just read off
                the Z label <InlineMath math="\color{#dc2626}{12}" /> which corresponds to{' '}
                <InlineMath math="Z_1Z_2" /> giving the rotation{' '}
                <InlineMath math="\bar{R}_{Z_1Z_2}(2\gamma)" />. <br />
                Since the flow labels at the end of the circuit equal those at the beginning, the
                circuit below is equivalent to{' '}
                <InlineMath math="e^{i\bar{Z}_1\bar{Z}_2\gamma}e^{i\bar{X}_1\bar{X}_2\beta}e^{i\bar{Y}_1\bar{Y}_2\alpha}" />
                .
                <br />
                Note that{' '}
                <InlineMath
                  math="X_1Z_1 = i^3Y_1 \;\&\; X_2Z_2 = i^3Y_2 \implies 
                {\color{#2563eb}{⟨12⟩}}{\color{#dc2626}{12}} \mapsto X_1Z_1X_2Z_2 = i^3Y_1i^3Y_2 = -Y_1Y_2 "
                />
                . <br />
                Therefore, the physical rotation <InlineMath math="R_X(-2\alpha)" /> translates into
                the logical rotation{' '}
                <InlineMath math="\bar{R}_{-Y_1Y_2}(-2\alpha)=\bar{R}_{Y_1Y_2}(2\alpha)" />.
              </p>

              <p>
                {' '}
                To read off Y rotations combine X and Z labels on basis of{' '}
                <InlineMath math="Y=i*X*Z" /> form. For example, an <InlineMath math="R_Y" />{' '}
                rotation after the second CNOT on the first qubit <br /> would get interpreted as{' '}
                <InlineMath
                  math="i\ast {\color{#dc2626}{12}} \ast {\color{#2563eb}{\langle 1\rangle}} 
                {\color{#dc2626}{2}} = i \cdot (-1) {\color{#2563eb}{\langle 1\rangle}} {\color{#dc2626}{122}} 
                = i^3 {\color{#2563eb}{\langle 1 \rangle}} {\color{#dc2626}{1}}"
                />
                , i.e. <InlineMath math="\bar{R}_{-Y_1}" />.<br />
                When doing this pay attention to the anticommutation rules:{' '}
              </p>
              <ul>
                <li>
                  <InlineMath>X_i</InlineMath> and <InlineMath>Z_i</InlineMath> anticommute:{' '}
                  <InlineMath math="\color{#2563eb}{⟨1⟩}\color{#dc2626}{1}" />
                  = <InlineMath math="-" />
                  <InlineMath math="\color{#dc2626}{1}\color{#2563eb}{⟨1⟩}" />
                </li>
                <li>
                  <InlineMath>X_i</InlineMath> and <InlineMath math="Z_j (i \neq j)" /> commute
                  meaning no phase change:{' '}
                  <InlineMath math="{\color{#2563eb}⟨1⟩}\color{#dc2626}{2}" /> ={' '}
                  <InlineMath math="\color{#dc2626}{2}\color{#2563eb}{⟨1⟩}" />
                </li>
                <li>
                  {' '}
                  <InlineMath math="X_i" /> and <InlineMath math="X_j" /> (resp.{' '}
                  <InlineMath math="Z_i" /> and <InlineMath math="Z_j" />) commute:{' '}
                  <InlineMath math="{\color{#2563eb}⟨12⟩}=\color{#2563eb}{⟨21⟩}" /> {'('}resp.{' '}
                  <InlineMath math="{\color{#dc2626}12}=\color{#dc2626}{21}" />
                  {')'}
                </li>
                <li>
                  <InlineMath math="X_iX_i = I" /> and <InlineMath math="Z_iZ_i = I" /> cancel out
                  e.g. <InlineMath math="{\color{#2563eb}⟨112⟩}=\color{#2563eb}{⟨2⟩}" /> and{' '}
                  <InlineMath math="{\color{#dc2626}112}=\color{#dc2626}{2}" />
                </li>
              </ul>
              <img
                style={{
                  width: '50%',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                }}
                src={FlowFormalism}
                alt="Figure 1"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MathHelp;
