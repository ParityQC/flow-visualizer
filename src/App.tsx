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
