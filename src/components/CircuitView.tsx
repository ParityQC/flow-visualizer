/**
 * handles the view of the GUI and feeds into CircuitBuilder. Label and Gate placement happens here.
 */
import { GateComponent } from './GateComponent';
import './CircuitView.css';
import { InlineMath } from './InlineMath';
import 'katex/dist/katex.min.css';
import { Gate } from '../models/Gates';
import { Circuit } from '../models/Circuit';
import {
  lineHeight,
  padding,
  qubitLabelWidth,
  labelLeftPadding,
  labelRightClearance,
  singleQubitGateWidth,
} from '../utils/LayoutConstants';
import { Fragment, useMemo, useState } from 'react';
import { TruncatedLabel } from '../utils/QubitLabelDisplay';
import {
  computeCircuitRenderingData,
  PositionedLabel,
  RenderConfig,
} from '../utils/QubitLabelDisplayUtils';
import { GatePreview } from './CircuitBuilder';
import { QubitContextMenu } from './QubitContextMenu';
import { getInitialState, useLabelVisibility } from '../utils/LabelVisibility';

/** The key to be used within `DataTransfer.setData` to signal that a gates is moved. */
export const mimeMoveGate = 'application/x-move-gate';
interface CircuitViewProps {
  circuit: Circuit;
  onGateContextMenu?: (_gate: Gate, _momentIndex: number) => void;
  gatePreview?: GatePreview | null;
}

interface QubitMenuState {
  qubitIndex: number;
  position: { x: number; y: number }; // menu appears at position
}

