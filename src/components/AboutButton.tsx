// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
/**
 * The "About" modal and the corresponding button to access it.
 */
import React from 'react';
import { ModalButton } from './Modal';
import './AboutButton.css';

const SOURCE_URL = 'https://github.com/ParityQC/flow-visualizer/';
const LICENSE_URL = 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html';

export const AboutButton: React.FC = () => (
  <ModalButton buttonLabel="About" modalClassName="about-modal">
    <h2>About</h2>

    <p>
      Parity Flow Visualizer — a GUI for building Clifford+rotation quantum circuits and visualizing
      the parity flow formalism.
    </p>

    <p>Copyright © 2026 Parity Quantum Computing GmbH (ParityQC).</p>

    <p>
      This program is free software, licensed under version 2 of the{' '}
      <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
        GNU General Public License
      </a>{' '}
      or, at your option, any later version. It comes with ABSOLUTELY NO WARRANTY, and you are
      welcome to redistribute it under the conditions the license sets out.
    </p>

    <p>
      Source code:{' '}
      <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
        github.com/ParityQC/flow-visualizer
      </a>
    </p>
  </ModalButton>
);

export default AboutButton;
