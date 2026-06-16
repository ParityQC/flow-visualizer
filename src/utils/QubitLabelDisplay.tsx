/**
 * Renders the X and Z Pauli labels for one qubit at one moment.
 * X labels are blue and bracketed; Z labels are red and plain.
 */
import { Label, XZLabelPair, SinglePauli } from './labelTracking';
import { useLabelVisibility } from './LabelVisibility';

interface QubitLabelDisplayProps {
  labels: XZLabelPair;
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
  borderRadius: '6px',
  fontFamily: 'monospace',
  alignItems: 'center',
};

const rowStyle = {
  display: 'flex',
  gap: '4px',
  alignItems: 'center',
  minHeight: '18px',
};
const tokenStyle = { fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 };
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
      <div
        style={{
          ...rowStyle,
          visibility: isVisible ? 'visible' : 'hidden',
        }}
      >
        {<span style={{ color: '#6b7280' }}>{values[label.phase]}</span>}
        {allFiltered ? (
          <span style={{ visibility: 'hidden' }}>I</span> // if filtered
        ) : (
          <>
            <div style={{ display: 'flex', gap: '2px' }}>
              {visibleOperators.length > 0 ? (
                <>
                  {xOperators.length > 0 && (
                    <span style={{ ...tokenStyle, color: '#2563eb' }}>
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
                    <span key={`z-${i}`} style={{ ...tokenStyle, color: '#dc2626' }}>
                      {op.qubit}
                      {i < zOperators.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </>
              ) : (
                <span style={{ color: '#888' }}>I</span>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={labelStyle}>
      {renderLabel(labels.physX, state.showPhysX)}
      {renderLabel(labels.physZ, state.showPhysZ)}
    </div>
  );
}