export function CircuitView({ circuit, onGateContextMenu, gatePreview }: CircuitViewProps) {
  const maxUsed = circuit.maxUsedQubitIndex();
  const baseline = 5;
  const numQubits = Math.max(baseline, maxUsed + 1);
  const numMoments = Math.max(Array.from(circuit.moments()).length + 3, 3);

  const [qubitMenu, setQubitMenu] = useState<QubitMenuState | null>(null);

  const { state, isLabelXVisible, isLabelZVisible } = useLabelVisibility();
  const columnWidth = state.columnWidth;
  // All labels start singleQubitGateWidth+labelLeftPadding from cellLeft. The
  // clip budget guarantees a label can never reach the next gate's column.
  const labelMaxWidth = Math.max(
    0,
    columnWidth - (singleQubitGateWidth + labelLeftPadding) - labelRightClearance
  );
  // Initial labels live in the qubit-name column; clip them to that width.
  const initialLabelMaxWidth = qubitLabelWidth - 20;

  const { initialLabels, labelChangesByMoment, momentOffsets } = useMemo(() => {
    const config: RenderConfig = {
      padding,
      lineHeight,
      momentWidth: columnWidth,
      qubitLabelWidth,
    };

    const result = computeCircuitRenderingData(circuit, config);

    const labelChangesByMoment = new Map<number, PositionedLabel[]>();
    for (const lc of result.labelChanges) {
      const arr = labelChangesByMoment.get(lc.momentIndex) ?? [];
      arr.push(lc);
      labelChangesByMoment.set(lc.momentIndex, arr);
    }

    return {
      initialLabels: result.initialLabels,
      labelChangesByMoment,
      momentOffsets: result.momentOffsets,
    };
  }, [circuit, columnWidth]);
  const previewGate = useMemo(() => {
    if (!gatePreview) return null;
    if (gatePreview.controlQubit === null) return null;

    if (gatePreview.targetType.numTargets === 2) {
      return new Gate({
        targetType: gatePreview.targetType,
        controls: [],
        targets: [gatePreview.targetQubit, gatePreview.controlQubit!],
      });
    } else {
      return new Gate({
        targetType: gatePreview.targetType,
        controls: [gatePreview.controlQubit],
        targets: [gatePreview.targetQubit],
      });
    }
  }, [gatePreview]);

  const totalOffset = useMemo(() => {
    let total = 0;
    momentOffsets.forEach((data) => {
      total = Math.max(total, data.cumulativeOffset + data.maxOffset);
    });
    return total;
  }, [momentOffsets]);

  const canvasWidth = padding + qubitLabelWidth + numMoments * columnWidth + totalOffset;
  const canvasHeight = padding * 2 + numQubits * lineHeight;

  const getGateContainerTop = (gate: Gate): number => {
    const allQubits = Array.from(gate.qubits());
    const minQubit = Math.min(...allQubits);

    return minQubit * lineHeight + 10;
  };

  const handleQubitRightClick = (e: React.MouseEvent, qubitIndex: number) => {
    e.preventDefault();
    setQubitMenu({
      qubitIndex,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const closeQubitMenu = () => {
    setQubitMenu(null);
  };

  return (
    <div className="circuit-box">
      <div
        className="circuit-canvas"
        style={{
          position: 'relative',
          height: `${canvasHeight}px`,
          width: `${canvasWidth}px`,
          minWidth: '100%',
        }}
      >
        <div className="circuit-grid">
          {Array.from({ length: numQubits }).map((_, qubitIndex) =>
            Array.from({ length: numMoments }).map((_, momentIndex) => {
              const offsetData = momentOffsets.get(momentIndex);
              const cumulativeOffset = offsetData?.cumulativeOffset || 0;
              return (
                <div
                  key={`grid-${qubitIndex}-${momentIndex}`}
                  className="circuit-cell"
                  style={{
                    top: `${padding + qubitIndex * lineHeight}px`,
                    left: `${padding + qubitLabelWidth + momentIndex * columnWidth + cumulativeOffset}px`,
                    width: `${columnWidth}px`,
                    height: `${lineHeight}px`,
                  }}
                />
              );
            })
          )}
        </div>
        <div className="gate-area">
          {initialLabels.map((position: PositionedLabel) => (
            <div
              key={`initial-label-${position.key}`}
              style={{
                position: 'absolute',
                top: `${position.top}px`,
                left: `15px`,
                zIndex: 5,
              }}
            >
              <TruncatedLabel labels={position.labels} maxWidth={initialLabelMaxWidth} />
            </div>
          ))}
          {Array.from(circuit.moments()).map((moment, momentIndex) => {
            const offsetData = momentOffsets.get(momentIndex);
            const gateOffsets = offsetData?.gateOffsets || new Map();
            const cumulativeOffset = offsetData?.cumulativeOffset || 0;

            const gateElements = Array.from(moment.gates()).map((gate, gateIndex) => {
              const gateKey = `gate-${momentIndex}-${gateIndex}`;
              const gateOffset = gateOffsets.get(gateKey) || 0;

              const handleDragStart: React.DragEventHandler<HTMLDivElement> = (e) => {
                e.dataTransfer.setData(mimeMoveGate, '1');
                e.dataTransfer.effectAllowed = 'move';
              };

              return (
                <div
                  key={gateKey}
                  style={{
                    position: 'absolute',
                    top: `${getGateContainerTop(gate)}px`,
                    left: `${padding + qubitLabelWidth + momentIndex * columnWidth + cumulativeOffset + gateOffset}px`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'grab',
                    userSelect: 'none',
                  }}
                  draggable
                  onDragStart={handleDragStart}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onGateContextMenu) onGateContextMenu(gate, momentIndex);
                  }}
                >
                  <GateComponent gate={gate} />
                </div>
              );
            });

            const labelElements = (labelChangesByMoment.get(momentIndex) ?? []).map((position) => (
              <div
                key={`label-${position.momentIndex}-${position.key}`}
                style={{
                  position: 'absolute',
                  top: `${position.top}px`,
                  left: `${position.left}px`, // correct positions already computed
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              >
                <TruncatedLabel labels={position.labels} maxWidth={labelMaxWidth} />
              </div>
            ));

            return (
              <Fragment key={`moment-${momentIndex}`}>
                {gateElements}
                {labelElements}
              </Fragment>
            );
          })}
          {gatePreview && previewGate && (
            <div
              style={{
                position: 'absolute',
                top: `${getGateContainerTop(previewGate)}px`,
                left: `${padding + qubitLabelWidth + gatePreview.momentIndex * columnWidth + (momentOffsets.get(gatePreview.momentIndex)?.cumulativeOffset || 0)}px`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: 0.5,
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <GateComponent gate={previewGate} />
            </div>
          )}
        </div>

        <div className="qubit-wires-area">
          {Array.from({ length: numQubits }).map((_, qubitIndex) => {
            return (
              <div
                key={qubitIndex}
                className="qubit-wire"
                style={{
                  height: `${lineHeight}px`,
                  top: `${padding + qubitIndex * lineHeight}px`,
                  left: `${qubitLabelWidth}px`,
                  right: `${padding}px`,
                  borderBottom: '2px solid blanchedalmond',
                }}
              >
                <span
                  className="qubit-label"
                  style={{
                    top: `${lineHeight / 2}px`,
                    width: `${qubitLabelWidth}px`,
                    left: `-${qubitLabelWidth * 0.75}px`,
                    cursor: 'context-menu',
                  }}
                  onContextMenu={(e) => handleQubitRightClick(e, qubitIndex)}
                >
                  <InlineMath math={`q_{${qubitIndex}}`} />
                  <span className="initial-state">
                    {getInitialState(isLabelXVisible(qubitIndex), isLabelZVisible(qubitIndex))}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        {qubitMenu && (
          <QubitContextMenu
            qubitIndex={qubitMenu.qubitIndex}
            position={qubitMenu.position}
            onClose={closeQubitMenu}
          />
        )}
      </div>
    </div>
  );
}
