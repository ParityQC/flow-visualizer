// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
/**
 * "Theoretical Background" modal: written explainer of the parity flow
 * formalism, label-update rules per gate, and how to read off
 * physical rotations from the labels.
 */
import React from 'react';
import FlowFormalism from '../assets/FlowFormalism.png';
import LabelUpdates from '../assets/LabelUpdates.png';
import CnotLabels from '../assets/CnotLabels.png';
import TwineQft from '../assets/TwineQft.png';
import { InlineMath } from './InlineMath';
import { ModalButton } from './Modal';
import { X_LABEL_COLOR, Z_LABEL_COLOR } from '../styles/katexColors';
import './MathHelp.css';

const xc = (s: string) => `\\textcolor{${X_LABEL_COLOR}}{${s}}`;
const zc = (s: string) => `\\textcolor{${Z_LABEL_COLOR}}{${s}}`;

export const TheoryHelp: React.FC = () => (
  <ModalButton buttonLabel="Theoretical Background" modalClassName="math-help-modal">
    <div>
      <h3 className="math-help-heading">Theoretical Background</h3>
      <h4 className="math-help-heading">Core Concept</h4>

      <p>
        The labels in the <strong> parity flow formalism</strong> track how quantum information
        evolves throughout a circuit. <br />
      </p>
      <p>
        This GUI is based on the following paper:{' '}
        <a href="https://link.aps.org/doi/10.1103/6xlb-l92j" target="_blank" rel="noreferrer">
          {' '}
          Parity Flow Formalism
        </a>
      </p>
      <p>
        The blue labels with the brackets <InlineMath math={xc('⟨i⟩')} /> denote the logical Pauli X
        Operator <InlineMath>X_i</InlineMath> and the red labels without brackets{' '}
        <InlineMath math={zc('i')} /> denote the logical Pauli Z Operator{' '}
        <InlineMath>Z_i</InlineMath>.
        <br />
        <InlineMath> X_1 </InlineMath> corresponds to <InlineMath math={xc('⟨1⟩')} />;{' '}
        <InlineMath> Z_1 </InlineMath> corresponds to <InlineMath math={zc('1')} />; {''}
        <InlineMath> Y_1 = i*X_1*Z_1</InlineMath> which corresponds to{' '}
        <InlineMath math={`i${xc('⟨1⟩')}${zc('1')}`} />.
      </p>
      <p>
        {' '}
        Clifford Gates map Pauli Eigenstates to Pauli Eigenstates. This gives the physical X or Z
        label of the ith qubit after the Clifford circuit C as <InlineMath math="C^\dagger X_i C" />{' '}
        resp. <InlineMath math="C^\dagger Z_i C" />.
        <br />
        The X label is denoted above the qubit wire, the Z label below.
        <br />
        The labels indicate the current &quot;frame&quot; of the quantum information stored in the
        qubit.
      </p>

      <h4 className="math-help-heading">Gate-Specific Label Updates</h4>
      <p>Different quantum gates update the qubit labels dynamically as they operate:</p>
      <ul className="math-help-gate-list">
        <div className="math-help-gate-row">
          <img className="math-help-gate-img" src={LabelUpdates} alt="single-qubit label updates" />
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
          <img className="math-help-gate-img" src={CnotLabels} alt="CNOT Label Updates" />
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
        These updates propagate dynamically as gates are applied, combining labels by the update
        rule of the gate, using the (anti-)commutation rules stated below.
      </p>
      <h4 className="math-help-heading">Interpretation of rotations</h4>
      <p>
        Refer to the image below for a visual representation of how physical rotations can be
        interpreted with the help of the labels. <br />
        Pauli rotations follow the OpenQASM convention,{' '}
        <InlineMath math="R_P (\alpha) = \exp(-iP \alpha/2)" />, so the angle shown on a gate is
        exactly the parameter written to the QASM panel. <br />
        For example for the first <InlineMath math="R_Z(2\gamma)" /> rotation, just read off the Z
        label <InlineMath math={zc('12')} /> which corresponds to <InlineMath math="Z_1Z_2" />{' '}
        giving the rotation <InlineMath math="\bar{R}_{Z_1Z_2}(2\gamma)" />. <br />
        Since the flow labels at the end of the circuit equal those at the beginning, the circuit
        below is equivalent to{' '}
        <InlineMath math="e^{-i\bar{Z}_1\bar{Z}_2\gamma}e^{-i\bar{X}_1\bar{X}_2\beta}e^{-i\bar{Y}_1\bar{Y}_2\alpha}" />
        .
        <br />
        Note that{' '}
        <InlineMath
          math={`X_1Z_1 = i^3Y_1 \\;\\&\\; X_2Z_2 = i^3Y_2 \\implies
                ${xc('⟨12⟩')}${zc('12')} \\mapsto X_1Z_1X_2Z_2 = i^3Y_1i^3Y_2 = -Y_1Y_2`}
        />
        . <br />
        Therefore, the physical rotation <InlineMath math="R_X(-2\alpha)" /> translates into the
        logical rotation <InlineMath math="\bar{R}_{-Y_1Y_2}(-2\alpha)=\bar{R}_{Y_1Y_2}(2\alpha)" />
        .
      </p>

      <p>
        {' '}
        To read off Y rotations combine X and Z labels on basis of <InlineMath math="Y=i*X*Z" />{' '}
        form. For example, an <InlineMath math="R_Y" /> rotation after the second CNOT on the first
        qubit <br /> would get interpreted as{' '}
        <InlineMath
          math={`i\\ast ${zc('12')} \\ast ${xc('\\langle 1\\rangle')}
                ${zc('2')} = i \\cdot (-1) ${xc('\\langle 1\\rangle')} ${zc('122')}
                = i^3 ${xc('\\langle 1 \\rangle')} ${zc('1')}`}
        />
        , i.e. <InlineMath math="\bar{R}_{-Y_1}" />.<br />
        When doing this pay attention to the anticommutation rules:{' '}
      </p>
      <ul>
        <li>
          <InlineMath>X_i</InlineMath> and <InlineMath>Z_i</InlineMath> anticommute:{' '}
          <InlineMath math={`${xc('⟨1⟩')}${zc('1')}`} />
          = <InlineMath math="-" />
          <InlineMath math={`${zc('1')}${xc('⟨1⟩')}`} />
        </li>
        <li>
          <InlineMath>X_i</InlineMath> and <InlineMath math="Z_j (i \neq j)" /> commute meaning no
          phase change: <InlineMath math={`${xc('⟨1⟩')}${zc('2')}`} /> ={' '}
          <InlineMath math={`${zc('2')}${xc('⟨1⟩')}`} />
        </li>
        <li>
          {' '}
          <InlineMath math="X_i" /> and <InlineMath math="X_j" /> (resp. <InlineMath math="Z_i" />{' '}
          and <InlineMath math="Z_j" />) commute:{' '}
          <InlineMath math={`${xc('⟨12⟩')}=${xc('⟨21⟩')}`} /> {'('}
          resp. <InlineMath math={`${zc('12')}=${zc('21')}`} />
          {')'}
        </li>
        <li>
          <InlineMath math="X_iX_i = I" /> and <InlineMath math="Z_iZ_i = I" /> cancel out e.g.{' '}
          <InlineMath math={`${xc('⟨112⟩')}=${xc('⟨2⟩')}`} /> and{' '}
          <InlineMath math={`${zc('112')}=${zc('2')}`} />
        </li>
      </ul>
      <img className="math-help-formalism-img" src={FlowFormalism} alt="Figure 1" />
      <p>
        Sometimes you do not want that certain Cliffords like <InlineMath math="S" /> are tracked.
        In that case just express them in terms of rotations (e.g. <InlineMath math="R_Z(\pi/2)" />{' '}
        in case of an <InlineMath math="S" /> gate).
      </p>
      <p className="math-help-figure-note">
        Note: the figure above is reproduced from the paper, which uses the opposite sign convention{' '}
        <InlineMath math="R_P(\alpha) = \exp(+iP\alpha/2)" />. Reading a logical rotation off the
        labels works the same either way — only the sign in the exponentials differs.
      </p>

      <h4 className="math-help-heading">The Parity Twine QFT</h4>
      <p>
        The flow formalism is a core step in the development of the parity twine quantum Fourier
        transform (Twine QFT) (
        <a href="https://arxiv.org/abs/2408.10907v2" target="_blank" rel="noreferrer">
          arXiv:2408.10907
        </a>
        ,{' '}
        <a href="https://arxiv.org/abs/2604.12465" target="_blank" rel="noreferrer">
          arXiv:2604.12465
        </a>
        ) and the{' '}
        <a
          href="https://quantum.cloud.ibm.com/functions?id=parityqc-parity-twine-optimizer"
          target="_blank"
          rel="noreferrer"
        >
          twine optimizer
        </a>
        . You will find the Twine QFT under <em>Load Example Circuit</em>:
      </p>
      <img className="math-help-twine-img" src={TwineQft} alt="Twine QFT example circuit" />
      <p>
        Note that the Hadamard gates are shown decomposed as{' '}
        <InlineMath math="R_z(\frac{\pi}{2})R_x(\frac{\pi}{2})R_z(\frac{\pi}{2})" />, and that the{' '}
        <InlineMath math="R_x(\frac{\pi}{2})" /> are not written as <InlineMath math="S" />{' '}
        gates, in order to exclude them from the tracking in the flow labels. This helps to see the
        pattern in the labels of the parity twine chains. In the implemented logical rotations this
        results — after the Hadamard gate — in the needed <InlineMath math="Z" />
        -rotations first on the single qubits <InlineMath math="Z_1, Z_2, \ldots" /> and afterwards
        all <InlineMath math="Z" />
        -rotations on two-body terms <InlineMath math="Z_0Z_1, Z_0Z_2, \ldots" /> (plus interwoven{' '}
        <InlineMath math="S" />
        -gates, plus the final layer of <InlineMath math="Z" />
        -rotations and a Hadamard).
      </p>
      <p>
        Note that the last four CNOT gates decode the qubits to nearly the identity: the trivial
        labels from the beginning are retrieved, but in reverse order. The Clifford circuit at the
        end of the logical circuit is therefore non-trivial, but it is just a permutation of the
        qubits. 
      </p>
    </div>
  </ModalButton>
);

export default TheoryHelp;
