/**
 * Handles the QASM window visuals.
 */
import { Circuit } from '../models/Circuit';
import { circuitToQasm } from '../utils/QasmConverter';

interface QasmDisplayProps {
  circuit: Circuit;
}

export function QasmDisplay({ circuit }: QasmDisplayProps) {
  const qasmCode = circuitToQasm(circuit);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(qasmCode)
      .then(() => alert('QASM copied to clipboard!'))
      .catch((err) => console.error('Failed to copy: ', err));
  };

  const downloadQasm = () => {
    const element = document.createElement('a');
    const file = new Blob([qasmCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'circuit.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="qasm-display">
      <div className="qasm-header">
        <h3>QASM Code</h3>
        <div className="qasm-actions">
          <button onClick={copyToClipboard}>Copy to Clipboard</button>
          <button onClick={downloadQasm}>Download QASM</button>
        </div>
      </div>
      <pre className="qasm-code">{qasmCode}</pre>
    </div>
  );
}
