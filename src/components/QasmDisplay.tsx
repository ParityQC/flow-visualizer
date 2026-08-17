// ParityQC © 2026. See the LICENSE file in the top level directory for details.
/**
 * QASM panel: live-renders the OpenQASM3 of the current circuit, plus
 * copy/download/upload buttons. Surfaces clipboard outcomes and converter
 * failures in an inline auto-dismissing banner, and upload failures in a modal.
 */
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Circuit } from '../models/Circuit';
import { circuitToQasm } from '../utils/QasmConverter';
import { parseQasm } from '../utils/QasmParser';
import { Modal } from './Modal';
import './QasmDisplay.css';

interface QasmDisplayProps {
  circuit: Circuit;
  /** Called with the circuit read from an uploaded QASM file. */
  onCircuitLoad: (_circuit: Circuit) => void;
}

type Status = { kind: 'idle' } | { kind: 'copied' } | { kind: 'error'; message: string };

const STATUS_TIMEOUT_MS = 2000;

export function QasmDisplay({ circuit, onCircuitLoad }: QasmDisplayProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    URL.revokeObjectURL(element.href);
  };

  const uploadQasm = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again fires another change event.
    event.target.value = '';
    if (!file) return;

    try {
      onCircuitLoad(parseQasm(await file.text()));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    }
  };

  const displayed = conversionError ? `// ${conversionError}` : qasmCode;
  const banner =
    status.kind === 'copied'
      ? { className: 'qasm-banner qasm-banner-success', text: 'Copied to clipboard' }
      : status.kind === 'error'
        ? { className: 'qasm-banner qasm-banner-error', text: status.message }
        : null;

  return (
    <div className="qasm-display panel">
      <div className="panel-header">
        <p className="panel-label">QASM Code</p>
        <div className="qasm-actions">
          <button className="btn" onClick={copyToClipboard}>
            Copy to Clipboard
          </button>
          <button className="btn" onClick={downloadQasm}>
            Download QASM
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            Upload QASM
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".qasm,.txt,text/plain"
            className="qasm-file-input"
            onChange={uploadQasm}
          />
        </div>
      </div>
      {banner && <div className={banner.className}>{banner.text}</div>}
      <pre className="qasm-code">{displayed}</pre>

      {uploadError !== null && (
        <Modal className="qasm-error-modal" onClose={() => setUploadError(null)}>
          <h2>Could not read QASM file</h2>
          <p className="qasm-error-message">{uploadError}</p>
          <p>
            Only flat OpenQASM 3 circuits using the gates of the tool box can be imported. The
            circuit was left unchanged.
          </p>
        </Modal>
      )}
    </div>
  );
}
