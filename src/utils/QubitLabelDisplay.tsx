/* eslint-disable react-refresh/only-export-components */
/**
 * Renders the X and Z Pauli labels for one qubit at one moment.
 * X labels are blue and bracketed; Z labels are red and plain.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Label, XZLabelPair, SinglePauli } from './labelTracking';
import { useLabelVisibility } from './LabelVisibility';
import './QubitLabelDisplay.css';

interface QubitLabelDisplayProps {
  labels: XZLabelPair;
}

const values = ['', 'i', '-', '-i'];

/** Plain-text rendering of one label, mirroring the visual (phase + ⟨X⟩ + Z, or `I`). */
function labelToText(label: Label): string {
  const xs = label.operators.filter((op) => op.type === 'X').map((op) => op.qubit);
  const zs = label.operators.filter((op) => op.type === 'Z').map((op) => op.qubit);
  let body = '';
  if (xs.length > 0) body += `⟨${xs.join(',')}⟩`;
  if (zs.length > 0) body += zs.join(',');
  if (body === '') body = 'I';
  return values[label.phase % 4] + body;
}

/** Full value of a label pair, used as the hover tooltip when a label is truncated. */
export function pairToTitle(labels: XZLabelPair): string {
  return `X: ${labelToText(labels.physX)}\nZ: ${labelToText(labels.physZ)}`;
}

export function QubitLabelDisplay({ labels }: QubitLabelDisplayProps) {
  const { state, isLabelXVisible, isLabelZVisible } = useLabelVisibility();

  const isOperatorVisible = (op: SinglePauli): boolean => {
    const qubitIndex = parseInt(op.qubit, 10);
    if (isNaN(qubitIndex)) return true;

    if (op.type === 'X') {
      return isLabelXVisible(qubitIndex);
    }
    if (op.type === 'Z') {
      return isLabelZVisible(qubitIndex);
    }
    return true;
  };

  const renderLabel = (label: Label, isVisible: boolean) => {
    const visibleOperators = label.operators.filter(isOperatorVisible);

    const xOperators = visibleOperators.filter((op: SinglePauli) => op.type === 'X');
    const zOperators = visibleOperators.filter((op: SinglePauli) => op.type === 'Z');

    const allFiltered = label.operators.length > 0 && visibleOperators.length === 0;

    return (
      <div className="label-row" style={{ visibility: isVisible ? 'visible' : 'hidden' }}>
        <span className="label-phase">{values[label.phase]}</span>
        {allFiltered ? (
          <span style={{ visibility: 'hidden' }}>I</span>
        ) : (
          <div className="label-tokens">
            {visibleOperators.length > 0 ? (
              <>
                {xOperators.length > 0 && (
                  <span className="label-token label-token-x">
                    ⟨
                    {xOperators.map((op: SinglePauli, i: number) => (
                      <span key={`x-${i}`}>
                        {op.qubit}
                        {i < xOperators.length - 1 ? ',' : ''}
                      </span>
                    ))}
                    ⟩
                  </span>
                )}
                {zOperators.map((op: SinglePauli, i: number) => (
                  <span key={`z-${i}`} className="label-token label-token-z">
                    {op.qubit}
                    {i < zOperators.length - 1 ? ',' : ''}
                  </span>
                ))}
              </>
            ) : (
              <span className="label-identity">I</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="qubit-label-display">
      {renderLabel(labels.physX, state.showPhysX)}
      {renderLabel(labels.physZ, state.showPhysZ)}
    </div>
  );
}

interface TruncatedLabelProps {
  labels: XZLabelPair;
  maxWidth: number;
}

/**
 * Wraps a QubitLabelDisplay in a fixed-width box that clips overflow. When the label
 * is wider than `maxWidth` it is visibly faded at the right edge and a tooltip shows
 * the full value. The clip width is chosen so a label can never reach the next gate,
 * so overlap is impossible regardless of label length or column width.
 */
export function TruncatedLabel({ labels, maxWidth }: TruncatedLabelProps) {
  const { state } = useLabelVisibility();
  const ref = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
    // Re-measure when content, budget, or visibility (which changes rendered width) changes.
  }, [labels, maxWidth, state]);

  return (
    <div
      ref={ref}
      className={`label-clip${truncated ? ' label-clip-truncated' : ''}`}
      style={{ maxWidth: `${maxWidth}px` }}
      title={truncated ? pairToTitle(labels) : undefined}
    >
      <QubitLabelDisplay labels={labels} />
    </div>
  );
}
