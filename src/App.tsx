// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
import { CircuitBuilder } from './components/CircuitBuilder';
import { emptyCircuit } from './utils/exampleCircuits';
import { DisplaySettingsProvider } from './utils/DisplaySettings';

function App() {
  return (
    <div className="App">
      <DisplaySettingsProvider>
        <CircuitBuilder initialCircuit={emptyCircuit} />
      </DisplaySettingsProvider>
    </div>
  );
}

export default App;
