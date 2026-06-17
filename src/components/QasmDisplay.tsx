/**
 * QASM panel: live-renders the OpenQASM3 of the current circuit, plus
 * copy/download buttons. Surfaces clipboard outcomes and converter failures in
 * an inline auto-dismissing banner.
 */
import { useEffect, useState } from 'react';
import { Circuit } from '../models/Circuit';
import { circuitToQasm } from '../utils/QasmConverter';
import './QasmDisplay.css';

interface QasmDisplayProps {
  circuit: Circuit;
}

type Status = { kind: 'idle' } | { kind: 'copied' } | { kind: 'error'; message: string };

const STATUS_TIMEOUT_MS = 2000;

export function QasmDisplay({ circuit }: QasmDisplayProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  let qasmCode = '';
  let conversionError: string | null = null;
  try {
    qasmCode = circuitToQasm(circuit);
  } catch (err) {
    conversionError = err instanceof Error ? err.message : String(err);
  }

  useEffect(() => {
    if (status.kind === 'idle') return;
    const t = setTimeout(() => setStatus({ kind: 'idle' }), STATUS_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [status]);

  const copyToClipboard = () => {
    if (conversionError) {
      setStatus({ kind: 'error', message: conversionError });
      return;
    }
    navigator.clipboard
      .writeText(qasmCode)
      .then(() => setStatus({ kind: 'copied' }))
      .catch((err) =>
        setStatus({ kind: 'error', message: err?.message ?? 'Clipboard write failed' })
      );
  };

  const downloadQasm = () => {
    if (conversionError) {
      setStatus({ kind: 'error', message: conversionError });
      return;
    }
    const element = document.createElement('a');
    const file = new Blob([qasmCode], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'circuit.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const displayed = conversionError ? `// ${conversionError}` : qasmCode;
  const banner =
    status.kind === 'copied'
      ? { className: 'qasm-banner qasm-banner-success', text: 'Copied to clipboard' }
      : status.kind === 'error'
        ? { className: 'qasm-banner qasm-banner-error', text: status.message }
        : null;

  return (
    <div className="qasm-display">
      <div className="qasm-header">
        <h3>QASM Code</h3>
        <div className="qasm-actions">
          <button className="btn" onClick={copyToClipboard}>Copy to Clipboard</button>
          <button className="btn" onClick={downloadQasm}>Download QASM</button>
        </div>
      </div>
      {banner && <div className={banner.className}>{banner.text}</div>}
      <pre className="qasm-code">{displayed}</pre>
    </div>
  );
}
