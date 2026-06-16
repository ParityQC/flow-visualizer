/**
 * "Math Background" modal: written explainer of the parity flow
 * formalism, label-update rules per gate, and how to read off
 * physical rotations from the labels.
 */
import React, { useEffect, useState } from 'react';
import FlowFormalism from '../assets/FlowFormalism.png';
import LabelUpdates from '../assets/LabelUpdates.png';
import CnotLabels from '../assets/CnotLabels.png';
import { InlineMath } from './InlineMath';
import './HelpButton.css';
import './MathHelp.css';

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
      <button className="math-help-trigger" onClick={() => setIsOpen(true)}>
        Math Background
      </button>

      {isOpen && (
        <div className="help-modal-overlay">
          <button
            className="help-modal-close-overlay"
            onClick={() => setIsOpen(false)}
            aria-label="Close dialog"
          />
          <div className="math-help-modal">
            <button className="help-modal-close" onClick={() => setIsOpen(false)}>
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
                The blue labels with the brackets <InlineMath math="\textcolor{#2563eb}{⟨i⟩}" /> denote
                the logical Pauli X Operator <InlineMath>X_i</InlineMath> and the red labels without
                brackets <InlineMath math="\textcolor{#dc2626}{i}" /> denote the logical Pauli Z
                Operator <InlineMath>Z_i</InlineMath>.
                <br />
                <InlineMath> X_1 </InlineMath> corresponds to{' '}
                <InlineMath math="\textcolor{#2563eb}{⟨1⟩}" />; <InlineMath> Z_1 </InlineMath>{' '}
                corresponds to <InlineMath math="\textcolor{#dc2626}{1}" />; {''}
                <InlineMath> Y_1 = i*X_1*Z_1</InlineMath> which corresponds to{' '}
                <InlineMath math="i\textcolor{#2563eb}{⟨1⟩}\textcolor{#dc2626}{1}" />.
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
                <div className="math-help-gate-row">
                  <img
                    className="math-help-gate-img"
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
                    className="math-help-gate-img"
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
              <h4 style={{ textAlign: 'center' }}>Interpretation of rotations</h4>
              <p>
                Refer to the image below for a visual representation of how physical rotations can
                be interpreted with the help of the labels. <br />
                The Pauli Rotations below are defined as{' '}
                <InlineMath math="R_P (\alpha) = \exp(iP \alpha/2)" />. <br />
                For example for the first <InlineMath math="R_Z(2\gamma)" /> rotation, just read off
                the Z label <InlineMath math="\textcolor{#dc2626}{12}" /> which corresponds to{' '}
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
                {\textcolor{#2563eb}{⟨12⟩}}{\textcolor{#dc2626}{12}} \mapsto X_1Z_1X_2Z_2 = i^3Y_1i^3Y_2 = -Y_1Y_2 "
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
                  math="i\ast {\textcolor{#dc2626}{12}} \ast {\textcolor{#2563eb}{\langle 1\rangle}}
                {\textcolor{#dc2626}{2}} = i \cdot (-1) {\textcolor{#2563eb}{\langle 1\rangle}} {\textcolor{#dc2626}{122}}
                = i^3 {\textcolor{#2563eb}{\langle 1 \rangle}} {\textcolor{#dc2626}{1}}"
                />
                , i.e. <InlineMath math="\bar{R}_{-Y_1}" />.<br />
                When doing this pay attention to the anticommutation rules:{' '}
              </p>
              <ul>
                <li>
                  <InlineMath>X_i</InlineMath> and <InlineMath>Z_i</InlineMath> anticommute:{' '}
                  <InlineMath math="\textcolor{#2563eb}{⟨1⟩}\textcolor{#dc2626}{1}" />
                  = <InlineMath math="-" />
                  <InlineMath math="\textcolor{#dc2626}{1}\textcolor{#2563eb}{⟨1⟩}" />
                </li>
                <li>
                  <InlineMath>X_i</InlineMath> and <InlineMath math="Z_j (i \neq j)" /> commute
                  meaning no phase change:{' '}
                  <InlineMath math="{\textcolor{#2563eb}⟨1⟩}\textcolor{#dc2626}{2}" /> ={' '}
                  <InlineMath math="\textcolor{#dc2626}{2}\textcolor{#2563eb}{⟨1⟩}" />
                </li>
                <li>
                  {' '}
                  <InlineMath math="X_i" /> and <InlineMath math="X_j" /> (resp.{' '}
                  <InlineMath math="Z_i" /> and <InlineMath math="Z_j" />) commute:{' '}
                  <InlineMath math="{\textcolor{#2563eb}⟨12⟩}=\textcolor{#2563eb}{⟨21⟩}" /> {'('}resp.{' '}
                  <InlineMath math="{\textcolor{#dc2626}12}=\textcolor{#dc2626}{21}" />
                  {')'}
                </li>
                <li>
                  <InlineMath math="X_iX_i = I" /> and <InlineMath math="Z_iZ_i = I" /> cancel out
                  e.g. <InlineMath math="{\textcolor{#2563eb}⟨112⟩}=\textcolor{#2563eb}{⟨2⟩}" /> and{' '}
                  <InlineMath math="{\textcolor{#dc2626}112}=\textcolor{#dc2626}{2}" />
                </li>
              </ul>
              <img
                className="math-help-formalism-img"
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
