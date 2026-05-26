import { CircuitBuilder } from './components/CircuitBuilder';
import { emptyCircuit } from './utils/exampleCircuits';
import { LabelVisibilityProvider } from './utils/LabelVisibility';

function App() {
  return (
    <div className="App">
      <LabelVisibilityProvider>
        <CircuitBuilder initialCircuit={emptyCircuit} />
      </LabelVisibilityProvider>
    </div>
  );
}

export default App;
