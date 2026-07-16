/**
 * Renders the X and Z Pauli labels for one qubit at one moment.
 * X labels are blue and bracketed; Z labels are red and plain.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Label, XZLabelPair, SinglePauli } from './labelTracking';
import { useDisplaySettings } from './DisplaySettings';
import './QubitLabelDisplay.css';

interface QubitLabelDisplayProps {
  labels: XZLabelPair;
}

const values = ['', 'i', '-', '-i'];

export function QubitLabelDisplay({ labels }: QubitLabelDisplayProps) {
  const { state, isLabelXVisible, isLabelZVisible } = useDisplaySettings();

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

interface FadingLabelProps {
  labels: XZLabelPair;
  maxWidth: number;
}

/**
 * Wraps a label so it fades out at the right edge before reaching the next gate.
 * The fade only kicks in when the label is actually wider than the space available
 * before the next gate; shorter labels render in full. Hovering always reveals a
 * tooltip with the full, un-faded label.
 */
export function FadingLabel({ labels, maxWidth }: FadingLabelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setOverflowing(el.scrollWidth > maxWidth + 1);
  }, [labels, maxWidth]);

  return (
    <div className="fading-label">
      <div
        className={overflowing ? 'label-fade label-fade-active' : 'label-fade'}
        style={overflowing ? { maxWidth: `${maxWidth}px` } : undefined}
      >
        <div className="label-fade-content" ref={contentRef}>
          <QubitLabelDisplay labels={labels} />
        </div>
      </div>
      <div className="label-tooltip">
        <QubitLabelDisplay labels={labels} />
      </div>
    </div>
  );
}
