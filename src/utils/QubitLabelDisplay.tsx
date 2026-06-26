/**
 * Renders the X and Z Pauli labels for one qubit at one moment.
 * X labels are blue and bracketed; Z labels are red and plain.
 */
import { Label, XZLabelPair, SinglePauli } from './labelTracking';
import { useLabelVisibility } from './LabelVisibility';
import './QubitLabelDisplay.css';

interface QubitLabelDisplayProps {
  labels: XZLabelPair;
}

const values = ['', 'i', '-', '-i'];

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
