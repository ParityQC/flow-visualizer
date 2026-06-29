/**
 * Returns the xz coordinates of where the labels should be positioned and offsets if 2-qubit gates overlap
 */
import { Circuit } from '../models/Circuit';
import { XZLabelPair, LabelTracker } from './labelTracking';
import {
  qubitLabelWidth,
  labelLeftPadding,
  labelRightClearance,
  singleQubitGateWidth,
  labelTopOffset,
  gateOverlapOffset,
  iswapGateOverlapOffset,
} from './LayoutConstants';

export interface PositionedLabel {
  key: string;
  qubitIndex: number;
  momentIndex: number;
  top: number;
  left: number;
  maxWidth?: number; // per-label clip budget; undefined for initial labels (CircuitView uses its own budget)
  labels: XZLabelPair;
}

export interface RenderConfig {
  padding: number;
  lineHeight: number;
  momentWidth: number;
  qubitLabelWidth: number;
}

export interface MomentOffsetData {
  gateOffsets: Map<string, number>; // offset for each gate within the moment
  maxOffset: number; // max offset in this moment (rightmost CNOT)
  cumulativeOffset: number; // sum of all max offsets from previous moments -> gets carried to subsequent moments
}

/**
 * Computes the overlap offsets for 2 qubit gates in each moment.
 * When multiple 2qubit gates share qubits in the same moment, they get staggered.
 * Returns per-gate offsets, max offset per moment, and cumulative offsets.
 * larger offset for i swap, since the i-box size has to be included
 */
export function computeMomentOffsets(circuit: Circuit): Map<number, MomentOffsetData> {
  const momentOffsets = new Map<number, MomentOffsetData>();
  let cumulativeOffset = 0;

  Array.from(circuit.moments()).forEach((moment, momentIndex) => {
    const qubitsUsed = new Map<number, number>();
    const gateOffsets = new Map<string, number>();
    let maxOffsetInMoment = 0;

    Array.from(moment.gates()).forEach((gate, gateIndex) => {
      const gateKey = `gate-${momentIndex}-${gateIndex}`;

      let thisGateOccupancy = 0;

      if (gate.numQubits === 2) {
        const qubits = Array.from(gate.qubits());
        const minQ = Math.min(...qubits);
        const maxQ = Math.max(...qubits);

        const qubitsPerGate = Array.from({ length: maxQ - minQ + 1 }, (_, i) => minQ + i);

        let maxOcc = 0;
        for (const qubit of qubitsPerGate) {
          maxOcc = Math.max(maxOcc, qubitsUsed.get(qubit) || 0);
        }
        thisGateOccupancy = maxOcc;

        for (const qubit of qubitsPerGate) {
          qubitsUsed.set(qubit, thisGateOccupancy + 1);
        }
      }

      const offsetPx =
        gate.targetType.name === 'iSWAP'
          ? thisGateOccupancy * iswapGateOverlapOffset
          : thisGateOccupancy * gateOverlapOffset;
      gateOffsets.set(gateKey, offsetPx);
      if (thisGateOccupancy > 1) {
        maxOffsetInMoment = Math.max(maxOffsetInMoment, offsetPx);
      }
    });

    momentOffsets.set(momentIndex, {
      gateOffsets,
      maxOffset: maxOffsetInMoment,
      cumulativeOffset,
    });

    // Add the max offset from this moment to the cumulative for subsequent moments
    cumulativeOffset += maxOffsetInMoment;
  });

  return momentOffsets;
}

export function computeCircuitRenderingData(
  circuit: Circuit,
  config: RenderConfig
): {
  tracker: LabelTracker;
  initialLabels: PositionedLabel[];
  labelChanges: PositionedLabel[];
  numQubits: number;
  momentOffsets: Map<number, MomentOffsetData>;
} {
  const tracker = new LabelTracker(circuit);
  const numQubits = circuit.maxUsedQubitIndex() + 1;
  const initialTracker = new LabelTracker().initializeFromCircuit(circuit);
  const initialLabels = computeInitialLabelPos(initialTracker, config);
  const momentOffsets = computeMomentOffsets(circuit);
  const labelChanges = computeLabelChangePositions(tracker, config, circuit, momentOffsets);

  return {
    tracker,
    initialLabels,
    labelChanges,
    numQubits,
    momentOffsets,
  };
}

export function computeInitialLabelPos(
  tracker: LabelTracker,
  config: RenderConfig
): PositionedLabel[] {
  const { padding, lineHeight } = config;
  const positions: PositionedLabel[] = [];

  const initialLabelsmap = tracker.getLabelsAtMomentBeforeGate(0);

  if (!initialLabelsmap) return positions;

  for (const [qubitIndex, labels] of initialLabelsmap) {
    positions.push({
      key: `initial-label-${qubitIndex}`,
      qubitIndex,
      momentIndex: -1,
      labels,
      top: -padding + qubitIndex * lineHeight + labelTopOffset,
      left: padding,
    });
  }
  return positions;
}

export function computeLabelChangePositions(
  tracker: LabelTracker,
  config: RenderConfig,
  circuit: Circuit,
  momentOffsets: Map<number, MomentOffsetData>
): PositionedLabel[] {
  const { padding, lineHeight, momentWidth } = config;
  const positions: PositionedLabel[] = [];
  const moments = tracker.getMomentIndices();

  for (const moment of moments) {
    const qubits = tracker.getActiveQubitsAtMoment(moment);

    // get offset data for this moment
    const offsetData = momentOffsets.get(moment);
    const cumulativeOffset = offsetData?.cumulativeOffset || 0;
    const maxOffset = offsetData?.maxOffset || 0;
    for (const qubit of qubits) {
      const currentLabel = tracker.getLabelsBeforeGate(moment + 1, qubit);
      const previousLabel = tracker.getLabelsBeforeGate(moment, qubit);
      if (!currentLabel) continue;
      if (moment === 0) {
        const moment0 = circuit.momentOfIndex(0);
        const hasGateAtQubit = moment0?.getGate(qubit) !== undefined;
        if (!hasGateAtQubit) continue;
      }
      if (!previousLabel?.equals(currentLabel)) {
        const gate = circuit.momentOfIndex(moment)?.getGate(qubit);
        const isBoxedGate =
          gate !== undefined && gate.numControls === 0 && gate.targetType.numTargets === 1;
        // Boxed single-qubit gates (H, S, T, Rz …) are 40px wide starting at cellLeft,
        // so the label must start past the right edge of the box.
        const effectivePadding = isBoxedGate
          ? singleQubitGateWidth + labelLeftPadding
          : labelLeftPadding;
        const labelMaxWidth = Math.max(0, momentWidth - effectivePadding - labelRightClearance);
        positions.push({
          key: `initial-label-${moment}-${qubit}`,
          qubitIndex: qubit,
          momentIndex: moment,
          labels: currentLabel,
          maxWidth: labelMaxWidth,
          top: -padding + qubit * lineHeight + labelTopOffset,
          // cumulativeOffset + maxOffset so all labels align with rightmost CNOT
          left:
            padding +
            qubitLabelWidth +
            momentWidth * moment +
            effectivePadding +
            cumulativeOffset +
            maxOffset,
        });
      }
    }
  }
  return positions;
}
